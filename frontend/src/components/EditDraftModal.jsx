import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  Building, 
  Calendar,
  AlertTriangle,
  FileEdit,
  Layers,
  FileText
} from 'lucide-react';

export default function EditDraftModal({ isOpen, onClose, onSuccess, request, initialItems = [], user }) {
  const { t } = useTranslation();

  const [type, setType] = useState('Local');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [refNum, setRefNum] = useState('');
  const [refDeptCode, setRefDeptCode] = useState('DP');
  const [refYear, setRefYear] = useState(() => new Date().getFullYear().toString());

  const isDraft = request?.CurrentStatus === 'Brouillon';

  useEffect(() => {
    if (request && isOpen) {
      setType(request.Type || 'Local');
      setTitle(request.Title || '');
      setDescription(request.Description || '');
      
      // Request date formatting
      if (request.RequestDate) {
        const d = new Date(request.RequestDate);
        setRequestDate(!isNaN(d.getTime()) ? d.toISOString().split('T')[0] : (request.RequestDate || ''));
      } else {
        setRequestDate(new Date().toISOString().split('T')[0]);
      }

      // Required by date formatting
      if (request.RequiredByDate) {
        const d = new Date(request.RequiredByDate);
        setRequiredByDate(!isNaN(d.getTime()) ? d.toISOString().split('T')[0] : (request.RequiredByDate || ''));
      } else {
        setRequiredByDate('');
      }
      
      if (request.RequestNumber) {
        const match = request.RequestNumber.match(/N°([^/]+)\/SENSUS\/([^/]+)\/(\d+)/i);
        if (match) {
          setRefNum(match[1]);
          setRefDeptCode(match[2].toUpperCase());
          setRefYear(match[3]);
        }
      }

      if (initialItems && initialItems.length > 0) {
        setItems(initialItems.map(i => ({
          itemDescription: i.ItemDescription || '',
          quantity: i.Quantity || 1,
          unit: i.Unit || 'U',
          observation: i.Observation || ''
        })));
      } else {
        setItems([{ itemDescription: '', quantity: 1, unit: 'U', observation: '' }]);
      }
      setErrorMessage('');
    }
  }, [request, initialItems, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !request) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      { itemDescription: '', quantity: 1, unit: 'U', observation: '' }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (targetStatus = null) => {
    setErrorMessage('');

    const cleanSeq = refNum.trim().replace(/^0+/, '');
    if (!cleanSeq) {
      setErrorMessage('Veuillez saisir un numéro de référence valide');
      return;
    }

    if (!refDeptCode.trim()) {
      setErrorMessage('Veuillez saisir un code département (ex: DP)');
      return;
    }

    if (!refYear.trim()) {
      setErrorMessage('Veuillez saisir l\'année (ex: 2026)');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Veuillez saisir un objet / titre pour la demande');
      return;
    }

    if (items.some(i => !i.itemDescription.trim())) {
      setErrorMessage('Toutes les lignes d\'articles doivent contenir une désignation');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const authHeaders = { Authorization: `Bearer ${token}` };

      const formattedRef = `N°${cleanSeq}/SENSUS/${(refDeptCode.trim() || 'DP').toUpperCase()}/${refYear.trim() || new Date().getFullYear()}`;

      const payload = {
        type,
        customNumber: formattedRef,
        title: title.trim(),
        department: request.Department,
        requestDate: requestDate || undefined,
        requiredByDate: requiredByDate || undefined,
        description: description || '',
        items,
        status: targetStatus || (isDraft ? 'Brouillon' : request.CurrentStatus)
      };

      await axios.put(`/api/requests/${request.RequestID}`, payload, { headers: authHeaders });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error updating request:', error);
      setErrorMessage(error.response?.data?.error || 'Échec de la mise à jour de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement cette demande (${request.RequestNumber}) ?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/requests/${request.RequestID}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting request:', error);
      setErrorMessage(error.response?.data?.error || 'Échec de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>{isDraft ? 'Modifier le Brouillon' : 'Modifier la Demande d\'Achat'}</span>
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800">
                  {request.RequestNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isDraft ? 'Mise à jour des informations avant soumission' : 'Édition des informations, dates, objet et articles de votre demande'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          
          {/* Status Note Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Statut de la demande :</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                {request.CurrentStatus}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Créée par : <span className="font-bold text-slate-700">{request.RequesterName || user?.fullName}</span>
            </p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Reference Number */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">N° de Référence *</label>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl p-1.5 font-mono text-xs font-bold text-slate-800 shadow-2xs">
                <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded-lg text-xs font-black shrink-0">N°</span>
                
                <input
                  type="text"
                  required
                  value={refNum}
                  onChange={(e) => setRefNum(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                  placeholder=""
                  className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-center text-blue-700 font-extrabold focus:outline-none focus:border-blue-500"
                  title="Numéro de séquence"
                />

                <span className="text-slate-400 font-bold text-xs shrink-0">/SENSUS/</span>

                <select
                  value={refDeptCode}
                  onChange={(e) => setRefDeptCode(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-center text-indigo-700 font-extrabold focus:outline-none focus:border-blue-500 cursor-pointer text-xs"
                  title="Direction / Titre (DP, DC, DRH, DFC, DG)"
                >
                  <option value="DP">DP — Directeur de Production</option>
                  <option value="DC">DC — Responsable Commercial</option>
                  <option value="DRH">DRH — Responsable Ressources Humaines</option>
                  <option value="DFC">DFC — Contrôleur Financier</option>
                  <option value="DG">DG — Directeur Général</option>
                </select>

                <span className="text-slate-400 font-bold text-xs shrink-0">/</span>

                <input
                  type="text"
                  required
                  value={refYear}
                  onChange={(e) => setRefYear(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="2026"
                  className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-center text-slate-800 font-extrabold focus:outline-none focus:border-blue-500"
                  maxLength={4}
                  title="Année"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                Référence finale : <span className="font-mono font-bold text-blue-600">N°{refNum || '....'}/SENSUS/{refDeptCode || '..'}/{refYear || '2026'}</span>
              </p>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Type de Demande *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="Local">📦 Achats Locaux</option>
                <option value="Etranger">🌐 Achats À l'Étranger (Import)</option>
              </select>
            </div>

            {/* Date Demande */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date de la Demande</label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Date Souhaitée */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date Souhaitée</label>
              <input
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Département</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 flex items-center gap-2">
                <Building size={14} className="text-slate-400" />
                <span>{request.Department || 'Production'}</span>
              </div>
            </div>

            {/* Title / Objet */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Objet de la demande *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Objet de la demande..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Description / Remarques */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Remarques / Observations</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Remarques éventuelles sur la réquisition..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

          </div>

          {/* Items Section */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Layers size={14} className="text-blue-600" />
                <span>Articles Demandés ({items.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un Article</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  
                  {/* Designation */}
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Désignation *</label>
                    <input
                      type="text"
                      required
                      value={item.itemDescription}
                      onChange={(e) => handleItemChange(idx, 'itemDescription', e.target.value)}
                      placeholder="Désignation exacte de l'article..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Quantité *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Unit */}
                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Unité *</label>
                    <input
                      type="text"
                      list={`edit-units-list-${idx}`}
                      value={item.unit || 'U'}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      placeholder="ex: Kg, U..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                    />
                    <datalist id={`edit-units-list-${idx}`}>
                      <option value="U" />
                      <option value="Kg" />
                      <option value="L" />
                      <option value="M" />
                      <option value="Boîte" />
                      <option value="Carton" />
                      <option value="Paquet" />
                      <option value="Roul" />
                      <option value="Ens" />
                      <option value="Bouteille" />
                      <option value="Sac" />
                    </datalist>
                  </div>

                  {/* Observation */}
                  <div className="col-span-11 md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Observation</label>
                    <input
                      type="text"
                      value={item.observation}
                      onChange={(e) => handleItemChange(idx, 'observation', e.target.value)}
                      placeholder="Spécifications..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Delete Item Row */}
                  <div className="col-span-1 flex justify-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Supprimer cette ligne d'article"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 px-6 py-4 bg-slate-50 shrink-0">
          
          {isDraft ? (
            <button
              type="button"
              onClick={handleDeleteDraft}
              disabled={isDeleting || submitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>Supprimer le Brouillon</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              Annuler
            </button>
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {isDraft ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit('Brouillon')}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>Enregistrer (Brouillon)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit('En Attente')}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0084ff] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>Soumettre la Demande</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(request.CurrentStatus)}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={15} />
                <span>{submitting ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
