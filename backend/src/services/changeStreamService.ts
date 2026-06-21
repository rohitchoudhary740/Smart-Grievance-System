import mongoose from 'mongoose';
import { Grievance } from '../models/Grievance';
import { GrievanceLog } from '../models/GrievanceLog';
import { emitToTenant } from './socketService';
import { SocketEvent } from '../types';
import { logger } from '../utils/logger';

type ResumeToken = unknown;
let grievanceToken: ResumeToken;
let logToken: ResumeToken;

/**
 * Watch Grievance collection for inserts/updates and push to tenanted socket rooms.
 * Requires MongoDB Atlas with replica set — Change Streams use the oplog.
 */
export function startChangeStreams(): void {
  watchGrievances();
  watchLogs();
}

function watchGrievances(): void {
  try {
    const pipeline = [
      { $match: { operationType: { $in: ['insert', 'update', 'replace'] } } },
    ];

    const opts = grievanceToken ? { resumeAfter: grievanceToken } : {};
    const stream = Grievance.watch(pipeline, { ...opts, fullDocument: 'updateLookup' });

    stream.on('change', (change) => {
      grievanceToken = change._id;

      const doc = (change as any).fullDocument;
      if (!doc) return;

      const tenantId = doc.tenantId?.toString();
      if (!tenantId) return;

      const event =
        change.operationType === 'insert'
          ? SocketEvent.GRIEVANCE_CREATED
          : SocketEvent.GRIEVANCE_UPDATED;

      // Sanitise before broadcasting (no passwordHash leakage risk here, but good practice)
      const payload = {
        _id:          doc._id,
        ticketNumber: doc.ticketNumber,
        title:        doc.title,
        status:       doc.status,
        priority:     doc.priority,
        departmentId: doc.departmentId,
        assignedOfficerId: doc.assignedOfficerId,
        updatedAt:    doc.updatedAt,
      };

      emitToTenant(tenantId, event, payload);
    });

    stream.on('error', (err) => {
      logger.error('Grievance change stream error — restarting', err);
      setTimeout(watchGrievances, 5000);
    });

    stream.on('close', () => {
      logger.warn('Grievance change stream closed — restarting');
      setTimeout(watchGrievances, 5000);
    });

    logger.info('✅  Grievance change stream active');
  } catch (err) {
    logger.warn('Change streams unavailable (standalone MongoDB?) — falling back to polling', err);
  }
}

function watchLogs(): void {
  try {
    const pipeline = [
      { $match: { operationType: 'insert' } },
    ];

    const opts = logToken ? { resumeAfter: logToken } : {};
    const stream = GrievanceLog.watch(pipeline, { ...opts, fullDocument: 'updateLookup' });

    stream.on('change', (change) => {
      logToken = change._id;
      const doc = (change as any).fullDocument;
      if (!doc) return;

      const tenantId = doc.tenantId?.toString();
      if (!tenantId) return;

      // SLA breach events get a dedicated socket event for prominent UI treatment
      if (doc.eventType === 'SLA_BREACHED') {
        emitToTenant(tenantId, SocketEvent.SLA_BREACHED, {
          grievanceId: doc.grievanceId,
          description: doc.description,
        });
      }
    });

    stream.on('error', (err) => {
      logger.error('GrievanceLog change stream error — restarting', err);
      setTimeout(watchLogs, 5000);
    });

    logger.info('✅  GrievanceLog change stream active');
  } catch (err) {
    logger.warn('Log change stream unavailable', err);
  }
}
