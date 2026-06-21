import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  color?: 'indigo' | 'emerald' | 'red' | 'amber' | 'blue' | 'purple';
  trend?: { value: number; label: string };
  delay?: number;
}

const THEMES = {
  indigo:  { bg: 'bg-blue-50',    icon: 'bg-blue-100 text-blue-900',      value: 'text-blue-900',    border: 'border-blue-100'    },
  emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600',value: 'text-emerald-700', border: 'border-emerald-100' },
  red:     { bg: 'bg-red-50',     icon: 'bg-red-100 text-red-600',        value: 'text-red-700',     border: 'border-red-100'     },
  amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-600',    value: 'text-amber-700',   border: 'border-amber-100'   },
  blue:    { bg: 'bg-blue-50',    icon: 'bg-blue-100 text-blue-600',      value: 'text-blue-700',    border: 'border-blue-100'    },
  purple:  { bg: 'bg-purple-50',  icon: 'bg-purple-100 text-purple-600',  value: 'text-purple-700',  border: 'border-purple-100'  },
};

export function StatCard({ label, value, sub, icon, color = 'indigo', trend, delay = 0 }: StatCardProps) {
  const t = THEMES[color];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className={`${t.bg} border ${t.border} rounded-2xl p-5 flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl ${t.icon} flex items-center justify-center flex-shrink-0 text-xl`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${t.value} leading-none`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            <span>{trend.value >= 0 ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}