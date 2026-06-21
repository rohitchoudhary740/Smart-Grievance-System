import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { useAnalytics } from '../../hooks/useAnalytics';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { PageLoader } from '../../components/ui/Loader';
import { StatCard } from '../../components/ui/StatCard';
import { adminApi } from '../../services/adminApi';
import { downloadBlob } from '../../utils';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/admin/dashboard',   label: 'Command Center', icon: <span>🎯</span> },
  { to: '/admin/grievances',  label: 'All Complaints',  icon: <span>📋</span> },
  { to: '/admin/analytics',   label: 'Analytics',       icon: <span>📊</span> },
  { to: '/admin/departments', label: 'Departments',     icon: <span>🏢</span> },
  { to: '/admin/users',       label: 'Users',           icon: <span>👥</span> },
  { to: '/admin/audit',       label: 'Audit Log',       icon: <span>🔍</span> },
];

const PRIORITY_COLORS = ['#22c55e', '#f59e0b', '#f97316', '#dc2626'];
const STATUS_COLORS   = ['#6366f1', '#0ea5e9', '#f59e0b', '#22c55e', '#6b7280', '#ef4444', '#f97316', '#dc2626'];

export default function AdminAnalytics() {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');
  const { data: a, loading } = useAnalytics({ from: from || undefined, to: to || undefined });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportGrievances({ from, to });
      downloadBlob(blob, `export-${Date.now()}.csv`);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  if (loading || !a) return <SidebarLayout navItems={NAV} title="Admin"><PageLoader /></SidebarLayout>;

  const statusData   = Object.entries(a.byStatus).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }));
  const priorityData = Object.entries(a.byPriority).map(([k, v]) => ({ name: k, value: v }));
  const slaData = [
    { name: 'On Time',  value: a.total - a.slaBreachCount },
    { name: 'Breached', value: a.slaBreachCount },
  ];

  return (
    <SidebarLayout navItems={NAV} title="Admin">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm">Performance insights across all departments</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary">
          {exporting ? '…' : '⬇'} Export CSV
        </button>
      </div>

      <div className="card mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Date range:</span>
          <input type="date" className="input text-sm w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-gray-400">→</span>
          <input type="date" className="input text-sm w-40" value={to}   onChange={(e) => setTo(e.target.value)} />
          {(from || to) && <button onClick={() => { setFrom(''); setTo(''); }} className="btn-ghost btn-sm">Clear</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total"           value={a.total}                              color="indigo" delay={0}    icon="📋" />
        <StatCard label="SLA Breach Rate" value={`${a.slaBreachRate}%`}               color="red"     delay={0.05} icon="⚠️" sub={`${a.slaBreachCount} breached`} />
        <StatCard label="Avg Resolution"  value={`${a.avgResolutionHours}h`}           color="blue"   delay={0.1}  icon="⏱" />
        <StatCard label="Satisfaction"    value={`${a.avgSatisfactionRating.toFixed(1)}/5`} color="amber" delay={0.15} icon="⭐" sub={`${a.reopenRate}% reopen rate`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} margin={{ left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                label={({ name, percent }) => `${name} ${Math.round(percent*100)}%`}
                labelLine={false} fontSize={10}>
                {priorityData.map((_, i) => <Cell key={i} fill={PRIORITY_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">By Department</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={a.byDepartment} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="department" tick={{ fontSize: 9 }} width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f61f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">SLA Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={slaData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={60} outerRadius={85}
                label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                <Cell fill="#22c55e" /><Cell fill="#dc2626" />
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {a.timeSeries.length > 0 && (
        <div className="card mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Inflow vs Resolution (30 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={a.timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="created"  stroke="#6366f1" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={false} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Top Categories</h3>
        </div>
        <table className="table-base">
          <thead><tr><th>#</th><th>Category</th><th>Count</th><th>Share</th></tr></thead>
          <tbody>
            {a.byCategory.map((c, i) => (
              <tr key={c.category}>
                <td className="text-gray-400 text-xs">{i + 1}</td>
                <td className="font-medium capitalize">{c.category}</td>
                <td>{c.count}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-24">
                      <div className="bg-brand-500 h-1.5 rounded-full"
                        style={{ width: `${Math.round((c.count / a.total) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{Math.round((c.count / a.total) * 100)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}