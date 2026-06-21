import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';
import { GrievanceLog, LogEventType } from '../../types';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { PageLoader } from '../../components/ui/Loader';
import { LOG_EVENT_LABEL, formatDateTime } from '../../utils';

const NAV = [
  { to: '/admin/dashboard',   label: 'Command Center', icon: <span>🎯</span> },
  { to: '/admin/grievances',  label: 'All Complaints',  icon: <span>📋</span> },
  { to: '/admin/analytics',   label: 'Analytics',       icon: <span>📊</span> },
  { to: '/admin/departments', label: 'Departments',     icon: <span>🏢</span> },
  { to: '/admin/users',       label: 'Users',           icon: <span>👥</span> },
  { to: '/admin/audit',       label: 'Audit Log',       icon: <span>🔍</span> },
];

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<GrievanceLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    adminApi.getAuditLogs({ eventType: eventFilter || undefined, page, limit: 30 })
      .then((res) => { setLogs(res.data); setTotal(res.total); })
      .finally(() => setLoading(false));
  }, [eventFilter, page]);

  const totalPages = Math.ceil(total / 30);

  return (
    <SidebarLayout navItems={NAV} title="Admin">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <select className="input text-sm w-48" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="">All events</option>
          {Object.values(LogEventType).map((t) => <option key={t} value={t}>{LOG_EVENT_LABEL[t]}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <table className="table-base">
            <thead>
              <tr><th>Event</th><th>Description</th><th>Actor</th><th>Time</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id}>
                  <td><span className="badge bg-gray-100 text-gray-700 text-xs">{LOG_EVENT_LABEL[l.eventType]}</span></td>
                  <td className="text-sm text-gray-700 max-w-sm truncate">{l.description}</td>
                  <td className="text-sm text-gray-500">{l.actor?.name ?? 'System'}</td>
                  <td className="text-xs text-gray-400">{formatDateTime(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm">← Prev</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </SidebarLayout>
  );
}
