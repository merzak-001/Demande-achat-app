import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Lock, User, ArrowRight, ShieldCheck, Building2, Eye, EyeOff, Check } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    if (shake) {
      const t = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(t);
    }
  }, [shake]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Veuillez renseigner votre identifiant et mot de passe.');
      setShake(true);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/auth/login', { username: username.trim(), password });

      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Identifiant ou mot de passe incorrect.';
      setError(msg);
      setShake(true);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f5f9] flex items-center justify-center p-4 relative font-['Inter',sans-serif] select-none">

      {/* Decorative navy corner accent */}
      <div className="absolute top-0 left-0 w-full h-72 bg-[#08192d] z-0 shadow-lg" />

      {/* Content wrapper */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row items-center gap-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden my-8">

        {/* Left Side: Brand Panel */}
        <div className="w-full md:w-1/2 bg-[#08192d] text-white p-8 md:p-12 flex flex-col justify-between self-stretch">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg shadow-black/30 shrink-0">
                <img src="/sensus.jpg" alt="Sensus" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">SENSUS SPA</p>
                <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-widest">Procurement</p>
              </div>
            </div>

            <h2 className="text-3xl font-black text-white leading-tight mb-4">
              Suivi des Demandes d'Achat
            </h2>

            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Plateforme unifiée de suivi, d'impression et de gestion des demandes d'achat et documents financiers pour le Service Achats.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              'Suivi des commandes locales et étrangères',
              'Pièces jointes et bons signés',
              'Contrôles d\'accès et rôle Achats',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs font-semibold text-slate-200">
                <Check size={14} className="text-[#0084ff]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Form */}
        <div className={`w-full md:w-1/2 p-8 md:p-12 ${shake ? 'animate-shake' : ''}`}>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Connexion à votre espace</h1>
            <p className="text-xs text-slate-500 mt-1">Saisissez vos identifiants pour continuer</p>
          </div>

          {error && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <span className="text-rose-500">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={usernameRef}
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="Nom d'utilisateur (ex: mohamed.brahimi)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-10 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#0084ff] hover:bg-[#0073e6] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Se Connecter</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
