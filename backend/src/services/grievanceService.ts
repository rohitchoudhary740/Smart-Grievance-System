import { Types, FilterQuery, UpdateQuery } from 'mongoose';
import { Grievance, IGrievance, IAttachment } from '../models/Grievance';
import { GrievanceLog } from '../models/GrievanceLog';
import { Feedback } from '../models/Feedback';
import { GrievanceStatus, Priority, SLARisk, LogEventType, EscalationLevel } from '../types';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateGrievanceInput {
  tenantId: string;
  submittedById: string;
  title: string;
  description: string;
  category?: string;
  address: string;
  ward?: string;
  lat?: number;
  lng?: number;
}

export interface GrievanceFilter {
  tenantId: string;
  status?: GrievanceStatus | GrievanceStatus[];
  priority?: Priority;
  slaRisk?: SLARisk;
  departmentId?: string;
  assignedOfficerId?: string;
  submittedById?: string;
  isEscalated?: boolean;
  search?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedGrievances {
  data: IGrievance[];
  total: number;
  page: number;
  limit: number;
}

// ─── Populate helper ──────────────────────────────────────────────────────────

const CITIZEN_POPULATE = [
  { path: 'submittedById', select: 'name email' },
  { path: 'departmentId',  select: 'name slug' },
  { path: 'assignedOfficerId', select: 'name email phone role' },
];

// ─── Grievance CRUD ───────────────────────────────────────────────────────────

export async function createGrievance(input: CreateGrievanceInput): Promise<IGrievance> {
  const geo =
    input.lat !== undefined && input.lng !== undefined
      ? { type: 'Point' as const, coordinates: [input.lng, input.lat] as [number, number] }
      : undefined;

  const grievance = await Grievance.create({
    tenantId:      new Types.ObjectId(input.tenantId),
    submittedById: new Types.ObjectId(input.submittedById),
    title:         input.title,
    description:   input.description,
    category:      input.category ?? 'general',
    location: {
      address: input.address,
      ward:    input.ward,
      geo,
    },
  });

  return grievance;
}

export async function getGrievanceById(
  id: string,
  tenantId: string
): Promise<IGrievance | null> {
  return Grievance.findOne({ _id: id, tenantId }).populate(CITIZEN_POPULATE).lean();
}

export async function listGrievances(filter: GrievanceFilter): Promise<PaginatedGrievances> {
  const {
    tenantId, status, priority, slaRisk, departmentId,
    assignedOfficerId, submittedById, isEscalated,
    search, from, to,
    page = 1, limit = 20,
    sortBy = 'createdAt', sortOrder = 'desc',
  } = filter;

  const query: FilterQuery<IGrievance> = { tenantId: new Types.ObjectId(tenantId) };

  if (status) {
    query.status = Array.isArray(status) ? { $in: status } : status;
  }
  if (priority)          query.priority         = priority;
  if (slaRisk)           query.slaRisk          = slaRisk;
  if (departmentId)      query.departmentId     = new Types.ObjectId(departmentId);
  if (assignedOfficerId) query.assignedOfficerId= new Types.ObjectId(assignedOfficerId);
  if (submittedById)     query.submittedById    = new Types.ObjectId(submittedById);
  if (typeof isEscalated === 'boolean') query.isEscalated = isEscalated;

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to)   query.createdAt.$lte = to;
  }

  if (search) {
    query.$text = { $search: search };
  }

  const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    Grievance.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(CITIZEN_POPULATE)
      .lean(),
    Grievance.countDocuments(query),
  ]);

  return { data: data as IGrievance[], total, page, limit };
}

export async function updateGrievanceStatus(
  grievanceId: string,
  tenantId: string,
  newStatus: GrievanceStatus,
  actorId: string,
  remarks?: string
): Promise<IGrievance | null> {
  const updates: UpdateQuery<IGrievance> = { status: newStatus };

  if (remarks) updates.remarks = remarks;

  if (newStatus === GrievanceStatus.RESOLVED) {
    updates.resolvedAt = new Date();
    updates.canReopen  = true;
  }
  if (newStatus === GrievanceStatus.CLOSED) {
    updates.closedAt  = new Date();
    updates.canReopen = false;
  }

  const grievance = await Grievance.findOneAndUpdate(
    { _id: grievanceId, tenantId },
    { $set: updates },
    { new: true }
  ).populate(CITIZEN_POPULATE);

  if (grievance) {
    await appendLog({
      grievanceId,
      tenantId,
      eventType:   LogEventType.STATUS_CHANGED,
      actorId,
      description: `Status changed to ${newStatus}${remarks ? `: ${remarks}` : ''}`,
      metadata:    { newStatus, remarks },
    });
  }

  return grievance;
}

export async function assignGrievance(
  grievanceId: string,
  tenantId: string,
  officerId: string,
  actorId: string,
  departmentId?: string
): Promise<IGrievance | null> {
  const updates: UpdateQuery<IGrievance> = {
    assignedOfficerId: new Types.ObjectId(officerId),
  };
  if (departmentId) {
    updates.departmentId = new Types.ObjectId(departmentId);
  }

  const grievance = await Grievance.findOneAndUpdate(
    { _id: grievanceId, tenantId },
    { $set: updates },
    { new: true }
  ).populate(CITIZEN_POPULATE);

  if (grievance) {
    await appendLog({
      grievanceId,
      tenantId,
      eventType:   LogEventType.ASSIGNED,
      actorId,
      description: `Complaint assigned to officer`,
      metadata:    { officerId, departmentId },
    });
  }

  return grievance;
}

export async function addAttachments(
  grievanceId: string,
  tenantId: string,
  attachments: Omit<IAttachment, 'uploadedAt'>[],
  field: 'attachments' | 'resolutionPhotos',
  actorId: string
): Promise<IGrievance | null> {
  const stamped = attachments.map((a) => ({ ...a, uploadedAt: new Date() }));

  const grievance = await Grievance.findOneAndUpdate(
    { _id: grievanceId, tenantId },
    { $push: { [field]: { $each: stamped } } },
    { new: true }
  );

  if (grievance) {
    await appendLog({
      grievanceId,
      tenantId,
      eventType:   LogEventType.PHOTO_UPLOADED,
      actorId,
      description: `${stamped.length} photo(s) uploaded as ${field === 'resolutionPhotos' ? 'resolution proof' : 'attachments'}`,
      metadata:    { count: stamped.length, field },
    });
  }

  return grievance;
}

export async function setAIMetadata(
  grievanceId: string,
  tenantId: string,
  ai: IGrievance['aiMetadata'],
  dueAt: Date,
  departmentId: string,
  officerId: string,
  estimatedResolutionTime: string
): Promise<IGrievance | null> {
  const updateFields: any = {
    aiMetadata: ai,
    priority:   ai?.priority,
    slaRisk:    ai?.slaRisk,
    category:   ai?.suggestedCategory ?? 'general',
    dueAt,
    estimatedResolutionTime,
  };

  if (departmentId && Types.ObjectId.isValid(departmentId)) {
    updateFields.departmentId = new Types.ObjectId(departmentId);
  }
  if (officerId && Types.ObjectId.isValid(officerId)) {
    updateFields.assignedOfficerId = new Types.ObjectId(officerId);
  }

  return Grievance.findOneAndUpdate(
    { _id: grievanceId, tenantId },
    { $set: updateFields },
    { new: true }
  ).populate(CITIZEN_POPULATE);
}

export async function markSLABreached(
  grievanceId: string,
  tenantId: string
): Promise<IGrievance | null> {
  const grievance = await Grievance.findOneAndUpdate(
    { _id: grievanceId, tenantId },
    { $set: { status: GrievanceStatus.SLA_BREACHED, slaBreachedAt: new Date() } },
    { new: true }
  );

  if (grievance) {
    await appendLog({
      grievanceId,
      tenantId,
      eventType:   LogEventType.SLA_BREACHED,
      description: 'SLA deadline breached — complaint escalation pending',
    });
  }

  return grievance;
}

export async function escalateGrievance(
  grievanceId: string,
  tenantId: string,
  level: EscalationLevel
): Promise<IGrievance | null> {
  const grievance = await Grievance.findOneAndUpdate(
    { _id: grievanceId, tenantId },
    { $set: { isEscalated: true, escalationLevel: level, escalatedAt: new Date() } },
    { new: true }
  );

  if (grievance) {
    await appendLog({
      grievanceId,
      tenantId,
      eventType:   LogEventType.ESCALATED,
      description: `Escalated to ${level}`,
      metadata:    { level },
    });
  }

  return grievance;
}

export async function reopenGrievance(
  grievanceId: string,
  tenantId: string,
  citizenId: string,
  reason: string
): Promise<IGrievance | null> {
  const grievance = await Grievance.findOneAndUpdate(
    { _id: grievanceId, tenantId, submittedById: citizenId, canReopen: true },
    {
      $set: {
        status:     GrievanceStatus.REOPENED,
        canReopen:  false,
        resolvedAt: undefined,
      },
    },
    { new: true }
  ).populate(CITIZEN_POPULATE);

  if (grievance) {
    await appendLog({
      grievanceId,
      tenantId,
      eventType:   LogEventType.REOPENED,
      actorId:     citizenId,
      description: `Case re-opened by citizen: ${reason}`,
      metadata:    { reason },
    });
  }

  return grievance;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export async function submitFeedback(
  grievanceId: string,
  tenantId: string,
  citizenId: string,
  rating: number,
  comment?: string
): Promise<void> {
  // Upsert — idempotent
  await Feedback.findOneAndUpdate(
    { grievanceId },
    { grievanceId, tenantId, citizenId, rating, comment },
    { upsert: true, new: true }
  );

  await Grievance.findByIdAndUpdate(grievanceId, {
    $set: { feedbackRating: rating, feedbackComment: comment, feedbackAt: new Date() },
  });

  await appendLog({
    grievanceId,
    tenantId,
    eventType:   LogEventType.FEEDBACK_SUBMITTED,
    actorId:     citizenId,
    description: `Citizen rated resolution ${rating}/5`,
    metadata:    { rating, comment },
  });
}

// ─── Audit log helpers ────────────────────────────────────────────────────────

interface LogInput {
  grievanceId: string;
  tenantId: string;
  eventType: LogEventType;
  actorId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function appendLog(input: LogInput): Promise<void> {
  try {
    await GrievanceLog.create({
      grievanceId: new Types.ObjectId(input.grievanceId),
      tenantId:    new Types.ObjectId(input.tenantId),
      eventType:   input.eventType,
      actorId:     input.actorId ? new Types.ObjectId(input.actorId) : undefined,
      description: input.description,
      metadata:    input.metadata,
    });
  } catch (err) {
    logger.error('appendLog failed', err);
  }
}

export async function getGrievanceLogs(
  grievanceId: string,
  tenantId: string
) {
  return GrievanceLog.find({ grievanceId, tenantId })
    .sort({ createdAt: 1 })
    .populate({ path: 'actorId', select: 'name role' })
    .lean();
}

export async function getAuditLogs(
  tenantId: string,
  opts: {
    actorId?: string;
    eventType?: LogEventType;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }
) {
  const { actorId, eventType, from, to, page = 1, limit = 30 } = opts;
  const query: FilterQuery<typeof GrievanceLog> = {
    tenantId: new Types.ObjectId(tenantId),
  };
  if (actorId)    query.actorId   = new Types.ObjectId(actorId);
  if (eventType)  query.eventType = eventType;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to)   query.createdAt.$lte = to;
  }

  const [data, total] = await Promise.all([
    GrievanceLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'actorId', select: 'name role' })
      .lean(),
    GrievanceLog.countDocuments(query),
  ]);

  return { data, total };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalyticsSummary(tenantId: string, from?: Date, to?: Date, departmentId?: string) {
  const matchBase: FilterQuery<IGrievance> = { tenantId: new Types.ObjectId(tenantId) };
  if (from || to) {
    matchBase.createdAt = {};
    if (from) matchBase.createdAt.$gte = from;
    if (to)   matchBase.createdAt.$lte = to;
  }
  if (departmentId) matchBase.departmentId = new Types.ObjectId(departmentId);

  const [
    statusAgg,
    priorityAgg,
    deptAgg,
    categoryAgg,
    resolutionAgg,
    satisfactionAgg,
    timeSeriesAgg,
    breachCount,
    reopenCount,
    total,
  ] = await Promise.all([
    Grievance.aggregate([
      { $match: matchBase },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Grievance.aggregate([
      { $match: matchBase },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Grievance.aggregate([
      { $match: matchBase },
      { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$dept.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Grievance.aggregate([
      { $match: matchBase },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Grievance.aggregate([
      { $match: { ...matchBase, resolvedAt: { $exists: true } } },
      {
        $project: {
          resolutionHours: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3_600_000],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: '$resolutionHours' } } },
    ]),
    Feedback.aggregate([
      { $match: { tenantId: new Types.ObjectId(tenantId) } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]),
    Grievance.aggregate([
      { $match: matchBase },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          created: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [
                { $in: ['$status', [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED]] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]),
    Grievance.countDocuments({ ...matchBase, slaBreachedAt: { $exists: true } }),
    Grievance.countDocuments({ ...matchBase, status: GrievanceStatus.REOPENED }),
    Grievance.countDocuments(matchBase),
  ]);

  const byStatus = Object.fromEntries(statusAgg.map((a) => [a._id, a.count])) as Record<string, number>;
  const byPriority = Object.fromEntries(priorityAgg.map((a) => [a._id, a.count])) as Record<string, number>;

  return {
    total,
    byStatus,
    byPriority,
    byDepartment: deptAgg.map((a) => ({ department: a._id ?? 'Unassigned', count: a.count })),
    byCategory:   categoryAgg.map((a) => ({ category: a._id ?? 'general', count: a.count })),
    slaBreachCount: breachCount,
    slaBreachRate:  total > 0 ? Math.round((breachCount / total) * 100) : 0,
    avgResolutionHours: Math.round(resolutionAgg[0]?.avg ?? 0),
    reopenRate:  total > 0 ? Math.round((reopenCount / total) * 100) : 0,
    avgSatisfactionRating: Math.round((satisfactionAgg[0]?.avg ?? 0) * 10) / 10,
    timeSeries:  timeSeriesAgg.map((a) => ({ date: a._id, created: a.created, resolved: a.resolved })),
  };
}

// ─── Critical zone detection ──────────────────────────────────────────────────

export async function detectCriticalZones(
  tenantId: string,
  threshold: number,
  windowHours: number
) {
  const since = new Date(Date.now() - windowHours * 3_600_000);

  const zones = await Grievance.aggregate([
    {
      $match: {
        tenantId:  new Types.ObjectId(tenantId),
          // Treat MEDIUM+HIGH+CRITICAL as "high activity" for hot zone detection.
          // This ensures wards with frequent complaints (even if AI assigns MEDIUM)
          // still show up as red hot zones on the map.
          priority:  { $in: [Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL] },
        status:    { $nin: [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED, GrievanceStatus.REJECTED] },
        createdAt: { $gte: since },
        $or: [
          { 'location.ward': { $exists: true, $ne: '' } },
          { 'location.geo.coordinates': { $exists: true, $type: 'array', $not: { $size: 0 } } },
        ],
      },
    },
    {
      // wardKey = ward if present, otherwise coarse geospatial bin for "same location" heat.
      $addFields: {
        wardKey: {
          $cond: [
            { $and: [
              { $ne: ['$location.ward', null] },
              { $ne: ['$location.ward', ''] },
            ]},
            '$location.ward',
            {
              $concat: [
                'HotSpot-',
                { $toString: { $round: [{ $arrayElemAt: ['$location.geo.coordinates', 0] }, 2] } },
                '-',
                { $toString: { $round: [{ $arrayElemAt: ['$location.geo.coordinates', 1] }, 2] } },
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id:          '$wardKey',
        count:        { $sum: 1 },
        topCategory:  { $first: '$category' },
        grievanceIds: { $push: '$_id' },
      },
    },
    { $match: { count: { $gte: threshold } } },
    { $sort: { count: -1 } },
  ]);

  return zones.map((z) => ({
    ward:         z._id as string,
    count:        z.count as number,
    threshold,
    topCategory:  z.topCategory as string,
    grievanceIds: z.grievanceIds as Types.ObjectId[],
    detectedAt:   new Date(),
  }));
}

// ─── Officer workload (for auto-assignment) ───────────────────────────────────

export async function getOfficerWorkloads(
  tenantId: string,
  departmentId: string
): Promise<Array<{ officerId: string; activeCount: number }>> {
  const activeStatuses = [
    GrievanceStatus.NEW,
    GrievanceStatus.ACCEPTED,
    GrievanceStatus.IN_PROGRESS,
    GrievanceStatus.REOPENED,
  ];

  const result = await Grievance.aggregate([
    {
      $match: {
        tenantId:     new Types.ObjectId(tenantId),
        departmentId: new Types.ObjectId(departmentId),
        status:       { $in: activeStatuses },
        assignedOfficerId: { $exists: true },
      },
    },
    {
      $group: {
        _id:         '$assignedOfficerId',
        activeCount: { $sum: 1 },
      },
    },
  ]);

  return result.map((r) => ({
    officerId:   r._id.toString(),
    activeCount: r.activeCount,
  }));
}

// ─── Officer performance ──────────────────────────────────────────────────────

export async function getOfficerPerformance(officerId: string, tenantId: string) {
  const [resolved, slaAgg, avgAgg] = await Promise.all([
    Grievance.countDocuments({
      tenantId,
      assignedOfficerId: new Types.ObjectId(officerId),
      status: { $in: [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED] },
    }),
    Grievance.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          assignedOfficerId: new Types.ObjectId(officerId),
          resolvedAt: { $exists: true },
          dueAt:      { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          slaHit:  { $sum: { $cond: [{ $lte: ['$resolvedAt', '$dueAt'] }, 1, 0] } },
          slaMiss: { $sum: { $cond: [{ $gt:  ['$resolvedAt', '$dueAt'] }, 1, 0] } },
        },
      },
    ]),
    Grievance.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          assignedOfficerId: new Types.ObjectId(officerId),
          resolvedAt: { $exists: true },
        },
      },
      {
        $project: {
          hours: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3_600_000] },
        },
      },
      { $group: { _id: null, avg: { $avg: '$hours' } } },
    ]),
  ]);

  return {
    resolved,
    slaHit:   slaAgg[0]?.slaHit  ?? 0,
    slaMiss:  slaAgg[0]?.slaMiss ?? 0,
    avgHours: Math.round(avgAgg[0]?.avg ?? 0),
  };
}


// ─── Officer leaderboard (all officers in tenant) ─────────────────────────────

export async function getOfficerLeaderboard(tenantId: string) {
  const results = await Grievance.aggregate([
    { $match: { tenantId: new Types.ObjectId(tenantId) } },
    {
      $group: {
        _id: '$assignedOfficerId',
        total:    { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', ['RESOLVED', 'CLOSED']] }, 1, 0] } },
        slaHit:   { $sum: { $cond: [
          { $and: [
            { $ifNull: ['$resolvedAt', false] },
            { $lte: ['$resolvedAt', '$dueAt'] },
          ]}, 1, 0,
        ]}},
        slaMiss: { $sum: { $cond: [
          { $and: [
            { $ifNull: ['$resolvedAt', false] },
            { $gt: ['$resolvedAt', '$dueAt'] },
          ]}, 1, 0,
        ]}},
        avgHoursSum: { $sum: { $cond: [
          { $ifNull: ['$resolvedAt', false] },
          { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3_600_000] },
          0,
        ]}},
        avgHoursCount: { $sum: { $cond: [{ $ifNull: ['$resolvedAt', false] }, 1, 0] } },
        active:   { $sum: { $cond: [
          { $in: ['$status', ['NEW', 'ACCEPTED', 'IN_PROGRESS', 'REOPENED']] }, 1, 0,
        ]}},
        breached: { $sum: { $cond: [{ $eq: ['$status', 'SLA_BREACHED'] }, 1, 0] } },
        ratings:  { $push: { $ifNull: ['$feedbackRating', null] } },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'officer',
      },
    },
    { $unwind: { path: '$officer', preserveNullAndEmptyArrays: false } },
    {
      $project: {
        officerId:    '$_id',
        name:         '$officer.name',
        email:        '$officer.email',
        role:         '$officer.role',
        departmentId: '$officer.departmentId',
        total:    1,
        resolved: 1,
        active:   1,
        breached: 1,
        slaHit:   1,
        slaMiss:  1,
        avgHours: {
          $cond: [
            { $gt: ['$avgHoursCount', 0] },
            { $round: [{ $divide: ['$avgHoursSum', '$avgHoursCount'] }, 0] },
            0,
          ],
        },
        resolutionRate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $round: [{ $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }, 1] },
            0,
          ],
        },
        slaRate: {
          $cond: [
            { $gt: [{ $add: ['$slaHit', '$slaMiss'] }, 0] },
            { $round: [{ $multiply: [{ $divide: ['$slaHit', { $add: ['$slaHit', '$slaMiss'] }] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    { $sort: { resolutionRate: -1, resolved: -1 } },
  ]);

  // Populate department names
  await Grievance.db.model('Department')
    .populate(results, { path: 'departmentId', select: 'name' })
    .catch(() => {});

  return results.map((r: any, i: number) => ({
    ...r,
    rank: i + 1,
    departmentName: r.departmentId?.name ?? 'General',
  }));
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export async function exportGrievancesCSV(
  filter: GrievanceFilter
): Promise<IGrievance[]> {
  const { data } = await listGrievances({ ...filter, limit: 5000, page: 1 });
  return data;
}

// ─── Duplicate detection (same ward) ─────────────────────────────────────────

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds an "already filed" grievance in the same ward by combining:
 * - exact ward match (case-insensitive)
 * - active statuses
 * - optional category match (AI suggested category)
 * - text similarity on title/description
 */
export async function findSimilarGrievanceInWard(opts: {
  tenantId: string;
  ward?: string;
  title: string;
  description: string;
  suggestedCategory?: string;
}): Promise<IGrievance | null> {
  const { tenantId, ward, title, description, suggestedCategory } = opts;

  const wardNorm = ward?.trim();
  if (!wardNorm) return null;

  // Ward input is often "Ward 7", while stored values might vary in spacing/case.
  // We treat it as a "same ward" match if it matches exactly OR if it contains the same ward number.
  const wardNumber = wardNorm.match(/\d+/)?.[0];
  const wardRegex = wardNumber
    ? new RegExp(`^(?:${escapeRegExp(wardNorm)}|.*\\b${escapeRegExp(wardNumber)}\\b.*)$`, 'i')
    : new RegExp(`^${escapeRegExp(wardNorm)}$`, 'i');

  const baseMatch: FilterQuery<IGrievance> = {
    tenantId: new Types.ObjectId(tenantId),
    'location.ward': wardRegex,
    // Prevent duplicate workload by matching any non-rejected grievance in the same ward.
    status: { $nin: [GrievanceStatus.REJECTED] },
  };

  const text = `${title ?? ''} ${description ?? ''}`.trim();
  const words = (text || '')
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3)
    .slice(0, 12);

  async function findByRegex(extraMatch: FilterQuery<IGrievance>): Promise<IGrievance | null> {
    if (!words.length) return null;
    const orClauses: any[] = [];

    const fullTitle = String(title ?? '').trim();
    if (fullTitle.length >= 6) {
      // Try to match the entire title phrase first.
      orClauses.push({ title: { $regex: new RegExp(escapeRegExp(fullTitle), 'i') } });
    }
    for (const w of words) {
      const r = new RegExp(escapeRegExp(w), 'i');
      orClauses.push({ title: { $regex: r } });
      orClauses.push({ description: { $regex: r } });
    }

    const match: FilterQuery<IGrievance> = {
      ...baseMatch,
      ...extraMatch,
      $or: orClauses,
    };

    const doc = await Grievance.findOne(match).sort({ createdAt: -1 }).lean();
    return (doc as unknown as IGrievance) || null;
  }

  async function tryQuery(extraMatch: FilterQuery<IGrievance>) {
    const match = { ...baseMatch, ...extraMatch } as FilterQuery<IGrievance>;
    const pipeline: any[] = [{ $match: match }];

    if (text) {
      pipeline.push({ $addFields: { textScore: { $meta: 'textScore' } } });
      pipeline.push({ $sort: { textScore: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({ $limit: 1 });

    // $text requires explicitly including it in the match stage
    if (text) {
      pipeline[0] = {
        $match: {
          ...match,
          ...(text ? { $text: { $search: text } } : {}),
        },
      };
    }

    try {
      const docs = await Grievance.aggregate(pipeline);
      return docs[0] ? (docs[0] as IGrievance) : null;
    } catch (err) {
      // If the $text index isn't available yet, fallback to a safer regex match.
      return findByRegex(extraMatch);
    }
  }

  // 1) Category + text similarity
  if (suggestedCategory) {
    const byCategory = await tryQuery({ category: suggestedCategory });
    if (byCategory) return byCategory;
  }

  // 2) Text similarity only
  return tryQuery({});
}

// ─── Citizen support (reduce duplicate workload) ────────────────────────────

export async function addSupportToGrievance(
  grievanceId: string,
  tenantId: string,
  citizenId: string
): Promise<{ ticketNumber: string; added: boolean } | null> {
  const userObjId = new Types.ObjectId(citizenId);
  const tenantObjId = new Types.ObjectId(tenantId);

  const grievance = await Grievance.findOne({ _id: grievanceId, tenantId });
  if (!grievance) return null;

  const alreadySupported = (grievance.supporters ?? []).some((id) => id.toString() === userObjId.toString());

  const updated = await Grievance.findOneAndUpdate(
    { _id: grievanceId, tenantId },
    { $addToSet: { supporters: userObjId } },
    { new: true }
  );

  if (!updated) return null;

  await appendLog({
    grievanceId,
    tenantId: tenantObjId.toString(),
    eventType: LogEventType.SUPPORT_ADDED,
    actorId: citizenId,
    description: alreadySupported
      ? 'Citizen supported complaint (already supported)'
      : 'Citizen supported complaint',
  });

  return { ticketNumber: updated.ticketNumber, added: !alreadySupported };
}

// ─── Delete grievance (citizen + admin) ───────────────────────────────────────

export async function deleteGrievance(opts: {
  grievanceId: string;
  tenantId: string;
  citizenId?: string; // if provided, delete only if submittedById matches
}): Promise<boolean> {
  const { grievanceId, tenantId, citizenId } = opts;

  const match: FilterQuery<IGrievance> = {
    _id: new Types.ObjectId(grievanceId),
    tenantId: new Types.ObjectId(tenantId),
  };
  if (citizenId) {
    match.submittedById = new Types.ObjectId(citizenId);
  }

  const exists = await Grievance.exists(match);
  if (!exists) return false;

  await Promise.all([
    Feedback.deleteMany({ grievanceId: new Types.ObjectId(grievanceId), tenantId: new Types.ObjectId(tenantId) }),
    GrievanceLog.deleteMany({ grievanceId: new Types.ObjectId(grievanceId), tenantId: new Types.ObjectId(tenantId) }),
    Grievance.deleteOne({ _id: new Types.ObjectId(grievanceId), tenantId: new Types.ObjectId(tenantId) }),
  ]);

  return true;
}