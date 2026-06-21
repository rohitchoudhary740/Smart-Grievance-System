
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { grievanceApi } from '../../services/grievanceApi';
import { Grievance, GrievanceLog, GrievanceStatus } from '../../types';
import { StatusBadge, PriorityBadge, SLARiskBadge } from '../../components/ui/Badge';
import { SLATimer } from '../../components/shared/SLATimer';
import { Timeline } from '../../components/shared/Timeline';
import { PageLoader } from '../../components/ui/Loader';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { ShareComplaint } from '../../components/shared/ShareComplaint';
import { ComplaintQR } from '../../components/shared/ComplaintQR';
import { formatDate, formatDateTime, initials } from '../../utils';

const NAV = [
  { to: '/citizen/dashboard', label: 'My Complaints', icon: <span>🏠</span> },
  { to: '/citizen/submit', label: 'Submit Complaint', icon: <span>➕</span> },
];

export default function GrievanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [g, setG] = useState<Grievance | null>(null);
  const [logs, setLogs] = useState<GrievanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([grievanceApi.getById(id), grievanceApi.getTimeline(id)])
      .then(([gData, logData]) => { setG(gData); setLogs(logData); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFeedback = async () => {
    if (!id) return;
    setSubmittingFeedback(true);
    try {
      await grievanceApi.submitFeedback(id, feedback);
      toast.success('Thank you for your feedback!');
      const updated = await grievanceApi.getById(id);
      setG(updated);
    } catch {
      toast.error('Failed to submit feedback');
    } finally { setSubmittingFeedback(false); }
  };

  const handleReopen = async () => {
    if (!id || !reopenReason.trim()) { toast.error('Please provide a reason'); return; }
    setReopening(true);
    try {
      const updated = await grievanceApi.reopen(id, reopenReason);
      setG(updated);
      toast.success('Case re-opened');
      setReopenReason('');
    } catch { toast.error('Failed to reopen'); }
    finally { setReopening(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = window.confirm('Delete this complaint? This cannot be undone.');
    if (!ok) return;
    setDeleting(true);
    try {
      await grievanceApi.deleteCitizen(id);
      toast.success('Complaint deleted');
      navigate('/citizen/dashboard');
    } catch {
      toast.error('Failed to delete complaint');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <SidebarLayout navItems={NAV} title="Citizen Portal"><PageLoader /></SidebarLayout>;
  if (!g) return <SidebarLayout navItems={NAV} title="Citizen Portal"><p>Not found.</p></SidebarLayout>;

  const isResolved = g.status === GrievanceStatus.RESOLVED || g.status === GrievanceStatus.CLOSED;
  // Mongoose populates as departmentId/assignedOfficerId objects
  const dept = (g as any).department || (g as any).departmentId;
  const officer = (g as any).assignedOfficer || (g as any).assignedOfficerId;
  const hasFeedback = !!g.feedbackRating;

  return (
    <SidebarLayout navItems={NAV} title="Citizen Portal">
      <Link to="/citizen/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        ← Back to complaints
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-xs font-mono text-gray-400">#{g.ticketNumber}</span>
                <h1 className="text-xl font-bold text-gray-900 mt-0.5">{g.title}</h1>
              </div>
              <div className="flex flex-wrap gap-2 justify-end items-center">
                <StatusBadge status={g.status} />
                <PriorityBadge priority={g.priority} />
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger btn-sm"
                  title="Delete complaint"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed">{g.description}</p>
            {g.dueAt && <div className="mt-4"><SLATimer dueAt={g.dueAt} /></div>}
          </motion.div>

          {/* Location */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-2">📍 Location</h3>
            <p className="text-gray-600">{g.location.address}</p>
            {g.location.ward && <p className="text-sm text-gray-400">Ward: {g.location.ward}</p>}
          </div>

          {/* AI Metadata */}
          {g.aiMetadata && (
            <div className="card bg-brand-50 border-brand-100">
              <h3 className="font-semibold text-brand-800 mb-3 flex items-center gap-2">
                <span>🤖</span> AI Classification
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Category:</span> <strong>{g.aiMetadata.suggestedCategory}</strong></div>
                <div><span className="text-gray-500">Department:</span> <strong>{g.aiMetadata.suggestedDepartmentName}</strong></div>
                <div><span className="text-gray-500">Priority:</span> <PriorityBadge priority={g.priority} /></div>
                <div><span className="text-gray-500">SLA Risk:</span> <SLARiskBadge risk={g.slaRisk} /></div>
              </div>
              <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-brand-100">{g.aiMetadata.summary}</p>
            </div>
          )}

          {/* Photos */}
          {g.attachments.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">Submitted Photos</h3>
              <div className="flex flex-wrap gap-3">
                {g.attachments.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
                    <img src={a.url} alt={a.filename} className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution photos */}
          {g.resolutionPhotos.length > 0 && (
            <div className="card border-green-100 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-3">✅ Resolution Proof</h3>
              <div className="flex flex-wrap gap-3">
                {g.resolutionPhotos.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
                    <img src={a.url} alt={a.filename} className="w-24 h-24 object-cover rounded-lg border border-green-200 hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {isResolved && !hasFeedback && (
            <div className="card border-yellow-100 bg-yellow-50">
              <h3 className="font-semibold text-yellow-800 mb-3">⭐ Rate this resolution</h3>
              <div className="flex gap-2 mb-3">
                {[1,2,3,4,5].map((r) => (
                  <button key={r} onClick={() => setFeedback({ ...feedback, rating: r })}
                    className={`text-2xl transition-transform hover:scale-110 ${feedback.rating >= r ? '' : 'opacity-30'}`}>
                    ⭐
                  </button>
                ))}
              </div>
              <textarea className="textarea text-sm" rows={2} placeholder="Optional comment…"
                value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} />
              <button onClick={handleFeedback} disabled={submittingFeedback} className="btn-primary mt-3">
                Submit Feedback
              </button>
              {g.canReopen && (
                <div className="mt-4 pt-4 border-t border-yellow-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">Not satisfied? Re-open this case:</p>
                  <textarea className="textarea text-sm" rows={2} placeholder="Reason for re-opening…"
                    value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                  <button onClick={handleReopen} disabled={reopening} className="btn-danger mt-2">
                    Re-open Case
                  </button>
                </div>
              )}
            </div>
          )}

          {hasFeedback && (
            <div className="card bg-green-50 border-green-100">
              <p className="text-sm font-medium text-green-700">
                You rated this resolution {'⭐'.repeat(g.feedbackRating!)} ({g.feedbackRating}/5)
              </p>
              {g.feedbackComment && <p className="text-sm text-gray-600 mt-1">"{g.feedbackComment}"</p>}
            </div>
          )}

          {/* Share tracking link */}
          <ShareComplaint grievance={g} />

          {/* QR Code receipt */}
          <ComplaintQR grievance={g} />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Assigned officer */}
          {officer && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">👤 Assigned Officer</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-semibold text-sm flex items-center justify-center">
                  {initials(officer.name)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{officer.name}</p>
                  <p className="text-xs text-gray-500">{officer.role}</p>
                  {officer.phone && (
                    <p className="text-xs text-brand-600 mt-0.5">{officer.phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Department */}
          {dept && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-1">🏢 Department</h3>
              <p className="text-gray-700">{dept.name}</p>
              {g.estimatedResolutionTime && (
                <p className="text-sm text-brand-600 mt-1">⏱ {g.estimatedResolutionTime}</p>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="card text-sm space-y-2 text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-400">Submitted</span>
              <span>{formatDate(g.createdAt)}</span>
            </div>
            {g.dueAt && (
              <div className="flex justify-between">
                <span className="text-gray-400">SLA Due</span>
                <span>{formatDate(g.dueAt)}</span>
              </div>
            )}
            {g.resolvedAt && (
              <div className="flex justify-between">
                <span className="text-gray-400">Resolved</span>
                <span className="text-green-600">{formatDateTime(g.resolvedAt)}</span>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Activity</h3>
            <Timeline logs={logs} />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}