import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  FileText, 
  Printer, 
  Search, 
  History,
  Plus,
  Paperclip,
  Globe2,
  Building,
  UserCheck
} from 'lucide-react';

export default function Dashboard({ onOpenCreateModal }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [metrics, setMetrics] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeTab, setTypeTab] = useState(searchParams.get('type') || 'all');
  const [myOnly, setMyOnly] = useState(false);

  // Status Change Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const urlType = searchParams.get('type');
    if (urlType) {
      setTypeTab(urlType);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDashboardData();
  }, [statusFilter, typeTab, searchQuery, myOnly]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch Metrics
      const metricsRes = await axios.get('/api/dashboard', { headers }).catch(() => null);
      if (metricsRes && metricsRes.data) {
        setMetrics(metricsRes.data.metrics);
        setRecentActivities(metricsRes.data.recentActivities);
      }

      // Fetch Requests List
      const requestsRes = await axios.get('/api/requests', {
        headers,
        params: { 
          status: statusFilter, 
          type: typeTab === 'all' ? '' : typeTab, 
          search: searchQuery, 
          myOnly 
        }
      }).catch(() => null);

      if (requestsRes && requestsRes.data) {
        setRequests(requestsRes.data);
      } else {
        // Fallback demo data
        setRequests([
          {
            RequestID: 1,
            RequestNumber: 'N°1231/SENSUS/DP/2026',
            Type: 'Local',
            RequestDate: '2026-08-10',
            Title: 'Fournitures de Bureau & Équipements IT',
            Department: 'Achat',
            RequesterName: 'Achraf Benali',
            CurrentStatus: 'En Attente',
            HasSignedDoc: true
          },
          {
            RequestID: 2,
            RequestNumber: 'N°1232/SENSUS/DP/2026',
            Type: 'Etranger',
            RequestDate: '2026-08-10',
            Title: 'Outillage Spécifique Importation',
            Department: 'Logistique',
            RequesterName: 'Fatima Zohra',
            CurrentStatus: 'En Cours',
            HasSignedDoc: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !newStatus) return;

    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${selectedRequest.RequestID}/status`, {
        newStatus,
        comments: statusComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSelectedRequest(null);
      setNewStatus('');
      setStatusComment('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Brouillon': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'En Attente': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'En Cours': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Commandée': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Finalisée': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Annulée': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeBadgeStyle = (type) => {
    return type === 'Etranger'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. Segmented Pill Tab Switcher */}
      <div className="flex items-center space-x-2 rtl:space-x-reverse bg-slate-200/70 p-1.5 rounded-full w-fit border border-slate-300/60 shadow-inner">
        <button
          onClick={() => { setTypeTab('all'); setSearchParams({}); }}
          className={`flex items-center space-x-2 rtl:space-x-reverse px-5 py-2 rounded-full text-xs font-bold transition-all ${
            typeTab === 'all'
              ? 'bg-white text-slate-900 shadow-md scale-105'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Toutes les Demandes</span>
        </button>

        <button
          onClick={() => { setTypeTab('Local'); setSearchParams({ type: 'Local' }); }}
          className={`flex items-center space-x-2 rtl:space-x-reverse px-5 py-2 rounded-full text-xs font-bold transition-all ${
            typeTab === 'Local'
              ? 'bg-white text-slate-900 shadow-md scale-105'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4 text-emerald-600" />
          <span>Demandes Locales</span>
        </button>

        <button
          onClick={() => { setTypeTab('Etranger'); setSearchParams({ type: 'Etranger' }); }}
          className={`flex items-center space-x-2 rtl:space-x-reverse px-5 py-2 rounded-full text-xs font-bold transition-all ${
            typeTab === 'Etranger'
              ? 'bg-white text-slate-900 shadow-md scale-105'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe2 className="w-4 h-4 text-indigo-600" />
          <span>Demandes Étrangères</span>
        </button>
      </div>

      {/* 2. Hero Header Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start space-x-4 rtl:space-x-reverse">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-[#0088ff] shrink-0 shadow-sm">
            <Globe2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {typeTab === 'Local' ? 'Demandes d\'Achat Locales' : typeTab === 'Etranger' ? 'Demandes d\'Achat Étrangères' : 'Toutes les Demandes d\'Achat'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Suivi et traitement direct des demandes d'achat pour le service Achats et les départements
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-3 rounded-full bg-[#0088ff] hover:bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all hover:scale-105 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nouveau Document</span>
        </button>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-4 rtl:right-4 rtl:left-auto top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher N° Réf, Objet, Service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-full pl-11 rtl:pr-11 rtl:pl-4 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse flex-wrap gap-y-2 w-full sm:w-auto">
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-full px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">Tous les Statuts</option>
            <option value="Brouillon">Brouillon</option>
            <option value="En Attente">En Attente</option>
            <option value="En Cours">En Cours</option>
            <option value="Commandée">Commandée</option>
            <option value="Finalisée">Finalisée</option>
            <option value="Annulée">Annulée</option>
          </select>

          <button
            onClick={() => setMyOnly(!myOnly)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-sm ${
              myOnly
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
          >
            Mes Demandes
          </button>
        </div>

      </div>

      {/* 4. White Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-500">
                <th className="p-4 pl-6">N° Référence & Objet</th>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Service</th>
                <th className="p-4">Demandeur</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Doc Signé</th>
                <th className="p-4 text-center pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {requests.map((req) => (
                <tr key={req.RequestID} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Reference & Title */}
                  <td className="p-4 pl-6">
                    <span className="font-mono font-bold text-slate-900 block text-sm">
                      {req.RequestNumber}
                    </span>
                    <span className="text-slate-500 block text-xs mt-0.5">
                      <strong className="text-slate-700">Objet :</strong> {req.Title}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="p-4 whitespace-nowrap font-mono text-slate-600">
                    {req.RequestDate ? new Date(req.RequestDate).toLocaleDateString() : new Date(req.CreatedAt).toLocaleDateString()}
                  </td>

                  {/* Type Badge */}
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${getTypeBadgeStyle(req.Type)}`}>
                      {req.Type === 'Etranger' ? 'Étranger' : 'Local'}
                    </span>
                  </td>

                  {/* Department */}
                  <td className="p-4 font-semibold text-slate-800">
                    {req.Department}
                  </td>

                  {/* Requester */}
                  <td className="p-4 text-slate-600">
                    {req.RequesterName || 'Demandeur'}
                  </td>

                  {/* Status Badge (French) */}
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border shadow-xs ${getStatusBadgeStyle(req.CurrentStatus)}`}>
                      {req.CurrentStatus}
                    </span>
                  </td>

                  {/* Signed Doc Status */}
                  <td className="p-4">
                    {req.HasSignedDoc ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-600 text-xs font-semibold">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Signé</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Non scanné</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4 pr-6 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                      <a
                        href={`/print/${req.RequestID}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title={t('dashboard.viewPrint')}
                      >
                        <Printer className="w-4 h-4" />
                      </a>

                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setNewStatus(req.CurrentStatus);
                        }}
                        className="px-2.5 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-[11px] font-semibold transition-all"
                      >
                        Changer Statut
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Status Update Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Mise à jour du statut - <span className="font-mono text-blue-600">{selectedRequest.RequestNumber}</span>
            </h3>

            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nouveau Statut</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="Brouillon">Brouillon</option>
                  <option value="En Attente">En Attente</option>
                  <option value="En Cours">En Cours</option>
                  <option value="Commandée">Commandée</option>
                  <option value="Finalisée">Finalisée</option>
                  <option value="Annulée">Annulée</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Commentaire / Observations</label>
                <textarea
                  rows="3"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Notez les informations de suivi..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 rtl:space-x-reverse pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-[#0088ff] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
                >
                  {updating ? 'Mise à jour...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
