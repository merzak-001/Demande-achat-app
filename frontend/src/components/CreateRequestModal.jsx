import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  X,
  Plus, 
  Trash2, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  AlertCircle,
  FileCheck,
  Building,
  Globe2
} from 'lucide-react';

export default function CreateRequestModal({ isOpen, onClose, onSuccess, user }) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Form State
  const [type, setType] = useState('Local'); // Local vs Etranger
  const userDept = user?.department || user?.Department || 'Production';
  const [department, setDepartment] = useState(userDept);
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [requiredByDate, setRequiredByDate] = useState('');

  const getDeptCode = (deptName) => {
    if (!deptName) return 'DP';
    const name = deptName.toLowerCase();
    if (name.includes('comm') || name.includes('vent')) return 'DC';
    if (name.includes('rh') || name.includes('ressource')) return 'DRH';
    if (name.includes('fin') || name.includes('compt')) return 'DFC';
    if (name.includes('dir') || name.includes('gen')) return 'DG';
    return 'DP';
  };

  const [refNum, setRefNum] = useState('');
  const [refDeptCode, setRefDeptCode] = useState(() => getDeptCode(userDept));
  const [refYear, setRefYear] = useState(() => new Date().getFullYear().toString());

  useEffect(() => {
    if (user?.department || user?.Department) {
      const d = user?.department || user?.Department;
      setDepartment(d);
      setRefDeptCode(getDeptCode(d));
    }
  }, [user]);

  // Item List State (Désignation, Quantité, Observation - NO AMOUNTS, NO PRIORITY)
  const [items, setItems] = useState([
    { itemDescription: '', quantity: 1, observation: '' }
  ]);

  // Two Distinct Optional File Attachment States
  const [signedDocFile, setSignedDocFile] = useState(null);
  const [sampleFiles, setSampleFiles] = useState([]);

  // Upload Drag & Drop Hover States
  const [isSignedDragOver, setIsSignedDragOver] = useState(false);
  const [isSampleDragOver, setIsSampleDragOver] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Dynamic Item Row Management
  const handleAddItem = () => {
    setItems([
      ...items,
      { itemDescription: '', quantity: 1, observation: '' }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  // File Handlers
  const handleSignedDocDrop = (e) => {
    e.preventDefault();
    setIsSignedDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSignedDocFile(e.dataTransfer.files[0]);
    }
  };

  const handleSampleDrop = (e) => {
    e.preventDefault();
    setIsSampleDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSampleFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveSample = (index) => {
    setSampleFiles(sampleFiles.filter((_, i) => i !== index));
  };

  // Form Submission Handler
  const handleSubmit = async (e, targetStatus = 'En Attente') => {
    if (e && e.preventDefault) e.preventDefault();
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

      // 1. Create Purchase Request Payload
      const formattedRef = `N°${cleanSeq}/SENSUS/${(refDeptCode.trim() || 'DP').toUpperCase()}/${refYear.trim() || new Date().getFullYear()}`;

      const requestPayload = {
        type,
        customNumber: formattedRef,
        requestDate,
        title,
        department: userDept,
        requiredByDate,
        items,
        status: targetStatus
      };

      const res = await axios.post('/api/requests', requestPayload, { headers: authHeaders });
      const newRequestId = res.data.requestId;

      // 2. Upload Optional Attachments if selected
      if (signedDocFile || sampleFiles.length > 0) {
        const formData = new FormData();
        formData.append('requestId', newRequestId);

        if (signedDocFile) {
          formData.append('signedDocument', signedDocFile);
        }

        if (sampleFiles.length > 0) {
          sampleFiles.forEach(file => {
            formData.append('referenceSamples', file);
          });
        }

        await axios.post(`/api/requests/${newRequestId}/attachments`, formData, {
          headers: {
            ...authHeaders,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error submitting purchase request:', error);
      setErrorMessage(error.response?.data?.error || 'Échec de l\'enregistrement de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{t('form.title')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('form.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center space-x-3 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body - Scrollable */}
        <form id="create-request-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pr-2">
          
          {/* Section 1: Type Selection (Local vs Étranger) */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-3">
            <label className="block text-xs font-extrabold text-blue-900 uppercase tracking-wider">{t('form.type')} *</label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setType('Local')}
                className={`flex items-center space-x-3 rtl:space-x-reverse p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  type === 'Local'
                    ? 'border-emerald-500 bg-white text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Building className={`w-5 h-5 ${type === 'Local' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs">{t('form.local')}</span>
                  <span className="block text-[10px] text-slate-500 font-normal">{t('form.localSubtitle')}</span>
                </div>
              </label>

              <label
                onClick={() => setType('Etranger')}
                className={`flex items-center space-x-3 rtl:space-x-reverse p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  type === 'Etranger'
                    ? 'border-indigo-500 bg-white text-indigo-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Globe2 className={`w-5 h-5 ${type === 'Etranger' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <span className="block text-xs">{t('form.foreign')}</span>
                  <span className="block text-[10px] text-slate-500 font-normal">{t('form.foreignSubtitle')}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.requestNumber')} *</label>
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
                Référence générée : <span className="font-mono font-bold text-blue-600">N°{refNum || '....'}/SENSUS/{refDeptCode || '..'}/{refYear || '2026'}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.requestDate')} *</label>
              <input
                type="date"
                required
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.department')} (Fixe)</label>
              <input
                type="text"
                readOnly
                value={userDept}
                className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-700 cursor-not-allowed select-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.requestTitle')} / Objet de la demande *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('form.titlePlaceholder', 'Ex: Achat d\'imprimantes et consommables pour le service')}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

          </div>

          {/* Section 3: Items Table */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">{t('form.itemsSection')}</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('form.addItem')}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2.5 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{t('form.designation')} *</label>
                    <input
                      type="text"
                      required
                      value={item.itemDescription}
                      onChange={(e) => handleItemChange(idx, 'itemDescription', e.target.value)}
                      placeholder={t('form.designationPlaceholder')}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{t('form.quantity')} *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Unité *</label>
                    <input
                      type="text"
                      list={`create-units-list-${idx}`}
                      value={item.unit || 'U'}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      placeholder="ex: Kg, U, Carton..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                    />
                    <datalist id={`create-units-list-${idx}`}>
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

                  <div className="col-span-11 md:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{t('form.observation')}</label>
                    <input
                      type="text"
                      value={item.observation}
                      onChange={(e) => handleItemChange(idx, 'observation', e.target.value)}
                      placeholder={t('form.observationPlaceholder')}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-1 flex justify-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Optional Attachments */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">{t('form.attachmentsSection')} {t('form.optional')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Zone 1: Physically Signed DA Document */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-800">{t('form.signedDocZone')}</label>
                
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsSignedDragOver(true); }}
                  onDragLeave={() => setIsSignedDragOver(false)}
                  onDrop={handleSignedDocDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    isSignedDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    id="modal-signed-doc-input"
                    className="hidden"
                    onChange={(e) => e.target.files[0] && setSignedDocFile(e.target.files[0])}
                  />
                  
                  {signedDocFile ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-emerald-800 text-xs font-bold">
                      <span className="truncate">{signedDocFile.name}</span>
                      <button type="button" onClick={() => setSignedDocFile(null)} className="text-slate-400 hover:text-red-600 ml-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="modal-signed-doc-input" className="cursor-pointer space-y-1 block">
                      <FileText className="w-6 h-6 mx-auto text-emerald-600 opacity-80" />
                      <span className="block text-[11px] font-bold text-slate-700">{t('form.dragDropPrompt')}</span>
                      <span className="block text-[9px] text-slate-400">PDF, JPG, PNG {t('form.optional')}</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Zone 2: Specifications & Samples */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-800">{t('form.samplesZone')}</label>
                
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsSampleDragOver(true); }}
                  onDragLeave={() => setIsSampleDragOver(false)}
                  onDrop={handleSampleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    isSampleDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xlsx"
                    id="modal-samples-input"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files.length > 0) {
                        setSampleFiles(prev => [...prev, ...Array.from(e.target.files)]);
                      }
                    }}
                  />

                  <label htmlFor="modal-samples-input" className="cursor-pointer space-y-1 block">
                    <UploadCloud className="w-6 h-6 mx-auto text-blue-600 opacity-80" />
                    <span className="block text-[11px] font-bold text-slate-700">{t('form.dragDropPrompt')}</span>
                    <span className="block text-[9px] text-slate-400">Fiches techniques, Photos {t('form.optional')}</span>
                  </label>
                </div>

                {sampleFiles.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {sampleFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-800">
                        <span className="truncate font-semibold">{file.name}</span>
                        <button type="button" onClick={() => handleRemoveSample(idx)} className="text-slate-400 hover:text-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

        </form>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {t('form.cancel')}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'Brouillon')}
            disabled={submitting}
            className="px-5 py-2 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            {t('form.saveDraftBtn')}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, 'En Attente')}
            disabled={submitting}
            className="px-6 py-2 rounded-full bg-[#0084ff] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            {submitting ? t('form.submitting') : t('form.submitBtn')}
          </button>
        </div>

      </div>
    </div>
  );
}
