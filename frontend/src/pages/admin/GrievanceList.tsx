import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { grievanceApi } from '../../services/grievanceApi';
import { adminApi } from '../../services/adminApi';
import { Grievance, GrievanceStatus, Priority, Department } from '../../types';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { SLATimer } from '../../components/shared/SLATimer';
import { SkeletonRow } from '../../components/ui/Loader';
import { timeAgo, downloadBlob } from '../../utils';

const NAV = [
  { to: '/admin/dashboard',   label: 'Command Center', icon: <span>🎯</span> },
  { to: '/admin/grievances',  label: 'All Complaints',  icon: <span>📋</span> },
  { to: '/admin/analytics',   label: 'Analytics',       icon: <span>📊</span> },
  { to: '/admin/departments', label: 'Departments',     icon: <span>🏢</span> },
  { to: '/admin/users',       label: 'Users',           icon: <span>👥</span> },
  { to: '/admin/audit',       label: 'Audit Log',       icon: <span>🔍</span> },
];

export default function AdminGrievanceList() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '', priority: '', departmentId: '', search: '', isEscalated: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await grievanceApi.adminGrievances({
        ...filters,
        status: filters.status as GrievanceStatus || undefined,
        priority: filters.priority as Priority || undefined,
        departmentId: filters.departmentId || undefined,
        isEscalated: filters.isEscalated === 'true' ? true : undefined,
        page,
        limit: 20,
      });
      setGrievances(res.data);
      setTotal(res.total);
    } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { adminApi.getDepartments().then(setDepartments); }, []);

  const handleExport = async () => {
    try {
      const blob = await adminApi.exportGrievances(filters as Record<string, string>);
      downloadBlob(blob, `grievances-export-${Date.now()}.csv`);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  const setFilter = (key: string, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  const totalPages = Math.ceil(total / 20);

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Delete this complaint? This cannot be undone.');
    if (!ok) return;
    setDeletingId(id);
    try {
      await grievanceApi.deleteAdmin(id);
      toast.success('Complaint deleted');
      await load();
    } catch {
      toast.error('Failed to delete complaint');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SidebarLayout navItems={NAV} title="Admin">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Complaints</h1>
          <p className="text-gray-500 text-sm">{total} total</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          ⬇ Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input className="input text-sm" placeholder="Search…" value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)} />

          <select className="input text-sm" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {Object.values(GrievanceStatus).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="input text-sm" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
            <option value="">All priorities</option>
            {Object.values(Priority).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select className="input text-sm" value={filters.departmentId} onChange={(e) => setFilter('departmentId', e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>

          <select className="input text-sm" value={filters.isEscalated} onChange={(e) => setFilter('isEscalated', e.target.value)}>
            <option value="">All</option>
            <option value="true">Escalated only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Department</th>
                <th>Officer</th>
                <th>SLA</th>
                <th>Filed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : grievances.map((g, i) => (
                    <motion.tr
                      key={g._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="cursor-pointer"
                    >
                      <td><span className="font-mono text-xs text-gray-500">#{g.ticketNumber}</span></td>
                      <td>
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 truncate text-sm">{g.title}</p>
                          <p className="text-xs text-gray-400 truncate">{g.location.address}</p>
                        </div>
                      </td>
                      <td><StatusBadge status={g.status} /></td>
                      <td><PriorityBadge priority={g.priority} /></td>
                      <td className="text-sm text-gray-600">{((g as any).department || (g as any).departmentId)?.name ?? <span className="text-gray-300">—</span>}</td>
                      <td className="text-sm text-gray-600">{((g as any).assignedOfficer || (g as any).assignedOfficerId)?.name ?? <span className="text-gray-300">Unassigned</span>}</td>
                      <td>
                        {g.dueAt
                          ? <SLATimer dueAt={g.dueAt} compact />
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="text-xs text-gray-400">{timeAgo(g.createdAt)}</td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(g._id);
                          }}
                          disabled={deletingId === g._id}
                          className="btn-danger btn-sm"
                          title="Delete complaint"
                        >
                          {deletingId === g._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
    </SidebarLayout>
  );
}
