import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, LayoutDashboard, PlusCircle, Globe, LogOut, User } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                {t('appName')}
              </span>
              <span className="block text-xs text-slate-400">Purchasing Processing Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-2 rtl:space-x-reverse">
            <Link
              to="/"
              className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('nav.dashboard')}</span>
            </Link>

            <Link
              to="/new"
              className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/new')
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('nav.newRequest')}</span>
            </Link>
          </nav>

          {/* Language Switcher & User Profile */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Multi-language Selector */}
            <div className="flex items-center space-x-1 rtl:space-x-reverse bg-slate-900/60 p-1 rounded-lg border border-slate-700">
              <Globe className="w-4 h-4 text-slate-400 ml-1 mr-1" />
              <button
                onClick={() => changeLanguage('fr')}
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  i18n.language === 'fr' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                FR
              </button>
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  i18n.language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('ar')}
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  i18n.language === 'ar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                العربية
              </button>
            </div>

            {/* User Profile Info */}
            {user ? (
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="hidden sm:block text-left rtl:text-right">
                    <span className="block font-medium text-slate-200">{user.fullName || 'Achraf Benali'}</span>
                    <span className="block text-xs text-slate-400">{user.department || 'Achat'}</span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}

          </div>

        </div>
      </div>
    </header>
  );
}
