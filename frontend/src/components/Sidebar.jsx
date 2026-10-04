import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  FileText, 
  Building, 
  Globe2, 
  PlusCircle, 
  LogOut,
  Boxes,
  Truck,
  Users
} from 'lucide-react';

export default function Sidebar({ onOpenSqlModal, user, onLogout }) {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path, search = '') => {
    return location.pathname === path && location.search === search;
  };

  return (
    <aside className="w-64 bg-[#0b1e36] text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800 shadow-xl no-print">
      
      {/* Brand Header */}
      <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-md shadow-black/20 shrink-0">
          <img src="/sensus.jpg" alt="Sensus" className="w-full h-full object-contain p-0.5" />
        </div>
        <div>
          <span className="font-extrabold text-white text-base tracking-wide block leading-tight">SENSUS</span>
          <span className="text-[11px] text-slate-400 block font-medium">Suivi des Demandes</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        
        <Link
          to="/"
          className={`flex items-center space-x-3 rtl:space-x-reverse px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
            isActive('/') && !location.search
              ? 'bg-[#0088ff] text-white shadow-lg shadow-blue-600/30 font-bold'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span>{t('nav.dashboard')}</span>
        </Link>

        <Link
          to="/new"
          className={`flex items-center space-x-3 rtl:space-x-reverse px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
            isActive('/new')
              ? 'bg-[#0088ff] text-white shadow-lg shadow-blue-600/30 font-bold'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <PlusCircle className="w-5 h-5 shrink-0 text-sky-400" />
          <span>{t('nav.newRequest')}</span>
        </Link>

        <div className="pt-4 pb-2 px-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Filtres Rapides
        </div>

        <Link
          to="/?type=Local"
          className={`flex items-center space-x-3 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            location.search === '?type=Local'
              ? 'bg-[#0088ff] text-white shadow-md font-semibold'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Demandes Locales</span>
        </Link>

        <Link
          to="/?type=Etranger"
          className={`flex items-center space-x-3 rtl:space-x-reverse px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            location.search === '?type=Etranger'
              ? 'bg-[#0088ff] text-white shadow-md font-semibold'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <Globe2 className="w-4 h-4 shrink-0 text-indigo-400" />
          <span>Demandes Étrangères</span>
        </Link>

      </div>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-800/80 bg-[#08172b]">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse truncate">
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400/30 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'AB'}
              </div>
              <div className="truncate text-xs">
                <span className="block font-semibold text-white truncate">{user.fullName || 'Achraf Benali'}</span>
                <span className="block text-slate-400 text-[10px] truncate">{user.department || 'Achat'}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title={t('nav.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

    </aside>
  );
}
