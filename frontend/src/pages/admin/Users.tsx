import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/adminApi';
import { User, UserRole } from '../../types';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { PageLoader } from '../../components/ui/Loader';
import { ROLE_LABEL, initials } from '../../utils';

const NAV = [
  { to: '/admin/dashboard',   label: 'Command Center', icon: <span>🎯</span> },
  { to: '/admin/grievances',  label: 'All Complaints',  icon: <span>📋</span> },
  { to: '/admin/analytics',   label: 'Analytics',       icon: <span>📊</span> },
  { to: '/admin/departments', label: 'Departments',     icon: <span>🏢</span> },
  { to: '/admin/users',       label: 'Users',           icon: <span>👥</span> },
  { to: '/admin/audit',       label: 'Audit Log',       icon: <span>🔍</span> },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const promoteToOfficer = async (userId: string) => {
    try {
      const updated = await adminApi.updateUserRole(userId, UserRole.OFFICER);
      setUsers((prev) => prev.map((u) => u._id === updated._id ? updated : u));
      toast.success('User promoted to Officer');
    } catch { toast.error('Failed to update role'); }
  };

  if (loading) return <SidebarLayout navItems={NAV} title="Admin"><PageLoader /></SidebarLayout>;

  return (
    <SidebarLayout navItems={NAV} title="Admin">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Users</h1>
      <div className="card p-0 overflow-hidden">
        <table className="table-base">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs flex items-center justify-center font-semibold">
                      {initials(u.name)}
                    </div>
                    <span className="font-medium text-sm">{u.name}</span>
                  </div>
                </td>
                <td className="text-gray-500 text-sm">{u.email}</td>
                <td><span className="badge bg-gray-100 text-gray-600">{ROLE_LABEL[u.role]}</span></td>
                <td className="text-gray-500 text-sm">{u.department?.name ?? '—'}</td>
                <td>
                  <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {u.role === UserRole.CITIZEN && (
                    <button onClick={() => promoteToOfficer(u._id)} className="btn-secondary btn-sm">
                      Promote → Officer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}
