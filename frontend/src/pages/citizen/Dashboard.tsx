import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { grievanceApi } from '../../services/grievanceApi';
import { useAuthStore } from '../../context/authStore';
import { GrievanceStatus, Priority } from '../../types';
import { useGrievances } from '../../hooks/useGrievances';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { SLATimer } from '../../components/shared/SLATimer';
import { SkeletonCard } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { timeAgo, truncate, initials } from '../../utils';
import { useT } from '../../context/i18nStore';

const PRIORITY_STRIP: Record<Priority, string> = {
  [Priority.LOW]:      'border-l-emerald-400',
  [Priority.MEDIUM]:   'border-l-amber-400',
  [Priority.HIGH]:     'border-l-orange-500',
  [Priority.CRITICAL]: 'border-l-red-600',
};

export default function CitizenDashboard() {
  const { user } = useAuthStore();
  const t = useT();

  const NAV = [
    { to: '/citizen/dashboard', label: t('nav.myComplaints'), icon: <span>🏠</span> },
    { to: '/citizen/submit',    label: t('nav.newComplaint'),  icon: <span>➕</span> },
  ];

  const STATUS_TABS = [
    { label: t('citizen.allTab'),         value: '' },
    { label: t('citizen.openTab'),        value: GrievanceStatus.NEW },
    { label: t('citizen.inProgressTab'), value: GrievanceStatus.IN_PROGRESS },
    { label: t('citizen.resolvedTab'),    value: GrievanceStatus.RESOLVED },
    { label: t('citizen.reopenedTab'),    value: GrievanceStatus.REOPENED },
  ];

  const fetchFn = useCallback((f: any) => grievanceApi.myGrievances(f), []);
  const { data: grievances, total, loading, filters, updateFilter } = useGrievances({
    fetchFn, initialFilters: { limit: 15 }, realtime: true,
  });

  const open     = grievances.filter(g => [GrievanceStatus.NEW, GrievanceStatus.ACCEPTED, GrievanceStatus.IN_PROGRESS].includes(g.status)).length;
  const resolved = grievances.filter(g => [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED].includes(g.status)).length;
  const breached = grievances.filter(g => g.status === GrievanceStatus.SLA_BREACHED).length;

  return (
    <SidebarLayout navItems={NAV} title={t('nav.myComplaints')}>
      {/* Hero banner */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #003087 0%, #00205b 60%, #001540 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">{t('citizen.welcome')}</p>
            <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
            <p className="text-blue-300 text-sm mt-1">
              {total} {t('citizen.filed')}
            </p>
          </div>
          <Link to="/citizen/submit"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all text-blue-900"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #ff8c3a)' }}>
            {t('citizen.newComplaint')}
          </Link>
        </div>

        {!loading && total > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: t('citizen.active'),   value: open,     color: 'bg-white/20',        textColor: 'text-white'        },
              { label: t('citizen.resolved'), value: resolved, color: 'bg-emerald-400/20',   textColor: 'text-emerald-200'  },
              { label: t('citizen.breached'), value: breached, color: 'bg-red-400/20',       textColor: 'text-red-200'      },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-xl p-3 text-center border border-white/10`}>
                <p className={`text-xl font-bold ${s.textColor}`}>{s.value}</p>
                <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-gray-200 p-1 rounded-xl w-fit shadow-sm overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => updateFilter('status', tab.value || undefined)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
              (filters.status ?? '') === tab.value
                ? 'text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
            style={(filters.status ?? '') === tab.value ? { backgroundColor: '#003087' } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Complaints list */}
      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : grievances.length === 0 ? (
        <EmptyState icon="📭" title={t('citizen.noComplaints')}
          description={t('citizen.submitFirst')}
          action={<Link to="/citizen/submit" className="btn-primary">{t('citizen.submitBtn')}</Link>} />
      ) : (
        <div className="grid gap-3">
          {grievances.map((g, i) => (
            <motion.div key={g._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <Link to={`/citizen/grievances/${g._id}`} className="block">
                <div className={`card border-l-4 ${PRIORITY_STRIP[g.priority]} hover:shadow-panel transition-all duration-200 hover:-translate-y-0.5 cursor-pointer p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                          #{g.ticketNumber}
                        </span>
                        <StatusBadge status={g.status} />
                        <PriorityBadge priority={g.priority} />
                        {g.isEscalated && (
                          <span className="badge bg-red-100 text-red-700 border border-red-200">🔺 {t('common.escalated')}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate text-base">{g.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{g.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">📍 {truncate(g.location.address, 35)}</span>
                        {((g as any).department || (g as any).departmentId) && (
                          <span className="flex items-center gap-1">🏢 {((g as any).department || (g as any).departmentId)?.name}</span>
                        )}
                        <span>{timeAgo(g.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right space-y-2">
                      {g.dueAt && <SLATimer dueAt={g.dueAt} compact />}
                      {g.feedbackRating && (
                        <p className="text-xs text-amber-500">{'⭐'.repeat(g.feedbackRating)}</p>
                      )}
                    </div>
                  </div>
                  {(g.assignedOfficer || (g as any).assignedOfficerId) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                        style={{ backgroundColor: '#003087' }}>
                        {initials((g.assignedOfficer || (g as any).assignedOfficerId)?.name || 'O')}
                      </div>
                      {t('citizen.assignedTo')} <strong>{(g.assignedOfficer || (g as any).assignedOfficerId)?.name}</strong>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </SidebarLayout>
  );
}