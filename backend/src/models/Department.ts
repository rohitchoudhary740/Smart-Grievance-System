import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISLAConfig {
  categorySlug: string;
  resolutionHours: number;
  escalationHours: number;        // hours after breach → escalate to dept head
  collectorEscalationHours: number; // hours after dept head → escalate to collector
}

export interface IDepartment extends Document {
  tenantId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  categories: string[];           // list of category slugs this dept handles
  headUserId?: Types.ObjectId;    // DEPT_HEAD user
  slaConfigs: ISLAConfig[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SLAConfigSchema = new Schema<ISLAConfig>(
  {
    categorySlug:              { type: String, required: true, lowercase: true, trim: true },
    resolutionHours:           { type: Number, required: true, min: 1 },
    escalationHours:           { type: Number, required: true, min: 1 },
    collectorEscalationHours:  { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const DepartmentSchema = new Schema<IDepartment>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    categories:  [{ type: String, lowercase: true, trim: true }],
    headUserId:  { type: Schema.Types.ObjectId, ref: 'User' },
    slaConfigs:  [SLAConfigSchema],
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
DepartmentSchema.index({ tenantId: 1, isActive: 1 });

export const Department: Model<IDepartment> = mongoose.model<IDepartment>('Department', DepartmentSchema);
