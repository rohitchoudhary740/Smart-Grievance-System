import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../services/authApi';
import { useAuthStore } from '../context/authStore';
import { UserRole } from '../types';
import { Spinner } from '../components/ui/Loader';
import { GovTopBar, AshokaChakra } from '../components/shared/GovTopBar';
import { useT } from '../context/i18nStore';

const DEMO_ROLES = [
  { label: 'Div. Commissioner', sub: 'State Overview — 5 Cities', email: 'admin@demo-city.gov',   password: 'admin123',   icon: '🏅', color: '#7c3aed', dest: '/collector/dashboard' },
  { label: 'Collector / Admin', sub: 'Command Centre Access',     email: 'admin@demo-city.gov',   password: 'admin123',   icon: '🏛️', color: '#FF6B00', dest: '/admin/dashboard'     },
  { label: 'Nodal Officer',     sub: 'Field Operations',          email: 'officer@demo-city.gov', password: 'officer123', icon: '👮', color: '#138808', dest: '/officer/dashboard'   },
  { label: 'Citizen',           sub: 'Lodge Grievance',           email: 'citizen@demo-city.gov', password: 'citizen123', icon: '👤', color: '#003087', dest: '/citizen/dashboard'   },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', tenantSlug: 'demo-city' });
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const t = useT();

  const doLogin = async (email: string, password: string, tenantSlug = 'demo-city', roleLabel?: string, destOverride?: string) => {
    if (roleLabel) setLoadingRole(roleLabel);
    else setLoading(true);
    try {
      const { user, token } = await authApi.login({ email, password, tenantSlug });
      setAuth(user, token);
      toast.success(`Welcome, ${user.name}!`);
      if (destOverride) { navigate(destOverride); return; }
      const dest: Record<UserRole, string> = {
        [UserRole.CITIZEN]:     '/citizen/dashboard',
        [UserRole.OFFICER]:     '/officer/dashboard',
        [UserRole.DEPT_HEAD]:   '/officer/dashboard',
        [UserRole.ADMIN]:       '/admin/dashboard',
        [UserRole.SUPER_ADMIN]: '/admin/dashboard',
      };
      navigate(dest[user.role]);
    } catch {
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F4F6F9' }}>
      {/* Government top bar */}
      <GovTopBar showTicker={false} />
      <div style={{ height: '48px' }} /> {/* Spacer — no ticker on login */}

      {/* Main login area */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-4xl">

          {/* Header card */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white border border-gray-200 rounded-t-2xl overflow-hidden shadow-lg">

            {/* Tricolour strip */}
            <div className="tricolour-strip" />

            <div className="px-8 py-6 flex flex-col md:flex-row items-center gap-6">
              {/* Emblem */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
                  <AshokaChakra size={56} />
                </div>
                <p className="text-xs text-gray-400 text-center leading-tight">
                  Indore Municipal<br />Corporation
                </p>
              </div>

              <div className="text-center md:text-left">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Government of Madhya Pradesh
                </p>
                <h1 className="text-2xl font-bold leading-tight" style={{ color: '#003087' }}>
                  Integrated Grievance Redressal
                </h1>
                <h2 className="text-2xl font-bold leading-tight" style={{ color: '#003087' }}>
                  & Monitoring System
                </h2>
                <p className="text-gray-500 text-sm mt-1.5">
                  एकीकृत शिकायत निवारण एवं निगरानी प्रणाली (IGRMS)
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3 justify-center md:justify-start">
                  <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-semibold">
                    🤖 AI Powered
                  </span>
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-semibold">
                    🇮🇳 Digital India
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                    🏙️ Smart City
                  </span>
                  <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full font-semibold">
                    🔒 Secure Portal
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Login + Demo grid */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid md:grid-cols-2 gap-0 bg-white border-x border-b border-gray-200 rounded-b-2xl shadow-lg overflow-hidden">

            {/* Left: Login form */}
            <div className="p-8 border-r border-gray-100">
              <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span style={{ color: '#003087' }}>🔐</span> Sign In to Portal
              </h3>

              <form onSubmit={e => { e.preventDefault(); doLogin(form.email, form.password, form.tenantSlug); }}
                className="space-y-4">
                <div>
                  <label className="label">Organisation / City Code</label>
                  <input type="text" className="input" placeholder="demo-city"
                    value={form.tenantSlug} onChange={e => setForm({ ...form, tenantSlug: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Official Email / User ID</label>
                  <input type="email" className="input" placeholder="user@department.gov.in"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" placeholder="••••••••"
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                </div>

                <button type="submit" disabled={loading}
                  className="btn-primary w-full justify-center py-3 text-base rounded-xl mt-2">
                  {loading ? <><Spinner size="sm" /> Signing In…</> : '🔐 Sign In Securely'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-4">
                New citizen?{' '}
                <Link to="/register" className="font-semibold hover:underline" style={{ color: '#003087' }}>
                  Register here
                </Link>
              </p>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                <p className="font-semibold mb-1">⚠ Security Notice</p>
                <p>This is an official Government portal. Unauthorised access is prohibited under IT Act, 2000.</p>
              </div>
            </div>

            {/* Right: Quick demo access */}
            <div className="p-8 bg-gray-50">
              <h3 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span>⚡</span> Quick Demo Access
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Select a role to log in instantly for demonstration
              </p>

              <div className="grid grid-cols-2 gap-3">
                {DEMO_ROLES.map(r => (
                  <button key={r.label}
                    onClick={() => doLogin(r.email, r.password, 'demo-city', r.label, (r as any).dest)}
                    disabled={!!loadingRole}
                    className="w-full flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all active:scale-98 disabled:opacity-60 text-left">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: r.color + '15', border: `1px solid ${r.color}30` }}>
                      {r.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{r.label}</p>
                      <p className="text-xs text-gray-500">{r.sub}</p>
                    </div>
                    {loadingRole === r.label
                      ? <Spinner size="sm" />
                      : <span className="text-gray-300 text-lg">›</span>}
                  </button>
                ))}
              </div>

              <div className="mt-5 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                <p className="font-semibold mb-1">🔑 Demo Credentials</p>
                <p>Org ID: <code className="font-mono bg-blue-100 px-1 rounded">demo-city</code></p>
                <p className="mt-1 text-blue-600">All passwords: admin123 / officer123 / citizen123</p>
              </div>
            </div>
          </motion.div>

          {/* Scheme logos bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-4 bg-white border border-gray-200 rounded-xl px-6 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-gray-400 font-medium">
              {['🇮🇳 Digital India', '🏙️ Smart Cities Mission', '🧹 Swachh Bharat', '🏠 AMRUT 2.0', '📡 BharatNet'].map(s => (
                <span key={s} className="flex items-center gap-1">{s}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}