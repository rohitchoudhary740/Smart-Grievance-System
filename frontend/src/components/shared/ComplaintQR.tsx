import React, { useEffect, useRef, useState } from 'react';
import { Grievance } from '../../types';

interface ComplaintQRProps {
  grievance: Grievance;
}

// ── Inline Ashoka Chakra (no external import to avoid circular deps) ───────────
function MiniEmblem() {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50 flex-shrink-0">
      <div style={{ height: '33%', background: '#FF6B00' }} />
      <div style={{ height: '34%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #003087' }} />
      </div>
      <div style={{ height: '33%', background: '#138808' }} />
    </div>
  );
}

// ── QR via canvas using unpkg CDN ─────────────────────────────────────────────
function QRCanvas({ text, size }: { text: string; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const render = (QRLib: any) => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      try {
        QRLib.toCanvas(canvas, text, {
          width: size,
          margin: 2,
          color: { dark: '#003087', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        }, (err: any) => {
          if (!cancelled) {
            if (err) setError(true);
            else setReady(true);
          }
        });
      } catch { setError(true); }
    };

    // Already loaded?
    if ((window as any).__qrloaded) {
      render((window as any).__qrloaded);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js';
    script.async = true;
    script.onload = () => {
      const lib = (window as any).QRCode;
      if (lib) {
        (window as any).__qrloaded = lib;
        render(lib);
      } else {
        setError(true);
      }
    };
    script.onerror = () => { if (!cancelled) setError(true); };
    document.head.appendChild(script);

    return () => { cancelled = true; };
  }, [text, size]);

  if (error) {
    return (
      <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400 p-4"
        style={{ width: size, height: size }}>
        <div className="text-center">
          <p className="text-2xl mb-1">📷</p>
          <p>QR unavailable<br/>(no internet)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} style={{ display: ready ? 'block' : 'none' }} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-center">
            <svg className="w-6 h-6 animate-spin text-blue-900 mx-auto mb-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-xs text-gray-400">Generating…</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Print styles (injected once) ──────────────────────────────────────────────
let _printStyleDone = false;
function ensurePrintStyles() {
  if (_printStyleDone) return;
  _printStyleDone = true;
  const s = document.createElement('style');
  s.textContent = `
    @media print {
      body > *:not(#qr-receipt-root) { display: none !important; }
      #qr-receipt-root { display: block !important; position: fixed; inset: 0; padding: 24px; }
      .qr-no-print { display: none !important; }
    }
  `;
  document.head.appendChild(s);
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ComplaintQR({ grievance }: ComplaintQRProps) {
  const [expanded, setExpanded] = useState(false);

  const host = window.location.hostname === 'localhost'
    ? window.location.origin
    : 'https://pscrm.in';
  const trackingUrl = `${host}/track/${grievance.ticketNumber}`;

  const dept = (grievance as any).department?.name ||
               (grievance as any).departmentId?.name ||
               'Municipal Department';

  const handlePrint = () => {
    ensurePrintStyles();
    window.print();
  };

  const handleDownload = () => {
    const canvas = document.querySelector('#qr-receipt-root canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `IGRMS-${grievance.ticketNumber}-QR.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* Toggle button */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#003087' }}>
            QR
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">QR Code — Grievance Receipt</p>
            <p className="text-xs text-gray-400">Print or show at ward office · Scan to track status</p>
          </div>
        </div>
        <span className={`text-gray-400 text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Receipt */}
      {expanded && (
        <div className="border-t border-gray-100 p-5">

          {/* Printable receipt */}
          <div id="qr-receipt-root"
            className="mx-auto mb-5 border-2 border-gray-700 rounded-2xl overflow-hidden bg-white"
            style={{ maxWidth: 380 }}>

            {/* Header */}
            <div className="px-5 py-4 text-center" style={{ backgroundColor: '#003087' }}>
              <div className="flex items-center justify-center gap-3 mb-1">
                <MiniEmblem />
                <div className="text-left">
                  <p className="text-white font-bold text-sm">IGRMS</p>
                  <p className="text-blue-200 text-xs">Indore Municipal Corporation</p>
                </div>
              </div>
              <p className="text-blue-300 text-xs mt-1">एकीकृत शिकायत निवारण प्रणाली</p>
            </div>

            {/* Tricolour */}
            <div style={{ height: 4, background: 'linear-gradient(to right, #FF6B00 33.3%, #fff 33.3% 66.6%, #138808 66.6%)' }} />

            <div className="p-5">
              <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Grievance Acknowledgement Receipt
              </p>

              {/* Ticket number */}
              <div className="text-center bg-blue-50 border-2 border-blue-200 rounded-xl py-3 mb-4">
                <p className="text-xs text-blue-400 font-medium mb-0.5">Ticket No. / टिकट संख्या</p>
                <p className="font-mono text-xl font-bold" style={{ color: '#003087' }}>
                  {grievance.ticketNumber}
                </p>
              </div>

              {/* QR code */}
              <div className="flex flex-col items-center mb-4">
                <div className="border-2 border-gray-200 rounded-2xl p-2 bg-white inline-block shadow-sm">
                  <QRCanvas text={trackingUrl} size={150} />
                </div>
                <p className="text-xs text-gray-400 mt-2">स्कैन करें / Scan to track online</p>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs border-t border-gray-100 pt-3 mb-3">
                {[
                  { l: 'Complaint',   v: grievance.title },
                  { l: 'Department',  v: dept },
                  { l: 'Priority',    v: grievance.priority },
                  { l: 'Status',      v: grievance.status.replace(/_/g, ' ') },
                  { l: 'Filed On',    v: new Date(grievance.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                  { l: 'Due By',      v: grievance.dueAt ? new Date(grievance.dueAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'To be assigned' },
                ].map(r => (
                  <div key={r.l} className="flex gap-2">
                    <span className="text-gray-400 w-20 flex-shrink-0">{r.l}:</span>
                    <span className="text-gray-800 font-semibold flex-1">{r.v}</span>
                  </div>
                ))}
              </div>

              {/* URL */}
              <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 mb-3">
                <p className="text-xs text-gray-400 mb-0.5">Track online / ऑनलाइन देखें:</p>
                <p className="text-xs font-mono break-all" style={{ color: '#003087' }}>{trackingUrl}</p>
              </div>

              {/* Helpline */}
              <div className="text-center bg-orange-50 border border-orange-100 rounded-xl py-2">
                <p className="text-xs font-bold text-orange-700">☎ Helpline: 1800-XXX-XXXX (Free · 24×7)</p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-5 py-2 text-center">
              <p className="text-xs text-gray-400">Computer generated receipt — No signature required</p>
              <p className="text-xs text-gray-400">यह कंप्यूटर जनरेटेड रसीद है — हस्ताक्षर आवश्यक नहीं</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-center flex-wrap qr-no-print">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl active:scale-95 transition-all"
              style={{ backgroundColor: '#003087' }}>
              🖨️ Print Receipt
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
              ⬇️ Download QR
            </button>
            <button onClick={() => {
              navigator.clipboard.writeText(trackingUrl).catch(() => {});
              const d = document.createElement('div');
              d.className = 'fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg';
              d.textContent = '✅ Link copied!';
              document.body.appendChild(d);
              setTimeout(() => d.remove(), 2500);
            }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
              🔗 Copy Link
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3 qr-no-print">
            💡 Show QR at any ward office or CSC centre for instant status check
          </p>
        </div>
      )}
    </div>
  );
}