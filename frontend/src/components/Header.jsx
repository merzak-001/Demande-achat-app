import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, CheckCircle, ShieldCheck } from 'lucide-react';

export default function Header({ title, subtitle }) {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3.5 shadow-sm no-print">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left Title & Tag */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{title || "Demandes d'Achat"}</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80">
            SENSUS Procurement
          </span>
        </div>

        {/* Right Controls & Tools */}
        <div className="flex items-center space-x-3 rtl:space-x-reverse flex-wrap gap-y-2">
          
          {/* Language Switcher Pill */}
          <div className="flex items-center space-x-1 rtl:space-x-reverse bg-slate-100 p-1 rounded-full border border-slate-200 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
            <button
              onClick={() => changeLanguage('fr')}
              className={`px-2 py-0.5 rounded-full transition-all ${
                i18n.language === 'fr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              FR
            </button>
            <button
              onClick={() => changeLanguage('en')}
              className={`px-2 py-0.5 rounded-full transition-all ${
                i18n.language === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage('ar')}
              className={`px-2 py-0.5 rounded-full transition-all ${
                i18n.language === 'ar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AR
            </button>
          </div>

          {/* Service & Operational Badge Pill */}
          <div className="hidden lg:flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Service Achats (SENSUS) : Opérations</span>
          </div>

        </div>

      </div>
    </header>
  );
}
