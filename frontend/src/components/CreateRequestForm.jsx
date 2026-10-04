import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  AlertCircle,
  FileCheck,
  Building,
  Globe2,
  ArrowLeft
} from 'lucide-react';

export default function CreateRequestForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Form State
  const [type, setType] = useState('Local'); // Local vs Etranger
  const [customNumber, setCustomNumber] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Achat');
  const [priority, setPriority] = useState('Normal');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [description, setDescription] = useState('');

  // Item List State (Désignation, Quantité, Observation)
  const [items, setItems] = useState([
    { itemDescription: '', quantity: 1, observation: '' }
  ]);

  // Two Distinct File Attachment States
  const [signedDocFile, setSignedDocFile] = useState(null);
  const [sampleFiles, setSampleFiles] = useState([]);

  // Upload Drag & Drop Hover States
  const [isSignedDragOver, setIsSignedDragOver] = useState(false);
  const [isSampleDragOver, setIsSampleDragOver] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  // File Handlers for Zone 1: Signed Document
  const handleSignedDocDrop = (e) => {
    e.preventDefault();
    setIsSignedDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSignedDocFile(e.dataTransfer.files[0]);
    }
  };

  // File Handlers for Zone 2: Samples & Specifications
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title || !department || items.some(i => !i.itemDescription)) {
      setErrorMessage('Veuillez remplir l\'objet, le service et les désignations des articles.');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const authHeaders = { Authorization: `Bearer ${token}` };

      // 1. Create Purchase Request Payload
      const requestPayload = {
        type,
        customNumber,
        requestDate,
        title,
        department,
        priority,
        requiredByDate,
        description,
        items
      };

      const res = await axios.post('/api/requests', requestPayload, { headers: authHeaders });
      const newRequestId = res.data.requestId;

      // 2. Upload Attachments if selected
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

      navigate('/');

    } catch (error) {
      console.error('Error submitting purchase request:', error);
      setErrorMessage(error.response?.data?.error || 'Échec de l\'enregistrement de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 rtl:space-x-reverse text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux Demandes</span>
        </button>

        <h1 className="text-xl font-extrabold text-slate-900">{t('form.title')}</h1>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center space-x-3 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Type Selection (Local vs Étranger) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">{t('form.type')} *</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              onClick={() => setType('Local')}
              className={`flex items-center space-x-3 rtl:space-x-reverse p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                type === 'Local'
                  ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Building className={`w-6 h-6 ${type === 'Local' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <span className="block text-sm">{t('form.local')}</span>
                <span className="block text-[11px] text-slate-500 font-normal">Fournisseurs et commandes locales</span>
              </div>
            </label>

            <label
              onClick={() => setType('Etranger')}
              className={`flex items-center space-x-3 rtl:space-x-reverse p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                type === 'Etranger'
                  ? 'border-indigo-500 bg-indigo-50/60 text-indigo-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Globe2 className={`w-6 h-6 ${type === 'Etranger' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <div>
                <span className="block text-sm">{t('form.foreign')}</span>
                <span className="block text-[11px] text-slate-500 font-normal">Achats & commandes à l'international</span>
              </div>
            </label>
          </div>
        </div>

        {/* Section 2: Header Metadata */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">{t('form.headerInfo')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.requestNumber')} *</label>
              <input
                type="text"
                required
                value={customNumber}
                onChange={(e) => setCustomNumber(e.target.value)}
                placeholder=""
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.requestDate')} *</label>
              <input
                type="date"
                required
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.department')} *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="Achat">Achat</option>
                <option value="Informatique">Informatique (IT)</option>
                <option value="Logistique">Logistique & Transport</option>
                <option value="Maintenance">Maintenance & Travaux</option>
                <option value="Finance">Finance & Comptabilité</option>
                <option value="RH">Ressources Humaines</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.requestTitle')} *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Objet de la demande d'achat..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="Low">{t('priority.Low')}</option>
                <option value="Normal">{t('priority.Normal')}</option>
                <option value="High">{t('priority.High')}</option>
                <option value="Urgent">{t('priority.Urgent')}</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('form.description')}</label>
              <textarea
                rows="2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description globale ou remarques particulières..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Items Table (Désignation, Quantité, Observation) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">{t('form.itemsSection')}</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('form.addItem')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                
                {/* Désignation */}
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{t('form.designation')} *</label>
                  <input
                    type="text"
                    required
                    value={item.itemDescription}
                    onChange={(e) => handleItemChange(idx, 'itemDescription', e.target.value)}
                    placeholder="Désignation précise de l'article"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Quantité */}
                <div className="col-span-4 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{t('form.quantity')} *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Observation */}
                <div className="col-span-7 md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">{t('form.observation')}</label>
                  <input
                    type="text"
                    value={item.observation}
                    onChange={(e) => handleItemChange(idx, 'observation', e.target.value)}
                    placeholder="Remarques, référence fabricant..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Delete button */}
                <div className="col-span-1 flex justify-center pt-3 md:pt-0">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-200 transition-colors"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Dual File Upload Zones */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">{t('form.attachmentsSection')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Zone 1: Physically Signed DA Document */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">{t('form.signedDocZone')}</label>
              <p className="text-xs text-slate-500">{t('form.signedDocDesc')}</p>
              
              <div
                onDragOver={(e) => { e.preventDefault(); setIsSignedDragOver(true); }}
                onDragLeave={() => setIsSignedDragOver(false)}
                onDrop={handleSignedDocDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  isSignedDragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,image/*"
                  id="signed-doc-input"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && setSignedDocFile(e.target.files[0])}
                />
                
                {signedDocFile ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs font-bold">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse truncate">
                      <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="truncate">{signedDocFile.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSignedDocFile(null)}
                      className="text-slate-400 hover:text-red-600 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="signed-doc-input" className="cursor-pointer space-y-2 block">
                    <FileText className="w-8 h-8 mx-auto text-emerald-600 opacity-80" />
                    <span className="block text-xs font-bold text-slate-700">{t('form.dragDropPrompt')}</span>
                    <span className="block text-[10px] text-slate-500">Formats: PDF, JPG, PNG (Max 15MB)</span>
                  </label>
                )}
              </div>
            </div>

            {/* Zone 2: Technical Specifications & Reference Samples */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">{t('form.samplesZone')}</label>
              <p className="text-xs text-slate-500">{t('form.samplesDesc')}</p>
              
              <div
                onDragOver={(e) => { e.preventDefault(); setIsSampleDragOver(true); }}
                onDragLeave={() => setIsSampleDragOver(false)}
                onDrop={handleSampleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  isSampleDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50/50 hover:border-slate-400'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xlsx"
                  id="samples-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files.length > 0) {
                      setSampleFiles(prev => [...prev, ...Array.from(e.target.files)]);
                    }
                  }}
                />

                <label htmlFor="samples-input" className="cursor-pointer space-y-2 block">
                  <UploadCloud className="w-8 h-8 mx-auto text-blue-600 opacity-80" />
                  <span className="block text-xs font-bold text-slate-700">{t('form.dragDropPrompt')}</span>
                  <span className="block text-[10px] text-slate-500">Photos produits, Fiches techniques, Échantillons</span>
                </label>
              </div>

              {/* Sample Files List Preview */}
              {sampleFiles.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {sampleFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse truncate">
                        <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate font-semibold">{file.name}</span>
                        <span className="text-[10px] text-slate-500">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSample(idx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-4 rtl:space-x-reverse pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-full bg-[#0088ff] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-105"
          >
            {submitting ? t('form.submitting') : t('form.submitBtn')}
          </button>
        </div>

      </form>
    </div>
  );
}
