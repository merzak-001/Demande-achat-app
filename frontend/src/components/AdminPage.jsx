import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Users, UserPlus, Shield, Trash2, LogOut, Building2,
  CheckCircle, XCircle, ChevronDown, AlertCircle, Check, KeyRound, Pencil, X, Search, Filter, UserCheck, Plus
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import ChangePasswordModal from './ChangePasswordModal';

const ROLES = ['Acheteur', 'Demandeur', 'Admin'];
const ROLE_COLOR = {
  Admin:     'bg-rose-50 text-rose-700 border-rose-200',
  Acheteur:  'bg-blue-50 text-blue-700 border-blue-200',
  Demandeur: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function AdminPage({ user, onLogout }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');

  const [systemSettings, setSystemSettings] = useState({
    ENABLE_RESPONSABLE_APPROVAL: true,
    ENABLE_DIRECTOR_AUTHORIZATION: false,
    ENABLE_DEMANDE_APPROVAL: true
  });

  const [form, setForm] = useState({
    fullName: '', username: '', password: '1010', department: '', role: 'Demandeur',
    isResponsable: false, managerId: '', interimManagerId: '', directorCode: ''
  });

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [uRes, dRes, sRes] = await Promise.all([
        axios.get('/api/users', { headers }),
        axios.get('/api/departments', { headers }),
        axios.get('/api/settings', { headers }).catch(() => ({ data: {} }))
      ]);
      setUsers(uRes.data);
      setDepartments(dRes.data);
      if (sRes.data) {
        setSystemSettings({
          ENABLE_RESPONSABLE_APPROVAL: sRes.data.ENABLE_RESPONSABLE_APPROVAL !== undefined ? Boolean(sRes.data.ENABLE_RESPONSABLE_APPROVAL) : true,
          ENABLE_DIRECTOR_AUTHORIZATION: Boolean(sRes.data.ENABLE_DIRECTOR_AUTHORIZATION),
          ENABLE_DEMANDE_APPROVAL: sRes.data.ENABLE_DEMANDE_APPROVAL !== undefined ? Boolean(sRes.data.ENABLE_DEMANDE_APPROVAL) : true
        });
      }
      if (dRes.data.length > 0 && !form.department) {
        setForm(f => ({ ...f, department: dRes.data[0].DepartmentName }));
      }
    } catch { setError('Erreur chargement utilisateurs'); }
    finally { setLoading(false); }
  };

  // Trigger data load on component mount
  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleResponsableSetting = async () => {
    const currentValue = systemSettings.ENABLE_RESPONSABLE_APPROVAL !== undefined ? systemSettings.ENABLE_RESPONSABLE_APPROVAL : true;
    const newValue = !currentValue;
    try {
      await axios.put('/api/settings', {
        settingKey: 'ENABLE_RESPONSABLE_APPROVAL',
        settingValue: newValue
      }, { headers });
      setSystemSettings(s => ({ ...s, ENABLE_RESPONSABLE_APPROVAL: newValue }));
      setSuccess(`Validation Responsable (N1) ${newValue ? 'ACTIVÉE' : 'DÉSACTIVÉE'} avec succès !`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur mise à jour paramètre');
    }
  };

  const handleToggleDirectorSetting = async () => {
    const newValue = !systemSettings.ENABLE_DIRECTOR_AUTHORIZATION;
    try {
      await axios.put('/api/settings', {
        settingKey: 'ENABLE_DIRECTOR_AUTHORIZATION',
        settingValue: newValue
      }, { headers });
      setSystemSettings(s => ({ ...s, ENABLE_DIRECTOR_AUTHORIZATION: newValue }));
      setSuccess(`Validation Direction (N2) ${newValue ? 'ACTIVÉE' : 'DÉSACTIVÉE'} avec succès !`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur mise à jour paramètre');
    }
  };

  const [newDeptDirectorCode, setNewDeptDirectorCode] = useState('DP');

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await axios.post('/api/departments', { departmentName: newDeptName.trim(), directorCode: newDeptDirectorCode }, { headers });
      setNewDeptName('');
      setNewDeptDirectorCode('DP');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur ajout département.');
    }
  };

  const handleUpdateDepartmentDirector = async (departmentId, directorCode) => {
    try {
      await axios.put(`/api/departments/${departmentId}`, { directorCode }, { headers });
      setDepartments(prev => prev.map(d => d.DepartmentID === departmentId ? { ...d, DirectorCode: directorCode } : d));
      setSuccess('Directeur référent du département mis à jour avec succès !');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur mise à jour directeur département.');
    }
  };

  const handleDeleteDepartment = async (id, name) => {
    if (!window.confirm(`Supprimer le département "${name}" ?`)) return;
    try {
      await axios.delete(`/api/departments/${id}`, { headers });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur suppression département.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.fullName || !form.username || !form.password || !form.department) {
      setError('Tous les champs sont obligatoires.'); return;
    }
    setSaving(true);
    try {
      await axios.post('/api/users', form, { headers });
      setSuccess('Utilisateur créé avec succès !');
      setForm({ fullName: '', username: '', password: '1010', department: '', role: 'Demandeur', isResponsable: false, managerId: '', interimManagerId: '' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création.');
    } finally { setSaving(false); }
  };

  const handleUpdateUser = async (userId, updateData) => {
    try {
      await axios.put(`/api/users/${userId}`, updateData, { headers });
      setSuccess('Utilisateur mis à jour avec succès !');
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour de l\'utilisateur.');
      throw err;
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Supprimer l'utilisateur "${username}" ?`)) return;
    try {
      await axios.delete(`/api/users/${id}`, { headers });
      setUsers(u => u.filter(u => u.UserID !== id));
    } catch { setError('Erreur suppression'); }
  };

  const handleToggle = async (id) => {
    try {
      await axios.patch(`/api/users/${id}/toggle`, {}, { headers });
      fetchUsers();
    } catch { setError('Erreur mise à jour'); }
  };

  return (
    <div className="min-h-screen bg-[#f2f5f9] text-slate-800 flex flex-col font-['Inter',sans-serif]">

      {/* ── Top Bar ── */}
      <header className="px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">Administration Système</h1>
            <p className="text-xs text-slate-500 font-medium">Gestion des accès utilisateurs — SENSUS SPA</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Validation Responsable (N1) Switch */}
          <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200 rounded-full px-3.5 py-1.5 shadow-2xs">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
              👔 Validation Responsable (N1) :
            </span>
            <button
              type="button"
              onClick={handleToggleResponsableSetting}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (systemSettings.ENABLE_RESPONSABLE_APPROVAL ?? true) ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              title={(systemSettings.ENABLE_RESPONSABLE_APPROVAL ?? true) ? 'Validation Responsable (N1) ACTIVÉE' : 'Validation Responsable (N1) DÉSACTIVÉE (Passe directement au niveau suivant / Acheteur)'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  (systemSettings.ENABLE_RESPONSABLE_APPROVAL ?? true) ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-[11px] font-extrabold uppercase ${(systemSettings.ENABLE_RESPONSABLE_APPROVAL ?? true) ? 'text-indigo-700' : 'text-slate-400'}`}>
              {(systemSettings.ENABLE_RESPONSABLE_APPROVAL ?? true) ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* Validation Direction (N2) Switch */}
          <div className="flex items-center gap-2 bg-purple-50/80 border border-purple-200 rounded-full px-3.5 py-1.5 shadow-2xs">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
              👑 Validation Direction (N2) :
            </span>
            <button
              type="button"
              onClick={handleToggleDirectorSetting}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                systemSettings.ENABLE_DIRECTOR_AUTHORIZATION ? 'bg-purple-600' : 'bg-slate-300'
              }`}
              title={systemSettings.ENABLE_DIRECTOR_AUTHORIZATION ? 'Validation Direction (N2) ACTIVÉE' : 'Validation Direction (N2) DÉSACTIVÉE'}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  systemSettings.ENABLE_DIRECTOR_AUTHORIZATION ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-[11px] font-extrabold uppercase ${systemSettings.ENABLE_DIRECTOR_AUTHORIZATION ? 'text-purple-700' : 'text-slate-400'}`}>
              {systemSettings.ENABLE_DIRECTOR_AUTHORIZATION ? 'ON' : 'OFF'}
            </span>
          </div>

          <LanguageSwitcher />

          <button
            onClick={() => setIsPasswordOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-all text-xs font-bold shadow-2xs cursor-pointer"
          >
            <KeyRound size={13} className="text-amber-600" />
            <span>{t('passwordModal.changePasswordNav', 'Changer mot de passe')}</span>
          </button>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">{user.fullName}</p>
            <p className="text-[10px] text-rose-600 font-semibold">Administrateur</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-all text-xs font-bold shadow-2xs cursor-pointer"
          >
            <LogOut size={13} className="text-slate-400" />
            <span>{t('nav.logout', 'Déconnexion')}</span>
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 p-4 sm:p-6 w-full max-w-[1920px] mx-auto overflow-y-auto">

        {/* ── Left: Create Form & Department Config ── */}
        <div className="w-full xl:w-80 shrink-0 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <UserPlus size={18} className="text-[#0084ff]" />
              <h2 className="text-sm font-bold text-slate-900">Nouvel Utilisateur</h2>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs font-semibold">
                <AlertCircle size={14} className="shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-xs font-semibold">
                <CheckCircle size={14} className="shrink-0 mt-px" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { key: 'fullName',   label: 'Nom Complet',       placeholder: 'Mohamed Benali',      type: 'text' },
                { key: 'username',   label: "Nom d'Utilisateur", placeholder: 'mohamed',             type: 'text' },
                { key: 'password',   label: 'Mot de Passe',      placeholder: '••••••••',            type: 'password' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              ))}

              {/* Department Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Département (Liste Référentiel)</label>
                <div className="relative">
                  <select
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white pr-8 cursor-pointer"
                  >
                    {departments.map(d => (
                      <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rôle</label>
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white pr-8 cursor-pointer"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Director Title Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">👑 Titre / Pouvoir Direction</label>
                <div className="relative">
                  <select
                    value={form.directorCode}
                    onChange={e => setForm(f => ({ ...f, directorCode: e.target.value }))}
                    className="w-full appearance-none bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-500 pr-8 cursor-pointer"
                  >
                    <option value="">-- Aucun (Chef de service / Standard) --</option>
                    <option value="DP">DP — Directeur de Production</option>
                    <option value="DC">DC — Responsable Commercial</option>
                    <option value="DRH">DRH — Responsable Ressources Humaines</option>
                    <option value="DFC">DFC — Contrôleur Financier</option>
                    <option value="DG">DG — Directeur Général</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                </div>
              </div>

              {/* Responsable Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isResponsable"
                  checked={form.isResponsable}
                  onChange={e => setForm(f => ({ ...f, isResponsable: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="isResponsable" className="text-xs font-bold text-slate-800 cursor-pointer">
                  👑 Est un Responsable (Chef de service)
                </label>
              </div>

              {/* Assigned Manager Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Responsable Hiérarchique (Superviseur)</label>
                <div className="relative">
                  <select
                    value={form.managerId}
                    onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white pr-8 cursor-pointer"
                  >
                    <option value="">-- Aucun Responsable --</option>
                    {users.map(u => (
                      <option key={u.UserID} value={u.UserID}>
                        {u.FullName} ({u.Department}) {u.IsResponsable ? '👑' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {(form.isResponsable || Boolean(form.directorCode)) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">🔄 Délégué Intérimaire (Valideur en cas d'absence)</label>
                  <div className="relative">
                    <select
                      value={form.interimManagerId}
                      onChange={e => setForm(f => ({ ...f, interimManagerId: e.target.value }))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white pr-8 cursor-pointer"
                    >
                      <option value="">-- Aucun Délégué Intérimaire --</option>
                      {users.map(u => (
                        <option key={u.UserID} value={u.UserID}>
                          {u.FullName} ({u.Department})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-full bg-[#0084ff] hover:bg-[#0073e6] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création...</>
                ) : (
                  <><UserPlus size={14} />Créer l'Utilisateur</>
                )}
              </button>
            </form>
          </div>

          {/* ── Department & Direction Management Card ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0 shadow-2xs">
                  <Building2 size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 leading-snug">Gestion des Départements</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Affectation des Directions (Niveau 2)</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full shrink-0">
                👑 Level 2
              </span>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleAddDepartment} className="space-y-2.5 bg-slate-50 border border-slate-200/70 p-3.5 rounded-xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nom du Nouveau Département
                </label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Ex: Qualité, Maintenance..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">
                  Direction Référente (Valideur L2)
                </label>
                <div className="relative">
                  <select
                    value={newDeptDirectorCode}
                    onChange={(e) => setNewDeptDirectorCode(e.target.value)}
                    className="w-full appearance-none bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-500 cursor-pointer pr-8 shadow-2xs"
                  >
                    <option value="DP">DP (Production)</option>
                    <option value="DC">DC (Commercial)</option>
                    <option value="DRH">DRH (Ressources Humaines)</option>
                    <option value="DFC">DFC (Finances & Contrôle)</option>
                    <option value="DG">DG (Direction Générale)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs mt-1"
              >
                <Plus size={14} />
                <span>Ajouter le Département</span>
              </button>
            </form>

            {/* List Section */}
            <div className="pt-1">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Département</span>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Direction Référente</span>
              </div>

              {/* Department List Scrollable */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {departments.map((d) => (
                  <div key={d.DepartmentID} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl p-2.5 transition-all text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs shrink-0">🏢</span>
                      <span className="font-bold text-slate-900 truncate" title={d.DepartmentName}>
                        {d.DepartmentName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative">
                        <select
                          value={d.DirectorCode || 'DP'}
                          onChange={(e) => handleUpdateDepartmentDirector(d.DepartmentID, e.target.value)}
                          className="appearance-none bg-white border border-purple-300 text-purple-900 font-extrabold text-[11px] rounded-lg pl-2 pr-6 py-1 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                          title="Modifier la Direction référente pour ce département"
                        >
                          <option value="DP">DP</option>
                          <option value="DC">DC</option>
                          <option value="DRH">DRH</option>
                          <option value="DFC">DFC</option>
                          <option value="DG">DG</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none" />
                      </div>

                      <button
                        onClick={() => handleDeleteDepartment(d.DepartmentID, d.DepartmentName)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-all cursor-pointer"
                        title="Supprimer le département"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Role Counts */}
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(role => (
              <div key={role} className={`rounded-2xl border p-3 text-center ${ROLE_COLOR[role]}`}>
                <p className="text-xl font-black">{users.filter(u => u.Role === role).length}</p>
                <p className="text-[10px] font-bold uppercase">{role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Full Width Users Cards Grid & Filter Bar ── */}
        <div className="flex-1 min-w-0 space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou login..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Department Filter */}
              <div className="relative">
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">🏢 Tous les départements</option>
                  {departments.map(d => (
                    <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Role Filter */}
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">👥 Tous les rôles</option>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                {users.filter(u => {
                  const matchesSearch = !searchTerm || u.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.Username?.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesDept = selectedDept === 'ALL' || u.Department === selectedDept;
                  const matchesRole = selectedRole === 'ALL' || u.Role === selectedRole;
                  return matchesSearch && matchesDept && matchesRole;
                }).length} / {users.length} comptes
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-500 text-xs bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-[#0084ff] rounded-full animate-spin mr-3" />
              Chargement des cartes utilisateurs...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {users.filter(u => {
                const matchesSearch = !searchTerm || u.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.Username?.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesDept = selectedDept === 'ALL' || u.Department === selectedDept;
                const matchesRole = selectedRole === 'ALL' || u.Role === selectedRole;
                return matchesSearch && matchesDept && matchesRole;
              }).map(u => (
                <div key={u.UserID} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group">
                  {/* Card Header: Role & Actions */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${ROLE_COLOR[u.Role]}`}>
                        {u.Role}
                      </span>
                      {u.DirectorCode && (
                        <span className="text-[10px] bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full font-bold" title={`Titre Direction: ${u.DirectorCode}`}>
                          👑 {u.DirectorCode}
                        </span>
                      )}
                      {!u.IsActive && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                          Inactif
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingUser(u)}
                        title="Modifier l'utilisateur"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleToggle(u.UserID)}
                        title={u.IsActive ? 'Désactiver' : 'Activer'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        {u.IsActive ? <CheckCircle size={15} /> : <XCircle size={15} />}
                      </button>
                      <button
                        onClick={() => handleDelete(u.UserID, u.Username)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* User Profile Info */}
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 shadow-xs ${
                      u.Role === 'Admin' ? 'bg-gradient-to-br from-rose-500 to-rose-700' : u.Role === 'Acheteur' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                    } text-white`}>
                      {u.FullName?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-slate-900 truncate" title={u.FullName}>{u.FullName}</h3>
                      <p className="text-[11px] text-slate-400 font-mono truncate">@{u.Username}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-semibold mt-0.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                        <Building2 size={11} className="text-slate-400" />
                        {u.Department}
                      </span>
                    </div>
                  </div>

                  {/* Status & Hierarchy Badges */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      {u.IsResponsable ? (
                        <button
                          onClick={() => handleUpdateUser(u.UserID, { isResponsable: false })}
                          className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Cliquer pour révoquer le statut Responsable"
                        >
                          👑 Responsable (Chef)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateUser(u.UserID, { isResponsable: true })}
                          className="text-[10px] text-slate-500 hover:text-amber-700 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 px-2 py-1 rounded-lg font-bold transition-all cursor-pointer"
                          title="Définir cet utilisateur comme Responsable"
                        >
                          + Définir Responsable
                        </button>
                      )}

                      {!u.ManagerID && !u.IsResponsable && u.Role === 'Demandeur' && (
                        <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                          ⚠️ Sans Responsable
                        </span>
                      )}
                    </div>

                    {/* Inline Manager Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Responsable Hiérarchique</label>
                      <select
                        value={u.ManagerID || ''}
                        onChange={(e) => handleUpdateUser(u.UserID, { managerId: e.target.value || null })}
                        className={`w-full rounded-xl text-[11px] font-medium px-2.5 py-1.5 focus:outline-none cursor-pointer border ${
                          !u.ManagerID && !u.IsResponsable && u.Role === 'Demandeur'
                            ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-500'
                        }`}
                      >
                        <option value="">-- Aucun Responsable --</option>
                        {users.filter(mgr => mgr.UserID !== u.UserID).map(mgr => (
                          <option key={mgr.UserID} value={mgr.UserID}>
                            {mgr.FullName} {mgr.IsResponsable ? '👑' : ''} ({mgr.Department})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Active Interim Delegate Card Badge */}
                    {u.InterimManagerName ? (
                      <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-xl px-2.5 py-1.5 text-[11px] font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1 text-purple-700">
                          <UserCheck size={12} className="text-purple-600" />
                          Délégué Intérimaire :
                        </span>
                        <span className="text-purple-900 font-extrabold">{u.InterimManagerName}</span>
                      </div>
                    ) : (
                      (u.IsResponsable || u.DirectorCode) && (
                        <div className="bg-slate-50 border border-slate-200 text-slate-400 rounded-xl px-2.5 py-1 text-[10px] font-medium flex items-center justify-between">
                          <span>Délégué Intérimaire :</span>
                          <span className="italic">Aucun (Géré par le Chef)</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ChangePasswordModal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />
      <EditUserModal 
        user={editingUser} 
        departments={departments} 
        allUsers={users} 
        isOpen={!!editingUser} 
        onClose={() => setEditingUser(null)} 
        onSave={handleUpdateUser} 
      />
    </div>
  );
}

function EditUserModal({ user, departments, allUsers, isOpen, onClose, onSave }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('Demandeur');
  const [isResponsable, setIsResponsable] = useState(false);
  const [managerId, setManagerId] = useState('');
  const [interimManagerId, setInterimManagerId] = useState('');
  const [directorCode, setDirectorCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.FullName || '');
      setUsername(user.Username || '');
      setPassword('');
      setDepartment(user.Department || '');
      setRole(user.Role || 'Demandeur');
      setIsResponsable(Boolean(user.IsResponsable));
      setManagerId(user.ManagerID || '');
      setInterimManagerId(user.InterimManagerID || '');
      setDirectorCode(user.DirectorCode || '');
      setError('');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(user.UserID, {
        fullName,
        username,
        password: password ? password : undefined,
        department,
        role,
        isResponsable,
        managerId: managerId || null,
        interimManagerId: interimManagerId || null,
        directorCode: directorCode || null
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la modification.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Modifier l'Utilisateur: {user.FullName}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nom Complet</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nom d'Utilisateur (Login)</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mot de Passe (Laisser vide si inchangé)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Département</label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {departments.map(d => (
                <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Rôle</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Demandeur">Demandeur</option>
              <option value="Acheteur">Acheteur</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-purple-900 mb-1">👑 Titre / Pouvoir Direction</label>
            <select
              value={directorCode}
              onChange={e => setDirectorCode(e.target.value)}
              className="w-full bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="">-- Aucun (Chef de service / Standard) --</option>
              <option value="DP">DP — Directeur de Production</option>
              <option value="DC">DC — Responsable Commercial</option>
              <option value="DRH">DRH — Responsable Ressources Humaines</option>
              <option value="DFC">DFC — Contrôleur Financier</option>
              <option value="DG">DG — Directeur Général</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="editIsResponsable"
              checked={isResponsable}
              onChange={e => setIsResponsable(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="editIsResponsable" className="text-xs font-bold text-slate-800 cursor-pointer">
              👑 Est un Responsable (Chef de service)
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Responsable Hiérarchique (Superviseur)</label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Aucun Responsable --</option>
              {allUsers.filter(u => u.UserID !== user.UserID).map(u => (
                <option key={u.UserID} value={u.UserID}>
                  {u.FullName} ({u.Department}) {u.IsResponsable ? '👑' : ''}
                </option>
              ))}
            </select>
          </div>

          {(isResponsable || Boolean(directorCode)) && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">🔄 Délégué Intérimaire (Valideur en cas d'absence)</label>
              <select
                value={interimManagerId}
                onChange={e => setInterimManagerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- Aucun Délégué Intérimaire --</option>
                {allUsers.filter(u => u.UserID !== user.UserID).map(u => (
                  <option key={u.UserID} value={u.UserID}>
                    {u.FullName} ({u.Department})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#0084ff] hover:bg-blue-600 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
