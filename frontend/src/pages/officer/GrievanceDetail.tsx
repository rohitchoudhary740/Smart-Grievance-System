import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { grievanceApi } from '../../services/grievanceApi';
import { Grievance, GrievanceLog, GrievanceStatus } from '../../types';
import { StatusBadge, PriorityBadge, SLARiskBadge } from '../../components/ui/Badge';
import { SLATimer } from '../../components/shared/SLATimer';
import { Timeline } from '../../components/shared/Timeline';
import { PageLoader, Spinner } from '../../components/ui/Loader';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { formatDateTime } from '../../utils';

const NAV = [
  { to: '/officer/dashboard', label: 'My Tasks', icon: <span>📋</span> },
  { to: '/officer/performance', label: 'Performance', icon: <span>📊</span> },
];

const NEXT_STATUS: Partial<Record<GrievanceStatus, GrievanceStatus>> = {
  [GrievanceStatus.NEW]:         GrievanceStatus.ACCEPTED,
  [GrievanceStatus.ACCEPTED]:    GrievanceStatus.IN_PROGRESS,
  [GrievanceStatus.IN_PROGRESS]: GrievanceStatus.RESOLVED,
};

const ACTION_LABEL: Partial<Record<GrievanceStatus, string>> = {
  [GrievanceStatus.NEW]:         'Accept',
  [GrievanceStatus.ACCEPTED]:    'Start Work',
  [GrievanceStatus.IN_PROGRESS]: 'Mark Resolved',
};

export default function OfficerGrievanceDetail() {
  const { id } = useParams<{ id: string }>();
  const [g, setG] = useState<Grievance | null>(null);
  const [logs, setLogs] = useState<GrievanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const proofRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([grievanceApi.officerGetById(id), grievanceApi.officerGetTimeline(id)])
      .then(([gData, logData]) => { setG(gData); setLogs(logData); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!g) return;
    const next = NEXT_STATUS[g.status];
    if (!next) return;
    setUpdating(true);
    try {
      const updated = await grievanceApi.updateStatus(g._id, next, remarks);
      setG(updated);
      const newLogs = await grievanceApi.officerGetTimeline(g._id);
      setLogs(newLogs);
      setRemarks('');
      toast.success(`Status updated to ${next.replace(/_/g, ' ')}`);

      // SMS simulation
      const officerName = (window as any).__ps_user_name || 'Nodal Officer';
      const smsMap: Partial<Record<GrievanceStatus, string>> = {
        [GrievanceStatus.ACCEPTED]:    `📱 SMS sent: Complaint ${g.ticketNumber} accepted by Officer ${officerName}.`,
        [GrievanceStatus.IN_PROGRESS]: `📱 SMS sent: Complaint ${g.ticketNumber} is under process by Officer ${officerName}.`,
        [GrievanceStatus.RESOLVED]:    `📱 SMS sent: Complaint ${g.ticketNumber} resolved by Officer ${officerName}. Please rate on portal.`,
        [GrievanceStatus.REJECTED]:    `📱 SMS sent: Complaint ${g.ticketNumber} has been rejected. Contact 1800-XXX-XXXX for assistance.`,
      };
      const smsMsg = smsMap[next];
      if (smsMsg) {
        setTimeout(() => toast(smsMsg, {
          icon: '📲',
          duration: 6000,
          style: { background: '#064e3b', color: '#d1fae5', fontSize: '12px', maxWidth: '420px', fontFamily: 'monospace' },
        }), 700);
      }
    } catch { toast.error('Update failed'); }
    finally { setUpdating(false); }
  };

  const handleProofUpload = async (files: FileList) => {
    if (!g || !files.length) return;
    setUploadingProof(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('photos', f));
      const updated = await grievanceApi.uploadProof(g._id, fd);
      setG(updated);
      toast.success('Proof uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingProof(false); }
  };

  if (loading) return <SidebarLayout navItems={NAV} title="Officer Portal"><PageLoader /></SidebarLayout>;
  if (!g) return <SidebarLayout navItems={NAV} title="Officer Portal"><p>Not found.</p></SidebarLayout>;

  const canAdvance = !!NEXT_STATUS[g.status];

  return (
    <SidebarLayout navItems={NAV} title="Officer Portal">
      <Link to="/officer/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        ← Back to dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <span className="text-xs font-mono text-gray-400">#{g.ticketNumber}</span>
              <StatusBadge status={g.status} />
              <PriorityBadge priority={g.priority} />
              {g.slaRisk && <SLARiskBadge risk={g.slaRisk} />}
              {g.isEscalated && (
                <span className="badge bg-red-100 text-red-700">🔺 Escalated</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{g.title}</h1>
            <p className="text-gray-600 mt-2 leading-relaxed">{g.description}</p>
            {g.dueAt && <div className="mt-4"><SLATimer dueAt={g.dueAt} /></div>}
          </div>

          {/* AI metadata */}
          {g.aiMetadata && (
            <div className="card bg-brand-50 border-brand-100">
              <h3 className="text-sm font-semibold text-brand-800 mb-2">🤖 AI Summary</h3>
              <p className="text-sm text-gray-700">{g.aiMetadata.summary}</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <span><span className="text-gray-400">Category:</span> {g.aiMetadata.suggestedCategory}</span>
                <span><span className="text-gray-400">Confidence:</span> {Math.round(g.aiMetadata.confidence * 100)}%</span>
                <span><span className="text-gray-400">Language:</span> {g.aiMetadata.language}</span>
              </div>
            </div>
          )}

          {/* Status update */}
          {canAdvance && (
            <div className="card border-brand-100 bg-brand-50">
              <h3 className="font-semibold text-brand-800 mb-3">Update Status</h3>
              <textarea
                className="textarea text-sm mb-3"
                rows={2}
                placeholder="Add internal remarks (optional)…"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <button onClick={handleStatusUpdate} disabled={updating} className="btn-primary">
                {updating ? <Spinner size="sm" /> : null}
                {ACTION_LABEL[g.status] ?? 'Advance'}
              </button>
            </div>
          )}

          {/* Resolution proof upload */}
          {g.status === GrievanceStatus.IN_PROGRESS && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">📷 Upload Resolution Proof</h3>
              <div
                onClick={() => proofRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-brand-400 transition-colors"
              >
                {uploadingProof ? <Spinner /> : (
                  <>
                    <p className="text-gray-500 text-sm">Click to upload proof photos</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                  </>
                )}
                <input ref={proofRef} type="file" multiple accept="image/*" className="hidden"
                  onChange={(e) => e.target.files && handleProofUpload(e.target.files)} />
              </div>
              {g.resolutionPhotos.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {g.resolutionPhotos.map((p) => (
                    <img key={p.url} src={p.url} alt="proof" className="w-20 h-20 object-cover rounded-lg border border-green-200" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {g.attachments.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">Citizen's Photos</h3>
              <div className="flex flex-wrap gap-2">
                {g.attachments.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
                    <img src={a.url} alt={a.filename} className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-80" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card text-sm space-y-2 text-gray-600">
            <div className="flex justify-between"><span className="text-gray-400">Location</span><span className="text-right text-xs">{g.location.address}</span></div>
            {g.location.ward && <div className="flex justify-between"><span className="text-gray-400">Ward</span><span>{g.location.ward}</span></div>}
            {g.department && <div className="flex justify-between"><span className="text-gray-400">Department</span><span>{g.department.name}</span></div>}
            <div className="flex justify-between"><span className="text-gray-400">Submitted</span><span>{formatDateTime(g.createdAt)}</span></div>
            {g.dueAt && <div className="flex justify-between"><span className="text-gray-400">Due</span><span>{formatDateTime(g.dueAt)}</span></div>}
          </div>

          {g.feedbackRating && (
            <div className="card bg-yellow-50 border-yellow-100">
              <p className="text-sm font-medium text-yellow-800">Citizen Feedback</p>
              <p className="text-lg mt-1">{'⭐'.repeat(g.feedbackRating)} <span className="text-sm text-gray-600">({g.feedbackRating}/5)</span></p>
              {g.feedbackComment && <p className="text-xs text-gray-500 mt-1">"{g.feedbackComment}"</p>}
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Activity Timeline</h3>
            <Timeline logs={logs} />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}