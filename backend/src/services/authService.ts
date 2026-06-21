import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload, UserRole } from '../types';
import { IUser } from '../models/User';

const SALT_ROUNDS = 12;

// ─── Password ─────────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
}

export function buildTokenPayload(user: IUser): JWTPayload {
  return {
    userId:       user._id.toString(),
    tenantId:     user.tenantId.toString(),
    role:         user.role as UserRole,
    departmentId: user.departmentId?.toString(),
  };
}

// ─── Safe user shape (no passwordHash) ───────────────────────────────────────

export function safeUser(user: IUser, tenant?: { name: string; slug: string; logoUrl?: string; primaryColor?: string }) {
  return {
    _id:          user._id.toString(),
    name:         user.name,
    email:        user.email,
    role:         user.role,
    tenantId:     user.tenantId.toString(),
    departmentId: user.departmentId?.toString(),
    phone:        user.phone,
    isActive:     user.isActive,
    createdAt:    user.createdAt,
    tenant,
  };
}
