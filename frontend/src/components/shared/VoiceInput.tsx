import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
}

type State = 'idle' | 'requesting' | 'listening' | 'done' | 'unsupported' | 'denied';

// Language options — en-IN works on ALL Windows Chrome installs
const LANGS = [
  { code: 'en-US',  label: '🇺🇸 English' },
  { code: 'en-IN',  label: '🇮🇳 Hinglish' },
  { code: 'hi-IN',  label: '🇮🇳 हिंदी'    },
];

export function VoiceInput({ onTranscript, placeholder }: VoiceInputProps) {
  const [state, setState]           = useState<State>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim]       = useState('');
  const [lang, setLang]             = useState('en-US'); // en-US most reliable on Windows
  const [debug, setDebug]           = useState('');
  const recognitionRef              = useRef<any>(null);
  const accRef                      = useRef('');
  const restartRef                  = useRef(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) setState('unsupported');
    return () => { hardStop(); };
  }, []);

  const hardStop = () => {
    restartRef.current = false;
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
  };

  const startRecognition = (selectedLang: string) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.lang            = selectedLang;
    r.continuous      = false;    // false = more reliable on Windows Chrome
    r.interimResults  = true;
    r.maxAlternatives = 3;

    r.onstart = () => {
      setState('listening');
      setDebug(`🎙 Mic active (${selectedLang}) — speak now`);
    };

    r.onspeechstart = () => setDebug('🔊 Speech detected — keep speaking…');
    r.onspeechend   = () => setDebug('Speech ended, processing…');

    r.onresult = (e: any) => {
      let fin = '';
      let inf = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          fin += e.results[i][0].transcript + ' ';
        } else {
          inf += e.results[i][0].transcript;
        }
      }
      if (fin) {
        accRef.current += fin;
        setTranscript(accRef.current);
        setInterim('');
        setDebug(`✓ Got: "${fin.trim()}"`);
      } else {
        setInterim(inf);
      }
    };

    r.onerror = (e: any) => {
      const msg = e.error;
      setDebug(`⚠ Error: ${msg}`);
      if (msg === 'not-allowed' || msg === 'permission-denied') {
        restartRef.current = false;
        setState('denied');
      } else if (msg === 'language-not-supported') {
        restartRef.current = false;
        setDebug('❌ Language not supported — switching to en-US');
        setLang('en-US');
        setTimeout(() => {
          if (restartRef.current) startRecognition('en-US');
        }, 300);
      } else if (msg === 'no-speech') {
        setDebug('No speech heard — still listening…');
        // onend will restart
      } else {
        setDebug(`Error: ${msg} — restarting…`);
      }
    };

    r.onend = () => {
      setInterim('');
      if (restartRef.current) {
        setDebug('Restarting…');
        setTimeout(() => {
          if (restartRef.current) startRecognition(selectedLang);
        }, 150);
      } else {
        setState(accRef.current.trim() ? 'done' : 'idle');
      }
    };

    recognitionRef.current = r;
    try {
      r.start();
    } catch (err: any) {
      setDebug(`Cannot start: ${err.message}`);
      setState('idle');
    }
  };

  const handleStart = async () => {
    setState('requesting');
    setDebug('Requesting microphone…');

    // Force browser mic permission dialog
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setDebug('Permission granted ✓ — starting…');
    } catch (err: any) {
      setState('denied');
      setDebug(`Permission denied: ${err.message}`);
      return;
    }

    accRef.current = '';
    setTranscript('');
    setInterim('');
    restartRef.current = true;
    startRecognition(lang);
  };

  const handleStop = () => {
    restartRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setState(accRef.current.trim() ? 'done' : 'idle');
    setDebug('Stopped.');
  };

  const handleConfirm = () => {
    const text = accRef.current.trim();
    if (text) onTranscript(text);
    accRef.current = '';
    setTranscript('');
    setInterim('');
    setState('idle');
    setDebug('');
  };

  const handleRetry = () => {
    hardStop();
    accRef.current = '';
    setTranscript('');
    setInterim('');
    setState('idle');
    setDebug('');
  };

  if (state === 'unsupported') return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
      <p className="font-semibold">🎤 Voice input not supported</p>
      <p className="text-xs mt-1">Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.</p>
    </div>
  );

  if (state === 'denied') return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
      <p className="font-semibold mb-1">🚫 Microphone blocked</p>
      <p className="text-xs mb-2">Click the 🔒 lock icon in your address bar → <strong>Microphone</strong> → <strong>Allow</strong> → refresh the page.</p>
      <button onClick={() => setState('idle')} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200">
        Try again
      </button>
    </div>
  );

  const isActive = state === 'listening' || state === 'requesting';

  return (
    <div className="space-y-3">
      {/* Language + Mic button */}
      <div className="flex items-center gap-3">

        {/* Language selector */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1 flex-shrink-0">
          {LANGS.map(l => (
            <button key={l.code} type="button"
              disabled={isActive}
              onClick={() => setLang(l.code)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 ${
                lang === l.code ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Mic / Stop */}
        <button type="button"
          onClick={isActive ? handleStop : handleStart}
          className={`relative w-13 h-13 w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 flex-shrink-0 ${
            state === 'listening'  ? 'bg-red-500 text-white' :
            state === 'requesting' ? 'bg-amber-400 text-white' :
            'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}>
          {state === 'listening' && (
            <span className="absolute inset-0 rounded-2xl bg-red-300 animate-ping opacity-30" />
          )}
          {state === 'requesting' ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : state === 'listening' ? (
            <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
              <rect x="5" y="5" width="14" height="14" rx="2"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${
            state === 'listening'  ? 'text-red-600' :
            state === 'requesting' ? 'text-amber-600' :
            state === 'done'       ? 'text-emerald-600' : 'text-gray-700'
          }`}>
            {state === 'idle'       && 'Tap mic to speak'}
            {state === 'requesting' && 'Requesting mic…'}
            {state === 'listening'  && (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                Listening — press ■ to stop
              </span>
            )}
            {state === 'done' && '✓ Got it! Confirm below.'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isActive ? 'Speak clearly near your mic' : 'Hindi / English / Hinglish'}
          </p>
        </div>
      </div>

      {/* Debug bar */}
      {debug && (
        <p className="text-xs font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 truncate">
          {debug}
        </p>
      )}

      {/* Live preview */}
      <AnimatePresence>
        {(isActive || state === 'done') && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className={`rounded-2xl border overflow-hidden ${
              state === 'done' ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50 border-indigo-200'
            }`}>

            {state === 'listening' && (
              <div className="flex items-center gap-0.5 px-4 pt-3">
                {Array.from({ length: 18 }).map((_, i) => (
                  <motion.div key={i} className="w-1 bg-indigo-400 rounded-full"
                    animate={{ height: ['3px', `${4 + (i % 6) * 3}px`, '3px'] }}
                    transition={{ duration: 0.3 + (i % 4) * 0.12, repeat: Infinity, delay: i * 0.05 }}/>
                ))}
                <span className="text-xs text-indigo-500 ml-2 font-medium">Recording</span>
              </div>
            )}

            <div className="px-4 py-3 min-h-10">
              {transcript || interim ? (
                <p className="text-sm text-gray-800 leading-relaxed">
                  {transcript}
                  {interim && <span className="text-gray-400 italic">{interim}</span>}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  {lang === 'hi-IN'
                    ? 'बोलिए… (Hindi needs Windows Hindi pack — try Hinglish instead)'
                    : lang === 'en-IN' ? 'Speak Hinglish — e.g. Hamare ward mein paani nahi aa raha'
                    : 'Start speaking — e.g. There is a large pothole on the main road'}
                </p>
              )}
            </div>

            {state === 'done' && transcript && (
              <div className="flex gap-2 px-4 pb-4">
                <button type="button" onClick={handleConfirm}
                  className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all">
                  ✓ Use this text
                </button>
                <button type="button" onClick={handleRetry}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
                  ↺ Retry
                </button>
                <button type="button" onClick={handleStart}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm rounded-xl hover:bg-indigo-200 active:scale-95 transition-all">
                  + More
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}