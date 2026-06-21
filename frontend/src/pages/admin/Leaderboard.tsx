import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { StatCard } from '../../components/ui/StatCard';
import { PageLoader } from '../../components/ui/Loader';
import { getLeaderboard, OfficerLeaderboardEntry } from '../../services/adminApi';

const NAV = [
  { to: '/admin/dashboard',    label: 'Command Center',  icon: <span>🎯</span> },
  { to: '/admin/grievances',   label: 'All Complaints',   icon: <span>📋</span> },
  { to: '/admin/leaderboard',  label: 'Officer Rankings', icon: <span>🏆</span> },
  { to: '/admin/analytics',    label: 'Analytics',        icon: <span>📊</span> },
  { to: '/admin/departments',  label: 'Departments',      icon: <span>🏢</span> },
  { to: '/admin/users',        label: 'Users',            icon: <span>👥</span> },
  { to: '/admin/audit',        label: 'Audit Log',        icon: <span>🔍</span> },
];

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const PERF_COLOR = (rate: number) => {
  if (rate >= 80) return { bar: '#138808', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
  if (rate >= 60) return { bar: '#f59e0b', text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'   };
  return            { bar: '#ef4444', text: 'text-red-700',     bg: 'bg-red-50 border-red-200'       };
};

const SLA_COLOR = (rate: number) => {
  if (rate >= 80) return 'text-emerald-600 font-bold';
  if (rate >= 60) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 w-7 text-right">{value}</span>
    </div>
  );
}

export default function OfficerLeaderboard() {
  const [data, setData]       = useState<OfficerLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof OfficerLeaderboardEntry>('resolutionRate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    getLeaderboard()
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key: keyof OfficerLeaderboardEntry) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...data]
    .filter(o => o.name.toLowerCase().includes(search.toLowerCase()) ||
                 o.departmentName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  const maxResolved = Math.max(...data.map(o => o.resolved), 1);

  if (loading) return <SidebarLayout navItems={NAV} title="Admin"><PageLoader /></SidebarLayout>;

  // Summary stats
  const topOfficer = data[0];
  const avgRate    = data.length ? Math.round(data.reduce((s, o) => s + o.resolutionRate, 0) / data.length) : 0;
  const totalRes   = data.reduce((s, o) => s + o.resolved, 0);
  const avgSLA     = data.length ? Math.round(data.reduce((s, o) => s + o.slaRate, 0) / data.length) : 0;

  const ThCol = ({ label, sortField }: { label: string; sortField?: keyof OfficerLeaderboardEntry }) => (
    <th className={`px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider ${sortField ? 'cursor-pointer hover:text-gray-800 select-none' : ''}`}
      onClick={() => sortField && toggleSort(sortField)}>
      <span className="flex items-center gap-1">
        {label}
        {sortField && sortKey === sortField && (
          <span className="text-blue-900">{sortDir === 'desc' ? '↓' : '↑'}</span>
        )}
      </span>
    </th>
  );

  return (
    <SidebarLayout navItems={NAV} title="Admin">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            🏆 Officer Performance Rankings
          </h1>
          <p className="page-subtitle">
            Accountability dashboard — {data.length} Nodal Officers · Ranked by resolution rate
          </p>
        </div>
        <div className="text-xs font-medium px-3 py-1.5 rounded-xl border"
          style={{ backgroundColor: '#EEF2FF', color: '#003087', borderColor: '#C7D2FE' }}>
          🔒 Visible to Collector & Admin only
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Officers"      value={data.length}         icon="👮" color="indigo"  delay={0}    />
        <StatCard label="Total Resolved"      value={totalRes}            icon="✅" color="emerald" delay={0.05} sub="by all officers" />
        <StatCard label="Avg Resolution Rate" value={`${avgRate}%`}       icon="📈" color={avgRate >= 70 ? 'emerald' : 'amber'} delay={0.1} />
        <StatCard label="Avg SLA Hit Rate"    value={`${avgSLA}%`}        icon="⏱" color={avgSLA >= 70 ? 'emerald' : 'red'}    delay={0.15} />
      </div>

      {/* Top 3 podium */}
      {data.length >= 3 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">🏅 Top Performers</h2>
          <div className="grid grid-cols-3 gap-3">
            {data.slice(0, 3).map((o, i) => {
              const c = PERF_COLOR(o.resolutionRate);
              return (
                <motion.div key={o.officerId}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-white rounded-2xl border-2 ${c.bg} p-5 text-center relative overflow-hidden`}>

                  {/* Background rank number */}
                  <div className="absolute -top-3 -right-2 text-8xl font-black opacity-5 select-none">
                    {i + 1}
                  </div>

                  <p className="text-3xl mb-2">{RANK_MEDAL[i + 1]}</p>
                  <p className="font-bold text-gray-900 text-base">{o.name}</p>
                  <p className="text-xs text-gray-400 mb-3">{o.departmentName}</p>

                  <p className={`text-3xl font-black mb-1 ${c.text}`}>{o.resolutionRate}%</p>
                  <p className="text-xs text-gray-400 mb-3">Resolution Rate</p>

                  <div className="grid grid-cols-3 gap-1 text-center text-xs pt-3 border-t border-gray-100">
                    <div>
                      <p className="font-bold text-gray-800">{o.resolved}</p>
                      <p className="text-gray-400">Resolved</p>
                    </div>
                    <div>
                      <p className={`font-bold ${SLA_COLOR(o.slaRate)}`}>{o.slaRate}%</p>
                      <p className="text-gray-400">SLA Hit</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{o.avgHours}h</p>
                      <p className="text-gray-400">Avg Time</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full rankings table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <h3 className="font-bold text-gray-800 text-sm">Full Rankings Table</h3>
          <input
            type="text"
            placeholder="Search officer or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input text-sm py-2 w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr style={{ background: '#F8F9FB' }}>
                <ThCol label="Rank" />
                <ThCol label="Officer" />
                <ThCol label="Department" />
                <ThCol label="Total"    sortField="total" />
                <ThCol label="Resolved" sortField="resolved" />
                <ThCol label="Active"   sortField="active" />
                <ThCol label="Breached" sortField="breached" />
                <ThCol label="Res. Rate %" sortField="resolutionRate" />
                <ThCol label="SLA Hit %"   sortField="slaRate" />
                <ThCol label="Avg Hours"   sortField="avgHours" />
                <ThCol label="Progress" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400 text-sm">
                    No officers found
                  </td>
                </tr>
              ) : sorted.map((o, i) => {
                const c      = PERF_COLOR(o.resolutionRate);
                const medal  = RANK_MEDAL[o.rank];
                const isTop3 = o.rank <= 3;

                return (
                  <motion.tr key={o.officerId}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={isTop3 ? 'bg-amber-50/40' : ''}>

                    {/* Rank */}
                    <td className="w-14">
                      <div className="flex items-center gap-1">
                        {medal
                          ? <span className="text-lg">{medal}</span>
                          : <span className="text-sm font-bold text-gray-400 w-6 text-center">#{o.rank}</span>
                        }
                      </div>
                    </td>

                    {/* Officer */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: '#003087' }}>
                          {o.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{o.name}</p>
                          <p className="text-xs text-gray-400">{o.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td>
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {o.departmentName}
                      </span>
                    </td>

                    {/* Counts */}
                    <td><span className="font-semibold text-gray-700">{o.total}</span></td>
                    <td><span className="font-semibold text-emerald-700">{o.resolved}</span></td>
                    <td><span className="font-semibold text-amber-600">{o.active}</span></td>
                    <td>
                      <span className={`font-semibold ${o.breached > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {o.breached}
                      </span>
                    </td>

                    {/* Resolution Rate */}
                    <td>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.text}`}>
                        {o.resolutionRate}%
                      </div>
                    </td>

                    {/* SLA Rate */}
                    <td>
                      <span className={`text-sm ${SLA_COLOR(o.slaRate)}`}>{o.slaRate}%</span>
                    </td>

                    {/* Avg Hours */}
                    <td>
                      <span className={`text-sm font-semibold ${
                        o.avgHours <= 24 ? 'text-emerald-600' :
                        o.avgHours <= 48 ? 'text-amber-600' : 'text-red-600'
                      }`}>{o.avgHours}h</span>
                    </td>

                    {/* Mini progress bar */}
                    <td className="w-32">
                      <MiniBar value={o.resolved} max={maxResolved} color={c.bar} />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-500">
          <span className="font-semibold text-gray-600">Color guide:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> ≥80% Excellent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> 60–79% Average
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> &lt;60% Needs Attention
          </span>
          <span className="ml-auto text-gray-400">
            Click column headers to sort · Collector-level accountability report
          </span>
        </div>
      </div>
    </SidebarLayout>
  );
}