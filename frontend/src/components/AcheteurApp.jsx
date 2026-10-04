import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  LayoutDashboard, User, Plus, LogOut, FileText,
  Clock, Loader2, CheckCircle2, XCircle, Package,
  Search, RefreshCw, ChevronRight, AlertCircle, Printer,
  Globe2, FileSpreadsheet, Edit3, Trash2, SlidersHorizontal,
  ChevronDown, Building, Check, Layers, Eye, TrendingUp,
  PieChart, BarChart3, Activity, ArrowUpRight, Calendar, Archive, KeyRound, Menu, X, Building2, UserCheck, Shield
} from 'lucide-react';
import CreateRequestModal from './CreateRequestModal';
import RequestDetailModal from './RequestDetailModal';
import EditDraftModal from './EditDraftModal';
import PrintModal from './PrintModal';
import LanguageSwitcher from './LanguageSwitcher';
import ChangePasswordModal from './ChangePasswordModal';
import InterimModal from './InterimModal';
import { formatCleanName, getInitials } from '../utils/nameUtils';

// ── Constants & Helpers ────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard',  label: 'Tableau de bord', icon: <LayoutDashboard size={15} /> },
  { id: 'toutes',     label: 'Toutes les Demandes', icon: <Layers size={15} /> },
  { id: 'en-attente', label: 'En Attente',      status: 'En Attente' },
  { id: 'en-cours',   label: 'En Cours',        status: 'En Cours' },
  { id: 'commandee',  label: 'Commandées',      status: 'Commandée' },
  { id: 'finalisee',  label: 'Finalisées',      status: 'Finalisée' },
  { id: 'archivee',   label: 'Archivées',       status: 'Archivée' },
  { id: 'mes-dem',    label: 'Mes Demandes',    myOnly: true },
];

const STATUS_STYLE = {
  'Brouillon':                          { bg: 'bg-slate-100 text-slate-700 border-slate-200',     dot: 'bg-slate-500',   label: 'Brouillon' },
  'En Attente Validation Responsable': { bg: 'bg-purple-50 text-purple-800 border-purple-200',  dot: 'bg-purple-500',  label: 'Validation Responsable' },
  'En Attente Validation Direction':   { bg: 'bg-purple-100 text-purple-900 border-purple-300',  dot: 'bg-purple-600',  label: 'Validation Direction' },
  'En Attente':                         { bg: 'bg-amber-50 text-amber-800 border-amber-200',      dot: 'bg-amber-500',   label: 'En Attente' },
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

// ── KpiCard Component ──────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, active, onClick, color = 'blue' }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white border rounded-2xl p-4 text-left transition-all cursor-pointer shadow-xs hover:shadow-md ${
        active ? 'border-[#0084ff] ring-2 ring-blue-500/20' : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
        <div className="p-2 rounded-xl bg-blue-50 text-[#0084ff]">{React.cloneElement(icon, { size: 16 })}</div>
      </div>
      <p className="text-2xl font-black text-slate-900">{value ?? '0'}</p>
    </button>
  );
}

// ── Visual Progress Bar Component for Charts ────────────────────────────────────
function StatProgressBar({ label, count, total, colorBg, colorBar }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-900 font-bold">{count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
      </div>
      <div className={`h-2.5 w-full ${colorBg} rounded-full overflow-hidden`}>
        <div className={`h-full ${colorBar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Monthly Dual Bar Chart (Demandes vs Articles) ──────────────────────────────
function MonthlyDualBarChart({ data, chartYear = 'last12', onChartYearChange, availableYears = [] }) {
  const { t } = useTranslation();
  
  const MONTH_NAMES = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
  ];

  const MONTH_FULL_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  let displayMonths = [];

  if (chartYear === 'last12') {
    // Generate the last 12 rolling months up to current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    displayMonths = Array.from({ length: 12 }, (_, i) => {
      // i = 0 (11 months ago) -> i = 11 (current month)
      const d = new Date(currentYear, currentMonth - 11 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-12
      const mIndex = d.getMonth();

      const found = Array.isArray(data)
        ? data.find(item => Number(item.MonthNum) === m && (item.YearNum ? Number(item.YearNum) === y : true))
        : null;

      return {
        key: `${y}-${m}`,
        yearNum: y,
        monthNum: m,
        name: `${MONTH_NAMES[mIndex]} ${String(y).slice(-2)}`,
        fullName: `${MONTH_FULL_NAMES[mIndex]} ${y}`,
        requests: found ? found.RequestCount : 0,
        items: found ? found.ItemCount : 0,
      };
    });
  } else if (chartYear === 'all') {
    // All Periods -> 12 calendar months Jan to Dec aggregated across all recorded data
    displayMonths = Array.from({ length: 12 }, (_, i) => {
      const mNum = i + 1;
      const matching = Array.isArray(data) ? data.filter(item => Number(item.MonthNum) === mNum) : [];
      const totalReq = matching.reduce((sum, item) => sum + (item.RequestCount || 0), 0);
      const totalItm = matching.reduce((sum, item) => sum + (item.ItemCount || 0), 0);

      return {
        key: `all-${mNum}`,
        monthNum: mNum,
        name: MONTH_NAMES[i],
        fullName: `${MONTH_FULL_NAMES[i]} (Toutes les périodes)`,
        requests: totalReq,
        items: totalItm,
      };
    });
  } else {
    // Specific Year (e.g. 2026) -> 12 months Jan to Dec
    const selectedYr = parseInt(chartYear) || new Date().getFullYear();
    displayMonths = Array.from({ length: 12 }, (_, i) => {
      const mNum = i + 1;
      const found = Array.isArray(data)
        ? data.find(item => Number(item.MonthNum) === mNum && (item.YearNum ? Number(item.YearNum) === selectedYr : true))
        : null;

      return {
        key: `${selectedYr}-${mNum}`,
        yearNum: selectedYr,
        monthNum: mNum,
        name: MONTH_NAMES[i],
        fullName: `${MONTH_FULL_NAMES[i]} ${selectedYr}`,
        requests: found ? found.RequestCount : 0,
        items: found ? found.ItemCount : 0,
      };
    });
  }

  const maxRequests = Math.max(...displayMonths.map(m => m.requests), 1);
  const maxItems    = Math.max(...displayMonths.map(m => m.items), 1);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between col-span-1 lg:col-span-3">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-[#0084ff]" />
          <h3 className="text-sm font-bold text-slate-900">
            {t('chart.monthlyTitle', "Évolution Mensuelle : Demandes d'Achat vs Nombre d'Articles")}
          </h3>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Year Filter Dropdown for the Chart */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
            <Calendar size={14} className="text-[#0084ff]" />
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t('chart.periodLabel', 'Période :')}
            </label>
            <select
              value={chartYear}
              onChange={(e) => onChartYearChange && onChartYearChange(e.target.value)}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer pl-1"
            >
              <option value="last12">{t('chart.last12Months', '12 Derniers Mois (Glissants)')}</option>
              <option value="all">{t('kpi.allYears', 'Toutes les périodes')}</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {t('chart.yearOption', { year: yr, defaultValue: `Année ${yr}` })}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-[#0084ff] shadow-xs inline-block" />
              <span className="text-slate-700">{t('chart.requestsLegend', 'Demandes (Nbr)')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-500 shadow-xs inline-block" />
              <span className="text-slate-700">{t('chart.itemsLegend', 'Articles (Qté)')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Bar Chart Area */}
      <div className="h-64 flex items-end justify-between gap-1.5 sm:gap-2 pt-6 pb-2 px-1 sm:px-2 border-b border-slate-200/80">
        {displayMonths.map((m) => {
          const reqHeightPct = Math.round((m.requests / maxRequests) * 85);
          const itemHeightPct = Math.round((m.items / maxItems) * 85);

          return (
            <div key={m.key} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              
              {/* Tooltip on Hover */}
              <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none z-30 whitespace-nowrap flex flex-col items-center">
                <span className="font-bold text-slate-200">{m.fullName}</span>
                <span>📋 {m.requests} demandes | 📦 {m.items} articles</span>
              </div>

              {/* Grouped Bars Container */}
              <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full px-0.5">
                
                {/* Request Count Bar (Blue) */}
                <div className="flex-1 flex flex-col items-center justify-end h-full">
                  {m.requests > 0 && (
                    <span className="text-[10px] font-extrabold text-[#0084ff] mb-1 group-hover:scale-110 transition-transform">
                      {m.requests}
                    </span>
                  )}
                  <div
                    style={{ height: `${Math.max(reqHeightPct, m.requests > 0 ? 12 : 0)}%` }}
                    className="w-full bg-[#0084ff] hover:bg-[#0073e6] rounded-t-md transition-all shadow-xs"
                  />
                </div>

                {/* Item Count Bar (Purple) */}
                <div className="flex-1 flex flex-col items-center justify-end h-full">
                  {m.items > 0 && (
                    <span className="text-[10px] font-extrabold text-purple-600 mb-1 group-hover:scale-110 transition-transform">
                      {m.items}
                    </span>
                  )}
                  <div
                    style={{ height: `${Math.max(itemHeightPct, m.items > 0 ? 12 : 0)}%` }}
                    className="w-full bg-purple-500 hover:bg-purple-600 rounded-t-md transition-all shadow-xs"
                  />
                </div>

              </div>

              {/* Month X-Axis Label */}
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-2.5 group-hover:text-slate-900 transition-colors truncate max-w-full text-center">
                {m.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Acheteur Component ───────────────────────────────────────────────────
export default function AcheteurApp({ user, onLogout }) {
  const { t } = useTranslation();
  const [activeNav, setActiveNav]       = useState('dashboard'); // 'dashboard', 'requests', 'mes-dem'
  const [activeTab, setActiveTab]       = useState('toutes');
  const [requests, setRequests]         = useState([]);
  const [metrics, setMetrics]           = useState(null);
  const [recentActivities, setActivities] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState('');

  // Advanced Filters State
  const [showAdvancedFilter, setShowAdvancedFilter]   = useState(false);
  const [departmentFilter, setDepartmentFilter]       = useState('');
  const [startDateFilter, setStartDateFilter]         = useState('');
  const [endDateFilter, setEndDateFilter]             = useState('');
  const [hasSignedDocFilter, setHasSignedDocFilter]   = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear]   = useState('all');
  const [chartYear, setChartYear]         = useState('last12');
  const [itemYear, setItemYear]           = useState(String(new Date().getFullYear()));

  const [selectedReqId, setSelectedReqId] = useState(null);
  const [selectedReqForStatus, setSelectedReqForStatus] = useState(null);
  const [printReqId, setPrintReqId] = useState(null);
  const [newStatus, setNewStatus]       = useState('');
  const [comment, setComment]           = useState('');
  const [updating, setUpdating]         = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSqlOpen, setIsSqlOpen]       = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingDraftReq, setEditingDraftReq]   = useState(null);
  const [editingDraftItems, setEditingDraftItems] = useState([]);
  const [isInterimOpen, setIsInterimOpen]       = useState(false);
  const [currentUserState, setCurrentUserState] = useState(user);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [directorAuthEnabled, setDirectorAuthEnabled] = useState(false);
  const [demandeApprovalEnabled, setDemandeApprovalEnabled] = useState(true);
  const [valDirCount, setValDirCount]           = useState(0);
  const [teamPendingCount, setTeamPendingCount] = useState(0);

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const auth = getAuthHeader();
      let statusParam = '';
      if (activeNav === 'val-direction' || activeTab === 'val-direction') {
        statusParam = 'En Attente Validation Direction';
      } else if (activeNav !== 'dashboard' && activeTab !== 'toutes' && activeTab !== 'all') {
        const currentTabObj = TABS.find(t => t.id === activeTab);
        statusParam = currentTabObj?.status || (
          activeTab === 'en-attente' ? 'En Attente' :
          activeTab === 'en-cours' ? 'En Cours' :
          activeTab === 'commandee' ? 'Commandée' :
          activeTab === 'finalisee' ? 'Finalisée' :
          activeTab === 'annulee' ? 'Annulée' :
          activeTab === 'archivee' ? 'Archivée' : ''
        );
      }
      const [mRes, rRes] = await Promise.all([
        axios.get('/api/dashboard', {
          ...auth,
          params: { month: selectedMonth, year: selectedYear, chartYear, itemYear }
        }).catch(() => null),
        axios.get('/api/requests', {
          ...auth,
          params: {
            status: statusParam,
            type: typeFilter,
            search,
            department: departmentFilter,
            startDate: startDateFilter,
            endDate: endDateFilter,
            hasSignedDoc: hasSignedDocFilter ? 'true' : 'false',
            myOnly: activeNav === 'mes-dem' ? 'true' : 'false',
            teamOnly: activeNav === 'teamRequests' ? 'true' : 'false'
          }
        }).catch(() => null),
      ]);

      if (mRes?.data) {
        setMetrics(mRes.data.metrics);
        setActivities(mRes.data.recentActivities || []);
      }
      if (rRes?.data) {
        setRequests(Array.isArray(rRes.data) ? rRes.data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeNav, activeTab, search, typeFilter, departmentFilter, startDateFilter, endDateFilter, hasSignedDocFilter, selectedMonth, selectedYear, chartYear, itemYear, refreshKey, getAuthHeader]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch system setting for Director Authorization and pending counts on mount
  useEffect(() => {
    const auth = getAuthHeader();
    axios.get('/api/settings', auth).then(res => {
      setDirectorAuthEnabled(Boolean(res.data?.ENABLE_DIRECTOR_AUTHORIZATION));
      setDemandeApprovalEnabled(res.data?.ENABLE_DEMANDE_APPROVAL !== undefined ? Boolean(res.data?.ENABLE_DEMANDE_APPROVAL) : true);
    }).catch(() => {});

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
  }, [refreshKey, user, getAuthHeader]);

  const handleValidateTeamRequest = async (e, reqId) => {
    e.stopPropagation();
    if (!window.confirm("Valider cette demande et la transmettre au service Achat ?")) return;
    try {
      const auth = getAuthHeader();
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'En Attente', comments: 'Validée par le Responsable / Intérimaire' }, auth);
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
      const auth = getAuthHeader();
      await axios.put(`/api/requests/${reqId}/status`, { newStatus: 'Refusée par Responsable', comments: `Refusée par le Responsable : ${reason.trim()}` }, auth);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('Error rejecting team request:', err);
    }
  };

  const getCount = (status) => {
    if (!metrics) return 0;
    const ACHETEUR_STATUSES = ['en attente', 'en cours', 'commandee', 'finalisee', 'annulee', 'archivee'];
    const normalize = str => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    if (!status || status === 'toutes' || status === 'all') {
      if (!metrics.statusBreakdown) return 0;
      return metrics.statusBreakdown.reduce((sum, s) => {
        const norm = normalize(s.CurrentStatus);
        return ACHETEUR_STATUSES.includes(norm) ? sum + (s.Count || 0) : sum;
      }, 0);
    }
    const target = normalize(status);
    const found = metrics.statusBreakdown?.find(s => normalize(s.CurrentStatus) === target);
    return found ? found.Count : 0;
  };

  const getTypeCount = (type) =>
    metrics?.typeBreakdown?.find(t => t.Type === type)?.Count || 0;

  const handleStatusUpdate = async () => {
    if (!selectedReqForStatus || !newStatus) return;
    setUpdating(true);
    try {
      await axios.put(`/api/requests/${selectedReqForStatus.RequestID}/status`,
        { newStatus, comments: comment }, getAuthHeader());
      setSelectedReqForStatus(null);
      setNewStatus('');
      setComment('');
      setRefreshKey(k => k + 1);
    } catch (e) {
      console.error('Failed to update status:', e);
      alert('Échec de la mise à jour du statut.');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedReqForStatus) setSelectedReqForStatus(null);
        if (selectedReqId) setSelectedReqId(null);
        if (isCreateOpen) setIsCreateOpen(false);
        if (isSqlOpen) setIsSqlOpen(false);
        if (printReqId) setPrintReqId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReqForStatus, selectedReqId, isCreateOpen, isSqlOpen, printReqId]);

  const total = metrics?.totalRequests || 0;
  const localCount = getTypeCount('Local');
  const foreignCount = getTypeCount('Etranger');

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
          <div className="w-8 h-8 rounded-full bg-[#0084ff] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs">
            {user.fullName?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{formatCleanName(user.fullName)}</p>
            <p className="text-[10px] text-blue-300 font-semibold flex items-center gap-1 mt-0.5">
              <Building2 size={11} className="text-blue-400 shrink-0" />
              <span className="truncate">{user.department ? `Service: ${user.department}` : 'Service Achats'}</span>
            </p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', label: t('nav.dashboard', 'Tableau de bord'),    icon: <LayoutDashboard size={16} /> },
            { id: 'requests',  label: t('nav.requestList', 'Liste des Demandes'), icon: <Layers size={16} /> },
            ...(directorAuthEnabled && (user.directorCode || user.DirectorCode || user.role === 'Admin') ? [{ id: 'val-direction', label: 'Validation Direction 👑', icon: <Shield size={16} /> }] : []),
            { id: 'mes-dem',   label: t('nav.myRequests', 'Mes Demandes'),       icon: <User size={16} /> },
            ...((user.isResponsable || user.subordinatesCount > 0) ? [{ id: 'teamRequests', label: 'Demandes Équipe 👥', icon: <UserCheck size={16} /> }] : [])
          ].map(item => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { 
                  setActiveNav(item.id); 
                  if (item.id === 'requests') setActiveTab('toutes'); 
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0084ff] text-white shadow-md shadow-blue-500/25 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/8'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.id === 'val-direction' && valDirCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-md animate-pulse border border-rose-300 shrink-0">
                    {valDirCount}
                  </span>
                )}
                {item.id === 'teamRequests' && teamPendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-md animate-pulse border border-rose-300 shrink-0">
                    {teamPendingCount}
                  </span>
                )}
              </button>
            );
          })}
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
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {activeNav === 'dashboard' ? 'Tableau de Bord — Performance & Statistiques' : activeNav === 'mes-dem' ? 'Mes Demandes d\'Achat' : 'Demandes d\'Achat & Achats'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200/80 font-bold px-3 py-1 rounded-full text-xs">
              <Building2 size={13} className="text-[#0084ff]" />
              <span>Service: {user.department || 'Appro'}</span>
            </span>
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

            {/* Refresh Button */}
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors cursor-pointer"
              title="Rafraîchir les données"
            >
              <RefreshCw size={14} />
            </button>

            {/* Language Switcher Dropdown */}
            <LanguageSwitcher />

            {/* Service Status Pill */}
            <div className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full border border-blue-200/80 flex items-center gap-1.5">
              <Check size={13} className="text-[#0084ff]" />
              <span>{t('serviceStatus', 'Service Achats : Opérations')}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Workspace */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 space-y-6">

          {/* Sub-Header Banner Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0084ff] flex items-center justify-center shrink-0">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {activeNav === 'dashboard' ? 'Vue d\'Ensemble des Opérations d\'Achat' : 'Documents & Demandes d\'Achat'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gestion & Impression des Notes pour le Contrôleur Financier (Apurements, Dédouanement & Chèques Importation)
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-[#0084ff] hover:bg-[#0073e6] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <Plus size={15} />
              <span>Nouveau Document</span>
            </button>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* DASHBOARD VIEW WITH CHARTS & KPIS                                 */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav === 'dashboard' && (
            <div className="space-y-6">

              {/* Month & Year KPI Filter Toolbar */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 text-slate-800">
                  <Calendar size={18} className="text-[#0084ff]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Période des Indicateurs KPI :</span>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mois :</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Tous les mois</option>
                      <option value="1">Janvier</option>
                      <option value="2">Février</option>
                      <option value="3">Mars</option>
                      <option value="4">Avril</option>
                      <option value="5">Mai</option>
                      <option value="6">Juin</option>
                      <option value="7">Juillet</option>
                      <option value="8">Août</option>
                      <option value="9">Septembre</option>
                      <option value="10">Octobre</option>
                      <option value="11">Novembre</option>
                      <option value="12">Décembre</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Année :</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="all">Toutes les années</option>
                      {(metrics?.availableYears && metrics.availableYears.length > 0 ? metrics.availableYears : [2026, 2025, 2024]).map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Top KPI Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard label="Total Demandes" value={metrics?.totalRequests} icon={<FileText />} active onClick={() => setActiveNav('requests')} />
                <KpiCard label="En Attente"     value={getCount('En Attente')} icon={<Clock />}        onClick={() => { setActiveNav('requests'); setActiveTab('en-attente'); }} />
                <KpiCard label="En Cours"       value={getCount('En Cours')}   icon={<Loader2 />}      onClick={() => { setActiveNav('requests'); setActiveTab('en-cours'); }} />
                <KpiCard label="Commandées"     value={getCount('Commandee')}  icon={<Package />}      onClick={() => { setActiveNav('requests'); setActiveTab('commandee'); }} />
                <KpiCard label="Finalisées"     value={getCount('Finalisee')}  icon={<CheckCircle2 />} onClick={() => { setActiveNav('requests'); setActiveTab('finalisee'); }} />
              </div>

              {/* Visual Charts & Breakdown Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Chart 1: Status Distribution */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={18} className="text-[#0084ff]" />
                      <h3 className="text-sm font-bold text-slate-900">Répartition par Statut</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">{total} Total</span>
                  </div>

                  <div className="space-y-4">
                    <StatProgressBar label="En Attente"  count={getCount('En Attente')} total={total} colorBg="bg-amber-100"   colorBar="bg-amber-500" />
                    <StatProgressBar label="En Cours"    count={getCount('En Cours')}   total={total} colorBg="bg-blue-100"    colorBar="bg-blue-500" />
                    <StatProgressBar label="Commandées"  count={getCount('Commandee')}  total={total} colorBg="bg-indigo-100"  colorBar="bg-indigo-500" />
                    <StatProgressBar label="Finalisées"  count={getCount('Finalisee')}  total={total} colorBg="bg-emerald-100" colorBar="bg-emerald-500" />
                    <StatProgressBar label="Annulées"    count={getCount('Annulee')}    total={total} colorBg="bg-rose-100"    colorBar="bg-rose-500" />
                  </div>
                </div>

                {/* Chart 2: Type Breakdown (Local vs Étranger) */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <PieChart size={18} className="text-[#0084ff]" />
                      <h3 className="text-sm font-bold text-slate-900">Origine des Commandes</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">Local vs Étranger</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-cyan-50/60 border border-cyan-200/80 rounded-2xl p-4 text-center">
                      <span className="text-2xl">🏠</span>
                      <p className="text-2xl font-black text-cyan-900 mt-1">{localCount}</p>
                      <p className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider">Local</p>
                      <p className="text-[10px] text-cyan-600 font-semibold mt-1">
                        {total > 0 ? Math.round((localCount / total) * 100) : 0}% du total
                      </p>
                    </div>

                    <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4 text-center">
                      <span className="text-2xl">✈️</span>
                      <p className="text-2xl font-black text-purple-900 mt-1">{foreignCount}</p>
                      <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Étranger</p>
                      <p className="text-[10px] text-purple-600 font-semibold mt-1">
                        {total > 0 ? Math.round((foreignCount / total) * 100) : 0}% du total
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between font-medium">
                    <span>Taux d'importation :</span>
                    <span className="font-bold text-purple-700">
                      {total > 0 ? Math.round((foreignCount / total) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Chart 3: Performance & Efficiency Widget */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Activity size={18} className="text-[#0084ff]" />
                      <h3 className="text-sm font-bold text-slate-900">Performance Achats</h3>
                    </div>

                    {/* Small Year Filter for Items Completion */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                      <Calendar size={12} className="text-[#0084ff]" />
                      <select
                        value={itemYear}
                        onChange={(e) => setItemYear(e.target.value)}
                        className="bg-transparent text-slate-800 text-[11px] font-bold focus:outline-none cursor-pointer"
                        title="Filtrer la période du Taux de Finalisation"
                      >
                        <option value="all">Toutes les périodes</option>
                        {(metrics?.availableYears && metrics.availableYears.length > 0 ? metrics.availableYears : [2026, 2025, 2024]).map((yr) => (
                          <option key={yr} value={yr}>Année {yr}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taux de Finalisation Articles</p>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {itemYear === 'all' ? 'Toutes périodes' : `Année ${itemYear}`}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-0.5">
                          {metrics?.itemCompletionRate ?? 0}%
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                          📦 {metrics?.itemMetrics?.deliveredItems || 0} / {metrics?.itemMetrics?.activeItems || 0} articles livrés
                          {metrics?.itemMetrics?.cancelledItems > 0 && ` (${metrics?.itemMetrics?.cancelledItems} annulés exclus)`}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <TrendingUp size={20} />
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Demandes en Soumission</p>
                        <p className="text-2xl font-black text-amber-600 mt-0.5">
                          {getCount('En Attente')}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Clock size={20} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 4: Monthly Dual Bar Chart (Demandes vs Articles) */}
                <MonthlyDualBarChart
                  data={metrics?.monthlyBreakdown}
                  chartYear={chartYear}
                  onChartYearChange={setChartYear}
                  availableYears={metrics?.availableYears || [2026, 2025, 2024]}
                />

              </div>

              {/* Lower Dashboard Grid: Activity Stream & Pending Requests */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left: Recent Activity Feed */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Activity size={16} className="text-[#0084ff]" />
                      <span>Historique d'Activité Récente</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-semibold">{recentActivities.length} récents</span>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {recentActivities.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">Aucune activité récente</p>
                    ) : (
                      recentActivities.map((act) => (
                        <div key={act.HistoryID} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60 hover:bg-slate-100/70 transition-colors">
                          <div className="w-7 h-7 rounded-full bg-[#0084ff] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {act.ChangedBy?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-900 truncate">{act.ChangedBy}</p>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {act.ChangedAt && !isNaN(new Date(act.ChangedAt).getTime()) ? new Date(act.ChangedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 font-medium truncate">
                              <span className="font-mono text-blue-600 font-bold">{act.RequestNumber}</span> : {act.Title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-slate-400 font-medium">{act.PreviousStatus || 'Nouveau'}</span>
                              <span className="text-[10px] text-slate-400">➔</span>
                              <StatusBadge status={act.NewStatus} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Urgent Pending Requests Widget */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock size={16} className="text-amber-500" />
                      <span>Demandes en Attente de Traitement</span>
                    </h3>
                    <button
                      onClick={() => { setActiveNav('requests'); setActiveTab('en-attente'); }}
                      className="text-xs font-bold text-[#0084ff] hover:underline flex items-center gap-1"
                    >
                      Voir toutes <ArrowUpRight size={12} />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {requests.filter(r => r.CurrentStatus === 'En Attente').slice(0, 5).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">Aucune demande en attente</p>
                    ) : (
                      requests.filter(r => r.CurrentStatus === 'En Attente').slice(0, 5).map(req => (
                        <div key={req.RequestID} className="flex items-center justify-between p-3 bg-amber-50/40 border border-amber-200/60 rounded-xl hover:bg-amber-50/80 transition-colors">
                          <div className="min-w-0 mr-2">
                            <p className="text-xs font-mono font-bold text-amber-900">{req.RequestNumber}</p>
                            <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{req.Title}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Par {req.RequesterName} ({req.Department})</p>
                          </div>
                          <button
                            onClick={() => setSelectedReqId(req.RequestID)}
                            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Eye size={13} />
                            {t('actions.details', 'Détails')}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* DEMANDES TABLE VIEW WITH FULL DETAILS MODAL                       */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeNav !== 'dashboard' && (
            <div className="space-y-6">

              {/* Segmented Pill Tabs */}
              {activeNav !== 'mes-dem' && (
                <div className="bg-[#eef3f8] p-1.5 rounded-full border border-slate-200/60 inline-flex items-center gap-1">
                  {[
                    ...(directorAuthEnabled && (user.directorCode || user.DirectorCode || user.role === 'Admin') ? [{ id: 'val-direction', label: 'Validation Direction 👑', status: 'En Attente Validation Direction' }] : []),
                    { id: 'en-attente', label: t('tabs.pending', 'En Attente'),    status: 'En Attente' },
                    { id: 'en-cours',   label: t('tabs.inProgress', 'En Cours'),   status: 'En Cours' },
                    { id: 'commandee',  label: t('tabs.ordered', 'Commandées'),   status: 'Commandee' },
                    { id: 'finalisee',  label: t('tabs.completed', 'Finalisées'), status: 'Finalisee' },
                    { id: 'annulee',    label: t('tabs.cancelled', 'Annulée'),     status: 'Annulee' },
                    { id: 'archivee',   label: t('tabs.archived', 'Archivées 📦'), status: 'Archivee' },
                    { id: 'toutes',     label: t('tabs.all', 'Toutes'),            status: '' },
                  ].map(tItem => {
                    const isActive = activeTab === tItem.id;
                    return (
                      <button
                        key={tItem.id}
                        onClick={() => setActiveTab(tItem.id)}
                        className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          isActive
                            ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-800 font-medium'
                        }`}
                      >
                        <span>{tItem.label}</span>
                        {tItem.id === 'val-direction' && valDirCount > 0 ? (
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow-sm animate-pulse border border-rose-300 ml-1">
                            {valDirCount}
                          </span>
                        ) : metrics ? (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-blue-50 text-[#0084ff]' : 'bg-slate-200/70 text-slate-600'}`}>
                            {getCount(tItem.status)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search & Filter Control Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('actions.searchPlaceholder', 'Rechercher N° Réf, Objet, Articles...')}
                    className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                  >
                    <option value="">Types ({t('tabs.all', 'Tous')})</option>
                    <option value="Local">🏠 {t('form.local', 'Local')}</option>
                    <option value="Etranger">✈️ {t('form.foreign', 'Étranger')}</option>
                  </select>

                  <button
                    onClick={() => setShowAdvancedFilter(v => !v)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all ${
                      showAdvancedFilter || departmentFilter || startDateFilter || endDateFilter || hasSignedDocFilter
                        ? 'bg-blue-50 text-[#0084ff] border border-blue-300 font-bold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <SlidersHorizontal size={13} className={showAdvancedFilter ? 'text-[#0084ff]' : 'text-slate-400'} />
                    <span>{t('actions.advancedFilters', 'Filtres Avancés')}</span>
                    {(departmentFilter || startDateFilter || endDateFilter || hasSignedDocFilter) && (
                      <span className="w-2 h-2 rounded-full bg-[#0084ff]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Advanced Filters Panel */}
              {showAdvancedFilter && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <SlidersHorizontal size={14} className="text-[#0084ff]" />
                      Filtres de Recherche Avancés
                    </span>
                    {(departmentFilter || startDateFilter || endDateFilter || hasSignedDocFilter || typeFilter || search) && (
                      <button
                        onClick={() => {
                          setDepartmentFilter('');
                          setStartDateFilter('');
                          setEndDateFilter('');
                          setHasSignedDocFilter(false);
                          setTypeFilter('');
                          setSearch('');
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} />
                        Réinitialiser tous les filtres
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Department Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Département / Service
                      </label>
                      <select
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">Tous les départements</option>
                        <option value="Direction Générale">Direction Générale</option>
                        <option value="Service Achat">Service Achat</option>
                        <option value="Production">Production</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="IT & Système">IT & Système</option>
                        <option value="Logistique & Stock">Logistique & Stock</option>
                        <option value="Ressources Humaines">Ressources Humaines</option>
                      </select>
                    </div>

                    {/* Date Début */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Date Début
                      </label>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={e => setStartDateFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Date Fin */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Date Fin
                      </label>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={e => setEndDateFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Signed Doc Checkbox */}
                    <div className="flex items-end pb-1.5">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hasSignedDocFilter}
                          onChange={e => setHasSignedDocFilter(e.target.checked)}
                          className="w-4 h-4 text-[#0084ff] rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">📄 Bon d'achat signé</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center h-48 text-slate-500 text-xs gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500/30 border-t-[#0084ff] rounded-full animate-spin" />
                    Chargement des données...
                  </div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                    <AlertCircle size={28} className="mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">Aucune demande d'achat trouvée</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f8fafc] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/80">
                        <th className="px-6 py-3.5">{t('table.refNo', 'N° RÉFÉRENCE')} & {t('table.subject', 'OBJET')}</th>
                        <th className="px-6 py-3.5">{t('table.date', 'DATE')}</th>
                        <th className="px-6 py-3.5">{t('table.type', 'TYPE')}</th>
                        <th className="px-6 py-3.5">{t('table.department', 'DÉPARTEMENT')}</th>
                        <th className="px-6 py-3.5">{t('table.requester', 'DEMANDEUR')}</th>
                        <th className="px-6 py-3.5">{t('table.status', 'STATUT')}</th>
                        <th className="px-6 py-3.5 text-right">{t('table.actions', 'ACTIONS')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.map(req => (
                        <tr
                          key={req.RequestID}
                          onClick={() => setSelectedReqId(req.RequestID)}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        >
                          {/* N° Référence & Objet */}
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-900 font-mono">{req.RequestNumber}</p>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">{req.Title}</p>
                          </td>

                          {/* Date */}
                          <td className="px-6 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                            {req.RequestDate && !isNaN(new Date(req.RequestDate).getTime()) ? new Date(req.RequestDate).toLocaleDateString('fr-FR') : '—'}
                          </td>

                          {/* Type */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              req.Type === 'Local' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {req.Type === 'Local' ? '🏠 Local' : '✈️ Étranger'}
                            </span>
                          </td>

                          {/* Département */}
                          <td className="px-6 py-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                            {req.Department}
                          </td>

                          {/* Demandeur */}
                          <td className="px-6 py-4 text-xs font-bold text-slate-800 whitespace-nowrap">
                            {formatCleanName(req.RequesterName)}
                          </td>

                          {/* Statut */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={req.CurrentStatus} targetDirectorCode={req.TargetDirectorCode} />
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {req.CurrentStatus === 'En Attente Validation Responsable' && (user.isResponsable || user.subordinatesCount > 0 || user.role === 'Admin') && (
                                <>
                                  <button
                                    onClick={(e) => handleValidateTeamRequest(e, req.RequestID)}
                                    className="px-2.5 py-1 rounded-full bg-purple-700 hover:bg-purple-800 text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-xs"
                                    title="Valider cette demande"
                                  >
                                    ✅ Valider
                                  </button>
                                  <button
                                    onClick={(e) => handleRejectTeamRequest(e, req.RequestID)}
                                    className="px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-xs"
                                    title="Refuser cette demande"
                                  >
                                    ❌ Refuser
                                  </button>
                                </>
                              )}
                              {['Finalisee', 'Finalisée'].includes(req.CurrentStatus) && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await axios.put(`/api/requests/${req.RequestID}/status`, { newStatus: 'Archivée', comments: 'Archivée' }, getAuthHeader());
                                      setRefreshKey(k => k + 1);
                                    } catch (err) { console.error(err); }
                                  }}
                                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                  title="Archiver la demande"
                                >
                                  <Archive size={13} />
                                  <span>Archiver</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedReqId(req.RequestID); }}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-[#0084ff] hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Voir les Détails"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedReqForStatus(req); setNewStatus(req.CurrentStatus); setComment(''); }}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Changer le statut"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setPrintReqId(req.RequestID); }}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Imprimer la demande"
                              >
                                <Printer size={15} />
                              </button>
                              {(req.RequesterID === user.userId || user.role === 'Admin') && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la demande ${req.RequestNumber} ?`)) return;
                                    try {
                                      await axios.delete(`/api/requests/${req.RequestID}`, getAuthHeader());
                                      setRefreshKey(k => k + 1);
                                    } catch (err) {
                                      console.error(err);
                                      alert(err.response?.data?.error || 'Échec de la suppression de la demande');
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Supprimer la demande"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ═══ DETAIL MODAL FOR REQUEST DETAILS ═════════════════════════════════ */}
      <RequestDetailModal
        requestId={selectedReqId}
        isOpen={Boolean(selectedReqId)}
        onClose={() => setSelectedReqId(null)}
        onStatusUpdated={() => setRefreshKey(k => k + 1)}
      />

      {/* ═══ STATUS CHANGE QUICK MODAL ════════════════════════════════════════ */}
      {selectedReqForStatus && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">Mettre à Jour le Statut</h3>
              <p className="text-xs text-blue-600 font-mono font-bold mt-0.5">{selectedReqForStatus.RequestNumber}</p>
              <p className="text-xs text-slate-600 mt-1 font-medium">{selectedReqForStatus.Title}</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Statut actuel</label>
              <StatusBadge status={selectedReqForStatus.CurrentStatus} />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nouveau statut</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'En Attente', label: 'En Attente' },
                  { value: 'En Cours',   label: 'En Cours' },
                  { value: 'Commandée',  label: 'Commandée' },
                  { value: 'Finalisée',  label: 'Finalisée' },
                  { value: 'Annulée',    label: 'Annulée' },
                  { value: 'Brouillon',  label: 'Brouillon' },
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setNewStatus(s.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      newStatus === s.value
                        ? 'border-[#0084ff] bg-blue-50 text-[#0084ff] shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Commentaire</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder="Commentaire de validation..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSelectedReqForStatus(null)}
                className="flex-1 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updating || !newStatus}
                className="flex-1 py-2.5 rounded-full bg-[#0084ff] hover:bg-[#0073e6] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
              >
                {updating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateRequestModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => { setIsCreateOpen(false); setRefreshKey(k => k+1); }} />
      <EditDraftModal isOpen={!!editingDraftReq} onClose={() => setEditingDraftReq(null)} onSuccess={() => { setEditingDraftReq(null); setRefreshKey(k => k+1); }} request={editingDraftReq} initialItems={editingDraftItems} user={user} />
      <RequestDetailModal requestId={selectedReqId} isOpen={!!selectedReqId} onClose={() => setSelectedReqId(null)} onStatusUpdated={() => setRefreshKey(k => k+1)} onEditDraft={(req, items) => { setEditingDraftReq(req); setEditingDraftItems(items); }} user={user} />
      <PrintModal requestId={printReqId} isOpen={!!printReqId} onClose={() => setPrintReqId(null)} />
      <ChangePasswordModal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />
      <InterimModal isOpen={isInterimOpen} onClose={() => setIsInterimOpen(false)} currentUser={currentUserState} onSaved={(newInterimId) => { setCurrentUserState(prev => ({ ...prev, interimManagerId: newInterimId })); setRefreshKey(k => k + 1); }} />
    </div>
  );
}
