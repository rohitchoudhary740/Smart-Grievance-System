import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../hooks/useSocket';
import { SocketEvent, CriticalZone } from '../../types';

interface Alert {
  id: string;
  type: 'sla' | 'escalation' | 'zone';
  message: string;
  at: Date;
}

export function LiveAlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const push = (alert: Omit<Alert, 'id' | 'at'>) => {
    const entry: Alert = { ...alert, id: Math.random().toString(36).slice(2), at: new Date() };
    setAlerts((prev) => [entry, ...prev].slice(0, 6)); // keep last 6
    // Auto-dismiss after 12s
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== entry.id));
    }, 12_000);
  };

  useSocket(SocketEvent.SLA_BREACHED, () => {
    push({ type: 'sla', message: 'SLA breach detected on a complaint' });
  });

  useSocket<{ level: string }>(SocketEvent.ESCALATION, (data) => {
    push({ type: 'escalation', message: `Escalation to ${data.level} triggered` });
  });

  useSocket<CriticalZone>(SocketEvent.CRITICAL_ZONE, (zone) => {
    push({ type: 'zone', message: `Critical zone: ${zone.ward} — ${zone.count} complaints` });
  });

  if (!alerts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {alerts.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-modal border text-sm ${
              a.type === 'sla'       ? 'bg-red-50 border-red-200 text-red-800' :
              a.type === 'zone'      ? 'bg-orange-50 border-orange-200 text-orange-800' :
              'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span className="text-lg flex-shrink-0">
              {a.type === 'sla' ? '⚠️' : a.type === 'zone' ? '🚨' : '🔺'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs uppercase tracking-wide opacity-60 mb-0.5">
                Live Alert
              </p>
              <p className="font-medium">{a.message}</p>
            </div>
            <button
              onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))}
              className="text-current opacity-40 hover:opacity-70 flex-shrink-0"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
