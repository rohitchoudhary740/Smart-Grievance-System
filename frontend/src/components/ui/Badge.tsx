import React from 'react';
import { GrievanceStatus, Priority, SLARisk } from '../../types';

interface BadgeProps { label: string; className?: string; dot?: string; }

export function Badge({ label, className = '', dot }: BadgeProps) {
  return (
    <span className={`badge ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />}
      {label}
    </span>
  );
}

const STATUS_CONFIG: Record<GrievanceStatus, { label: string; cls: string; dot: string }> = {
  [GrievanceStatus.NEW]:          { label: 'New',          cls: 'bg-indigo-50 text-indigo-700 border border-indigo-100',     dot: 'bg-indigo-500'  },
  [GrievanceStatus.ACCEPTED]:     { label: 'Accepted',     cls: 'bg-sky-50 text-sky-700 border border-sky-100',             dot: 'bg-sky-500'     },
  [GrievanceStatus.IN_PROGRESS]:  { label: 'In Progress',  cls: 'bg-amber-50 text-amber-700 border border-amber-100',       dot: 'bg-amber-500'   },
  [GrievanceStatus.RESOLVED]:     { label: 'Resolved',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500' },
  [GrievanceStatus.CLOSED]:       { label: 'Closed',       cls: 'bg-gray-100 text-gray-500 border border-gray-200',         dot: 'bg-gray-400'    },
  [GrievanceStatus.REJECTED]:     { label: 'Rejected',     cls: 'bg-red-50 text-red-700 border border-red-100',             dot: 'bg-red-500'     },
  [GrievanceStatus.REOPENED]:     { label: 'Re-opened',    cls: 'bg-orange-50 text-orange-700 border border-orange-100',    dot: 'bg-orange-500'  },
  [GrievanceStatus.SLA_BREACHED]: { label: 'SLA Breached', cls: 'bg-red-100 text-red-800 border border-red-200',            dot: 'bg-red-600'     },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; cls: string; dot: string }> = {
  [Priority.LOW]:      { label: 'Low',      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500' },
  [Priority.MEDIUM]:   { label: 'Medium',   cls: 'bg-amber-50 text-amber-700 border border-amber-100',       dot: 'bg-amber-500'   },
  [Priority.HIGH]:     { label: 'High',     cls: 'bg-orange-50 text-orange-700 border border-orange-100',    dot: 'bg-orange-500'  },
  [Priority.CRITICAL]: { label: 'Critical', cls: 'bg-red-50 text-red-700 border border-red-100',             dot: 'bg-red-600 animate-pulse' },
};

const SLA_RISK_CONFIG: Record<SLARisk, { label: string; cls: string }> = {
  [SLARisk.LOW]:    { label: 'SLA: Low',    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  [SLARisk.MEDIUM]: { label: 'SLA: Medium', cls: 'bg-amber-50 text-amber-700 border border-amber-100'       },
  [SLARisk.HIGH]:   { label: 'SLA: High',   cls: 'bg-red-50 text-red-700 border border-red-100'             },
};

export function StatusBadge({ status }: { status: GrievanceStatus }) {
  const c = STATUS_CONFIG[status];
  return <Badge label={c.label} className={c.cls} dot={c.dot} />;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = PRIORITY_CONFIG[priority];
  return <Badge label={c.label} className={c.cls} dot={c.dot} />;
}

export function SLARiskBadge({ risk }: { risk: SLARisk }) {
  const c = SLA_RISK_CONFIG[risk];
  return <Badge label={c.label} className={c.cls} />;
}
