import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { grievanceApi } from '../../services/grievanceApi';
import { useGrievances } from '../../hooks/useGrievances';
import { useSocket } from '../../hooks/useSocket';
import { Grievance, GrievanceStatus, SocketEvent, Priority } from '../../types';
import { PriorityBadge } from '../../components/ui/Badge';
import { SLATimer } from '../../components/shared/SLATimer';
import { StatCard } from '../../components/ui/StatCard';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { Spinner } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { truncate } from '../../utils';
import { useT } from '../../context/i18nStore';

// NAV defined inside component

// COLUMNS defined inside component

const NEXT_STATUS: Partial<Record<GrievanceStatus, GrievanceStatus>> = {
  [GrievanceStatus.NEW]:          GrievanceStatus.ACCEPTED,
  [GrievanceStatus.ACCEPTED]:     GrievanceStatus.IN_PROGRESS,
  [GrievanceStatus.IN_PROGRESS]:  GrievanceStatus.RESOLVED,
  [GrievanceStatus.REOPENED]:     GrievanceStatus.ACCEPTED,
  [GrievanceStatus.SLA_BREACHED]: GrievanceStatus.IN_PROGRESS,
};



// ACTION_LABEL defined inside component

// ACTION_CLS defined inside component



export default function OfficerDashboard() {
  const [updating, setUpdating] = useState<string | null>(null);
  const t = useT();

  const NAV = [
    { to: '/officer/dashboard',   label: t('nav.myTasks'),    icon: <span>📋</span> },
    { to: '/officer/performance', label: t('nav.performance'), icon: <span>📊</span> },
  ];

  const COLUMNS = [
    { status: GrievanceStatus.NEW,          label: t('status.NEW'),          accent: 'border-t-4 border-t-indigo-500', headerBg: 'text-indigo-600' },
    { status: GrievanceStatus.ACCEPTED,     label: t('status.ACCEPTED'),     accent: 'border-t-4 border-t-sky-500',    headerBg: 'text-sky-600'    },
    { status: GrievanceStatus.IN_PROGRESS,  label: t('status.IN_PROGRESS'),  accent: 'border-t-4 border-t-amber-500',  headerBg: 'text-amber-600'  },
    { status: GrievanceStatus.REOPENED,     label: t('status.REOPENED'),     accent: 'border-t-4 border-t-orange-500', headerBg: 'text-orange-600' },
    { status: GrievanceStatus.SLA_BREACHED, label: t('status.SLA_BREACHED'), accent: 'border-t-4 border-t-red-500',    headerBg: 'text-red-600'    },
  ];

  const ACTION_LABEL: Partial<Record<GrievanceStatus, string>> = {
    [GrievanceStatus.NEW]:          t('officer.accept'),
    [GrievanceStatus.ACCEPTED]:     t('officer.startWork'),
    [GrievanceStatus.IN_PROGRESS]:  t('officer.resolve'),
    [GrievanceStatus.REOPENED]:     t('officer.reaccept'),
    [GrievanceStatus.SLA_BREACHED]: t('officer.startWork'),
  };

  const ACTION_CLS: Partial<Record<GrievanceStatus, string>> = {
    [GrievanceStatus.NEW]:          'btn-primary btn-sm',
    [GrievanceStatus.ACCEPTED]:     'btn-primary btn-sm',
    [GrievanceStatus.IN_PROGRESS]:  'btn-success btn-sm',
    [GrievanceStatus.REOPENED]:     'btn-primary btn-sm',
    [GrievanceStatus.SLA_BREACHED]: 'btn-danger btn-sm',
  };

  const PRIORITY_TOP: Record<Priority, string> = {
    [Priority.LOW]:      'bg-emerald-400',
    [Priority.MEDIUM]:   'bg-amber-400',
    [Priority.HIGH]:     'bg-orange-500',
    [Priority.CRITICAL]: 'bg-red-600',
  };
  const [performance, setPerformance] = useState<any>(null);

  const fetchFn = useCallback((f: any) => grievanceApi.officerGrievances({ ...f, limit: 100 }), []);
  const { data: grievances, loading, refresh } = useGrievances({ fetchFn, initialFilters: {}, realtime: true });

  useSocket(SocketEvent.GRIEVANCE_ASSIGNED, () => { refresh(); toast('New complaint assigned', { icon: '📋' }); });

  useEffect(() => { grievanceApi.officerPerformance().then(d => setPerformance(d)).catch(() => {}); }, []);

  const advance = async (g: Grievance) => {
    const next = NEXT_STATUS[g.status];
    if (!next) return;
    setUpdating(g._id);
    try {
      await grievanceApi.updateStatus(g._id, next);

      // Status success toast
      toast.success(next === GrievanceStatus.RESOLVED ? '✅ Complaint resolved!' : `Moved to ${next.replace(/_/g, ' ')}`);

      // SMS simulation toast
      const officerName = (window as any).__ps_user_name || 'Nodal Officer';
      const smsMessages: Partial<Record<GrievanceStatus, string>> = {
        [GrievanceStatus.ACCEPTED]:    `📱 SMS sent to citizen: Your complaint ${g.ticketNumber} has been accepted by Officer ${officerName}. Expected resolution within 48 hours.`,
        [GrievanceStatus.IN_PROGRESS]: `📱 SMS sent to citizen: Complaint ${g.ticketNumber} is now under process by Officer ${officerName}. You will be notified upon resolution.`,
        [GrievanceStatus.RESOLVED]:    `📱 SMS sent to citizen: Your complaint ${g.ticketNumber} has been resolved by Officer ${officerName}. Please rate your experience on the portal.`,
      };
      const smsMsg = smsMessages[next];
      if (smsMsg) {
        setTimeout(() => {
          toast(smsMsg, {
            icon: '📲',
            duration: 6000,
            style: {
              background: '#064e3b',
              color: '#d1fae5',
              fontSize: '12px',
              maxWidth: '420px',
              fontFamily: 'monospace',
            },
          });
        }, 800);
      }

      refresh();
    } catch { toast.error('Update failed'); }
    finally { setUpdating(null); }
  };

  const byStatus = (s: GrievanceStatus) => grievances.filter(g => g.status === s);
  const activeCount = grievances.filter(g =>
    [GrievanceStatus.NEW, GrievanceStatus.ACCEPTED, GrievanceStatus.IN_PROGRESS,
     GrievanceStatus.REOPENED, GrievanceStatus.SLA_BREACHED].includes(g.status)
  ).length;
  const hitRate = performance ? Math.round((performance.slaHit / (performance.slaHit + performance.slaMiss || 1)) * 100) : 0;

  return (
    <SidebarLayout navItems={NAV} title="Officer Portal">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Tasks"   value={activeCount}                              icon="📋" color="indigo"  delay={0}    />
        <StatCard label="Resolved"       value={performance?.resolved ?? '—'}             icon="✅" color="emerald" delay={0.05} />
        <StatCard label="Avg Resolution" value={performance ? `${performance.avgHours}h` : '—'} icon="⏱"  color="blue"   delay={0.1}  />
        <StatCard label="SLA Hit Rate"   value={performance ? `${hitRate}%` : '—'}
          icon="🎯" color={hitRate >= 80 ? 'emerald' : hitRate >= 50 ? 'amber' : 'red'} delay={0.15} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">Task Board</h1>
          <p className="page-subtitle">{activeCount} active task{activeCount !== 1 ? 's' : ''} assigned to you</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded-full w-2/3 mb-4" />
              <div className="space-y-3">
                {[0,1].map(j => <div key={j} className="h-28 bg-gray-50 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {COLUMNS.map(({ status, label, accent, headerBg }) => {
            const cards = byStatus(status);
            return (
              <div key={status} className={`bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden ${accent}`}>
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <h2 className={`font-semibold text-sm ${headerBg}`}>{label}</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cards.length > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                    {cards.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 min-h-32">
                  {cards.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-gray-300">All clear ✓</p>
                    </div>
                  ) : cards.map((g, i) => (
                    <motion.div key={g._id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      {/* Priority strip */}
                      <div className={`h-1 ${PRIORITY_TOP[g.priority]} w-full`} />
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-xs font-mono text-gray-400">#{g.ticketNumber}</span>
                          <PriorityBadge priority={g.priority} />
                        </div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">{truncate(g.title, 55)}</h3>
                        <p className="text-xs text-gray-400 mb-1.5 line-clamp-2">{truncate(g.description, 70)}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">📍 {truncate(g.location.address, 30)}</p>
                        {g.isEscalated && <p className="text-xs text-red-600 font-semibold mt-1">🔺 Escalated</p>}
                        {g.dueAt && <div className="mt-2"><SLATimer dueAt={g.dueAt} compact /></div>}
                        <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-gray-100">
                          <Link to={`/officer/grievances/${g._id}`}
                            className="btn btn-secondary btn-sm flex-1 justify-center text-xs py-1">
                            View
                          </Link>
                          {NEXT_STATUS[g.status] && (
                            <button onClick={() => advance(g)} disabled={updating === g._id}
                              className={`${ACTION_CLS[g.status] ?? 'btn-primary btn-sm'} flex-1 justify-center text-xs py-1`}>
                              {updating === g._id ? <Spinner size="sm" /> : ACTION_LABEL[g.status]}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recently resolved */}
      {!loading && byStatus(GrievanceStatus.RESOLVED).length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Recently Resolved</h2>
          <div className="grid gap-2">
            {byStatus(GrievanceStatus.RESOLVED).slice(0, 3).map(g => (
              <div key={g._id} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                <span className="text-emerald-500 text-lg">✅</span>
                <span className="text-sm font-medium text-gray-700 flex-1 truncate">{g.title}</span>
                <span className="text-xs font-mono text-gray-400">#{g.ticketNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}