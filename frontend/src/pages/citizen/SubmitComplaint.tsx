
import React, { useState, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { grievanceApi } from '../../services/grievanceApi';
import { Grievance } from '../../types';
import { Spinner } from '../../components/ui/Loader';
import { SidebarLayout } from '../../layouts/SidebarLayout';
import { VoiceInput } from '../../components/shared/VoiceInput';
import { ShareComplaint } from '../../components/shared/ShareComplaint';
import { useT } from '../../context/i18nStore';
import { LocationPickerMap } from '../../components/shared/LocationPickerMap';

// Lazy load QR to prevent any import-chain crashes on page load
const ComplaintQR = lazy(() =>
  import('../../components/shared/ComplaintQR').then(m => ({ default: m.ComplaintQR }))
);

const NAV = [
  { to: '/citizen/dashboard', label: 'My Complaints', icon: <span>🏠</span> },
  { to: '/citizen/submit',    label: 'New Complaint',  icon: <span>➕</span> },
];

interface AIPreview {
  suggestedCategory: string;
  suggestedDepartmentName: string;
  priority: string;
  slaRisk: string;
  summary: string;
  estimatedResolutionTime?: string;
}

export default function SubmitComplaintPage() {
  const navigate = useNavigate();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const STEPS = [
    t('submit.stepDetails'),
    t('submit.stepLocation'),
    t('submit.stepPhotos'),
    t('submit.stepReview'),
  ];

  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState({
    title: '', description: '', address: '', ward: '', lat: '', lng: '', category: '',
  });
  const [files, setFiles]         = useState<File[]>([]);
  const [ai, setAi]               = useState<AIPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Grievance | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const [locNonce, setLocNonce]  = useState(0);

  const set = (key: keyof typeof form, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const canNext = () => {
    if (step === 0) return form.title.trim().length > 0 && form.description.trim().length > 0;
    if (step === 1) return form.address.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('address', form.address);
      if (form.ward)     fd.append('ward', form.ward);
      if (form.lat)      fd.append('lat', form.lat);
      if (form.lng)      fd.append('lng', form.lng);
      if (form.category) fd.append('category', form.category);
      files.forEach(f => fd.append('photos', f));

      const grievance = await grievanceApi.create(fd);
      setSubmitted(grievance);
      if (grievance.aiMetadata) {
        setAi({
          suggestedCategory:       grievance.aiMetadata.suggestedCategory,
          suggestedDepartmentName: grievance.aiMetadata.suggestedDepartmentName,
          priority:                grievance.aiMetadata.priority,
          slaRisk:                 grievance.aiMetadata.slaRisk,
          summary:                 grievance.aiMetadata.summary,
          estimatedResolutionTime: grievance.estimatedResolutionTime,
        });
      }
      toast.success('Complaint submitted successfully!');
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      const duplicateOfId = err?.response?.data?.data?.duplicateOfId;

      // Duplicate: ask user to support the existing complaint instead
      if (status === 409 && duplicateOfId && message) {
        const wantsSupport = window.confirm(message);
        if (wantsSupport) {
          try {
            await grievanceApi.support(duplicateOfId);
            toast.success('Support added successfully!');
            navigate(`/citizen/grievances/${duplicateOfId}`);
            return;
          } catch {
            toast.error('Failed to add support. Please try again.');
            return;
          }
        }
        // User declined adding support; don't treat it as a submission error.
        return;
      }

      toast.error(message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(null); setAi(null); setStep(0);
    setForm({ title: '', description: '', address: '', ward: '', lat: '', lng: '', category: '' });
    setFiles([]);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SidebarLayout navItems={NAV} title="Citizen Portal">
        <div className="max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="card text-center py-8 px-6">

            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              className="text-5xl mb-3">✅</motion.div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Complaint Submitted!</h2>
            <p className="text-gray-500 text-sm mb-3">Your grievance has been registered</p>

            <p className="font-mono text-xl font-bold px-4 py-2 rounded-xl inline-block mb-6 border-2"
              style={{ color: '#003087', backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }}>
              #{submitted.ticketNumber}
            </p>

            {/* AI Result */}
            {ai && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-left mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🤖</span>
                  <p className="text-sm font-bold" style={{ color: '#003087' }}>AI Analysis Complete</p>
                  <span className="ml-auto text-xs bg-blue-100 px-2 py-0.5 rounded-full font-medium text-blue-700">
                    Smart Analysis
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  {[
                    { l: 'Category',   v: ai.suggestedCategory },
                    { l: 'Department', v: ai.suggestedDepartmentName },
                    { l: 'Priority',   v: ai.priority },
                    { l: 'SLA Risk',   v: ai.slaRisk },
                  ].map(r => (
                    <div key={r.l} className="bg-white rounded-xl p-2.5 border border-blue-100">
                      <p className="text-xs text-gray-400 mb-0.5">{r.l}</p>
                      <p className="font-semibold text-gray-800 capitalize text-xs">{r.v}</p>
                    </div>
                  ))}
                </div>
                {ai.summary && (
                  <p className="text-xs text-gray-600 bg-white rounded-xl p-2.5 border border-blue-100 leading-relaxed">
                    📝 {ai.summary}
                  </p>
                )}
                {ai.estimatedResolutionTime && (
                  <p className="text-sm font-semibold mt-2" style={{ color: '#003087' }}>
                    ⏱ {ai.estimatedResolutionTime}
                  </p>
                )}
              </motion.div>
            )}

            {/* WhatsApp Share */}
            <div className="text-left mb-4">
              <ShareComplaint grievance={submitted} />
            </div>

            {/* QR Code — lazy loaded so it never blocks the page */}
            <div className="text-left mb-5">
              <Suspense fallback={
                <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center text-sm text-gray-400">
                  Loading QR Code…
                </div>
              }>
                <ComplaintQR grievance={submitted} />
              </Suspense>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate(`/citizen/grievances/${submitted._id}`)}
                className="btn-primary">
                Track Status
              </button>
              <button onClick={resetForm} className="btn-secondary">
                Submit Another
              </button>
            </div>
          </motion.div>
        </div>
      </SidebarLayout>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <SidebarLayout navItems={NAV} title="Citizen Portal">
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="page-title">{t('submit.title')}</h1>
          <p className="page-subtitle">{t('submit.subtitle')}</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-2 ${i <= step ? '' : 'opacity-40'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step  ? 'text-white' :
                  i === step ? 'ring-2 ring-offset-1' : 'bg-gray-100 text-gray-400'
                }`}
                style={i < step ? { backgroundColor: '#003087' } :
                       i === step ? { backgroundColor: '#EEF2FF', color: '#003087', ringColor: '#003087' } : {}}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:block text-gray-600">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${i < step ? '' : 'bg-gray-200'}`}
                  style={i < step ? { backgroundColor: '#003087' } : {}} />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
            <div className="card space-y-5">

              {/* Step 0 — Details */}
              {step === 0 && (
                <>
                  <div>
                    <label className="label">Complaint Title <span className="text-red-500">*</span></label>
                    <input className="input" placeholder="Brief title of your complaint"
                      value={form.title} onChange={e => set('title', e.target.value)} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="label mb-0">Description <span className="text-red-500">*</span></label>
                      <button type="button" onClick={() => setShowVoice(v => !v)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                          showVoice
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                        }`}>
                        🎤 {showVoice ? 'Hide Voice' : 'Voice Input'}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showVoice && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} className="mb-3 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl overflow-hidden">
                          <p className="text-xs font-semibold text-indigo-700 mb-3">
                            🎤 Voice Input — <span className="font-normal">speak in English or Hinglish</span>
                          </p>
                          <VoiceInput
                            onTranscript={text => {
                              set('description', form.description ? form.description + ' ' + text : text);
                              setShowVoice(false);
                              toast.success('Voice added!');
                            }}
                            placeholder="Speak your complaint…"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <textarea className="textarea" rows={4}
                      placeholder="Describe your complaint in detail. Hindi, English, or Hinglish all work."
                      value={form.description} onChange={e => set('description', e.target.value)} />
                    <p className="text-xs text-gray-400 mt-1.5">🌐 Multilingual — Hindi, English, Hinglish supported</p>
                  </div>

                  {/* AI Duplicate Detection */}
                  {/* Duplicate warnings are handled on submit via server 409 response */}

                  <div>
                    <label className="label">Category <span className="text-gray-400 font-normal">(optional — AI will suggest)</span></label>
                    <input className="input" placeholder="e.g. Roads, Water Supply, Sanitation, Electricity"
                      value={form.category} onChange={e => set('category', e.target.value)} />
                  </div>
                </>
              )}

              {/* Step 1 — Location */}
              {step === 1 && (
                <>
                  <div>
                    <label className="label">Address <span className="text-red-500">*</span></label>
                    <input className="input" placeholder="Street, colony, locality, city"
                      value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Ward <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input className="input" placeholder="e.g. Ward 14"
                        value={form.ward} onChange={e => set('ward', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Area / Mohalla</label>
                      <input className="input" placeholder="e.g. Palasia, Vijay Nagar"
                        value={form.category} onChange={e => set('category', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Latitude <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        placeholder="Auto-detected"
                        value={form.lat}
                        onChange={e => set('lat', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Longitude <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        className="input"
                        type="number"
                        step="any"
                        placeholder="Auto-detected"
                        value={form.lng}
                        onChange={e => set('lng', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold text-gray-800">📍 Select location on map</p>
                      <button
                        type="button"
                        onClick={() => setLocNonce((n) => n + 1)}
                        className="btn-secondary btn-sm"
                      >
                        Use my location
                      </button>
                    </div>
                    <LocationPickerMap
                      value={{ lat: form.lat || undefined, lng: form.lng || undefined }}
                      onChange={({ lat, lng }) => {
                        if (lat !== undefined) set('lat', lat);
                        if (lng !== undefined) set('lng', lng);
                      }}
                      height="260px"
                      autoRequest={true}
                      requestNonce={locNonce}
                    />
                    <p className="text-xs text-gray-400 mt-3">
                      Coordinates will be auto-detected. You can also click the map to adjust the marker.
                    </p>
                  </div>
                </>
              )}

              {/* Step 2 — Photos */}
              {step === 2 && (
                <>
                  <div>
                    <label className="label">Photos <span className="text-gray-400 font-normal">(optional, max 5)</span></label>
                    <div onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-2xl p-8 text-center cursor-pointer hover:bg-blue-50 transition-all group">
                      <p className="text-4xl mb-2">📷</p>
                      <p className="text-sm font-medium text-gray-600">Click to upload photos</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG — up to 10MB each</p>
                      <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
                        onChange={e => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} />
                    </div>
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {files.map((file, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-xl">
                            📎 {file.name}
                            <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                              className="text-blue-300 hover:text-red-500 ml-1">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
                    <p className="font-semibold mb-1">📸 Photo tips for faster resolution:</p>
                    <p className="text-xs text-amber-700">Take a clear photo of the problem, include a nearby landmark, and capture multiple angles if possible.</p>
                  </div>
                </>
              )}

              {/* Step 3 — Review */}
              {step === 3 && (
                <>
                  <h3 className="font-semibold text-gray-800 text-sm">Review your complaint before submitting</h3>
                  <div className="space-y-2">
                    {[
                      { l: 'Title',       v: form.title },
                      { l: 'Description', v: form.description },
                      { l: 'Address',     v: form.address },
                      { l: 'Ward',        v: form.ward || '—' },
                      { l: 'Photos',      v: files.length > 0 ? `${files.length} attached` : 'None' },
                    ].map(r => (
                      <div key={r.l} className="flex gap-3 text-sm p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-gray-400 font-medium w-24 flex-shrink-0">{r.l}</span>
                        <span className="text-gray-800 flex-1 leading-relaxed break-words">{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-xs font-medium flex items-center gap-2" style={{ color: '#003087' }}>
                      🤖 AI will classify and assign your complaint automatically after submission.
                    </p>
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setStep(s => s - 1)}
                  disabled={step === 0}
                  className="btn-secondary disabled:invisible">
                  ← Back
                </button>
                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={() => setStep(s => s + 1)}
                    disabled={!canNext()}
                    className="btn-primary disabled:opacity-50">
                    Next →
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={submitting}
                    className="btn-primary px-8">
                    {submitting ? <><Spinner size="sm" /> Submitting…</> : '🚀 Submit Complaint'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </SidebarLayout>
  );
}