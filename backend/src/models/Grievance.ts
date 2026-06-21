import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { GrievanceStatus, Priority, SLARisk, EscalationLevel } from '../types';

export interface IAttachment {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
}

export interface IAIMetadata {
  suggestedCategory: string;
  suggestedDepartmentName: string;
  priority: Priority;
  slaRisk: SLARisk;
  summary: string;
  confidence: number;
  language: string;
  processedAt: Date;
}

export interface IGrievance extends Document {
  tenantId: Types.ObjectId;
  ticketNumber: string;           // human-readable, e.g. GRV-2024-00042

  // Core fields
  title: string;
  description: string;
  category: string;
  status: GrievanceStatus;
  priority: Priority;
  slaRisk: SLARisk;

  // Location
  location: {
    address: string;
    ward?: string;
    geo?: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    };
  };

  // Actors
  submittedById: Types.ObjectId;
  departmentId?: Types.ObjectId;
  assignedOfficerId?: Types.ObjectId;

  // AI
  aiMetadata?: IAIMetadata;

  // Files
  attachments: IAttachment[];
  resolutionPhotos: IAttachment[];

  // Officer notes
  remarks: string;

  // SLA
  estimatedResolutionTime?: string; // human-readable string
  dueAt?: Date;
  slaBreachedAt?: Date;

  // Escalation
  isEscalated: boolean;
  escalationLevel?: EscalationLevel;
  escalatedAt?: Date;

  // Resolution / closure
  resolvedAt?: Date;
  closedAt?: Date;

  // Feedback
  feedbackRating?: number;
  feedbackComment?: string;
  feedbackAt?: Date;
  canReopen: boolean;

  // Citizen support (to reduce duplicate workload)
  supporters: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    url:        { type: String, required: true },
    filename:   { type: String, required: true },
    mimetype:   { type: String, required: true },
    size:       { type: Number, required: true },
    uploadedAt: { type: Date,   default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const AIMetadataSchema = new Schema<IAIMetadata>(
  {
    suggestedCategory:       { type: String },
    suggestedDepartmentName: { type: String },
    priority:    { type: String, enum: Object.values(Priority) },
    slaRisk:     { type: String, enum: Object.values(SLARisk) },
    summary:     { type: String },
    confidence:  { type: Number, min: 0, max: 1 },
    language:    { type: String },
    processedAt: { type: Date },
  },
  { _id: false }
);

const GrievanceSchema = new Schema<IGrievance>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ticketNumber: { type: String, required: true },

    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category:    { type: String, default: 'general', lowercase: true, trim: true },
    status: {
      type: String,
      enum: Object.values(GrievanceStatus),
      default: GrievanceStatus.NEW,
    },
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.MEDIUM,
    },
    slaRisk: {
      type: String,
      enum: Object.values(SLARisk),
      default: SLARisk.LOW,
    },

    location: {
      address: { type: String, required: true, trim: true },
      ward:    { type: String, trim: true },
      geo: {
        type:        { type: String, enum: ['Point'] },
        coordinates: { type: [Number] },      // [lng, lat]
      },
    },

    submittedById:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId:     { type: Schema.Types.ObjectId, ref: 'Department' },
    assignedOfficerId:{ type: Schema.Types.ObjectId, ref: 'User' },

    aiMetadata:      AIMetadataSchema,
    attachments:     [AttachmentSchema],
    resolutionPhotos:[AttachmentSchema],
    remarks:         { type: String, default: '' },

    estimatedResolutionTime: { type: String },
    dueAt:          { type: Date },
    slaBreachedAt:  { type: Date },

    isEscalated:    { type: Boolean, default: false },
    escalationLevel:{ type: String, enum: Object.values(EscalationLevel) },
    escalatedAt:    { type: Date },

    resolvedAt: { type: Date },
    closedAt:   { type: Date },

    feedbackRating:  { type: Number, min: 1, max: 5 },
    feedbackComment: { type: String },
    feedbackAt:      { type: Date },
    canReopen:       { type: Boolean, default: false },

    supporters:      [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  {
    timestamps: true,
    // Optimistic concurrency for status transitions
    optimisticConcurrency: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
GrievanceSchema.index({ tenantId: 1, status: 1 });
GrievanceSchema.index({ tenantId: 1, assignedOfficerId: 1, status: 1 });
GrievanceSchema.index({ tenantId: 1, departmentId: 1, status: 1 });
GrievanceSchema.index({ tenantId: 1, submittedById: 1 });
GrievanceSchema.index({ tenantId: 1, priority: 1, status: 1 });
GrievanceSchema.index({ tenantId: 1, dueAt: 1, status: 1 });
GrievanceSchema.index({ tenantId: 1, 'location.ward': 1, priority: 1 });
GrievanceSchema.index({ ticketNumber: 1 }, { unique: true });

// Geospatial index — only created when geo is present
GrievanceSchema.index({ 'location.geo': '2dsphere' }, { sparse: true });

// Text search across title, description, location
GrievanceSchema.index(
  { title: 'text', description: 'text', 'location.address': 'text' },
  { weights: { title: 10, description: 5, 'location.address': 3 } }
);

// ── Ticket number auto-generation ─────────────────────────────────────────────
// Uses an atomic counter per tenant + year to avoid duplicate ticketNumber under concurrency.
const GrievanceCounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    year:     { type: Number, required: true },
    seq:      { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

GrievanceCounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export interface IGrievanceCounter extends Document {
  tenantId: Types.ObjectId;
  year: number;
  seq: number;
}

const GrievanceCounter =
  (mongoose.models['GrievanceCounter'] as Model<IGrievanceCounter> | undefined) ??
  mongoose.model<IGrievanceCounter>('GrievanceCounter', GrievanceCounterSchema);

GrievanceSchema.pre('validate', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    // If we introduced the counter after older GRVs already exist,
    // we must initialize the counter to avoid reusing existing ticketNumber values.
    // Since the numeric portion is zero-padded, sorting by ticketNumber desc gives the max seq.
    const latest = await Grievance.findOne(
      {
        tenantId: this.tenantId,
        ticketNumber: { $regex: `^GRV-${year}-\\d{5}$` },
      },
      { ticketNumber: 1 }
    )
      .sort({ ticketNumber: -1 })
      .lean();

    const maxSeq =
      latest?.ticketNumber ? parseInt(String(latest.ticketNumber).split('-')[2] ?? '0', 10) : 0;

    // Atomic counter increment without conflicting updates to `seq`.
    // Uses an update pipeline so we can safely handle the upsert case:
    // - if `seq` doesn't exist yet, start from maxSeq
    // - then increment by 1
    const counter = await GrievanceCounter.findOneAndUpdate(
      { tenantId: this.tenantId, year },
      [
        {
          $set: {
            tenantId: this.tenantId,
            year,
            // Always move forward past existing maxSeq:
            // seq = max(existingSeq, maxSeq) + 1
            seq: { $add: [{ $max: [{ $ifNull: ['$seq', 0] }, maxSeq] }, 1] },
          },
        },
      ],
      { new: true, upsert: true }
    );

    this.ticketNumber = `GRV-${year}-${String(counter?.seq ?? (maxSeq + 1)).padStart(5, '0')}`;
  }
  next();
});

export const Grievance: Model<IGrievance> = mongoose.model<IGrievance>('Grievance', GrievanceSchema);