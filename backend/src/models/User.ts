import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  tenantId: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  departmentId?: Types.ObjectId;  // set for OFFICER and DEPT_HEAD
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },  // never returned by default
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CITIZEN,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    phone:        { type: String, trim: true },
    avatar:       { type: String },
    isActive:     { type: Boolean, default: true },
    lastLoginAt:  { type: Date },
  },
  { timestamps: true }
);

// Composite unique index — same email can exist in different tenants
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1, isActive: 1 });
UserSchema.index({ tenantId: 1, departmentId: 1, role: 1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
