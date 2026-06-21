import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { citizenChatbotApi } from '../../services/citizenChatbotApi';
import { useAuthStore } from '../../context/authStore';
import { UserRole } from '../../types';

type ChatRole = 'user' | 'assistant';
type VoiceState = 'idle' | 'requesting' | 'listening' | 'done' | 'unsupported' | 'denied';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface RouteShortcut {
  id: string;
  label: string;
  to: string;
  keywords: string[];
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderMessageContent(content: string, role: ChatRole): React.ReactNode {
  // Keep user text plain; format assistant markdown-like bullets/bold.
  if (role === 'user') return content;

  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  return (
    <div className="space-y-1.5 whitespace-pre-wrap">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('* ')) {
          const text = trimmed.slice(2).trim();
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1 text-indigo-500">•</span>
              <span>{renderInlineMarkdown(text)}</span>
            </div>
          );
        }
        return (
          <div key={i}>
            {renderInlineMarkdown(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

const ROUTE_SHORTCUTS: RouteShortcut[] = [
  {
    id: 'citizen_submit',
    label: 'Complaint Filing',
    to: '/citizen/submit',
    keywords: ['file complaint', 'submit complaint', 'new complaint', 'शिकायत दर्ज', 'नई शिकायत'],
  },
  {
    id: 'citizen_dashboard',
    label: 'My Complaints',
    to: '/citizen/dashboard',
    keywords: ['dashboard', 'my complaints', 'home', 'डैशबोर्ड', 'मेरी शिकायत'],
  },
  {
    id: 'public_track',
    label: 'Track Complaint',
    to: '/track',
    keywords: ['track', 'trace', 'status', 'track complaint', 'ट्रैक', 'स्थिति'],
  },
  { id: 'login', label: 'Login', to: '/login', keywords: ['login', 'sign in', 'लॉगिन'] },
  { id: 'register', label: 'Register', to: '/register', keywords: ['register', 'sign up', 'रजिस्टर'] },
];

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectLang(text: string): 'hi' | 'en' {
  return /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
}

function pickFemaleVoice(lang: 'hi' | 'en'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const target = lang === 'hi' ? 'hi' : 'en';
  const localized = voices.filter((v) => v.lang.toLowerCase().startsWith(target));

  // Prefer professional-sounding female voices on Windows/Edge/Chrome.
  const topPriority = /(aria|jenny|samantha|heera|veena|kajal)/i;
  const femaleHints = /(female|woman|zira|susan|natasha)/i;
  const qualityHints = /(google|microsoft|enhanced|natural|neural)/i;

  return (
    localized.find((v) => topPriority.test(v.name)) ??
    localized.find((v) => femaleHints.test(v.name) && qualityHints.test(v.name)) ??
    localized.find((v) => femaleHints.test(v.name)) ??
    localized.find((v) => qualityHints.test(v.name)) ??
    localized[0] ??
    voices.find((v) => topPriority.test(v.name)) ??
    voices.find((v) => femaleHints.test(v.name)) ??
    voices[0]
  );
}

function extractTicketNumber(text: string): string | null {
  const m = text.toUpperCase().match(/\b([A-Z]{3,}-\d{4}-\d{3,})\b/);
  return m?.[1] ?? null;
}

function parseNavIntent(text: string): { to: string; label: string } | null {
  const q = text.toLowerCase();
  const ticket = extractTicketNumber(text);

  if (ROUTE_SHORTCUTS.find((s) => s.id === 'public_track')!.keywords.some((k) => q.includes(k))) {
    return { to: ticket ? `/track/${ticket}` : '/track', label: ticket ? `Track ${ticket}` : 'Track Complaint' };
  }

  for (const s of ROUTE_SHORTCUTS) {
    if (s.id === 'public_track') continue;
    if (s.keywords.some((k) => q.includes(k.toLowerCase()))) return { to: s.to, label: s.label };
  }
  return null;
}

export function CitizenChatbotWidget() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isCitizen = user?.role === UserRole.CITIZEN;

  const [open, setOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: 'assistant',
      content: 'Hello! I am your IGRMS assistant. You can type or speak. I can also navigate you to complaint filing and complaint tracking.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInlineListening, setIsInlineListening] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const lastSpokenIdRef = useRef<string | null>(null);

  const historyForApi = useMemo(
    () => messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try { recognitionRef.current?.abort?.(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages]);

  useEffect(() => {
    if (!voiceOutputEnabled) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    if (lastSpokenIdRef.current === last.id) return;
    lastSpokenIdRef.current = last.id;

    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(last.content);
      const lang = detectLang(last.content);
      u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      const femaleVoice = pickFemaleVoice(lang);
      if (femaleVoice) u.voice = femaleVoice;
      u.rate = 0.95;
      u.pitch = 1.02;
      synth.speak(u);
    } catch {
      // ignore browser TTS failures
    }
  }, [messages, voiceOutputEnabled]);

  if (!isCitizen) return null;

  const pushAssistant = (content: string) => {
    setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', content }]);
  };

  const navigateTo = (to: string, label: string) => {
    navigate(to);
    pushAssistant(`Opening ${label} for you.`);
  };

  const getRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceState('unsupported');
      return null;
    }
    return SR;
  };

  const startListening = async (onFinal: (text: string) => void) => {
    const SR = getRecognition();
    if (!SR) return;

    setVoiceState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setVoiceState('denied');
      return;
    }

    const r = new SR();
    r.lang = 'en-IN';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3;

    let finalText = '';

    r.onstart = () => setVoiceState('listening');
    r.onresult = (e: any) => {
      let fin = '';
      let inf = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + ' ';
        else inf += e.results[i][0].transcript;
      }
      if (fin) {
        finalText = `${finalText} ${fin}`.trim();
      } else {
        setInput(inf);
      }
    };
    r.onerror = (e: any) => {
      const err = String(e?.error ?? '');
      if (err === 'not-allowed' || err === 'permission-denied') setVoiceState('denied');
      else setVoiceState('idle');
    };
    r.onend = () => {
      const out = finalText.trim();
      setVoiceState(out ? 'done' : 'idle');
      if (out) onFinal(out);
    };

    recognitionRef.current = r;
    try { r.start(); } catch { setVoiceState('idle'); }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    setVoiceState('idle');
  };

  const sendText = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;

    setError(null);
    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');

    const nav = parseNavIntent(text);
    if (nav) {
      navigateTo(nav.to, nav.label);
      return;
    }

    setSending(true);
    try {
      const reply = await citizenChatbotApi.sendMessage({ message: text, history: historyForApi });
      if (!mountedRef.current) return;
      setMessages((prev) => [...prev, { id: makeId(), role: 'assistant', content: reply }]);
    } catch {
      setError('Unable to contact IGRMS assistant right now.');
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'assistant', content: 'Sorry, there was a temporary issue. Please try again.' },
      ]);
    } finally {
      if (mountedRef.current) setSending(false);
    }
  };

  const handleInlineMic = () => {
    if (isInlineListening) {
      setIsInlineListening(false);
      stopListening();
      return;
    }
    setIsInlineListening(true);
    startListening((text) => {
      setIsInlineListening(false);
      setInput(text);
      sendText(text);
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-modal bg-white border border-gray-200 flex items-center justify-center hover:shadow-lg transition-all"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        <span className="text-lg">{open ? '✕' : '🤖'}</span>
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[430px] max-w-[calc(100vw-1.5rem)] h-[34rem] rounded-3xl overflow-hidden border border-slate-200 shadow-2xl bg-white flex flex-col">
          <div className="px-5 py-4 bg-gradient-to-r from-indigo-700 via-violet-700 to-sky-500 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">IGRMS Voice Assistant</p>
              <p className="text-xs text-blue-100">Type or speak. I will respond by voice too.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleInlineMic();
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-white/30 bg-white/10 hover:bg-white/20"
              >
                {isInlineListening ? 'Stop Mic' : 'Start Mic'}
              </button>
              <button
                onClick={() => {
                  setVoiceOutputEnabled((v) => !v);
                  if (voiceOutputEnabled) {
                    try { window.speechSynthesis?.cancel(); } catch {}
                  }
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-white/30 bg-white/10 hover:bg-white/20"
                title="Toggle AI voice"
              >
                {voiceOutputEnabled ? '🔊 Voice On' : '🔈 Voice Off'}
              </button>
              <button
                onClick={() => {
                  try { window.speechSynthesis?.cancel(); } catch {}
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-white/30 bg-white/10 hover:bg-white/20"
                title="Stop AI speaking"
              >
                ⏹ Stop Voice
              </button>
              <button onClick={() => setOpen(false)} className="text-white/90 hover:text-white">✕</button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-3 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm border ${
                  m.role === 'user'
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}>
                  {renderMessageContent(m.content, m.role)}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <div className="p-3 border-t bg-white shrink-0">
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="mb-2 text-[11px] text-slate-500 font-medium">
              {voiceState === 'listening'
                ? 'Listening... speak now.'
                : voiceState === 'requesting'
                  ? 'Requesting microphone permission...'
                  : voiceState === 'denied'
                    ? 'Microphone blocked. Allow microphone in browser settings.'
                    : 'Voice ready. Use mic or type below.'}
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {ROUTE_SHORTCUTS.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigateTo(s.to, s.label)}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-200 hover:bg-slate-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2 shadow-sm">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendText(input)}
                className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
                placeholder="Write or use mic..."
                disabled={sending}
              />
              <button
                onClick={handleInlineMic}
                className={`w-10 h-10 rounded-xl text-white ${isInlineListening ? 'bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                title="Speak"
              >
                🎤
              </button>
              <button
                onClick={() => sendText(input)}
                disabled={sending}
                className="px-4 h-10 rounded-xl bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

