import React, { useEffect, useState } from 'react';
import { grievanceApi } from '../../services/grievanceApi';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { PageLoader } from '../../components/ui/Loader';
import { StatCard } from '../../components/ui/StatCard';

const NAV = [
  { to: '/officer/dashboard',   label: 'My Tasks',    icon: <span>📋</span> },
  { to: '/officer/performance', label: 'Performance', icon: <span>📊</span> },
];

interface Perf { resolved: number; avgHours: number; slaHit: number; slaMiss: number; }

export default function OfficerPerformance() {
  const [perf, setPerf] = useState<Perf | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    grievanceApi.officerPerformance().then(d => setPerf(d as Perf)).finally(() => setLoading(false));
  }, []);

  if (loading) return <SidebarLayout navItems={NAV} title="Officer Portal"><PageLoader /></SidebarLayout>;

  const hitRate = perf ? Math.round((perf.slaHit / (perf.slaHit + perf.slaMiss || 1)) * 100) : 0;

  return (
    <SidebarLayout navItems={NAV} title="Officer Portal">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Performance</h1>
          <p className="page-subtitle">Your resolution stats and SLA compliance</p>
        </div>
      </div>
      {perf && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Complaints Resolved" value={perf.resolved}    icon="✅" color="emerald" delay={0}    />
          <StatCard label="Avg Resolution Time" value={`${perf.avgHours}h`} icon="⏱" color="blue"    delay={0.05} />
          <StatCard label="SLA Hit"             value={perf.slaHit}      icon="🎯" color="indigo"  delay={0.1}  />
          <StatCard label="SLA Hit Rate"        value={`${hitRate}%`}    icon="📈"
            color={hitRate >= 80 ? 'emerald' : hitRate >= 50 ? 'amber' : 'red'} delay={0.15}
            sub={`${perf.slaMiss} missed`} />
        </div>
      )}
    </SidebarLayout>
  );
}