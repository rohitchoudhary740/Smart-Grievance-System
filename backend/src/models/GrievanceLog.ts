import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { LogEventType } from '../types';

export interface IGrievanceLog extends Document {
  grievanceId: Types.ObjectId;
  tenantId:    Types.ObjectId;
  eventType:   LogEventType;
  actorId?:    Types.ObjectId;       // undefined for system events
  description: string;
  metadata?:   Record<string, unknown>; // arbitrary event-specific data
  createdAt:   Date;
}

const GrievanceLogSchema = new Schema<IGrievanceLog>(
  {
    grievanceId: { type: Schema.Types.ObjectId, ref: 'Grievance', required: true },
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant',    required: true },
    eventType: {
      type:     String,
      enum:     Object.values(LogEventType),
      required: true,
    },
    actorId:     { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, required: true },
    metadata:    { type: Schema.Types.Mixed },
  },
  {
    // No updatedAt — this collection is append-only
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Append-only enforcement at schema level
GrievanceLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function () {
  throw new Error('GrievanceLog is append-only. Use .create() or .insertMany().');
});

// Indexes for timeline queries and admin audit log
GrievanceLogSchema.index({ grievanceId: 1, createdAt: 1 });
GrievanceLogSchema.index({ tenantId: 1, eventType: 1, createdAt: -1 });
GrievanceLogSchema.index({ tenantId: 1, actorId: 1, createdAt: -1 });

export const GrievanceLog: Model<IGrievanceLog> = mongoose.model<IGrievanceLog>(
  'GrievanceLog',
  GrievanceLogSchema
);
