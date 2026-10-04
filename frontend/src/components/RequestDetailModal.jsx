import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  X, Printer, Clock, FileText, Download, CheckCircle2,
  Paperclip, ArrowRight, User, Building, Calendar,
  Tag, Shield, AlertCircle, Edit3, MessageSquare, Plus, FileEdit
} from 'lucide-react';
import PrintModal from './PrintModal';
import { formatCleanName, getInitials } from '../utils/nameUtils';

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

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('fr-FR');
};

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const s = STATUS_STYLE[status] || STATUS_STYLE['Brouillon'];
  const label = t(`status.${status}`, s.label);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.bg}`}>
      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}

export default function RequestDetailModal({ requestId, isOpen, onClose, onStatusUpdated, onEditDraft, user }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Status Update state inside modal
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [fileLoading, setFileLoading] = useState(null); // attachmentId being loaded
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !requestId) {
      setData(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/requests/${requestId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
        setNewStatus(res.data.request?.CurrentStatus || '');
      } catch (err) {
        console.error('Error fetching request details:', err);
        setError('Impossible de charger les détails de cette demande.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, requestId]);

  if (!isOpen) return null;

  const handleUpdateItemStatus = async (itemId, newItemStatus, deliveredQuantity) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/requests/${requestId}/items/${itemId}/status`, { 
        newItemStatus, 
        deliveredQuantity 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedAutoStatus = res.data?.autoUpdatedRequestStatus;
      const updatedStatus = res.data?.newItemStatus || newItemStatus;
      const updatedDelivQty = res.data?.deliveredQuantity;

      setData(prev => ({
        ...prev,
        request: updatedAutoStatus ? { ...prev.request, CurrentStatus: updatedAutoStatus } : prev.request,
        items: (prev?.items || []).map(it => it.ItemID === itemId ? { 
          ...it, 
          ItemStatus: updatedStatus,
          DeliveredQuantity: updatedDelivQty !== undefined ? updatedDelivQty : it.DeliveredQuantity
        } : it)
      }));

      if (onStatusUpdated) {
        onStatusUpdated();
      }
    } catch (err) {
      console.error('Error updating item status:', err);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === data?.request?.CurrentStatus) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${requestId}/status`, {
        newStatus,
        comments: comment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh data
      const res = await axios.get(`/api/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
      setShowStatusPicker(false);
      setComment('');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Échec de la mise à jour du statut.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitDraft = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${requestId}/status`, { newStatus: 'En Attente', comments: 'Soumission de la demande après brouillon' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      console.error('Error submitting draft:', err);
    }
  };

  const handleRestoreDraft = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${requestId}/status`, { newStatus: 'Brouillon', comments: 'Restaurée en brouillon' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      console.error('Error restoring draft:', err);
    }
  };

  const handleValidateByResponsable = async () => {
    if (!window.confirm("Valider cette demande et la transmettre au service Achat ?")) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${requestId}/status`, {
        newStatus: 'En Attente',
        comments: comment ? `Validée par le Responsable : ${comment}` : 'Validée par le Responsable / Intérimaire'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      console.error('Error validating request:', err);
      alert('Échec de la validation de la demande.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectByResponsable = async () => {
    const reason = window.prompt("Motif du refus de cette demande (obligatoire) :");
    if (!reason || !reason.trim()) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${requestId}/status`, {
        newStatus: 'Refusée par Responsable',
        comments: `Refusée par le Responsable : ${reason.trim()}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Échec du refus de la demande.');
    } finally {
      setUpdating(false);
    }
  };

  const handleValidateByDirection = async () => {
    if (!window.confirm("Valider cette demande en tant que Direction et la transmettre aux Achats ?")) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${requestId}/status`, {
        newStatus: 'En Attente',
        comments: comment ? `Validée par la Direction (${user?.directorCode || user?.DirectorCode || 'Direction'}) : ${comment}` : `Validée définitivement par la Direction (${user?.directorCode || user?.DirectorCode || 'Direction'})`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      console.error('Error validating by direction:', err);
      alert('Échec de la validation par la Direction.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectByDirection = async () => {
    const reason = window.prompt("Motif du refus par la Direction (obligatoire) :");
    if (!reason || !reason.trim()) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/requests/${requestId}/status`, {
        newStatus: 'Refusée par Direction',
        comments: `Refusée par la Direction (${user?.directorCode || user?.DirectorCode || 'Direction'}) : ${reason.trim()}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      console.error('Error rejecting by direction:', err);
      alert('Échec du refus par la Direction.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer / annuler cette demande ?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err) {
      console.error('Error deleting request:', err);
    }
  };

  const openAttachment = async (att) => {
    setFileLoading(att.AttachmentID);
    setFileError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attachments/${att.AttachmentID}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const text = await response.text();
        setFileError(text || `Erreur ${response.status}: Le fichier est introuvable sur le serveur.`);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      // Revoke object URL after a short delay to free memory
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      if (!win) {
        // Fallback: download if popup blocked
        const a = document.createElement('a');
        a.href = url;
        a.download = att.OriginalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error opening attachment:', err);
      setFileError('Impossible d\'ouvrir ce fichier. Vérifiez votre connexion.');
    } finally {
      setFileLoading(null);
    }
  };

  const req = data?.request;
  const items = data?.items || [];
  const attachments = data?.attachments || [];
  const history = data?.statusHistory || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col font-['Inter',sans-serif]">

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono font-bold text-[#0084ff] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                {req?.RequestNumber || 'Chargement...'}
              </span>
              {req && (
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  req.Type === 'Local' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {req.Type === 'Local' ? '🏠 Local' : '✈️ Étranger'}
                </span>
              )}
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
              {req?.Title || 'Détails de la demande'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-xs gap-2">
            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-[#0084ff] rounded-full animate-spin" />
            Chargement des détails de la demande...
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : !req ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>Demande introuvable ou indisponible.</span>
          </div>
        ) : (
          /* Modal Body Scrollable */
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">

            {/* Header Cards Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 relative overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Demandeur</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0084ff] text-white flex items-center justify-center text-xs font-black shrink-0 overflow-hidden shadow-xs">
                    {getInitials(req.RequesterName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 leading-tight truncate">{formatCleanName(req.RequesterName)}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">@{req.RequesterUsername || 'user'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Département</p>
                <div className="flex items-center gap-2 text-slate-800">
                  <Building size={16} className="text-blue-500 shrink-0" />
                  <span className="text-xs font-bold">{req.Department || '—'}</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Demande</p>
                <div className="flex items-center gap-2 text-slate-800">
                  <Calendar size={16} className="text-blue-500 shrink-0" />
                  <span className="text-xs font-bold">
                    {formatDate(req.RequestDate)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Statut Actuel</p>
                <div>
                  <StatusBadge status={req.CurrentStatus} />
                </div>
              </div>
            </div>

            {/* Responsable Validation Banner */}
            {req.CurrentStatus === 'En Attente Validation Responsable' && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-purple-500/20">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-950">Demande en attente de Validation Responsable ⏳</p>
                    <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                      Cette demande nécessite la validation du responsable hiérarchique avant d'être transmise au service Achat.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleValidateByResponsable}
                    disabled={updating}
                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <CheckCircle2 size={15} />
                    <span>Valider la Demande ✅</span>
                  </button>
                  <button
                    onClick={handleRejectByResponsable}
                    disabled={updating}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <X size={15} />
                    <span>Refuser ❌</span>
                  </button>
                </div>
              </div>
            )}

            {/* Direction Final Validation Banner */}
            {req.CurrentStatus === 'En Attente Validation Direction' && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-purple-500/20">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-950">👑 Validation Finale Direction Requise (Niveau 2)</p>
                    <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                      Cette demande a été validée au Niveau 1 et est en attente de la confirmation par la Direction ({req.TargetDirectorCode ? `Directeur : ${req.TargetDirectorCode}` : 'DP, DC, DRH, DFC, DG'}).
                    </p>
                  </div>
                </div>

                {(user?.directorCode || user?.role === 'Admin' || user?.DirectorCode) ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleValidateByDirection}
                      disabled={updating}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <CheckCircle2 size={15} />
                      <span>Valider (Transmission Achats) ✅</span>
                    </button>
                    <button
                      onClick={handleRejectByDirection}
                      disabled={updating}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <X size={15} />
                      <span>Refuser (Direction) ❌</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-purple-900 bg-purple-100 border border-purple-300 px-3 py-1.5 rounded-full">
                    En attente confirmation Direction
                  </span>
                )}
              </div>
            )}

            {/* Description Notes */}
            {req.Description && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-1">Remarques / Motif</p>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{req.Description}</p>
              </div>
            )}

            {/* Articles & Produits Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="bg-[#f8fafc] px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Articles Demandés ({items.length})
                </h3>
                {(req.CurrentStatus === 'Brouillon' || req.RequesterID === user?.userId || user?.role === 'Admin') && onEditDraft && !['Finalisee', 'Finalisée', 'Archivee', 'Archivée'].includes(req.CurrentStatus) && (
                  <button
                    onClick={() => { onClose(); onEditDraft(req, items); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <FileEdit size={14} />
                    <span>Ajouter / Modifier les articles</span>
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200/60">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">DÉSIGNATION ARTICLE</th>
                      <th className="px-4 py-2.5 text-center">QUANTITÉ</th>
                      <th className="px-4 py-2.5">STATUT ARTICLE</th>
                      <th className="px-4 py-2.5">OBSERVATIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={item.ItemID || idx} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-900">{item.ItemDescription}</td>

                        {/* Interactive Quantity Delivered Counter */}
                        <td className="px-4 py-3 text-xs font-black text-center min-w-[130px]">
                          <div className="flex items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl shadow-2xs">
                            <input
                              type="number"
                              min="0"
                              max={item.Quantity}
                              value={item.DeliveredQuantity ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  handleUpdateItemStatus(item.ItemID, null, val);
                                }
                              }}
                              className="w-12 text-center text-xs font-black bg-white border border-slate-300 rounded-lg py-1 px-0.5 text-blue-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              title="Quantité livrée à ce jour"
                            />
                            <span className="text-slate-400 font-extrabold text-[11px]">/ {item.Quantity} <span className="text-blue-600 font-bold ml-0.5">{item.Unit || 'U'}</span></span>
                          </div>

                          {/* Item Delivery Progress Bar */}
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5 max-w-[100px] mx-auto">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                (item.DeliveredQuantity || 0) >= item.Quantity ? 'bg-emerald-500' :
                                (item.DeliveredQuantity || 0) > 0 ? 'bg-purple-500' : 'bg-slate-300'
                              }`}
                              style={{ width: `${Math.min(100, Math.round(((item.DeliveredQuantity || 0) / (item.Quantity || 1)) * 100))}%` }}
                            />
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={item.ItemStatus || 'En Attente'}
                            onChange={(e) => handleUpdateItemStatus(item.ItemID, e.target.value)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${
                              item.ItemStatus === 'Livré Totalement' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                              item.ItemStatus === 'Livré Partiellement' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                              item.ItemStatus === 'En Cours' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                              item.ItemStatus === 'Non Disponible' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                              item.ItemStatus === 'Annulé' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                              'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            <option value="En Attente">⏳ En Attente</option>
                            <option value="En Cours">🔵 En Cours</option>
                            <option value="Livré Partiellement">🚚 Livré Partiellement</option>
                            <option value="Livré Totalement">✅ Livré Totalement</option>
                            <option value="Non Disponible">❌ Non Disponible</option>
                            <option value="Annulé">🚫 Annulé</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                          {item.Observation || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attachments Section */}
            {attachments.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Paperclip size={14} className="text-[#0084ff]" />
                  <span>Pièces Jointes & Documents Signés ({attachments.length})</span>
                </h3>

                {fileError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{fileError}</span>
                    <button onClick={() => setFileError('')} className="ml-auto text-rose-400 hover:text-rose-700"><X size={12} /></button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map(att => (
                    <div key={att.AttachmentID} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="min-w-0 mr-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{att.OriginalFileName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {att.AttachmentType === 'SignedDocument' ? '📄 Document Signé' : '📎 Échantillon/Fiche'} · {Math.round((att.FileSize || 0) / 1024)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => openAttachment(att)}
                        disabled={fileLoading === att.AttachmentID}
                        className="p-2 bg-white border border-slate-200 hover:bg-blue-50 text-[#0084ff] rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Télécharger / Visualiser"
                      >
                        {fileLoading === att.AttachmentID ? (
                          <><div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" /><span>Chargement...</span></>
                        ) : (
                          <><Download size={14} /><span>Ouvrir</span></>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status History & Audit Log */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-[#0084ff]" />
                <span>Historique du Traitement ({history.length})</span>
              </h3>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {history.map((h, idx) => (
                  <div key={h.HistoryID || idx} className="relative">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#0084ff] ring-4 ring-white" />
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{h.ChangedByName || 'Système'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(h.ChangedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-slate-400">{h.PreviousStatus || 'Nouveau'}</span>
                        <ArrowRight size={10} className="text-slate-400" />
                        <StatusBadge status={h.NewStatus} />
                      </div>
                      {h.Comments && (
                        <div className={`p-2.5 rounded-xl border mt-2 text-[11px] font-medium leading-relaxed ${
                          h.Comments.includes('✏️') 
                            ? 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-2xs' 
                            : 'bg-white border-slate-200/70 text-slate-700'
                        }`}>
                          <div className="whitespace-pre-line text-[11px]">
                            {h.Comments}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Modal Footer Actions */}
        {req && (
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between shrink-0 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {(req.RequesterID === user?.userId || user?.role === 'Admin') && !['Finalisee', 'Finalisée', 'Archivee', 'Archivée'].includes(req.CurrentStatus) && onEditDraft && (
                <button
                  onClick={() => { onClose(); onEditDraft(req, items); }}
                  className="px-4 py-2 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Modifier les articles, dates ou objet de votre demande"
                >
                  <FileEdit size={14} />
                  <span>Modifier la Demande</span>
                </button>
              )}

              <button
                onClick={() => setShowStatusPicker(v => !v)}
                className="px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-[#0084ff] border border-blue-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <Edit3 size={14} />
                <span>{t('actions.changeStatus', 'Changer Statut')}</span>
              </button>

              {req.CurrentStatus === 'Brouillon' && (
                <button
                  onClick={handleSubmitDraft}
                  className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {t('actions.submitRequest', '🚀 Soumettre la Demande')}
                </button>
              )}

              {['Annulee', 'Annulée'].includes(req.CurrentStatus) && (
                <button
                  onClick={handleRestoreDraft}
                  className="px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer"
                >
                  {t('actions.restoreDraft', '🔄 Restaurer en Brouillon')}
                </button>
              )}

              {(user?.role === 'Admin' || req.RequesterID === user?.userId) && !['Finalisee', 'Finalisée', 'Archivee', 'Archivée'].includes(req.CurrentStatus) && (
                <button
                  onClick={handleDeleteRequest}
                  className="px-4 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                >
                  {t('actions.delete', 'Supprimer')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPrintOpen(true)}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>{t('actions.print', 'Imprimer')}</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {t('form.cancel', 'Fermer')}
              </button>
            </div>
          </div>
        )}

        {/* Quick Status Update Drawer inside Modal */}
        {showStatusPicker && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-slate-900">{t('actions.changeStatus', 'Mettre à jour le statut de cette demande')}</p>
            <div className="grid grid-cols-3 gap-2">
              {['En Attente', 'En Cours', 'Commandee', 'Finalisee', 'Annulee'].map(s => {
                const labels = { 'En Attente':'En Attente', 'En Cours':'En Cours', 'Commandee':'Commandée', 'Finalisee':'Finalisée', 'Annulee':'Annulée' };
                return (
                  <button
                    key={s}
                    onClick={() => setNewStatus(s)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      newStatus === s
                        ? 'border-[#0084ff] bg-white text-[#0084ff] shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {t('status.' + s, labels[s])}
                  </button>
                );
              })}
            </div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Ajouter une remarque..."
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowStatusPicker(false)}
                className="px-3 py-1.5 rounded-full text-xs text-slate-500 hover:bg-slate-200 font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                className="px-4 py-1.5 rounded-full bg-[#0084ff] hover:bg-[#0073e6] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {updating ? 'Enregistrement...' : 'Valider Nouveau Statut'}
              </button>
            </div>
          </div>
        )}

      </div>
      <PrintModal requestId={requestId} isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} />
    </div>
  );
}
