import { Request, Response } from 'express';
import { body } from 'express-validator';
import {
  createGrievance, getGrievanceById, listGrievances,
  submitFeedback, reopenGrievance, getGrievanceLogs,
  setAIMetadata, addAttachments, appendLog,
  findSimilarGrievanceInWard, addSupportToGrievance, deleteGrievance,
} from '../services/grievanceService';
import { classifyComplaint } from '../services/aiService';
import { autoAssign } from '../services/assignmentService';
import { getDepartmentsByTenant, getSLAForCategory } from '../services/tenantService';
import { multerFileToAttachment } from '../middlewares/upload';
import { respond } from '../utils/respond';
import { logger } from '../utils/logger';
import { GrievanceStatus, LogEventType } from '../types';
import fs from 'fs/promises';

// ── POST /api/citizen/grievances ──────────────────────────────────────────────
export async function submitGrievance(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { title, description, address, ward, lat, lng, category } = req.body as {
      title: string; description: string; address: string;
      ward?: string; lat?: string; lng?: string; category?: string;
    };

    // Multer already saved uploaded files to disk before this handler runs.
    // If we return a duplicate conflict, we must clean up to avoid orphan uploads.
    const files = (req.files as Express.Multer.File[]) ?? [];

    // 1) Run AI classification (required for both assignment + duplicate detection)
    const ai = await classifyComplaint(title, description);

    // 2) Duplicate detection (same ward)
    const similar = await findSimilarGrievanceInWard({
      tenantId,
      ward,
      title,
      description,
      suggestedCategory: ai.suggestedCategory,
    });

    if (similar) {
      // cleanup uploaded photos saved by multer
      await Promise.all(
        files.map(async (f) => {
          const p = (f as any).path as string | undefined;
          if (!p) return;
          await fs.unlink(p).catch(() => undefined);
        })
      );

      const deptName =
        similar.aiMetadata?.suggestedDepartmentName?.trim() ||
        (similar as any).departmentId?.name?.toString() ||
        'General Administration';
      const wardLabel = similar.location?.ward || ward || 'Unknown ward';

      const message = `⚠ Similar complaint already filed: ${similar.ticketNumber} (${deptName}, ${wardLabel}). Would you like to add your support instead?`;

      res.status(409).json({
        success: false,
        message,
        data: { duplicateOfId: similar._id.toString() },
      });
      return;
    }

    // 3. Create the grievance record
    const grievance = await createGrievance({
      tenantId, submittedById: userId,
      title, description, address, ward,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      category,
    });

    // 4. Attach uploaded photos
    if (files.length) {
      await addAttachments(
        grievance._id.toString(),
        tenantId,
        files.map((f) => multerFileToAttachment(f, userId)),
        'attachments',
        userId
      );
    }

    // 5. Log creation event
    await appendLog({
      grievanceId: grievance._id.toString(),
      tenantId,
      eventType: LogEventType.CREATED,
      actorId: userId,
      description: `Complaint submitted by citizen`,
    });

    // 6. Look up department SLA
    const allDepts = await getDepartmentsByTenant(tenantId);
    const normalizeDept = (s: unknown) =>
      String(s ?? '')
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ');

    const suggestedDeptNorm = normalizeDept(ai.suggestedDepartmentName);
    const suggestedCategoryNorm = (ai.suggestedCategory ?? '').trim().toLowerCase();
    const categoryTokens = suggestedCategoryNorm
      .split(/\W+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);

    const categoryMatches = (deptCats: string[]): boolean => {
      return deptCats?.some((c) => {
        const cn = String(c ?? '').trim().toLowerCase();
        if (!cn) return false;
        if (cn === suggestedCategoryNorm) return true;
        if (cn.includes(suggestedCategoryNorm) || suggestedCategoryNorm.includes(cn)) return true;
        for (const tok of categoryTokens) {
          if (tok && cn.includes(tok)) return true;
        }
        return false;
      }) ?? false;
    };

    const nameMatches = (deptName: string): boolean => {
      const dn = normalizeDept(deptName);
      if (!dn || !suggestedDeptNorm) return false;
      return dn === suggestedDeptNorm || dn.includes(suggestedDeptNorm) || suggestedDeptNorm.includes(dn);
    };

    const dept =
      allDepts.find((d) => nameMatches(d.name) || categoryMatches(d.categories as any)) ??
      allDepts.find((d) => d.slug === 'admin') ??
      allDepts[0];

    const slaConfig = dept ? getSLAForCategory(dept, ai.suggestedCategory) : {
      resolutionHours: 48, escalationHours: 24, collectorEscalationHours: 48,
    };

    // 6. Auto-assign officer
    const assignment = await autoAssign(
      tenantId, ai.suggestedDepartmentName,
      ai.suggestedCategory, slaConfig.resolutionHours
    );

    // 7. Always save AI metadata, then assign if possible
    const aiMeta = {
      suggestedCategory:       ai.suggestedCategory,
      suggestedDepartmentName: ai.suggestedDepartmentName,
      priority:                ai.priority,
      slaRisk:                 ai.slaRisk,
      summary:                 ai.summary,
      confidence:              ai.confidence,
      language:                ai.language,
      processedAt:             new Date(),
    };

    // Use assignment data if available, otherwise use fallback dept + default SLA
    const finalDeptId   = assignment?.departmentId   ?? dept?._id?.toString() ?? '';
    const finalOfficerId= assignment?.officerId       ?? '';
    const finalDueAt    = assignment?.dueAt           ?? new Date(Date.now() + slaConfig.resolutionHours * 3_600_000);
    const finalERT      = assignment?.estimatedResolutionTime ?? `Expected within ${slaConfig.resolutionHours} hours`;

    const updated = finalDeptId
      ? await setAIMetadata(
          grievance._id.toString(), tenantId,
          aiMeta, finalDueAt, finalDeptId,
          finalOfficerId || grievance.assignedOfficerId?.toString() || '',
          finalERT
        )
      : grievance;

    if (assignment) {
      await appendLog({
        grievanceId: grievance._id.toString(),
        tenantId,
        eventType:   LogEventType.ASSIGNED,
        description: `Auto-assigned to officer in ${assignment.departmentName}`,
        metadata:    { officerId: assignment.officerId, departmentId: assignment.departmentId },
      });
    } else {
      await appendLog({
        grievanceId: grievance._id.toString(),
        tenantId,
        eventType:   LogEventType.ASSIGNED,
        description: `Classified by AI as ${ai.suggestedDepartmentName} — pending manual officer assignment`,
        metadata:    { departmentName: ai.suggestedDepartmentName },
      });
    }

    respond.created(res, updated ?? grievance);
  } catch (err) {
    logger.error('submitGrievance error', err);
    respond.serverError(res);
  }
}

// ── GET /api/citizen/grievances ───────────────────────────────────────────────
export async function myGrievances(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { status, page = '1', limit = '10' } = req.query as Record<string, string>;

    const result = await listGrievances({
      tenantId,
      submittedById: userId,
      status: status as GrievanceStatus || undefined,
      page:  parseInt(page),
      limit: parseInt(limit),
    });

    respond.paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    logger.error('myGrievances error', err);
    respond.serverError(res);
  }
}

// ── GET /api/citizen/grievances/:id ──────────────────────────────────────────
export async function getGrievance(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const grievance = await getGrievanceById(req.params.id, tenantId);
    if (!grievance) { respond.notFound(res); return; }
    respond.ok(res, grievance);
  } catch (err) {
    logger.error('getGrievance error', err);
    respond.serverError(res);
  }
}

// ── GET /api/citizen/grievances/:id/timeline ──────────────────────────────────
export async function getTimeline(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const logs = await getGrievanceLogs(req.params.id, tenantId);
    respond.ok(res, logs);
  } catch (err) {
    logger.error('getTimeline error', err);
    respond.serverError(res);
  }
}

// ── POST /api/citizen/grievances/:id/feedback ─────────────────────────────────
export async function leaveFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { rating, comment } = req.body as { rating: number; comment?: string };
    const { id } = req.params;

    // Verify the grievance belongs to this citizen and is resolved
    const grievance = await getGrievanceById(id, tenantId);
    if (!grievance) { respond.notFound(res); return; }
    if (grievance.submittedById.toString() !== userId) { respond.forbidden(res); return; }
    if (
      grievance.status !== GrievanceStatus.RESOLVED &&
      grievance.status !== GrievanceStatus.CLOSED
    ) {
      respond.badRequest(res, 'Feedback can only be submitted for resolved complaints');
      return;
    }

    await submitFeedback(id, tenantId, userId, rating, comment);
    respond.ok(res, { message: 'Feedback recorded' });
  } catch (err) {
    logger.error('leaveFeedback error', err);
    respond.serverError(res);
  }
}

// ── POST /api/citizen/grievances/:id/reopen ───────────────────────────────────
export async function reopen(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { reason } = req.body as { reason: string };
    const { id } = req.params;

    const updated = await reopenGrievance(id, tenantId, userId, reason);
    if (!updated) {
      respond.badRequest(res, 'Cannot reopen this complaint — it may not be eligible or already re-opened');
      return;
    }
    respond.ok(res, updated);
  } catch (err) {
    logger.error('reopen error', err);
    respond.serverError(res);
  }
}

// ── POST /api/citizen/grievances/:id/support ────────────────────────────────
export async function support(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const result = await addSupportToGrievance(id, tenantId, userId);
    if (!result) { respond.notFound(res); return; }

    respond.ok(res, {
      message: result.added ? 'Support added' : 'Support already added',
      ticketNumber: result.ticketNumber,
    });
  } catch (err) {
    logger.error('support error', err);
    respond.serverError(res);
  }
}

// ── DELETE /api/citizen/grievances/:id ──────────────────────────────────────
export async function deleteMyGrievance(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const deleted = await deleteGrievance({ grievanceId: id, tenantId, citizenId: userId });
    if (!deleted) { respond.notFound(res); return; }

    respond.ok(res, { message: 'Complaint deleted' });
  } catch (err) {
    logger.error('deleteMyGrievance error', err);
    respond.serverError(res);
  }
}

// ─── Validation chains (exported for use in routes) ──────────────────────────
export const submitValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 5000 }),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
  body('reason').optional().trim().isLength({ min: 5 }).withMessage('Reopen reason must be at least 5 characters'),
];