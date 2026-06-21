// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  CITIZEN = 'CITIZEN',
  OFFICER = 'OFFICER',
  DEPT_HEAD = 'DEPT_HEAD',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum GrievanceStatus {
  NEW = 'NEW',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REJECTED = 'REJECTED',
  REOPENED = 'REOPENED',
  SLA_BREACHED = 'SLA_BREACHED',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SLARisk {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum LogEventType {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  REASSIGNED = 'REASSIGNED',
  REMARK_ADDED = 'REMARK_ADDED',
  PHOTO_UPLOADED = 'PHOTO_UPLOADED',
  SUPPORT_ADDED = 'SUPPORT_ADDED',
  SLA_BREACHED = 'SLA_BREACHED',
  ESCALATED = 'ESCALATED',
  FEEDBACK_SUBMITTED = 'FEEDBACK_SUBMITTED',
  REOPENED = 'REOPENED',
  CLOSED = 'CLOSED',
}

export enum EscalationLevel {
  OFFICER = 'OFFICER',
  DEPT_HEAD = 'DEPT_HEAD',
  COLLECTOR = 'COLLECTOR',
}

// ─── AI Metadata ──────────────────────────────────────────────────────────────

export interface AIMetadata {
  suggestedCategory: string;
  suggestedDepartmentName: string;
  priority: Priority;
  slaRisk: SLARisk;
  summary: string;
  confidence: number; // 0–1
  language: string;   // detected language
  processedAt: Date;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface LocationInput {
  address: string;
  ward?: string;
  lat?: number;
  lng?: number;
}

// ─── SLA Config ───────────────────────────────────────────────────────────────

export interface SLAConfig {
  categorySlug: string;
  resolutionHours: number;        // target hours to resolve
  escalationHours: number;        // hours after breach before escalating to dept head
  collectorEscalationHours: number; // hours after dept head before collector
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  departmentId?: string;
  iat?: number;
  exp?: number;
}

// ─── Express Augmentation ────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Socket Events ───────────────────────────────────────────────────────────

export enum SocketEvent {
  GRIEVANCE_CREATED = 'grievance:created',
  GRIEVANCE_UPDATED = 'grievance:updated',
  GRIEVANCE_ASSIGNED = 'grievance:assigned',
  SLA_BREACHED = 'sla:breached',
  CRITICAL_ZONE = 'alert:critical_zone',
  ESCALATION = 'alert:escalation',
}
