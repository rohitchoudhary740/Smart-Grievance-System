import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../context/authStore';
import { UserRole } from '../types';
import { initials } from '../utils';
import { GovTopBar, AshokaChakra } from '../components/shared/GovTopBar';
import { useT } from '../context/i18nStore';
import { GovFooter } from '../components/shared/GovFooter';
import { CitizenChatbotWidget } from '../components/shared/CitizenChatbotWidget';

interface NavItem { to: string; label: string; icon: React.ReactNode; }
interface SidebarLayoutProps {
  navItems: NavItem[];
  children: React.ReactNode;
  title: string;
  tickerItems?: string[];
}

const ROLE_META: Record<UserRole, { label: string; sub: string; badgeBg: string }> = {
  [UserRole.CITIZEN]:     { label: 'Citizen',          sub: 'Public Portal',       badgeBg: 'bg-blue-500/20'   },
  [UserRole.OFFICER]:     { label: 'Nodal Officer',     sub: 'Field Operations',    badgeBg: 'bg-green-500/20'  },
  [UserRole.DEPT_HEAD]:   { label: 'Dept. Head',        sub: 'Department Control',  badgeBg: 'bg-purple-500/20' },
  [UserRole.ADMIN]:       { label: 'Collector / Admin', sub: 'Command Centre',      badgeBg: 'bg-orange-500/20' },
  [UserRole.SUPER_ADMIN]: { label: 'Super Admin',       sub: 'System Control',      badgeBg: 'bg-red-500/20'    },
};

// Top bar height: ~80px (identity bar ~44 + tricolour 4 + ticker 28 = 76px)
const TOP_HEIGHT = 76;

export function SidebarLayout({ navItems, children, title, tickerItems }: SidebarLayoutProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const roleMeta = user ? ROLE_META[user.role] : null;
  const t = useT();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed government top bar */}
      <GovTopBar tickerItems={tickerItems} />

      {/* Spacer for fixed top bar */}
      <div style={{ height: `${TOP_HEIGHT}px` }} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <motion.aside
          initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="w-64 flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ backgroundColor: '#002070', minHeight: `calc(100vh - ${TOP_HEIGHT}px)` }}>

          {/* System branding */}
          <div className="px-4 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 p-1">
                <AshokaChakra size={28} />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-bold leading-tight">IGRMS</p>
                <p className="text-blue-300 text-xs leading-tight truncate">{title}</p>
              </div>
            </div>
            {/* Tricolour accent under brand */}
            <div className="mt-3 h-0.5 rounded-full overflow-hidden">
              <div className="h-full" style={{
                background: 'linear-gradient(to right, #FF6B00 33%, #fff 33% 66%, #138808 66%)'
              }} />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-0.5">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider px-3 mb-2">
              Navigation Menu
            </p>
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span className="w-4 h-4 flex-shrink-0 opacity-80">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User info */}
          {user && roleMeta && (
            <div className="px-3 py-4 border-t border-white/10">
              <div className={`flex items-center gap-2.5 p-2.5 rounded-lg ${roleMeta.badgeBg} mb-2.5`}>
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{initials(user.name)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-semibold truncate">{user.name}</p>
                  <p className="text-blue-300 text-xs truncate">{roleMeta.label}</p>
                  <p className="text-blue-400 text-xs truncate">{roleMeta.sub}</p>
                </div>
              </div>
              <button onClick={() => { clearAuth(); navigate('/login'); }}
                className="w-full text-xs text-blue-300 hover:text-white hover:bg-white/10 py-1.5 rounded-lg transition-colors">
                {t('nav.signOut')}
              </button>
            </div>
          )}

          {/* Helpline at bottom of sidebar */}
          <div className="px-4 py-3 border-t border-white/10 bg-white/5">
            <p className="text-xs text-blue-400 font-medium">☎ {t('common.helpline')}</p>
            <p className="text-white text-sm font-bold mt-0.5">1800-XXX-XXXX</p>
            <p className="text-blue-400 text-xs">{t('common.available247')}</p>
          </div>
        </motion.aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ backgroundColor: 'var(--gov-bg)' }}>
          <main id="main-content" className="flex-1 p-6 max-w-7xl w-full mx-auto">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}>
              {children}
            </motion.div>
          </main>
          <GovFooter />
        </div>
      </div>

      {/* Citizen AI assistant (hidden for non-citizen roles) */}
      {user?.role === UserRole.CITIZEN && <CitizenChatbotWidget />}
    </div>
  );
}