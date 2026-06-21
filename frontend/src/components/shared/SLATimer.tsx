import React, { useEffect, useState } from 'react';
import { differenceInSeconds, parseISO } from 'date-fns';

interface SLATimerProps {
  dueAt: string;
  compact?: boolean;
}

function formatSeconds(totalSec: number): string {
  const abs = Math.abs(totalSec);
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

export function SLATimer({ dueAt, compact = false }: SLATimerProps) {
  const [secsLeft, setSecsLeft] = useState(() =>
    differenceInSeconds(parseISO(dueAt), new Date())
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSecsLeft(differenceInSeconds(parseISO(dueAt), new Date()));
    }, 1000);
    return () => clearInterval(id);
  }, [dueAt]);

  const isOverdue = secsLeft < 0;
  const isWarning = secsLeft >= 0 && secsLeft < 4 * 3600; // < 4h

  const colorClass = isOverdue
    ? 'sla-breach'
    : isWarning
    ? 'sla-warning'
    : 'sla-ok';

  const label = isOverdue
    ? `${formatSeconds(secsLeft)} overdue`
    : formatSeconds(secsLeft);

  if (compact) {
    return (
      <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${colorClass}`}>
        {isOverdue ? '⚠ ' : ''}{label}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colorClass}`}>
      <span className="text-sm font-medium">
        {isOverdue ? '⚠ Overdue by' : 'Due in'}
      </span>
      <span className="font-mono font-semibold text-sm">{label}</span>
    </div>
  );
}
