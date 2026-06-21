import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../services/adminApi';
import { Department } from '../../types';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { PageLoader } from '../../components/ui/Loader';

const NAV = [
  { to: '/admin/dashboard',   label: 'Command Center', icon: <span>🎯</span> },
  { to: '/admin/grievances',  label: 'All Complaints',  icon: <span>📋</span> },
  { to: '/admin/analytics',   label: 'Analytics',       icon: <span>📊</span> },
  { to: '/admin/departments', label: 'Departments',     icon: <span>🏢</span> },
  { to: '/admin/users',       label: 'Users',           icon: <span>👥</span> },
  { to: '/admin/audit',       label: 'Audit Log',       icon: <span>🔍</span> },
];

export default function AdminDepartments() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDepartments().then(setDepts).finally(() => setLoading(false));
  }, []);

  if (loading) return <SidebarLayout navItems={NAV} title="Admin"><PageLoader /></SidebarLayout>;

  return (
    <SidebarLayout navItems={NAV} title="Admin">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Departments</h1>
      <div className="grid gap-4">
        {depts.map((d) => (
          <div key={d._id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{d.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{d.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {d.categories.map((c) => (
                    <span key={c} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
              <span className={`badge ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {d.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
              {d.slaConfigs.length} SLA rule(s) configured
            </div>
          </div>
        ))}
      </div>
    </SidebarLayout>
  );
}
