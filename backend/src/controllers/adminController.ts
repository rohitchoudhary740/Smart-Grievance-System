import { Request, Response } from 'express';
import {
  listGrievances, getOfficerLeaderboard, getGrievanceLogs, getAnalyticsSummary,
  detectCriticalZones, getAuditLogs, assignGrievance, exportGrievancesCSV, deleteGrievance,
} from '../services/grievanceService';
import { getDepartmentsByTenant, createDepartment, updateDepartment } from '../services/tenantService';
import { listUsers, updateUserRole } from '../services/userService';
import { respond } from '../utils/respond';
import { logger } from '../utils/logger';
import { GrievanceStatus, Priority, SLARisk, UserRole, LogEventType } from '../types';
import { ITenant } from '../models/Tenant';

// ── GET /api/admin/grievances ─────────────────────────────────────────────────
export async function allGrievances(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const q = req.query as Record<string, string>;

    const result = await listGrievances({
      tenantId,
      status:       q.status       as GrievanceStatus || undefined,
      priority:     q.priority     as Priority        || undefined,
      slaRisk:      q.slaRisk      as SLARisk         || undefined,
      departmentId: q.departmentId || undefined,
      search:       q.search       || undefined,
      isEscalated:  q.isEscalated  === 'true' ? true : undefined,
      from:         q.from ? new Date(q.from) : undefined,
      to:           q.to   ? new Date(q.to)   : undefined,
      page:  parseInt(q.page  ?? '1'),
      limit: parseInt(q.limit ?? '20'),
    });

    respond.paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    logger.error('allGrievances error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/grievances/:id/timeline ────────────────────────────────────
export async function adminTimeline(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const logs = await getGrievanceLogs(req.params.id, tenantId);
    respond.ok(res, logs);
  } catch (err) {
    logger.error('adminTimeline error', err);
    respond.serverError(res);
  }
}

// ── PATCH /api/admin/grievances/:id/assign ────────────────────────────────────
export async function reassign(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user!;
    const { officerId, departmentId } = req.body as { officerId: string; departmentId?: string };

    const updated = await assignGrievance(
      req.params.id, tenantId, officerId, userId, departmentId
    );
    if (!updated) { respond.notFound(res); return; }
    respond.ok(res, updated);
  } catch (err) {
    logger.error('reassign error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/analytics ──────────────────────────────────────────────────
export async function analytics(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const { from, to, departmentId } = req.query as Record<string, string>;

    const summary = await getAnalyticsSummary(
      tenantId,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
      departmentId || undefined
    );

    respond.ok(res, summary);
  } catch (err) {
    logger.error('analytics error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/critical-zones ─────────────────────────────────────────────
export async function criticalZones(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const tenant = (req as any).tenant as ITenant;
    const threshold  = tenant?.settings?.criticalZoneThreshold  ?? 5;
    const windowHours= tenant?.settings?.criticalZoneWindowHours ?? 24;

    const zones = await detectCriticalZones(tenantId, threshold, windowHours);
    respond.ok(res, zones);
  } catch (err) {
    logger.error('criticalZones error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/departments ────────────────────────────────────────────────
export async function getDepts(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const depts = await getDepartmentsByTenant(tenantId);
    respond.ok(res, depts);
  } catch (err) {
    logger.error('getDepts error', err);
    respond.serverError(res);
  }
}

// ── POST /api/admin/departments ───────────────────────────────────────────────
export async function createDept(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const dept = await createDepartment({ ...req.body, tenantId });
    respond.created(res, dept);
  } catch (err) {
    logger.error('createDept error', err);
    respond.serverError(res);
  }
}

// ── PUT /api/admin/departments/:id ────────────────────────────────────────────
export async function updateDept(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const updated = await updateDepartment(req.params.id, tenantId, req.body);
    if (!updated) { respond.notFound(res); return; }
    respond.ok(res, updated);
  } catch (err) {
    logger.error('updateDept error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const { role, departmentId } = req.query as { role?: string; departmentId?: string };
    const users = await listUsers(tenantId, { role: role as UserRole, departmentId });
    respond.ok(res, users);
  } catch (err) {
    logger.error('getUsers error', err);
    respond.serverError(res);
  }
}

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
export async function patchUserRole(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const { role, departmentId } = req.body as { role: UserRole; departmentId?: string };

    if (!Object.values(UserRole).includes(role)) {
      respond.badRequest(res, 'Invalid role');
      return;
    }

    const updated = await updateUserRole(req.params.id, tenantId, role, departmentId);
    if (!updated) { respond.notFound(res); return; }
    respond.ok(res, updated);
  } catch (err) {
    logger.error('patchUserRole error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/audit-logs ─────────────────────────────────────────────────
export async function auditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const q = req.query as Record<string, string>;

    const result = await getAuditLogs(tenantId, {
      actorId:   q.userId    || undefined,
      eventType: q.eventType as LogEventType || undefined,
      from:      q.from ? new Date(q.from) : undefined,
      to:        q.to   ? new Date(q.to)   : undefined,
      page:  parseInt(q.page  ?? '1'),
      limit: parseInt(q.limit ?? '30'),
    });

    respond.paginated(res, result.data, result.total,
      parseInt(q.page ?? '1'), parseInt(q.limit ?? '30'));
  } catch (err) {
    logger.error('auditLogs error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/export ─────────────────────────────────────────────────────
export async function exportCSV(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const q = req.query as Record<string, string>;

    const data = await exportGrievancesCSV({
      tenantId,
      status:       q.status   as GrievanceStatus || undefined,
      priority:     q.priority as Priority        || undefined,
      departmentId: q.departmentId || undefined,
    });

    // Build CSV
    const headers = [
      'Ticket', 'Title', 'Status', 'Priority', 'Category',
      'Department', 'Officer', 'Address', 'Ward', 'Created', 'Resolved',
    ];

    const rows = data.map((g) => [
      g.ticketNumber,
      `"${g.title.replace(/"/g, '""')}"`,
      g.status,
      g.priority,
      g.category,
      (g as any).departmentId?.name ?? '',
      (g as any).assignedOfficerId?.name ?? '',
      `"${g.location.address.replace(/"/g, '""')}"`,
      g.location.ward ?? '',
      g.createdAt.toISOString(),
      g.resolvedAt?.toISOString() ?? '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="grievances-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    logger.error('exportCSV error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/leaderboard ─────────────────────────────────────────────────
export async function officerLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const data = await getOfficerLeaderboard(tenantId);
    respond.ok(res, data);
  } catch (err) {
    logger.error('officerLeaderboard error', err);
    respond.serverError(res);
  }
}import { Request, Response } from 'express';
import {
  listGrievances, getOfficerLeaderboard, getGrievanceLogs, getAnalyticsSummary,
  detectCriticalZones, getAuditLogs, assignGrievance, exportGrievancesCSV,
} from '../services/grievanceService';
import { getDepartmentsByTenant, createDepartment, updateDepartment } from '../services/tenantService';
import { listUsers, updateUserRole } from '../services/userService';
import { respond } from '../utils/respond';
import { logger } from '../utils/logger';
import { GrievanceStatus, Priority, SLARisk, UserRole, LogEventType } from '../types';
import { ITenant } from '../models/Tenant';

// ── GET /api/admin/grievances ─────────────────────────────────────────────────
export async function allGrievances(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const q = req.query as Record<string, string>;

    const result = await listGrievances({
      tenantId,
      status:       q.status       as GrievanceStatus || undefined,
      priority:     q.priority     as Priority        || undefined,
      slaRisk:      q.slaRisk      as SLARisk         || undefined,
      departmentId: q.departmentId || undefined,
      search:       q.search       || undefined,
      isEscalated:  q.isEscalated  === 'true' ? true : undefined,
      from:         q.from ? new Date(q.from) : undefined,
      to:           q.to   ? new Date(q.to)   : undefined,
      page:  parseInt(q.page  ?? '1'),
      limit: parseInt(q.limit ?? '20'),
    });

    respond.paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    logger.error('allGrievances error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/grievances/:id/timeline ────────────────────────────────────
export async function adminTimeline(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const logs = await getGrievanceLogs(req.params.id, tenantId);
    respond.ok(res, logs);
  } catch (err) {
    logger.error('adminTimeline error', err);
    respond.serverError(res);
  }
}

// ── PATCH /api/admin/grievances/:id/assign ────────────────────────────────────
export async function reassign(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId, userId } = req.user!;
    const { officerId, departmentId } = req.body as { officerId: string; departmentId?: string };

    const updated = await assignGrievance(
      req.params.id, tenantId, officerId, userId, departmentId
    );
    if (!updated) { respond.notFound(res); return; }
    respond.ok(res, updated);
  } catch (err) {
    logger.error('reassign error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/analytics ──────────────────────────────────────────────────
export async function analytics(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const { from, to, departmentId } = req.query as Record<string, string>;

    const summary = await getAnalyticsSummary(
      tenantId,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
      departmentId || undefined
    );

    respond.ok(res, summary);
  } catch (err) {
    logger.error('analytics error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/critical-zones ─────────────────────────────────────────────
export async function criticalZones(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const tenant = (req as any).tenant as ITenant;
    const threshold  = tenant?.settings?.criticalZoneThreshold  ?? 5;
    const windowHours= tenant?.settings?.criticalZoneWindowHours ?? 24;

    const zones = await detectCriticalZones(tenantId, threshold, windowHours);
    respond.ok(res, zones);
  } catch (err) {
    logger.error('criticalZones error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/departments ────────────────────────────────────────────────
export async function getDepts(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const depts = await getDepartmentsByTenant(tenantId);
    respond.ok(res, depts);
  } catch (err) {
    logger.error('getDepts error', err);
    respond.serverError(res);
  }
}

// ── POST /api/admin/departments ───────────────────────────────────────────────
export async function createDept(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const dept = await createDepartment({ ...req.body, tenantId });
    respond.created(res, dept);
  } catch (err) {
    logger.error('createDept error', err);
    respond.serverError(res);
  }
}

// ── PUT /api/admin/departments/:id ────────────────────────────────────────────
export async function updateDept(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const updated = await updateDepartment(req.params.id, tenantId, req.body);
    if (!updated) { respond.notFound(res); return; }
    respond.ok(res, updated);
  } catch (err) {
    logger.error('updateDept error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────
export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const { role, departmentId } = req.query as { role?: string; departmentId?: string };
    const users = await listUsers(tenantId, { role: role as UserRole, departmentId });
    respond.ok(res, users);
  } catch (err) {
    logger.error('getUsers error', err);
    respond.serverError(res);
  }
}

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
export async function patchUserRole(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const { role, departmentId } = req.body as { role: UserRole; departmentId?: string };

    if (!Object.values(UserRole).includes(role)) {
      respond.badRequest(res, 'Invalid role');
      return;
    }

    const updated = await updateUserRole(req.params.id, tenantId, role, departmentId);
    if (!updated) { respond.notFound(res); return; }
    respond.ok(res, updated);
  } catch (err) {
    logger.error('patchUserRole error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/audit-logs ─────────────────────────────────────────────────
export async function auditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const q = req.query as Record<string, string>;

    const result = await getAuditLogs(tenantId, {
      actorId:   q.userId    || undefined,
      eventType: q.eventType as LogEventType || undefined,
      from:      q.from ? new Date(q.from) : undefined,
      to:        q.to   ? new Date(q.to)   : undefined,
      page:  parseInt(q.page  ?? '1'),
      limit: parseInt(q.limit ?? '30'),
    });

    respond.paginated(res, result.data, result.total,
      parseInt(q.page ?? '1'), parseInt(q.limit ?? '30'));
  } catch (err) {
    logger.error('auditLogs error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/export ─────────────────────────────────────────────────────
export async function exportCSV(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const q = req.query as Record<string, string>;

    const data = await exportGrievancesCSV({
      tenantId,
      status:       q.status   as GrievanceStatus || undefined,
      priority:     q.priority as Priority        || undefined,
      departmentId: q.departmentId || undefined,
    });

    // Build CSV
    const headers = [
      'Ticket', 'Title', 'Status', 'Priority', 'Category',
      'Department', 'Officer', 'Address', 'Ward', 'Created', 'Resolved',
    ];

    const rows = data.map((g) => [
      g.ticketNumber,
      `"${g.title.replace(/"/g, '""')}"`,
      g.status,
      g.priority,
      g.category,
      (g as any).departmentId?.name ?? '',
      (g as any).assignedOfficerId?.name ?? '',
      `"${g.location.address.replace(/"/g, '""')}"`,
      g.location.ward ?? '',
      g.createdAt.toISOString(),
      g.resolvedAt?.toISOString() ?? '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="grievances-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    logger.error('exportCSV error', err);
    respond.serverError(res);
  }
}

// ── GET /api/admin/leaderboard ─────────────────────────────────────────────────
export async function officerLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const data = await getOfficerLeaderboard(tenantId);
    respond.ok(res, data);
  } catch (err) {
    logger.error('officerLeaderboard error', err);
    respond.serverError(res);
  }
}

// ── DELETE /api/admin/grievances/:id ────────────────────────────────────────
export async function deleteAnyGrievance(req: Request, res: Response): Promise<void> {
  try {
    const { tenantId } = req.user!;
    const deleted = await deleteGrievance({ grievanceId: req.params.id, tenantId });
    if (!deleted) { respond.notFound(res); return; }
    respond.ok(res, { message: 'Complaint deleted' });
  } catch (err) {
    logger.error('deleteAnyGrievance error', err);
    respond.serverError(res);
  }
}