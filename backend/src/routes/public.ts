import { Router, Request, Response } from 'express';
import { Grievance } from '../models/Grievance';
import { GrievanceLog } from '../models/GrievanceLog';
import { respond } from '../utils/respond';

const router = Router();

// GET /api/public/track/:ticketNumber — no auth required
router.get('/track/:ticketNumber', async (req: Request, res: Response) => {
  try {
    const { ticketNumber } = req.params;

    const grievance = await Grievance.findOne({
      ticketNumber: ticketNumber.toUpperCase(),
    })
      .populate({ path: 'departmentId',      select: 'name slug' })
      .populate({ path: 'assignedOfficerId', select: 'name role' })
      .lean();

    if (!grievance) {
      respond.notFound(res, `No grievance found with ticket number ${ticketNumber}`);
      return;
    }

    // Sanitise — don't expose citizen personal details publicly
    const safe = {
      _id:          grievance._id,
      ticketNumber: grievance.ticketNumber,
      title:        grievance.title,
      description:  grievance.description,
      category:     grievance.category,
      status:       grievance.status,
      priority:     grievance.priority,
      slaRisk:      grievance.slaRisk,
      location: {
        address: grievance.location.address,
        ward:    grievance.location.ward,
      },
      department:            (grievance as any).departmentId,
      assignedOfficer:       (grievance as any).assignedOfficerId,
      aiMetadata:            grievance.aiMetadata,
      estimatedResolutionTime: grievance.estimatedResolutionTime,
      dueAt:        grievance.dueAt,
      resolvedAt:   grievance.resolvedAt,
      slaBreachedAt:grievance.slaBreachedAt,
      isEscalated:  grievance.isEscalated,
      escalationLevel: grievance.escalationLevel,
      feedbackRating:  grievance.feedbackRating,
      createdAt:    grievance.createdAt,
      updatedAt:    grievance.updatedAt,
    };

    respond.ok(res, safe);
  } catch (err) {
    respond.serverError(res);
  }
});

// GET /api/public/track/:ticketNumber/timeline
router.get('/track/:ticketNumber/timeline', async (req: Request, res: Response) => {
  try {
    const { ticketNumber } = req.params;

    const grievance = await Grievance.findOne({
      ticketNumber: ticketNumber.toUpperCase(),
    }).select('_id tenantId').lean();

    if (!grievance) {
      respond.notFound(res);
      return;
    }

    const logs = await GrievanceLog.find({ grievanceId: grievance._id })
      .sort({ createdAt: 1 })
      .populate({ path: 'actorId', select: 'name role' })
      .lean();

    // Only expose citizen-safe events
    const safeLogs = logs.map(l => ({
      _id:         l._id,
      eventType:   l.eventType,
      description: l.description,
      actor:       (l as any).actorId ? { name: (l as any).actorId.name, role: (l as any).actorId.role } : undefined,
      createdAt:   l.createdAt,
    }));

    respond.ok(res, safeLogs);
  } catch {
    respond.serverError(res);
  }
});

export default router;