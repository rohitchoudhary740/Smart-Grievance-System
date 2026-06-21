import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../services/apiClient';
import { Grievance, GrievanceStatus, GrievanceLog } from '../types';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import { Timeline } from '../components/shared/Timeline';
import { GovTopBar, AshokaChakra } from '../components/shared/GovTopBar';
import { GovFooter } from '../components/shared/GovFooter';
import { formatDate, formatDateTime, initials } from '../utils';

const STATUS_STEPS = [
  { status: GrievanceStatus.NEW,         label: 'Registered',   icon: '📝' },
  { status: GrievanceStatus.ACCEPTED,    label: 'Accepted',     icon: '✅' },
  { status: GrievanceStatus.IN_PROGRESS, label: 'In Progress',  icon: '🔧' },
  { status: GrievanceStatus.RESOLVED,    label: 'Redressed',    icon: '🏆' },
];

function ProgressBar({ status }: { status: GrievanceStatus }) {
  const stepIndex = STATUS_STEPS.findIndex(s => s.status === status);
  const activeIndex = stepIndex >= 0 ? stepIndex : 0;
  const isResolved = status === GrievanceStatus.RESOLVED || status === GrievanceStatus.CLOSED;
  const isBreach   = status === GrievanceStatus.SLA_BREACHED;
  const isReopened = status === GrievanceStatus.REOPENED;

  return (
    <div className="mb-6">
      {(isBreach || isReopened) && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
          isBreach ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-orange-50 border border-orange-200 text-orange-700'
        }`}>
          {isBreach ? '⚠️ SLA deadline has been breached — case escalated to Department Head' : '🔓 Case has been re-opened by citizen'}
        </div>
      )}

      <div className="flex items-center">
        {STATUS_STEPS.map((step, i) => {
          const done    = isResolved ? true : i <= activeIndex;
          const current = i === activeIndex && !isResolved;
          return (
            <React.Fragment key={step.status}>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                  done    ? 'border-green-500 bg-green-50' :
                  current ? 'border-blue-900 bg-blue-50 ring-4 ring-blue-100' :
                  'border-gray-200 bg-white'
                }`}>
                  {done ? (isResolved && i === 3 ? '🏆' : '✓') : step.icon}
                </div>
                <p className={`text-xs font-semibold text-center leading-tight ${
                  done ? 'text-green-700' : current ? 'text-blue-900' : 'text-gray-400'
                }`} style={{ maxWidth: '64px' }}>
                  {step.label}
                </p>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-1.5 mx-1 rounded-full transition-all ${
                  i < activeIndex || isResolved ? 'bg-green-400' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function TrackPage() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [logs, setLogs]           = useState<GrievanceLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [searchInput, setSearchInput] = useState(ticketNumber ?? '');

  const loadByTicket = async (ticket: string) => {
    if (!ticket.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Public endpoint — no auth required
      const { data } = await apiClient.get(`/public/track/${ticket.trim().toUpperCase()}`);
      setGrievance(data.data);
      // Load logs too if available
      try {
        const { data: ld } = await apiClient.get(`/public/track/${ticket.trim().toUpperCase()}/timeline`);
        setLogs(ld.data ?? []);
      } catch { setLogs([]); }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError(`No grievance found with ticket number "${ticket.toUpperCase()}". Please check and try again.`);
      } else {
        setError('Unable to fetch grievance. Please try again later.');
      }
      setGrievance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketNumber) loadByTicket(ticketNumber);
    else setLoading(false);
  }, [ticketNumber]);

  const dept    = grievance ? ((grievance as any).department || (grievance as any).departmentId) : null;
  const officer = grievance ? ((grievance as any).assignedOfficer || (grievance as any).assignedOfficerId) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F4F6F9' }}>
      <GovTopBar showTicker={false} />
      <div style={{ height: '48px' }} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-6">
          <div className="tricolour-strip" />
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <AshokaChakra size={36} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#003087' }}>
                Track Your Grievance
              </h1>
              <p className="text-sm text-gray-500">
                Indore Municipal Corporation — IGRMS
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search box */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-6">
          <label className="label">Enter Grievance / Ticket Number</label>
          <div className="flex gap-2">
            <input
              className="input flex-1 font-mono uppercase"
              placeholder="e.g. GRV-2026-00009"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && loadByTicket(searchInput)}
            />
            <button onClick={() => loadByTicket(searchInput)}
              disabled={loading || !searchInput.trim()}
              className="btn-primary px-6 rounded-xl">
              {loading ? '…' : 'Track'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 You can find your ticket number in the acknowledgement SMS / receipt
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-6 text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Grievance card */}
        {grievance && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            {/* Ticket header */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="tricolour-strip" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                        #{grievance.ticketNumber}
                      </span>
                      <StatusBadge status={grievance.status} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{grievance.title}</h2>
                  </div>
                  <PriorityBadge priority={grievance.priority} />
                </div>

                {/* Progress bar */}
                <ProgressBar status={grievance.status} />

                <p className="text-sm text-gray-600 leading-relaxed mb-4">{grievance.description}</p>

                {/* Key info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Filed On',      value: formatDate(grievance.createdAt) },
                    { label: 'Location',      value: grievance.location.address },
                    { label: 'Department',    value: dept?.name ?? 'Under Review' },
                    { label: 'SLA Due',       value: grievance.dueAt ? formatDate(grievance.dueAt) : '—' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                      <p className="text-gray-800 font-semibold mt-0.5 text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Assigned officer */}
            {officer && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                  👤 Assigned Nodal Officer
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: '#003087' }}>
                    {initials(officer.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{officer.name}</p>
                    <p className="text-xs text-gray-500">{officer.role} — {dept?.name ?? 'Municipal Corporation'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {logs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 text-sm">📋 Activity Timeline</h3>
                <Timeline logs={logs} />
              </div>
            )}

            {/* Bottom actions */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <p className="text-sm font-semibold text-blue-900 mb-3">🔗 Share this status</p>
              <div className="flex gap-2 flex-wrap">
                {/* WhatsApp */}
                <a href={`https://wa.me/?text=${encodeURIComponent(`🏛️ Grievance Status Update\n\nTicket: ${grievance.ticketNumber}\nStatus: ${grievance.status.replace('_',' ')}\nComplaint: ${grievance.title}\n\nTrack: ${window.location.href}`)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 active:scale-95 transition-all">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Share on WhatsApp
                </a>

                <button onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-blue-300 active:scale-95 transition-all">
                  🔗 Copy Link
                </button>

                <Link to="/citizen/submit"
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-xl active:scale-95 transition-all"
                  style={{ backgroundColor: '#003087' }}>
                  + New Grievance
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* No ticket entered yet */}
        {!loading && !grievance && !error && (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
            <p className="text-4xl mb-3">🔍</p>
            <h3 className="font-semibold text-gray-700 mb-1">Track Your Grievance</h3>
            <p className="text-sm text-gray-400">
              Enter your ticket number above to see the current status of your complaint
            </p>
          </div>
        )}
      </main>

      <GovFooter />
    </div>
  );
}