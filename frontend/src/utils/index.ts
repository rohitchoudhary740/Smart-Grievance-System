import { formatDistanceToNow, format, differenceInHours, parseISO } from 'date-fns';
import { GrievanceStatus, Priority, SLARisk, UserRole, LogEventType } from '../types';

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, {
    addSuffix: true,
  });
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  return format(typeof date === 'string' ? parseISO(date) : date, fmt);
}

export function formatDateTime(date: string | Date): string {
  return format(typeof date === 'string' ? parseISO(date) : date, 'dd MMM yyyy, HH:mm');
}

// ─── SLA helpers ──────────────────────────────────────────────────────────────

export type SLAStatus = 'ok' | 'warning' | 'breach';

export function getSLAStatus(dueAt?: string): SLAStatus {
  if (!dueAt) return 'ok';
  const hoursLeft = differenceInHours(parseISO(dueAt), new Date());
  if (hoursLeft < 0) return 'breach';
  if (hoursLeft < 4) return 'warning';
  return 'ok';
}

export function formatSLATimer(dueAt?: string): string {
  if (!dueAt) return '—';
  const hoursLeft = differenceInHours(parseISO(dueAt), new Date());
  if (hoursLeft < 0) return `${Math.abs(hoursLeft)}h overdue`;
  if (hoursLeft < 24) return `${hoursLeft}h left`;
  const days = Math.floor(hoursLeft / 24);
  const hrs = hoursLeft % 24;
  return hrs > 0 ? `${days}d ${hrs}h left` : `${days}d left`;
}

// ─── Status display ───────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<GrievanceStatus, string> = {
  [GrievanceStatus.NEW]:          'New',
  [GrievanceStatus.ACCEPTED]:     'Accepted',
  [GrievanceStatus.IN_PROGRESS]:  'In Progress',
  [GrievanceStatus.RESOLVED]:     'Resolved',
  [GrievanceStatus.CLOSED]:       'Closed',
  [GrievanceStatus.REJECTED]:     'Rejected',
  [GrievanceStatus.REOPENED]:     'Re-opened',
  [GrievanceStatus.SLA_BREACHED]: 'SLA Breached',
};

export const STATUS_COLOR: Record<GrievanceStatus, string> = {
  [GrievanceStatus.NEW]:          'bg-indigo-100 text-indigo-700',
  [GrievanceStatus.ACCEPTED]:     'bg-sky-100 text-sky-700',
  [GrievanceStatus.IN_PROGRESS]:  'bg-amber-100 text-amber-700',
  [GrievanceStatus.RESOLVED]:     'bg-green-100 text-green-700',
  [GrievanceStatus.CLOSED]:       'bg-gray-100 text-gray-600',
  [GrievanceStatus.REJECTED]:     'bg-red-100 text-red-700',
  [GrievanceStatus.REOPENED]:     'bg-orange-100 text-orange-700',
  [GrievanceStatus.SLA_BREACHED]: 'bg-red-200 text-red-800',
};

// ─── Priority display ─────────────────────────────────────────────────────────

export const PRIORITY_LABEL: Record<Priority, string> = {
  [Priority.LOW]:      'Low',
  [Priority.MEDIUM]:   'Medium',
  [Priority.HIGH]:     'High',
  [Priority.CRITICAL]: 'Critical',
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  [Priority.LOW]:      'bg-green-100 text-green-700',
  [Priority.MEDIUM]:   'bg-amber-100 text-amber-700',
  [Priority.HIGH]:     'bg-orange-100 text-orange-700',
  [Priority.CRITICAL]: 'bg-red-100 text-red-700',
};

export const PRIORITY_DOT: Record<Priority, string> = {
  [Priority.LOW]:      'bg-green-500',
  [Priority.MEDIUM]:   'bg-amber-500',
  [Priority.HIGH]:     'bg-orange-500',
  [Priority.CRITICAL]: 'bg-red-600',
};

// ─── SLA risk ─────────────────────────────────────────────────────────────────

export const SLA_RISK_COLOR: Record<SLARisk, string> = {
  [SLARisk.LOW]:    'bg-green-100 text-green-700',
  [SLARisk.MEDIUM]: 'bg-amber-100 text-amber-700',
  [SLARisk.HIGH]:   'bg-red-100 text-red-700',
};

// ─── Role display ─────────────────────────────────────────────────────────────

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.CITIZEN]:     'Citizen',
  [UserRole.OFFICER]:     'Officer',
  [UserRole.DEPT_HEAD]:   'Dept. Head',
  [UserRole.ADMIN]:       'Admin',
  [UserRole.SUPER_ADMIN]: 'Super Admin',
};

// ─── Log event icons/labels ───────────────────────────────────────────────────

export const LOG_EVENT_LABEL: Record<LogEventType, string> = {
  [LogEventType.CREATED]:           'Complaint submitted',
  [LogEventType.STATUS_CHANGED]:    'Status updated',
  [LogEventType.ASSIGNED]:          'Officer assigned',
  [LogEventType.REASSIGNED]:        'Officer reassigned',
  [LogEventType.REMARK_ADDED]:      'Remark added',
  [LogEventType.PHOTO_UPLOADED]:    'Photo uploaded',
  [LogEventType.SUPPORT_ADDED]:    'Support added',
  [LogEventType.SLA_BREACHED]:      'SLA breached',
  [LogEventType.ESCALATED]:         'Escalated',
  [LogEventType.FEEDBACK_SUBMITTED]:'Feedback submitted',
  [LogEventType.REOPENED]:          'Case re-opened',
  [LogEventType.CLOSED]:            'Case closed',
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function truncate(str: string, len = 80): string {
  return str.length > len ? `${str.slice(0, len)}…` : str;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
