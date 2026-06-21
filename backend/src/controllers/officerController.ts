import { Request, Response } from 'express';
import {
  listGrievances, getGrievanceById, updateGrievanceStatus,
  addAttachments, getGrievanceLogs, getOfficerPerformance,
} from '../services/grievanceService';
import { multerFileToAttachment } from '../middlewares/upload';
import { respond } from '../utils/respond';
import { logger } from '../utils/logger';
import { GrievanceStatus } from '../types';

// Valid officer-driven transitions
const ALLOWED_TRANSITIONS: Partial<Record<GrievanceStatus, GrievanceStatus[]>> = {
  [GrievanceStatus.NEW]:         [GrievanceStatus.ACCEPTED, GrievanceStatus.REJECTED],
  [GrievanceStatus.ACCEPTED]:    [GrievanceStatus.IN_PROGRESS],
  [GrievanceStatus.IN_PROGRESS]: [GrievanceStatus.RESOLVED],
  [GrievanceStatus.REOPENED]:    [GrievanceStatus.ACCEPTED, GrievanceStatus.IN_PROGRESS],
  [GrievanceStatus.SLA_BREACHED]:[GrievanceStatus.ACCEPTED, GrievanceStatus.IN_PROGRESS, GrievanceStatus.RESOLVED],
};

// ── GET /api/officer/grievances/:id ──────────────────────────────────────────
export async function getGrievanceDetail(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const grievance = await getGrievanceById(req.params.id, tenantId);
    if (!grievance) { respond.notFound(res); return; }
    // Officers can view any grievance in their tenant
    respond.ok(res, grievance);
  } catch (err) {
    logger.error('getGrievanceDetail error', err);
    respond.serverError(res);
  }
}

// ── GET /api/officer/grievances ───────────────────────────────────────────────
export async function myTasks(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    // When no status filter, show all active statuses including REOPENED + SLA_BREACHED
    const activeStatuses = [
      GrievanceStatus.NEW,
      GrievanceStatus.ACCEPTED,
      GrievanceStatus.IN_PROGRESS,
      GrievanceStatus.REOPENED,
      GrievanceStatus.SLA_BREACHED,
    ];

    const result = await listGrievances({
      tenantId,
      assignedOfficerId: userId,
      status: status
        ? status as GrievanceStatus
        : activeStatuses as unknown as GrievanceStatus,
      page:  parseInt(page),
      limit: parseInt(limit),
      sortBy: 'dueAt',
      sortOrder: 'asc',
    });

    respond.paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    logger.error('myTasks error', err);
    respond.serverError(res);
  }
}

// ── PATCH /api/officer/grievances/:id/status ──────────────────────────────────
export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;
    const { status, remarks } = req.body as { status: GrievanceStatus; remarks?: string };

    // Fetch grievance — any officer in the tenant can update status
    const grievance = await getGrievanceById(id, tenantId);
    if (!grievance) { respond.notFound(res); return; }

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[grievance.status] ?? [];
    if (!allowed.includes(status)) {
      respond.badRequest(
        res,
        `Cannot transition from ${grievance.status} to ${status}`
      );
      return;
    }

    const updated = await updateGrievanceStatus(id, tenantId, status, userId, remarks);
    respond.ok(res, updated);
  } catch (err) {
    logger.error('updateStatus error', err);
    respond.serverError(res);
  }
}

// ── POST /api/officer/grievances/:id/proof ────────────────────────────────────
export async function uploadProof(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const { id } = req.params;

    const grievance = await getGrievanceById(id, tenantId);
    if (!grievance) { respond.notFound(res); return; }

    // Any officer in the tenant can upload proof

    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) {
      respond.badRequest(res, 'No files uploaded');
      return;
    }

    const updated = await addAttachments(
      id, tenantId,
      files.map((f) => multerFileToAttachment(f, userId)),
      'resolutionPhotos',
      userId
    );

    respond.ok(res, updated);
  } catch (err) {
    logger.error('uploadProof error', err);
    respond.serverError(res);
  }
}

// ── GET /api/officer/grievances/:id/timeline ─────────────────────────────────
export async function getOfficerTimeline(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const logs = await getGrievanceLogs(req.params.id, tenantId);
    respond.ok(res, logs);
  } catch (err) {
    logger.error('getOfficerTimeline error', err);
    respond.serverError(res);
  }
}

// ── GET /api/officer/performance ──────────────────────────────────────────────
export async function performance(req: Request, res: Response): Promise<void> {
  try {
    const { userId, tenantId } = req.user!;
    const stats = await getOfficerPerformance(userId, tenantId);
    respond.ok(res, stats);
  } catch (err) {
    logger.error('performance error', err);
    respond.serverError(res);
  }
}