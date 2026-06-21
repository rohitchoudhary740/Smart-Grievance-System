import React, { useState, useEffect } from 'react';
import { AshokaChakra } from './GovTopBar';

export function GovFooter() {
  const [visitors] = useState(() => 12847 + Math.floor(Math.random() * 200));
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const lastUpdated = time.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <footer style={{ backgroundColor: '#003087' }} className="text-white mt-8">
      {/* Tricolour strip */}
      <div className="tricolour-strip" />

      {/* Main footer */}
      <div className="px-6 py-6 max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">

          {/* Col 1: Branding */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0">
                <div style={{ height:'33.3%', background:'#FF6B00' }}/>
                <div style={{ height:'33.3%', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <AshokaChakra size={12} />
                </div>
                <div style={{ height:'33.4%', background:'#138808' }}/>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">IGRMS</p>
                <p className="text-blue-200 text-xs">Indore Municipal Corporation</p>
              </div>
            </div>
            <p className="text-blue-200 text-xs leading-relaxed">
              Integrated Grievance Redressal & Monitoring System — Powered by Artificial Intelligence under Digital India Programme.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 border-b border-white/20 pb-1">
              Quick Links
            </h4>
            <ul className="space-y-1.5 text-xs text-blue-200">
              {['Lodge a Grievance', 'Track Grievance Status', 'Nodal Officers List',
                'SLA Guidelines', 'Annual Report 2025–26'].map(l => (
                <li key={l}>
                  <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
                    <span className="text-orange-400 text-xs">›</span> {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Important Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 border-b border-white/20 pb-1">
              Government Links
            </h4>
            <ul className="space-y-1.5 text-xs text-blue-200">
              {[
                { label: 'India.gov.in', href: 'https://india.gov.in' },
                { label: 'MyGov.in', href: 'https://mygov.in' },
                { label: 'Digital India', href: 'https://digitalindia.gov.in' },
                { label: 'Smart Cities Mission', href: 'https://smartcities.gov.in' },
                { label: 'RTI Online Portal', href: 'https://rtionline.gov.in' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-1">
                    <span className="text-orange-400 text-xs">›</span> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact + Stats */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3 border-b border-white/20 pb-1">
              Help & Contact
            </h4>
            <div className="space-y-2 text-xs text-blue-200">
              <p className="flex items-center gap-2">
                <span className="text-orange-400 text-base">☎</span>
                <span>Toll Free: <strong className="text-white">1800-XXX-XXXX</strong></span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-orange-400 text-base">📧</span>
                <span>grievance@imc.gov.in</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-orange-400 text-base">🕐</span>
                <span>Mon–Sat: 9:00 AM – 6:00 PM</span>
              </p>
              <div className="mt-3 pt-2 border-t border-white/10">
                <p className="text-blue-300 flex items-center gap-2">
                  👁 Visitors:
                  <strong className="text-white font-mono">
                    {visitors.toLocaleString('en-IN')}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scheme badges */}
        <div className="flex flex-wrap gap-2 mb-5 pb-5 border-b border-white/10">
          {[
            { label: 'Digital India', color: '#1565C0' },
            { label: 'Smart Cities Mission', color: '#0277BD' },
            { label: 'Swachh Bharat Abhiyan', color: '#2E7D32' },
            { label: 'Atal Mission (AMRUT)', color: '#6A1B9A' },
            { label: 'Pradhan Mantri Awas Yojana', color: '#BF360C' },
          ].map(s => (
            <span key={s.label}
              className="text-white text-xs px-3 py-1 rounded-full font-medium border border-white/20"
              style={{ backgroundColor: s.color + '99' }}>
              {s.label}
            </span>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-blue-300">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center md:justify-start">
            <span>© 2026 Indore Municipal Corporation. All Rights Reserved.</span>
            <span className="hidden md:block text-white/20">|</span>
            {['Privacy Policy', 'Terms of Use', 'Accessibility Statement', 'Disclaimer', 'Sitemap'].map(l => (
              <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3 text-right">
            <p>Last Updated: <span className="text-blue-100">{lastUpdated}</span></p>
            <div className="w-px h-3 bg-white/20" />
            <p>Designed & Hosted on <strong className="text-white">MeghRaj</strong> (GI Cloud)</p>
          </div>
        </div>

        {/* NIC credit */}
        <div className="mt-3 pt-3 border-t border-white/10 text-center">
          <p className="text-blue-400 text-xs">
            Designed, Developed and Maintained by{' '}
            <strong className="text-blue-200">National Informatics Centre (NIC)</strong>,
            Ministry of Electronics & Information Technology, Government of India
          </p>
        </div>
      </div>
    </footer>
  );
}