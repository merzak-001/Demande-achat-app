import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2 as GlobeIcon, ChevronDown as ChevronIcon, Check as CheckIcon } from 'lucide-react';

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'en', name: 'English',  flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', name: 'العربية',   flag: '🇩🇿', dir: 'rtl' },
];

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.code === (i18n.language || 'fr')) || LANGUAGES[0];

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang.code);
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.dir;
    localStorage.setItem('i18nextLng', lang.code);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer ${
          isOpen ? 'ring-2 ring-[#0084ff]/30 border-[#0084ff]' : ''
        }`}
        title="Changer de langue / Switch Language"
      >
        <GlobeIcon size={14} className="text-[#0084ff]" />
        <span className="text-sm leading-none">{currentLang.flag}</span>
        {!compact && <span className="font-bold text-slate-800">{currentLang.name}</span>}
        <ChevronIcon size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200/80 ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1 border-b border-slate-100">
            Langue / Language
          </div>
          {LANGUAGES.map((lang) => {
            const isSelected = currentLang.code === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-[#0084ff] font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
                {isSelected && <CheckIcon size={13} className="text-[#0084ff]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
