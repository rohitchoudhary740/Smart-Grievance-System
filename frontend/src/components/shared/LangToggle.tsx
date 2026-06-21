import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n, Lang } from '../../context/i18nStore';

export function LangToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1 border border-white/20">
      {(['en', 'hi'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`relative px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
            lang === l
              ? 'text-blue-900'
              : 'text-white/70 hover:text-white'
          }`}
        >
          {lang === l && (
            <motion.div
              layoutId="lang-pill"
              className="absolute inset-0 bg-white rounded-md"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1">
            {l === 'en' ? (
              <><span>🇬🇧</span> EN</>
            ) : (
              <><span>🇮🇳</span> हि</>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}