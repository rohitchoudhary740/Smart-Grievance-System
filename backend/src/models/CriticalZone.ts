import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICriticalZone extends Document {
  tenantId:     Types.ObjectId;
  ward:         string;
  count:        number;
  threshold:    number;
  topCategory:  string;
  grievanceIds: Types.ObjectId[];
  detectedAt:   Date;
  resolvedAt?:  Date;
  isActive:     boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

const CriticalZoneSchema = new Schema<ICriticalZone>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ward:         { type: String, required: true, trim: true },
    count:        { type: Number, required: true },
    threshold:    { type: Number, required: true },
    topCategory:  { type: String, required: true },
    grievanceIds: [{ type: Schema.Types.ObjectId, ref: 'Grievance' }],
    detectedAt:   { type: Date, required: true },
    resolvedAt:   { type: Date },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

CriticalZoneSchema.index({ tenantId: 1, isActive: 1 });
CriticalZoneSchema.index({ tenantId: 1, ward: 1, isActive: 1 });

export const CriticalZone: Model<ICriticalZone> = mongoose.model<ICriticalZone>(
  'CriticalZone',
  CriticalZoneSchema
);
