import React, { useState } from 'react';
import { LangToggle } from './LangToggle';

// ── Ashoka Chakra SVG (24 spokes) ─────────────────────────────────────────────
function AshokaChakra({ size = 20 }: { size?: number }) {
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 360) / 24;
    const rad   = (angle * Math.PI) / 180;
    const cx    = size / 2;
    const cy    = size / 2;
    const r1    = size * 0.18;
    const r2    = size * 0.45;
    return (
      <line key={i}
        x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)}
        x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)}
        stroke="#003087" strokeWidth="1" />
    );
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={size*0.47} fill="none" stroke="#003087" strokeWidth="1.2"/>
      <circle cx={size/2} cy={size/2} r={size*0.15} fill="#003087"/>
      {spokes}
    </svg>
  );
}

// ── Accessibility bar ─────────────────────────────────────────────────────────
function AccessibilityBar() {
  const [fontSize, setFontSize] = useState<'sm'|'md'|'lg'|'xl'>('md');
  const [contrast, setContrast] = useState(false);

  const setFont = (size: 'sm'|'md'|'lg'|'xl') => {
    const html = document.documentElement;
    ['font-sm','font-md','font-lg','font-xl'].forEach(c => html.classList.remove(c));
    html.classList.add(`font-${size}`);
    setFontSize(size);
  };

  const toggleContrast = () => {
    document.documentElement.classList.toggle('high-contrast');
    setContrast(c => !c);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-300 text-xs hidden md:block">Accessibility:</span>
      <div className="flex items-center gap-1">
        <button onClick={() => setFont('sm')}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${fontSize === 'sm' ? 'bg-white text-blue-900 font-bold' : 'text-gray-300 hover:text-white'}`}>
          A-
        </button>
        <button onClick={() => setFont('md')}
          className={`text-sm px-1.5 py-0.5 rounded transition-colors ${fontSize === 'md' ? 'bg-white text-blue-900 font-bold' : 'text-gray-300 hover:text-white'}`}>
          A
        </button>
        <button onClick={() => setFont('lg')}
          className={`text-base px-1.5 py-0.5 rounded transition-colors ${fontSize === 'lg' ? 'bg-white text-blue-900 font-bold' : 'text-gray-300 hover:text-white'}`}>
          A+
        </button>
        <button onClick={() => setFont('xl')}
          className={`text-lg px-1.5 py-0.5 rounded transition-colors ${fontSize === 'xl' ? 'bg-white text-blue-900 font-bold' : 'text-gray-300 hover:text-white'}`}>
          A++
        </button>
      </div>
      <div className="w-px h-4 bg-gray-600" />
      <button onClick={toggleContrast}
        className={`text-xs px-2 py-0.5 rounded border transition-colors ${contrast ? 'bg-yellow-300 text-black border-yellow-300' : 'text-gray-300 border-gray-600 hover:text-white hover:border-gray-400'}`}>
        {contrast ? '◑ High Contrast ON' : '◑ Contrast'}
      </button>
      <div className="w-px h-4 bg-gray-600" />
      <a href="#main-content"
        className="text-xs text-gray-400 hover:text-white transition-colors hidden md:block">
        Skip to main content
      </a>
    </div>
  );
}

// ── Live ticker ───────────────────────────────────────────────────────────────
interface TickerProps { items: string[]; }

function Ticker({ items }: TickerProps) {
  return (
    <div className="bg-blue-900/60 border-t border-blue-700/50 overflow-hidden"
      style={{ height: '28px' }}>
      <div className="flex items-center h-full">
        <div className="flex-shrink-0 bg-orange-500 text-white text-xs font-bold px-3 h-full flex items-center gap-1.5 z-10">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>
          LIVE
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="ticker-animate flex items-center gap-8 text-xs text-blue-100 h-full py-1">
            {items.map((item, i) => (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-orange-400">◆</span>
                {item}
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {items.map((item, i) => (
              <span key={`dup-${i}`} className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-orange-400">◆</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main GovTopBar ────────────────────────────────────────────────────────────
interface GovTopBarProps {
  tickerItems?: string[];
  showTicker?: boolean;
}

const DEFAULT_TICKER = [
  'Integrated Grievance Redressal & Monitoring System (IGRMS) — Powered by AI',
  'Toll Free Helpline: 1800-XXX-XXXX | Available 24×7',
  'For urgent civic emergencies, dial 1533 (IMC Control Room)',
  'Jan Sunwai (Public Hearing) — Every 2nd Saturday at District Collectorate',
  'Your grievance will be resolved within 48 working hours as per SLA norms',
  'RTI applications can be filed at rtionline.gov.in',
  'Smart City Indore — Ranked #1 in Swachh Survekshan 2024',
  'File your grievance in Hindi or English — हिंदी में शिकायत दर्ज करें',
];

export function GovTopBar({ tickerItems = DEFAULT_TICKER, showTicker = true }: GovTopBarProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 shadow-md">
      {/* ── Top identity bar ────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#003087' }}>
        <div className="flex items-center justify-between px-4 py-2 max-w-screen-2xl mx-auto">

          {/* Left: Emblem + Name */}
          <div className="flex items-center gap-3">
            {/* India flag colours circle */}
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/30">
              <div style={{ height:'33.3%', background:'#FF6B00' }}/>
              <div style={{ height:'33.3%', background:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <AshokaChakra size={10} />
              </div>
              <div style={{ height:'33.4%', background:'#138808' }}/>
            </div>

            <div className="hidden sm:block">
              <p className="text-white text-xs font-bold tracking-wide leading-tight">
                भारत सरकार | Government of India
              </p>
              <p className="text-blue-200 text-xs leading-tight">
                Ministry of Housing & Urban Affairs — Smart Cities Mission
              </p>
            </div>

            <div className="w-px h-8 bg-white/20 mx-1 hidden md:block" />

            {/* System name */}
            <div className="hidden md:block">
              <p className="text-white text-xs font-semibold">
                Integrated Grievance Redressal & Monitoring System
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-blue-200 text-xs">IGRMS v2.1</span>
                <span className="bg-orange-500 text-white text-xs px-1.5 py-0 rounded font-semibold">
                  AI Enabled
                </span>
                <span className="bg-green-700 text-white text-xs px-1.5 py-0 rounded font-semibold">
                  Digital India
                </span>
              </div>
            </div>
          </div>

          {/* Right: Lang toggle + Accessibility */}
          <div className="flex items-center gap-3">
            <LangToggle />
            <div className="w-px h-5 bg-white/20" />
            <AccessibilityBar />
          </div>
        </div>
      </div>

      {/* ── Tricolour strip ──────────────────────────────────────────────────── */}
      <div className="tricolour-strip" />

      {/* ── Live ticker ──────────────────────────────────────────────────────── */}
      {showTicker && <Ticker items={tickerItems} />}
    </div>
  );
}

// Export Ashoka for use elsewhere
export { AshokaChakra };