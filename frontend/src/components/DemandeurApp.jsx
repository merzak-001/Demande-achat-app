import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Plus, LogOut, Clock, CheckCircle2, XCircle,
  Package, FileText, Eye, Printer, AlertCircle, RefreshCw,
  TrendingUp, Layers, User, Globe2, FileSpreadsheet, Check,
  Search, Archive, Calendar, Trash2, KeyRound, Menu, X, Building2, UserCheck, Shield
} from 'lucide-react';
import { formatCleanName, getInitials } from '../utils/nameUtils';
import CreateRequestModal from './CreateRequestModal';
import RequestDetailModal from './RequestDetailModal';
import EditDraftModal from './EditDraftModal';
import PrintModal from './PrintModal';
import LanguageSwitcher from './LanguageSwitcher';
import ChangePasswordModal from './ChangePasswordModal';
import InterimModal from './InterimModal';

// ── Status Config ──────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  'Brouillon':                          { bg: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-500',   label: 'Brouillon' },
  'En Attente Validation Responsable': { bg: 'bg-purple-50 text-purple-800 border-purple-200',  dot: 'bg-purple-500',  label: 'Validation Responsable' },
  'En Attente Validation Direction':   { bg: 'bg-purple-100 text-purple-900 border-purple-300',  dot: 'bg-purple-600',  label: 'Validation Direction' },
  'En Attente':                         { bg: 'bg-amber-50 text-amber-800 border-amber-200',      dot: 'bg-amber-500',   label: 'En Attente (Acheteur)' },
  'En Cours':                           { bg: 'bg-blue-50 text-blue-800 border-blue-200',        dot: 'bg-blue-500',    label: 'En Cours' },
  'Commandee':                          { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',  dot: 'bg-indigo-500',  label: 'Commandée' },
  'Commandée':                          { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',  dot: 'bg-indigo-500',  label: 'Commandée' },
  'Finalisee':                          { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',dot: 'bg-emerald-500', label: 'Finalisée' },
  'Finalisée':                          { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',dot: 'bg-emerald-500', label: 'Finalisée' },
  'Refusée par Responsable':            { bg: 'bg-rose-50 text-rose-800 border-rose-200',        dot: 'bg-rose-500',    label: 'Refusée par Responsable' },
  'Refusee par Responsable':            { bg: 'bg-rose-50 text-rose-800 border-rose-200',        dot: 'bg-rose-500',    label: 'Refusée par Responsable' },
  'Refusée par Direction':              { bg: 'bg-rose-50 text-rose-800 border-rose-200',        dot: 'bg-rose-500',    label: 'Refusée par Direction' },
  'Refusee par Direction':              { bg: 'bg-rose-50 text-rose-800 border-rose-200',        dot: 'bg-rose-500',    label: 'Refusée par Direction' },
  'Annulee':                            { bg: 'bg-rose-50 text-rose-800 border-rose-200',        dot: 'bg-rose-500',    label: 'Annulée' },
  'Annulée':                            { bg: 'bg-rose-50 text-rose-800 border-rose-200',        dot: 'bg-rose-500',    label: 'Annulée' },
  'Archivee':                           { bg: 'bg-slate-800 text-slate-200 border-slate-700',     dot: 'bg-slate-400',   label: 'Archivée' },
  'Archivée':                           { bg: 'bg-slate-800 text-slate-200 border-slate-700',     dot: 'bg-slate-400',   label: 'Archivée' },
};

const STATUS_FILTERS = [
  { id: 'all',                          translationKey: 'tabs.all',        label: 'Toutes',                       status: '' },
  { id: 'validation-responsable',       translationKey: 'tabs.validation', label: 'À Valider',                    status: 'En Attente Validation Responsable' },
  { id: 'validation-direction',         translationKey: 'tabs.valDir',     label: 'Validation Direction',         status: 'En Attente Validation Direction' },
  { id: 'en-attente',                   translationKey: 'tabs.pending',    label: 'En Attente',                   status: 'En Attente' },
  { id: 'en-cours',                     translationKey: 'tabs.inProgress', label: 'En Cours',                     status: 'En Cours' },
  { id: 'commandee',                    translationKey: 'tabs.ordered',    label: 'Commandée',                    status: 'Commandée' },
  { id: 'finalisee',                    translationKey: 'tabs.completed',  label: 'Finalisée',                    status: 'Finalisée' },
  { id: 'refusee',                      translationKey: 'tabs.rejected',   label: 'Refusées',                     status: 'Refusée par Responsable' },
  { id: 'annulee',                      translationKey: 'tabs.cancelled',  label: 'Annulée',                      status: 'Annulée' },
  { id: 'brouillon',                    translationKey: 'tabs.brouillon',  label: 'Brouillons',                   status: 'Brouillon' },
  { id: 'archivee',                     translationKey: 'tabs.archived',   label: 'Archivées',                    status: 'Archivée' },
];

function StatusBadge({ status, targetDirectorCode }) {
  const { t } = useTranslation();
  const s = STATUS_STYLE[status] || STATUS_STYLE['Brouillon'];
  const label = t(`status.${status}`, s.label);
  return (
    <div className="flex flex-col items-start leading-tight">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${s.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {label}
      </span>
      {status === 'En Attente Validation Direction' && (
        <span className="text-[11px] text-slate-500 font-medium mt-1">
          Direction : {targetDirectorCode || 'DP'}
        </span>
      )}
      {status === 'En Attente Validation Responsable' && (
        <span className="text-[11px] text-slate-500 font-medium mt-1">
          Resp. Hiérarchique
        </span>
      )}
    </div>
  );
}

// ── Main Demandeur Component ──────────────────────────────────────────────────
export default function DemandeurApp({ user, onLogout }) {
  const { t } = useTranslation();
  const [activeNav, setActiveNav]       = useState('myRequests');
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [selectedReqId, setSelectedReqId] = useState(null); // for Detail modal
  const [printReqId, setPrintReqId]     = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSqlOpen, setIsSqlOpen]       = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingDraftReq, setEditingDraftReq]   = useState(null);
  const [editingDraftItems, setEditingDraftItems] = useState([]);
  const [isInterimOpen, setIsInterimOpen]       = useState(false);
  const [currentUserState, setCurrentUserState] = useState(user);
  const [refreshKey, setRefreshKey]             = useState(0);
  const [directorAuthEnabled, setDirectorAuthEnabled] = useState(false);
  const [demandeApprovalEnabled, setDemandeApprovalEnabled] = useState(true);
  const [valDirCount, setValDirCount]           = useState(0);
  const [teamPendingCount, setTeamPendingCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    axios.get('/api/settings', auth).then(res => {
      setDirectorAuthEnabled(Boolean(res.data?.ENABLE_DIRECTOR_AUTHORIZATION));
      setDemandeApprovalEnabled(res.data?.ENABLE_DEMANDE_APPROVAL !== undefined ? Boolean(res.data?.ENABLE_DEMANDE_APPROVAL) : true);
    }).catch(() => {});

    // Fetch pending notification counts
    if (user.directorCode || user.DirectorCode || user.role === 'Admin') {
      axios.get('/api/requests', { ...auth, params: { status: 'En Attente Validation Direction', onlyPending: 'true' } })
        .then(res => { if (Array.isArray(res.data)) setValDirCount(res.data.length); })
        .catch(() => {});
    }

    if (user.isResponsable || user.subordinatesCount > 0) {
      axios.get('/api/requests', { ...auth, params: { teamOnly: 'true' } })
        .then(res => {
          if (Array.isArray(res.data)) {
            const pending = res.data.filter(r => r.CurrentStatus === 'En Attente Validation Responsable');
            setTeamPendingCount(pending.length);
          }
        }).catch(() => {});
    }
  }, [refreshKey, user]);

  const handleOpenEditDraft = async (e, req) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/requests/${req.RequestID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingDraftReq(res.data.request || req);
      setEditingDraftItems(res.data.items || []);
    } catch (err) {
      setEditingDraftReq(req);
      setEditingDraftItems([]);
    }
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const auth = { headers: { Authorization: `Bearer ${token}` } };
      const params = { 
        search
      };
      if (activeNav === 'val-direction') {
        params.status = 'En Attente Validation Direction';
      } else if (activeNav === 'teamRequests') {
        params.teamOnly = 'true';
      } else {
        params.myOnly = 'true';
        params.status = 'all_with_archived';
      }

      const res = await axios.get('/api/requests', { ...auth, params });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, activeNav, refreshKey]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleArchive = async (e, reqId) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'Archivée', comments: 'Archivée' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error archiving request:', err);
    }
  };

  const handleDelete = async (e, reqId) => {
    e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer / annuler cette demande ?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/requests/${reqId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error deleting request:', err);
    }
  };

  const handleSubmitDraft = async (e, reqId) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'En Attente', comments: 'Soumission de la demande' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error submitting draft request:', err);
    }
  };

  const handleValidateTeamRequest = async (e, reqId) => {
    e.stopPropagation();
    if (!window.confirm("Valider cette demande et la transmettre au service Achat ?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'En Attente', comments: 'Validée par le Responsable / Intérimaire' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error validating team request:', err);
    }
  };

  const handleRejectTeamRequest = async (e, reqId) => {
    e.stopPropagation();
    const reason = window.prompt("Motif du refus de cette demande (obligatoire) :");
    if (!reason || !reason.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'Refusée par Responsable', comments: `Refusée par le Responsable : ${reason.trim()}` }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error rejecting team request:', err);
    }
  };

  const handleValidateDirectionRequest = async (e, reqId) => {
    e.stopPropagation();
    if (!window.confirm("Accorder l'autorisation finale de la Direction pour cette demande ?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'En Attente', comments: 'Autorisation Finale Accordée par la Direction 👑' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error validating direction request:', err);
    }
  };

  const handleRejectDirectionRequest = async (e, reqId) => {
    e.stopPropagation();
    const reason = window.prompt("Motif du refus Direction (obligatoire) :");
    if (!reason || !reason.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'Refusée par Direction', comments: `Refusée par la Direction : ${reason.trim()}` }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error rejecting direction request:', err);
    }
  };

  const handleRestoreDraft = async (e, reqId) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'Brouillon', comments: 'Restaurée en brouillon' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error restoring draft request:', err);
    }
  };

  const norm = str => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

  const counts = {
    all:          requests.filter(r => !['archivee', 'brouillon'].includes(norm(r.CurrentStatus))).length,
    brouillon:    requests.filter(r => norm(r.CurrentStatus) === 'brouillon').length,
    'en-attente': requests.filter(r => norm(r.CurrentStatus) === 'en attente').length,
    'en-cours':   requests.filter(r => norm(r.CurrentStatus) === 'en cours').length,
    commandee:    requests.filter(r => norm(r.CurrentStatus) === 'commandee').length,
    finalisee:    requests.filter(r => norm(r.CurrentStatus) === 'finalisee').length,
    annulee:      requests.filter(r => norm(r.CurrentStatus) === 'annulee').length,
    archivee:     requests.filter(r => norm(r.CurrentStatus) === 'archivee').length,
  };

  const filteredRequests = requests.filter(r => {
    const s = norm(r.CurrentStatus);
    if (statusFilter === 'all') return !['archivee', 'brouillon'].includes(s);
    if (statusFilter === 'brouillon') return s === 'brouillon';
    if (statusFilter === 'en-attente') return s === 'en attente';
    if (statusFilter === 'en-cours') return s === 'en cours';
    if (statusFilter === 'commandee') return s === 'commandee';
    if (statusFilter === 'finalisee') return s === 'finalisee';
    if (statusFilter === 'annulee') return s === 'annulee';
    if (statusFilter === 'archivee') return s === 'archivee';
    return true;
  });

  return (
    <div className="flex h-screen bg-[#f2f5f9] text-slate-800 overflow-hidden font-['Inter',sans-serif]">

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════════ */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#08192d] text-white flex flex-col shadow-2xl transition-transform duration-300 md:static md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        
        {/* Brand Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-md shadow-black/20 shrink-0">
              <img src="/sensus.jpg" alt="Sensus" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">SENSUS SPA</p>
              <p className="text-blue-300/70 text-[10px] font-medium">Suivi des Demandes d'Achat</p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-3 mt-3 bg-white/10 border border-white/15 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0084ff] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs overflow-hidden">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{formatCleanName(user.fullName)}</p>
            <p className="text-[10px] text-blue-300 font-semibold flex items-center gap-1 mt-0.5">
              <Building2 size={11} className="text-blue-400 shrink-0" />
              <span className="truncate">{user.department ? `Département: ${user.department}` : 'Demandeur'}</span>
            </p>
          </div>
        </div>

        {/* Quick Stats Widget */}
        <div className="px-4 py-3 mx-3 mt-3 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-base font-black text-white">{counts.all}</p>
            <p className="text-[9px] text-slate-400 font-semibold uppercase">{t('kpi.total', 'Total')}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-base font-black text-amber-400">{counts['en-attente']}</p>
            <p className="text-[9px] text-slate-400 font-semibold uppercase">{t('tabs.pending', 'En Attente')}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-base font-black text-blue-400">{counts['en-cours']}</p>
            <p className="text-[9px] text-slate-400 font-semibold uppercase">{t('tabs.inProgress', 'En Cours')}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2 text-center">
            <p className="text-base font-black text-emerald-400">{counts.finalisee}</p>
            <p className="text-[9px] text-slate-400 font-semibold uppercase">{t('tabs.completed', 'Finalisée')}</p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => { setActiveNav('myRequests'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeNav === 'myRequests' ? 'bg-[#0084ff] text-white shadow-md shadow-blue-500/25' : 'text-slate-300 hover:text-white hover:bg-white/8'
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers size={16} />
              <span>{t('nav.myRequests', 'Mes Demandes')}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20">{counts.all}</span>
          </button>

          {directorAuthEnabled && (user.directorCode || user.DirectorCode || user.role === 'Admin') && (
            <button
              onClick={() => { setActiveNav('val-direction'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'val-direction' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25' : 'text-slate-300 hover:text-white hover:bg-white/8'
              }`}
            >
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-amber-400" />
                <span>Validation Direction</span>
              </div>
              {valDirCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-md animate-pulse border border-rose-300 shrink-0">
                  {valDirCount}
                </span>
              )}
            </button>
          )}

          {(user.isResponsable || user.subordinatesCount > 0) && (
            <button
              onClick={() => { setActiveNav('teamRequests'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'teamRequests' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-300 hover:text-white hover:bg-white/8'
              }`}
            >
              <div className="flex items-center gap-3">
                <User size={16} />
                <span>{t('nav.teamRequests', 'Demandes de mon Équipe')}</span>
              </div>
              {teamPendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-md animate-pulse border border-rose-300 shrink-0">
                  {teamPendingCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => { setIsCreateOpen(true); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/8 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('nav.newRequest', 'Nouvelle Demande')}</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={() => { setIsPasswordOpen(true); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/8 transition-all cursor-pointer font-medium"
          >
            <KeyRound size={14} className="text-amber-400" />
            <span>{t('passwordModal.changePasswordNav', 'Changer mot de passe')}</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer font-medium"
          >
            <LogOut size={14} />
            <span>{t('nav.logout', 'Déconnexion')}</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT AREA ════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top Header Bar */}
        <header className="px-4 sm:px-8 py-3.5 bg-white/70 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(v => !v)}
              className="md:hidden p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              title="Menu"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">{t('nav.myRequests', 'Mes Demandes d\'Achat')}</h1>
            {user.department && (
              <span className="hidden sm:inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200/80 font-bold px-3 py-1 rounded-full text-xs">
                <Building2 size={13} className="text-[#0084ff]" />
                <span>Service: {user.department}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {(user.isResponsable || user.subordinatesCount > 0) && (
              <button
                onClick={() => setIsInterimOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Gérer mon délégué intérimaire"
              >
                <UserCheck size={14} className="text-purple-600" />
                <span>Délégué Intérimaire</span>
                {currentUserState?.interimManagerId && <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />}
              </button>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Refresh Button */}
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors cursor-pointer"
              title="Rafraîchir"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {/* Sub-Header Banner Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0084ff] flex items-center justify-center shrink-0">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {activeNav === 'val-direction' ? 'Validation Direction 👑' : activeNav === 'teamRequests' ? 'Demandes de mon Équipe 👥' : 'Mes Demandes d\'Achat'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeNav === 'val-direction' ? 'Validez les demandes d\'achat transmises pour autorisation finale' : activeNav === 'teamRequests' ? 'Validez les demandes des membres de votre équipe' : 'Suivez en temps réel l\'avancement et le traitement de vos demandes d\'achat'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-[#0084ff] hover:bg-[#0073e6] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Nouvelle Demande</span>
            </button>
          </div>

          {/* Status Filter Pills & Search Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="bg-[#eef3f8] p-1.5 rounded-full border border-slate-200/60 inline-flex items-center gap-1">
              {[
                { id: 'all',        label: t('tabs.all', 'Toutes') },
                ...(directorAuthEnabled && (user.directorCode || user.DirectorCode || user.role === 'Admin') ? [{ id: 'validation-direction', label: 'Validation Direction 👑' }] : []),
                { id: 'brouillon',  label: t('status.Brouillon', 'Brouillons 📝') },
                { id: 'en-attente', label: t('tabs.pending', 'En Attente') },
                { id: 'en-cours',   label: t('tabs.inProgress', 'En Cours') },
                { id: 'commandee',  label: t('tabs.ordered', 'Commandées') },
                { id: 'finalisee',  label: t('tabs.completed', 'Finalisées') },
                { id: 'annulee',    label: t('status.Annulée', 'Annulées') },
                { id: 'archivee',   label: t('tabs.archived', 'Archivées 📦') },
              ].map(filter => {
                const isActive = statusFilter === filter.id;
                const count = counts[filter.id] || 0;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                    className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-800 font-medium'
                    }`}
                  >
                    <span>{filter.label}</span>
                    {filter.id === 'validation-direction' && valDirCount > 0 ? (
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-sm animate-pulse border border-rose-300 ml-1">
                        {valDirCount}
                      </span>
                    ) : (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-blue-50 text-[#0084ff]' : 'bg-slate-200/70 text-slate-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('actions.searchPlaceholder', 'Rechercher mes demandes...')}
                className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Demandes Table View (Identical to Acheteur View) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-xs gap-2">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-[#0084ff] rounded-full animate-spin" />
                Chargement de vos demandes...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0084ff] flex items-center justify-center mb-4">
                  <FileText size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Aucune demande d'achat trouvée</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-6">
                  Vous n'avez pas encore créé de demande d'achat ou aucune demande ne correspond à ce filtre.
                </p>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-[#0084ff] hover:bg-[#0073e6] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus size={15} />
                  <span>{t('actions.newDocument', 'Créer une demande d\'achat')}</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-3.5">{t('table.refNo', 'N° Référence')}</th>
                      <th className="px-6 py-3.5">{t('table.subject', 'Objet / Description')}</th>
                      {activeNav === 'teamRequests' && (
                        <th className="px-6 py-3.5">{t('table.requester', 'Demandeur')}</th>
                      )}
                      <th className="px-6 py-3.5">{t('table.type', 'Type')}</th>
                      <th className="px-6 py-3.5">{t('table.date', 'Date Demande')}</th>
                      <th className="px-6 py-3.5">{t('table.status', 'Statut Actuel')}</th>
                      <th className="px-6 py-3.5 text-right">{t('table.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map(req => (
                      <tr
                        key={req.RequestID}
                        onClick={() => setSelectedReqId(req.RequestID)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-bold text-[#0084ff] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 group-hover:bg-blue-100">
                            {req.RequestNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-[#0084ff] transition-colors">
                            {req.Title}
                          </p>
                          {req.Description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                              {req.Description}
                            </p>
                          )}
                        </td>
                        {activeNav === 'teamRequests' && (
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-900 bg-indigo-50 border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                              <User size={12} className="text-indigo-600 shrink-0" />
                              <span>{formatCleanName(req.RequesterName)}</span>
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            req.Type === 'Local' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {req.Type === 'Local' ? '🏠 Local' : '✈️ Étranger'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {req.RequestDate && !isNaN(new Date(req.RequestDate).getTime()) ? new Date(req.RequestDate).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={req.CurrentStatus} targetDirectorCode={req.TargetDirectorCode} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            
                            {/* Validation Direction specific actions */}
                            {req.CurrentStatus === 'En Attente Validation Direction' && (user.directorCode || user.DirectorCode || user.role === 'Admin') && (
                              <>
                                <button
                                  onClick={(e) => handleValidateDirectionRequest(e, req.RequestID)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Accorder l'autorisation finale de la Direction"
                                >
                                  👑 Valider
                                </button>
                                <button
                                  onClick={(e) => handleRejectDirectionRequest(e, req.RequestID)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Refuser au niveau Direction"
                                >
                                  ❌ Refuser
                                </button>
                              </>
                            )}

                            {/* Validation Responsable specific actions */}
                            {req.CurrentStatus === 'En Attente Validation Responsable' && (user.isResponsable || user.subordinatesCount > 0 || user.role === 'Admin') && (
                              <>
                                <button
                                  onClick={(e) => handleValidateTeamRequest(e, req.RequestID)}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Valider cette demande et la transmettre au service achat"
                                >
                                  ✅ Valider
                                </button>
                                <button
                                  onClick={(e) => handleRejectTeamRequest(e, req.RequestID)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Refuser cette demande"
                                >
                                  ❌ Refuser
                                </button>
                              </>
                            )}

                            {/* Brouillon specific actions */}
                            {req.CurrentStatus === 'Brouillon' && (
                              <>
                                <button
                                  onClick={(e) => handleOpenEditDraft(e, req)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Éditer et modifier le brouillon"
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  onClick={(e) => handleSubmitDraft(e, req.RequestID)}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="Soumettre la demande au service acheteur"
                                >
                                  🚀 Soumettre
                                </button>
                                <button
                                  onClick={(e) => handleDelete(e, req.RequestID)}
                                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="Supprimer la demande"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}

                            {/* Annulée specific actions */}
                            {['Annulee', 'Annulée'].includes(req.CurrentStatus) && (
                              <>
                                <button
                                  onClick={(e) => handleRestoreDraft(e, req.RequestID)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="Restaurer la demande en brouillon pour pouvoir la rééditer"
                                >
                                  🔄 Restaurer en Brouillon
                                </button>
                                <button
                                  onClick={(e) => handleDelete(e, req.RequestID)}
                                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  title="Supprimer définitivement"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}

                            {/* Edit Action for Creator or Admin on any active requests */}
                            {req.CurrentStatus !== 'Brouillon' && !['Annulee', 'Annulée', 'Finalisee', 'Finalisée', 'Archivee', 'Archivée'].includes(req.CurrentStatus) && (req.RequesterID === user.userId || user.role === 'Admin') && (
                              <button
                                onClick={(e) => handleOpenEditDraft(e, req)}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Modifier les informations, dates, objet ou articles de cette demande"
                              >
                                ✏️ Modifier
                              </button>
                            )}

                            {/* Delete/Cancel for active non-completed requests - ONLY for original creator or Admin */}
                            {(req.RequesterID === user.userId || user.role === 'Admin') && !['Brouillon', 'Annulee', 'Annulée', 'Finalisee', 'Finalisée', 'Archivee', 'Archivée'].includes(req.CurrentStatus) && (
                              <button
                                onClick={(e) => handleDelete(e, req.RequestID)}
                                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Supprimer la demande"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                            {/* Archive for Finalised requests */}
                            {['Finalisee', 'Finalisée'].includes(req.CurrentStatus) && (
                              <button
                                onClick={(e) => handleArchive(e, req.RequestID)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                title={t('actions.archive', 'Archiver')}
                              >
                                <Archive size={14} className="text-slate-600" />
                                <span>{t('actions.archive', 'Archiver')}</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => { e.stopPropagation(); setPrintReqId(req.RequestID); }}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                              title={t('actions.print', 'Imprimer')}
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedReqId(req.RequestID); }}
                              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0084ff] border border-blue-200 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={14} />
                              <span>{t('actions.details', 'Détails')}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#0084ff] hover:bg-[#0073e6] rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-40 cursor-pointer"
        title="Nouvelle Demande"
      >
        <Plus size={24} className="text-white" />
      </button>

      <CreateRequestModal user={user} isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => { setIsCreateOpen(false); setRefreshKey(k => k+1); }} />
      <EditDraftModal isOpen={!!editingDraftReq} onClose={() => setEditingDraftReq(null)} onSuccess={() => { setEditingDraftReq(null); setRefreshKey(k => k+1); }} request={editingDraftReq} initialItems={editingDraftItems} user={user} />
      <RequestDetailModal requestId={selectedReqId} isOpen={!!selectedReqId} onClose={() => setSelectedReqId(null)} onStatusUpdated={() => setRefreshKey(k => k+1)} onEditDraft={(req, items) => { setEditingDraftReq(req); setEditingDraftItems(items); }} user={user} />
      <PrintModal requestId={printReqId} isOpen={!!printReqId} onClose={() => setPrintReqId(null)} />
      <ChangePasswordModal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />
      <InterimModal isOpen={isInterimOpen} onClose={() => setIsInterimOpen(false)} currentUser={currentUserState} onSaved={(newInterimId) => { setCurrentUserState(prev => ({ ...prev, interimManagerId: newInterimId })); setRefreshKey(k => k + 1); }} />
    </div>
  );
}
