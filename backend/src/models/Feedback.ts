import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IFeedback extends Document {
  grievanceId: Types.ObjectId;
  tenantId:    Types.ObjectId;
  citizenId:   Types.ObjectId;
  rating:      number;       // 1–5
  comment?:    string;
  createdAt:   Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    grievanceId: { type: Schema.Types.ObjectId, ref: 'Grievance', required: true, unique: true },
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant',    required: true },
    citizenId:   { type: Schema.Types.ObjectId, ref: 'User',      required: true },
    rating:      { type: Number, required: true, min: 1, max: 5 },
    comment:     { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FeedbackSchema.index({ tenantId: 1 });
FeedbackSchema.index({ tenantId: 1, citizenId: 1 });

export const Feedback: Model<IFeedback> = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
