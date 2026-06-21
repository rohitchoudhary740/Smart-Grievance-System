// ─── Enums (mirrored from backend) ───────────────────────────────────────────

export enum UserRole {
  CITIZEN   = 'CITIZEN',
  OFFICER   = 'OFFICER',
  DEPT_HEAD = 'DEPT_HEAD',
  ADMIN     = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum GrievanceStatus {
  NEW         = 'NEW',
  ACCEPTED    = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED    = 'RESOLVED',
  CLOSED      = 'CLOSED',
  REJECTED    = 'REJECTED',
  REOPENED    = 'REOPENED',
  SLA_BREACHED = 'SLA_BREACHED',
}

export enum Priority {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SLARisk {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
}

export enum LogEventType {
  CREATED          = 'CREATED',
  STATUS_CHANGED   = 'STATUS_CHANGED',
  ASSIGNED         = 'ASSIGNED',
  REASSIGNED       = 'REASSIGNED',
  REMARK_ADDED     = 'REMARK_ADDED',
  PHOTO_UPLOADED   = 'PHOTO_UPLOADED',
  SUPPORT_ADDED    = 'SUPPORT_ADDED',
  SLA_BREACHED     = 'SLA_BREACHED',
  ESCALATED        = 'ESCALATED',
  FEEDBACK_SUBMITTED = 'FEEDBACK_SUBMITTED',
  REOPENED         = 'REOPENED',
  CLOSED           = 'CLOSED',
}

// ─── Domain models ────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  department?: Department;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  _id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  categories: string[];
  headUserId?: string;
  slaConfigs: SLAConfig[];
  isActive: boolean;
}

export interface SLAConfig {
  categorySlug: string;
  resolutionHours: number;
  escalationHours: number;
  collectorEscalationHours: number;
}

export interface AIMetadata {
  suggestedCategory: string;
  suggestedDepartmentName: string;
  priority: Priority;
  slaRisk: SLARisk;
  summary: string;
  confidence: number;
  language: string;
  processedAt: string;
}

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface Attachment {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Grievance {
  _id: string;
  tenantId: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  status: GrievanceStatus;
  priority: Priority;
  slaRisk: SLARisk;
  location: {
    address: string;
    ward?: string;
    geo?: GeoLocation;
  };
  submittedById: string;
  submittedBy?: Pick<User, '_id' | 'name' | 'email'>;
  departmentId?: string;
  department?: Pick<Department, '_id' | 'name' | 'slug'>;
  assignedOfficerId?: string;
  assignedOfficer?: Pick<User, '_id' | 'name' | 'email' | 'phone' | 'role'>;
  aiMetadata?: AIMetadata;
  attachments: Attachment[];
  resolutionPhotos: Attachment[];
  remarks: string;
  estimatedResolutionTime?: string;
  dueAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaBreachedAt?: string;
  escalationLevel?: string;
  isEscalated: boolean;
  feedbackRating?: number;
  feedbackComment?: string;
  feedbackAt?: string;
  canReopen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GrievanceLog {
  _id: string;
  grievanceId: string;
  tenantId: string;
  eventType: LogEventType;
  actorId?: string;
  actor?: Pick<User, '_id' | 'name' | 'role'>;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Feedback {
  _id: string;
  grievanceId: string;
  citizenId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total: number;
  byStatus: Record<GrievanceStatus, number>;
  byPriority: Record<Priority, number>;
  byDepartment: Array<{ department: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  slaBreachCount: number;
  slaBreachRate: number;
  avgResolutionHours: number;
  reopenRate: number;
  avgSatisfactionRating: number;
  timeSeries: Array<{ date: string; created: number; resolved: number }>;
}

export interface CriticalZone {
  ward: string;
  count: number;
  threshold: number;
  topCategory: string;
  grievanceIds: string[];
  detectedAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  departmentId?: string;
  tenant?: Pick<Tenant, '_id' | 'name' | 'slug' | 'logoUrl' | 'primaryColor'>;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ─── API wrappers ─────────────────────────────────────────────────────────────

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

// ─── Filter/Query params ──────────────────────────────────────────────────────

export interface GrievanceFilters {
  status?: GrievanceStatus;
  priority?: Priority;
  departmentId?: string;
  category?: string;
  slaRisk?: SLARisk;
  isEscalated?: boolean;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ─── Socket events ────────────────────────────────────────────────────────────

export enum SocketEvent {
  GRIEVANCE_CREATED  = 'grievance:created',
  GRIEVANCE_UPDATED  = 'grievance:updated',
  GRIEVANCE_ASSIGNED = 'grievance:assigned',
  SLA_BREACHED       = 'sla:breached',
  CRITICAL_ZONE      = 'alert:critical_zone',
  ESCALATION         = 'alert:escalation',
}
