import cron from 'node-cron';
import { Grievance } from '../models/Grievance';
import { Tenant } from '../models/Tenant';
import {
  markSLABreached, escalateGrievance, detectCriticalZones,
} from './grievanceService';
import { emitToTenant } from './socketService';
import { SocketEvent, GrievanceStatus, EscalationLevel } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export function startSLACron(): void {
  cron.schedule(config.sla.cronSchedule, async () => {
    logger.debug('SLA cron: running check');
    try {
      await checkSLABreaches();
      await checkEscalations();
      await checkCriticalZones();
    } catch (err) {
      logger.error('SLA cron error', err);
    }
  });

  logger.info(`✅  SLA cron scheduler active (${config.sla.cronSchedule})`);
}

// ─── 1. Mark overdue complaints as SLA_BREACHED ───────────────────────────────
async function checkSLABreaches(): Promise<void> {
  const now = new Date();

  // Find all non-terminal complaints past their dueAt with no breach recorded yet
  const overdue = await Grievance.find({
    dueAt:         { $lt: now },
    slaBreachedAt: { $exists: false },
    status: {
      $nin: [
        GrievanceStatus.RESOLVED,
        GrievanceStatus.CLOSED,
        GrievanceStatus.REJECTED,
        GrievanceStatus.SLA_BREACHED,
      ],
    },
  }).select('_id tenantId').lean();

  for (const g of overdue) {
    await markSLABreached(g._id.toString(), g.tenantId.toString());
    emitToTenant(g.tenantId.toString(), SocketEvent.SLA_BREACHED, {
      grievanceId: g._id,
    });
  }

  if (overdue.length) {
    logger.warn(`SLA cron: marked ${overdue.length} grievance(s) as SLA_BREACHED`);
  }
}

// ─── 2. Escalate breached complaints to dept head / collector ─────────────────
async function checkEscalations(): Promise<void> {
  // Get all active tenants to retrieve their escalation config
  const tenants = await Tenant.find({ isActive: true }).lean();

  for (const tenant of tenants) {
    const tenantId = tenant._id.toString();

    // Find breached grievances not yet escalated to DEPT_HEAD
    const breachedNoEscalation = await Grievance.find({
      tenantId:       tenant._id,
      slaBreachedAt:  { $exists: true },
      isEscalated:    false,
      status: {
        $nin: [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED, GrievanceStatus.REJECTED],
      },
    }).select('_id tenantId slaBreachedAt').lean();

    for (const g of breachedNoEscalation) {
      // Escalate to dept head after tenant's escalationHours
      const hoursSinceBreach =
        (Date.now() - new Date(g.slaBreachedAt!).getTime()) / 3_600_000;

      if (hoursSinceBreach >= 4) { // Default: 4h after breach → dept head
        await escalateGrievance(g._id.toString(), tenantId, EscalationLevel.DEPT_HEAD);
        emitToTenant(tenantId, SocketEvent.ESCALATION, {
          grievanceId: g._id,
          level: EscalationLevel.DEPT_HEAD,
        });
      }
    }

    // Escalate dept_head → collector after further delay
    const escalatedToDeptHead = await Grievance.find({
      tenantId:       tenant._id,
      isEscalated:    true,
      escalationLevel:EscalationLevel.DEPT_HEAD,
      escalatedAt:    { $exists: true },
      status: {
        $nin: [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED, GrievanceStatus.REJECTED],
      },
    }).select('_id tenantId escalatedAt').lean();

    for (const g of escalatedToDeptHead) {
      const hoursSinceEscalation =
        (Date.now() - new Date(g.escalatedAt!).getTime()) / 3_600_000;

      if (hoursSinceEscalation >= 8) { // Default: 8h at dept head → collector
        await escalateGrievance(g._id.toString(), tenantId, EscalationLevel.COLLECTOR);
        emitToTenant(tenantId, SocketEvent.ESCALATION, {
          grievanceId: g._id,
          level: EscalationLevel.COLLECTOR,
        });
      }
    }
  }
}

// ─── 3. Detect and emit critical zone alerts ──────────────────────────────────
async function checkCriticalZones(): Promise<void> {
  const tenants = await Tenant.find({ isActive: true }).lean();

  for (const tenant of tenants) {
    const tenantId   = tenant._id.toString();
    const threshold  = tenant.settings?.criticalZoneThreshold  ?? 5;
    const windowHours= tenant.settings?.criticalZoneWindowHours ?? 24;

    const zones = await detectCriticalZones(tenantId, threshold, windowHours);
    for (const zone of zones) {
      emitToTenant(tenantId, SocketEvent.CRITICAL_ZONE, zone);
    }
  }
}
