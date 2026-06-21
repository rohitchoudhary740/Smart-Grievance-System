import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { adminApi } from '../../services/adminApi';
import { grievanceApi } from '../../services/grievanceApi';
import { AnalyticsSummary, CriticalZone, Grievance } from '../../types';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Loader';
import { StatCard } from '../../components/ui/StatCard';
import { LiveAlertPanel } from '../../components/shared/LiveAlertPanel';
import { timeAgo } from '../../utils';
import { getSocket } from '../../services/socketClient';
import { SocketEvent } from '../../types';
import { useT } from '../../context/i18nStore';
import toast from 'react-hot-toast';

const GrievanceMap = lazy(() =>
  import('../../components/shared/GrievanceMap').then(m => ({ default: m.GrievanceMap }))
);

const STATUS_COLORS: Record<string, string> = {
  NEW: '#6366f1', ACCEPTED: '#0ea5e9', IN_PROGRESS: '#f59e0b', RESOLVED: '#10b981',
  CLOSED: '#9ca3af', REJECTED: '#ef4444', REOPENED: '#f97316', SLA_BREACHED: '#dc2626',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#dc2626',
};

export default function AdminDashboard() {
  const t = useT(); // ← hook called FIRST inside component

  // NAV uses t() so must be INSIDE component
  const NAV = [
    { to: '/admin/dashboard',   label: t('nav.commandCenter'), icon: <span>🎯</span> },
    { to: '/admin/grievances',  label: t('nav.allComplaints'),  icon: <span>📋</span> },
    { to: '/admin/analytics',   label: t('nav.analytics'),      icon: <span>📊</span> },
    { to: '/admin/departments', label: t('nav.departments'),     icon: <span>🏢</span> },
    { to: '/admin/users',       label: t('nav.users'),           icon: <span>👥</span> },
    { to: '/admin/audit',       label: t('nav.auditLog'),        icon: <span>🔍</span> },
    { to: '/admin/leaderboard',  label: '🏆 Officer Rankings',    icon: <span>🏆</span> },
  ];

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [zones, setZones]         = useState<CriticalZone[]>([]);
  const [recent, setRecent]       = useState<Grievance[]>([]);
  const [allGrievances, setAll]   = useState<Grievance[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'map'>('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, z, r, all] = await Promise.all([
        adminApi.getAnalytics(),
        adminApi.getCriticalZones(),
        grievanceApi.adminGrievances({ limit: 8, page: 1 }),
        grievanceApi.adminGrievances({ limit: 200, page: 1 }),
      ]);
      setAnalytics(a); setZones(z); setRecent(r.data); setAll(all.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const s = getSocket();
    const refresh = () => load();
    s.on(SocketEvent.GRIEVANCE_CREATED, refresh);
    s.on(SocketEvent.GRIEVANCE_UPDATED, refresh);
    s.on(SocketEvent.SLA_BREACHED, () => { toast.error('⚠ SLA breach!'); load(); });
    s.on(SocketEvent.CRITICAL_ZONE, (d: CriticalZone) => toast.error(`🚨 Critical zone: ${d.ward}`));
    return () => {
      s.off(SocketEvent.GRIEVANCE_CREATED, refresh);
      s.off(SocketEvent.GRIEVANCE_UPDATED, refresh);
      s.off(SocketEvent.SLA_BREACHED);
      s.off(SocketEvent.CRITICAL_ZONE);
    };
  }, [load]);

  if (loading) return <SidebarLayout navItems={NAV} title="Admin"><PageLoader /></SidebarLayout>;

  const a = analytics!;
  const statusData   = Object.entries(a.byStatus).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }));
  const priorityData = Object.entries(a.byPriority).map(([k, v]) => ({ name: k, value: v }));

  return (
    <SidebarLayout navItems={NAV} title={t('nav.commandCenter')}>
      <LiveAlertPanel />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{t('admin.commandCenter')}</h1>
          <p className="page-subtitle">
            {t('admin.liveMonitor')} — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm gap-1">
            {(['overview', 'map'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                  activeTab === tab ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
                style={activeTab === tab ? { backgroundColor: '#003087' } : {}}>
                {tab === 'map' ? '🗺 Map' : '📊 Overview'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            {t('admin.live')}
          </div>
        </div>
      </div>

      {/* Critical zone alerts */}
      {zones.length > 0 && (
        <div className="mb-5 space-y-2">
          {zones.map(z => (
            <motion.div key={z.ward} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
              <span className="text-2xl">🚨</span>
              <div className="flex-1">
                <p className="font-semibold text-red-800 text-sm">{t('admin.criticalZone')}: {z.ward}</p>
                <p className="text-xs text-red-500 mt-0.5">{z.count} high-priority complaints · Top: {z.topCategory}</p>
              </div>
              <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg font-semibold">
                {z.count} Active
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'overview' ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label={t('admin.total')}        value={a.total}                                      icon="📋" color="indigo" delay={0}    sub={`${a.byStatus['NEW'] ?? 0} new today`} />
            <StatCard label={t('admin.slaBreaches')}  value={a.slaBreachCount}                             icon="⚠️" color="red"    delay={0.05} sub={`${a.slaBreachRate}% breach rate`} />
            <StatCard label={t('admin.avgResolution')} value={`${a.avgResolutionHours}h`}                  icon="⏱" color="blue"   delay={0.1}  sub="across all departments" />
            <StatCard label={t('admin.satisfaction')} value={`${a.avgSatisfactionRating.toFixed(1)}/5`}    icon="⭐" color="amber"  delay={0.15} sub={`${a.reopenRate}% reopen rate`} />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                        label={({ name, percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ''}
                        labelLine={false} fontSize={10}>
                        {statusData.map(e => <Cell key={e.name} fill={STATUS_COLORS[e.name.replace(/ /g, '_')] ?? '#94a3b8'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Priority Breakdown</h3>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        innerRadius={40} outerRadius={65}
                        label={({ name, percent }) => percent > 0.05 ? `${name} ${Math.round(percent * 100)}%` : ''}
                        labelLine={false} fontSize={10}>
                        {priorityData.map(e => <Cell key={e.name} fill={PRIORITY_COLORS[e.name] ?? '#94a3b8'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {a.timeSeries.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Inflow vs Resolution (30 days)</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={a.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="created"  stroke="#003087" strokeWidth={2} dot={false} name="Created" />
                      <Line type="monotone" dataKey="resolved" stroke="#138808" strokeWidth={2} dot={false} name="Resolved" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">By Department</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={a.byDepartment.slice(0, 5)} layout="vertical" margin={{ left: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="department" tick={{ fontSize: 9 }} width={85} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#003087" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">SLA Status</h3>
                <div className="space-y-3">
                  {[
                    { label: 'On Track', value: a.total - a.slaBreachCount, color: 'bg-emerald-500', pct: Math.round(((a.total - a.slaBreachCount) / (a.total || 1)) * 100) },
                    { label: 'Breached', value: a.slaBreachCount,           color: 'bg-red-500',     pct: a.slaBreachRate },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{s.label}</span>
                        <span className="text-gray-500">{s.value} ({s.pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-2 ${s.color} rounded-full transition-all`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent complaints */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">{t('admin.recentComplaints')}</h3>
              <Link to="/admin/grievances" className="text-xs font-semibold hover:underline" style={{ color: '#003087' }}>
                {t('admin.viewAll')}
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>{t('common.ticket')}</th>
                    <th>Title</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.priority')}</th>
                    <th>{t('common.department')}</th>
                    <th>{t('common.filed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((g, i) => (
                    <motion.tr key={g._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td><span className="font-mono text-xs bg-gray-50 px-2 py-0.5 rounded-lg text-gray-500">#{g.ticketNumber}</span></td>
                      <td className="max-w-xs truncate font-medium text-sm">{g.title}</td>
                      <td><StatusBadge status={g.status} /></td>
                      <td><PriorityBadge priority={g.priority} /></td>
                      <td className="text-gray-500 text-xs">{((g as any).department || (g as any).departmentId)?.name ?? '—'}</td>
                      <td className="text-gray-400 text-xs">{timeAgo(g.createdAt)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Complaint Map</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {allGrievances.filter(g => g.location?.geo).length} geo-tagged · colour = priority
              </p>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              {[['🟢', 'Low'], ['🟡', 'Medium'], ['🟠', 'High'], ['🔴', 'Critical']].map(([dot, label]) => (
                <span key={label} className="flex items-center gap-1">{dot} {label}</span>
              ))}
            </div>
          </div>
          <Suspense fallback={<div className="h-96 flex items-center justify-center text-gray-400 text-sm">Loading map…</div>}>
            <GrievanceMap
              grievances={allGrievances}
              height="500px"
              hotZones={zones
                .map((z) => {
                  const zoneIds = new Set(
                    (z.grievanceIds ?? []).map((id: any) => {
                      if (typeof id === 'string') return id;
                      return (id?.toString?.() ?? String(id)).toString();
                    })
                  );

                  const points = allGrievances
                    .filter((g) => zoneIds.has(String(g._id)))
                    .filter((g) => g.location?.geo?.coordinates?.length === 2)
                    .map((g) => {
                      const [lng, lat] = g.location.geo!.coordinates;
                      return { lat, lng };
                    });

                  if (!points.length) return null;

                  const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
                  const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length;

                  return { ward: z.ward, count: z.count, lat: avgLat, lng: avgLng };
                })
                .filter(
                  (x): x is { ward: string; count: number; lat: number; lng: number } => !!x
                )}
            />
          </Suspense>
        </div>
      )}
    </SidebarLayout>
  );
}