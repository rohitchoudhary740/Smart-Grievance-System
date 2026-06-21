import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grievance } from '../../types';

interface ShareComplaintProps {
  grievance: Grievance;
}

export function ShareComplaint({ grievance }: ShareComplaintProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Tracking URL — uses current host in dev, pscrm.in in prod
  const host = window.location.hostname === 'localhost'
    ? `${window.location.origin}`
    : 'https://pscrm.in';
  const trackingUrl = `${host}/track/${grievance.ticketNumber}`;

  // WhatsApp message
  const dept = (grievance as any).department?.name ||
               (grievance as any).departmentId?.name ||
               'Municipal Department';

  const whatsappText = [
    `🏛️ *Grievance Registered — IGRMS*`,
    ``,
    `📋 *Ticket No:* ${grievance.ticketNumber}`,
    `📝 *Complaint:* ${grievance.title}`,
    `🏢 *Department:* ${dept}`,
    `⚡ *Priority:* ${grievance.priority}`,
    `📅 *Filed on:* ${new Date(grievance.createdAt).toLocaleDateString('en-IN')}`,
    ``,
    `🔗 *Track your complaint:*`,
    trackingUrl,
    ``,
    `_Indore Municipal Corporation — IGRMS_`,
    `_Toll Free: 1800-XXX-XXXX_`,
  ].join('\n');

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = trackingUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const shareWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
    setShared(true);
  };

  const shareSMS = () => {
    const smsText = `Grievance ${grievance.ticketNumber} registered with IMC. Track: ${trackingUrl}`;
    window.open(`sms:?body=${encodeURIComponent(smsText)}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Grievance ${grievance.ticketNumber} — IGRMS`,
          text: `Track my civic complaint with Indore Municipal Corporation`,
          url: trackingUrl,
        });
      } catch {}
    }
  };

  return (
    <div className="bg-white border-2 border-green-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Share on WhatsApp</p>
          <p className="text-green-100 text-xs">Share tracking link with family or friends</p>
        </div>
        <AnimatePresence>
          {shared && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="text-xs bg-white text-green-700 px-2 py-1 rounded-full font-bold">
              Shared!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 space-y-4">
        {/* Tracking URL display */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your Tracking Link
          </p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-mono truncate">{trackingUrl}</p>
            </div>
            <button onClick={copyLink}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                copied
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:text-blue-700'
              }`}>
              {copied ? (
                <><span>✓</span> Copied!</>
              ) : (
                <><span>📋</span> Copy</>
              )}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-2">
          {/* WhatsApp */}
          <button onClick={shareWhatsApp}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 active:scale-95 transition-all group">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <span className="text-xs font-semibold text-green-800">WhatsApp</span>
          </button>

          {/* SMS */}
          <button onClick={shareSMS}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all group">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white text-xl">💬</span>
            </div>
            <span className="text-xs font-semibold text-blue-800">SMS</span>
          </button>

          {/* Native share / Copy */}
          <button onClick={navigator.share ? shareNative : copyLink}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 active:scale-95 transition-all group">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white text-xl">{navigator.share ? '📤' : '🔗'}</span>
            </div>
            <span className="text-xs font-semibold text-purple-800">
              {navigator.share ? 'Share' : 'Copy Link'}
            </span>
          </button>
        </div>

        {/* WhatsApp message preview */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-green-600 px-3 py-1.5 flex items-center gap-2">
            <span className="text-white text-xs font-semibold">WhatsApp Message Preview</span>
          </div>
          <div className="p-3">
            <div className="bg-white rounded-xl rounded-tl-none shadow-sm p-3 max-w-xs">
              <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed font-mono">
                {[
                  `🏛️ *Grievance Registered*`,
                  `📋 *${grievance.ticketNumber}*`,
                  `📝 ${grievance.title}`,
                  `🏢 ${dept}`,
                  `⚡ Priority: ${grievance.priority}`,
                  `🔗 ${trackingUrl}`,
                ].join('\n')}
              </p>
              <p className="text-xs text-gray-400 text-right mt-1">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Tip */}
        <p className="text-xs text-gray-400 text-center">
          💡 Share this link with family members to let them track the complaint status anytime
        </p>
      </div>
    </div>
  );
}