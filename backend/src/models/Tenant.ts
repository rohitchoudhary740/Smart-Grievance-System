import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;               // URL-safe unique identifier, e.g. "demo-city"
  logoUrl?: string;
  primaryColor?: string;      // hex for white-labelling
  isActive: boolean;
  settings: {
    criticalZoneThreshold: number;   // complaints in a ward before zone alert fires
    criticalZoneWindowHours: number; // rolling window for zone detection
    reopenWindowHours: number;       // how long citizen can reopen after resolution
    maxAttachments: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name:         { type: String, required: true, trim: true },
    slug:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl:      { type: String },
    primaryColor: { type: String, default: '#4f61f7' },
    isActive:     { type: Boolean, default: true },
    settings: {
      criticalZoneThreshold:   { type: Number, default: 5 },
      criticalZoneWindowHours: { type: Number, default: 24 },
      reopenWindowHours:       { type: Number, default: 72 },
      maxAttachments:          { type: Number, default: 5 },
    },
  },
  { timestamps: true }
);

TenantSchema.index({ slug: 1 }, { unique: true });

export const Tenant: Model<ITenant> = mongoose.model<ITenant>('Tenant', TenantSchema);
