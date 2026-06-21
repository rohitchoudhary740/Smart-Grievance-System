import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { StatCard } from '../../components/ui/StatCard';
import { PageLoader } from '../../components/ui/Loader';
import { LiveAlertPanel } from '../../components/shared/LiveAlertPanel';

const CITIES = [
  { id: 'indore',   name: 'Indore',   fullName: 'Indore Municipal Corporation',   code: 'IMC', population: '3.2M', color: '#003087', stats: { total: 847, open: 234, resolved: 567, breached: 46, satisfaction: 4.1, avgHours: 38 } },
  { id: 'bhopal',   name: 'Bhopal',   fullName: 'Bhopal Municipal Corporation',   code: 'BMC', population: '1.9M', color: '#138808', stats: { total: 612, open: 198, resolved: 389, breached: 25, satisfaction: 3.8, avgHours: 52 } },
  { id: 'jabalpur', name: 'Jabalpur', fullName: 'Jabalpur Municipal Corporation', code: 'JMC', population: '1.1M', color: '#FF6B00', stats: { total: 334, open: 112, resolved: 201, breached: 21, satisfaction: 3.6, avgHours: 61 } },
  { id: 'gwalior',  name: 'Gwalior',  fullName: 'Gwalior Municipal Corporation',  code: 'GMC', population: '1.0M', color: '#7c3aed', stats: { total: 289, open: 98,  resolved: 175, breached: 16, satisfaction: 3.9, avgHours: 44 } },
  { id: 'ujjain',   name: 'Ujjain',   fullName: 'Ujjain Municipal Corporation',   code: 'UMC', population: '0.5M', color: '#0891b2', stats: { total: 156, open: 67,  resolved: 81,  breached: 8,  satisfaction: 4.2, avgHours: 29 } },
];

const ESCALATED = [
  { ticketNumber: 'GRV-2026-00089', title: 'Major sewage overflow — Rajwada area',    city: 'Indore',   cityCode: 'IMC', priority: 'CRITICAL', level: 'COLLECTOR', escalatedAt: '2h ago',  dept: 'Sanitation',          daysOpen: 5, cityColor: '#003087' },
  { ticketNumber: 'GRV-2026-00134', title: 'Bridge structural damage — NH-52',         city: 'Bhopal',   cityCode: 'BMC', priority: 'CRITICAL', level: 'COLLECTOR', escalatedAt: '4h ago',  dept: 'Roads & Infra',       daysOpen: 7, cityColor: '#138808' },
  { ticketNumber: 'GRV-2026-00312', title: 'Road collapse — heavy vehicle damage',     city: 'Ujjain',   cityCode: 'UMC', priority: 'CRITICAL', level: 'COLLECTOR', escalatedAt: '12h ago', dept: 'Roads & Infra',       daysOpen: 6, cityColor: '#0891b2' },
  { ticketNumber: 'GRV-2026-00523', title: 'Water contamination report',               city: 'Jabalpur', cityCode: 'JMC', priority: 'CRITICAL', level: 'COLLECTOR', escalatedAt: '1d ago',  dept: 'Water Supply',        daysOpen: 2, cityColor: '#FF6B00' },
  { ticketNumber: 'GRV-2026-00056', title: 'Water supply cut for 72+ hours',           city: 'Jabalpur', cityCode: 'JMC', priority: 'HIGH',     level: 'DEPT_HEAD', escalatedAt: '6h ago',  dept: 'Water Supply',        daysOpen: 3, cityColor: '#FF6B00' },
  { ticketNumber: 'GRV-2026-00201', title: 'Streetlight failure — 2km stretch',        city: 'Gwalior',  cityCode: 'GMC', priority: 'HIGH',     level: 'DEPT_HEAD', escalatedAt: '8h ago',  dept: 'Electricity',         daysOpen: 4, cityColor: '#7c3aed' },
  { ticketNumber: 'GRV-2026-00078', title: 'Garbage pile — market area 4 days',        city: 'Indore',   cityCode: 'IMC', priority: 'HIGH',     level: 'DEPT_HEAD', escalatedAt: '10h ago', dept: 'Sanitation',          daysOpen: 4, cityColor: '#003087' },
  { ticketNumber: 'GRV-2026-00445', title: 'Illegal construction blocking main road',  city: 'Bhopal',   cityCode: 'BMC', priority: 'MEDIUM',   level: 'DEPT_HEAD', escalatedAt: '1d ago',  dept: 'General Admin',       daysOpen: 8, cityColor: '#138808' },
];

const DEPT_DATA = [
  { dept: 'Roads',       Indore: 234, Bhopal: 178, Jabalpur: 89, Gwalior: 67, Ujjain: 34 },
  { dept: 'Water',       Indore: 187, Bhopal: 134, Jabalpur: 67, Gwalior: 45, Ujjain: 28 },
  { dept: 'Sanitation',  Indore: 198, Bhopal: 145, Jabalpur: 78, Gwalior: 56, Ujjain: 31 },
  { dept: 'Electricity', Indore: 145, Bhopal: 98,  Jabalpur: 56, Gwalior: 78, Ujjain: 29 },
];

const TREND_DATA = [
  { month: 'Oct', Indore: 678, Bhopal: 489, Jabalpur: 267, Gwalior: 234, Ujjain: 123 },
  { month: 'Nov', Indore: 712, Bhopal: 523, Jabalpur: 289, Gwalior: 256, Ujjain: 134 },
  { month: 'Dec', Indore: 698, Bhopal: 534, Jabalpur: 301, Gwalior: 245, Ujjain: 145 },
  { month: 'Jan', Indore: 734, Bhopal: 567, Jabalpur: 312, Gwalior: 267, Ujjain: 134 },
  { month: 'Feb', Indore: 798, Bhopal: 589, Jabalpur: 323, Gwalior: 278, Ujjain: 148 },
  { month: 'Mar', Indore: 847, Bhopal: 612, Jabalpur: 334, Gwalior: 289, Ujjain: 156 },
];

const NAV = [
  { to: '/collector/dashboard', label: 'State Overview',  icon: <span>🗺️</span> },
  { to: '/collector/dashboard', label: 'Escalated Cases', icon: <span>🔺</span> },
  { to: '/collector/dashboard', label: 'City Reports',    icon: <span>🏙️</span> },
];

const PRIORITY_CLS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-700', MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',  CRITICAL: 'bg-red-100 text-red-700',
};

export default function CollectorDashboard() {
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  const totalComplaints = CITIES.reduce((s, c) => s + c.stats.total, 0);
  const totalOpen       = CITIES.reduce((s, c) => s + c.stats.open, 0);
  const totalResolved   = CITIES.reduce((s, c) => s + c.stats.resolved, 0);
  const totalBreached   = CITIES.reduce((s, c) => s + c.stats.breached, 0);
  const avgSat          = (CITIES.reduce((s, c) => s + c.stats.satisfaction, 0) / CITIES.length).toFixed(1);

  const filtered    = cityFilter ? ESCALATED.filter(e => e.city === cityFilter) : ESCALATED;
  const criticalNow = ESCALATED.filter(e => e.level === 'COLLECTOR');

  return (
    <SidebarLayout navItems={NAV} title="Divisional Commissioner">
      <LiveAlertPanel />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: '#003087' }}>
              🔒 READ-ONLY
            </span>
            <span className="text-xs font-semibold text-gray-500">
              Divisional Commissioner — Madhya Pradesh
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">State-Level Command Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            राज्य स्तरीय नागरिक शिकायत निगरानी · {CITIES.length} Municipal Corporations · Madhya Pradesh
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> LIVE
        </div>
      </div>

      {/* 🚨 Critical alerts requiring collector */}
      {criticalNow.length > 0 && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl overflow-hidden">
          <div className="bg-red-600 px-5 py-2.5 flex items-center gap-2">
            <span className="text-white font-bold text-sm">🚨 {criticalNow.length} Cases Escalated to Collector Level — Immediate Action Required</span>
          </div>
          <div className="p-4 space-y-2">
            {criticalNow.map(e => (
              <div key={e.ticketNumber} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-red-100">
                <span className="text-xs font-bold px-2 py-0.5 rounded text-white flex-shrink-0"
                  style={{ backgroundColor: e.cityColor }}>{e.cityCode}</span>
                <p className="flex-1 text-sm font-semibold text-gray-800 truncate">{e.title}</p>
                <span className="text-xs text-red-500 flex-shrink-0">{e.daysOpen} days open · {e.escalatedAt}</span>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">{e.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Grievances"  value={totalComplaints.toLocaleString('en-IN')} icon="📋" color="indigo"  delay={0}    sub={`${CITIES.length} cities`} />
        <StatCard label="Open Cases"         value={totalOpen.toLocaleString('en-IN')}        icon="🔓" color="amber"   delay={0.05} sub="awaiting resolution" />
        <StatCard label="Resolved"           value={totalResolved.toLocaleString('en-IN')}    icon="✅" color="emerald" delay={0.1}  sub={`${Math.round((totalResolved/totalComplaints)*100)}% rate`} />
        <StatCard label="SLA Breaches"       value={totalBreached}                            icon="⚠️" color="red"     delay={0.15} sub="all cities" />
        <StatCard label="Avg Satisfaction"   value={`${avgSat}/5`}                            icon="⭐" color="blue"    delay={0.2}  sub="citizen rating" />
      </div>

      {/* City cards */}
      <div className="mb-6">
        <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">
          Municipal Corporation Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {CITIES.map((city, i) => {
            const resRate = Math.round((city.stats.resolved / city.stats.total) * 100);
            const isSelected = cityFilter === city.name;
            return (
              <motion.div key={city.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setCityFilter(isSelected ? null : city.name)}
                className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'shadow-lg scale-105' : 'border-gray-100 hover:border-gray-300'
                }`}
                style={isSelected ? { borderColor: city.color } : {}}>

                {/* City badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: city.color }}>{city.code}</span>
                  <span className={`text-xs font-bold ${
                    resRate >= 75 ? 'text-emerald-600' : resRate >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>{resRate}% ✓</span>
                </div>

                <p className="font-bold text-gray-900 text-sm">{city.name}</p>
                <p className="text-xs text-gray-400 mb-3">{city.population} residents</p>

                <div className="space-y-1 text-xs">
                  {[
                    { l: 'Total',    v: city.stats.total,    cls: 'text-gray-700' },
                    { l: 'Open',     v: city.stats.open,     cls: 'text-amber-600 font-semibold' },
                    { l: 'Breached', v: city.stats.breached, cls: city.stats.breached > 20 ? 'text-red-600 font-semibold' : 'text-gray-600' },
                    { l: 'Avg SLA',  v: `${city.stats.avgHours}h`, cls: 'text-gray-600' },
                    { l: '⭐ Rating', v: `${city.stats.satisfaction}/5`, cls: 'text-amber-600' },
                  ].map(row => (
                    <div key={row.l} className="flex justify-between">
                      <span className="text-gray-400">{row.l}</span>
                      <span className={row.cls}>{row.v}</span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${resRate}%` }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }}
                    style={{ backgroundColor: city.color }} />
                </div>
              </motion.div>
            );
          })}
        </div>
        {cityFilter && (
          <button onClick={() => setCityFilter(null)}
            className="mt-2 text-xs text-blue-600 hover:underline">
            ✕ Clear filter — show all cities
          </button>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Dept-wise Distribution — All Cities</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DEPT_DATA} margin={{ left: -10 }}>
              <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {CITIES.map((c, i) => (
                <Bar key={c.id} dataKey={c.name} fill={c.color} radius={[3, 3, 0, 0]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Trend — 6 Months (All Cities)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {CITIES.map((c, i) => (
                <Line key={c.id} type="monotone" dataKey={c.name}
                  stroke={c.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Escalated table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              🔺 All Escalated Grievances
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {filtered.length}
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {cityFilter ? `Filtered: ${cityFilter}` : 'All cities'} · Read-only view
            </p>
          </div>
          <div className="flex gap-1.5">
            {CITIES.map(c => (
              <button key={c.id} onClick={() => setCityFilter(cityFilter === c.name ? null : c.name)}
                className="text-xs px-2.5 py-1 rounded-full font-bold transition-all border"
                style={cityFilter === c.name
                  ? { backgroundColor: c.color, color: '#fff', borderColor: c.color }
                  : { backgroundColor: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>
                {c.code}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>City</th><th>Ticket</th><th>Complaint</th>
                <th>Dept</th><th>Priority</th><th>Level</th>
                <th>Days Open</th><th>Escalated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <motion.tr key={e.ticketNumber}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}>
                  <td>
                    <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: e.cityColor }}>
                      {e.cityCode}
                    </span>
                  </td>
                  <td><span className="font-mono text-xs text-gray-400">{e.ticketNumber}</span></td>
                  <td className="max-w-[200px]">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                  </td>
                  <td className="text-xs text-gray-500">{e.dept}</td>
                  <td>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_CLS[e.priority]}`}>
                      {e.priority}
                    </span>
                  </td>
                  <td>
                    {e.level === 'COLLECTOR' ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-800 border border-red-200">
                        🚨 Collector
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        🔺 Dept Head
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`font-bold text-sm ${
                      e.daysOpen >= 5 ? 'text-red-600' : e.daysOpen >= 3 ? 'text-amber-600' : 'text-gray-700'
                    }`}>{e.daysOpen}d</span>
                  </td>
                  <td className="text-xs text-gray-400">{e.escalatedAt}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
          <span className="text-blue-400">🔒</span>
          <p className="text-xs text-blue-700">
            <strong>Read-only view.</strong> Divisional Commissioner — Madhya Pradesh.
            For resolution, contact the respective Municipal Commissioner or call the escalation hotline.
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}