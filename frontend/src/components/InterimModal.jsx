import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCheck, ShieldAlert, X, Check } from 'lucide-react';

export default function InterimModal({ isOpen, onClose, currentUser, onSaved }) {
  const [users, setUsers] = useState([]);
  const [selectedInterimId, setSelectedInterimId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } });
        const allUsers = Array.isArray(res.data) ? res.data : [];
        const eligible = allUsers.filter(u => u.UserID !== currentUser?.userId);
        setUsers(eligible);

        if (currentUser?.interimManagerId) {
          setSelectedInterimId(String(currentUser.interimManagerId));
        } else {
          setSelectedInterimId('');
        }
      } catch (err) {
        console.error('Failed to fetch users for interim selection:', err);
        setError('Impossible de charger la liste des utilisateurs.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSave = async (targetId) => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/users/me/interim', {
        interimManagerId: targetId ? parseInt(targetId) : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (onSaved) onSaved(targetId ? parseInt(targetId) : null);
      onClose();
    } catch (err) {
      console.error('Failed to update interim delegate:', err);
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour du délégué intérimaire');
    } finally {
      setSaving(false);
    }
  };

  const activeDelegateObj = users.find(u => u.UserID === parseInt(selectedInterimId));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 relative">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Délégué Intérimaire (Valideur)</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Désignez un collaborateur pour valider les demandes de votre équipe en votre absence.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-xs text-slate-500 gap-2">
            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-600 rounded-full animate-spin" />
            Chargement de la liste...
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Sélectionner le Délégué Intérimaire
              </label>
              <select
                value={selectedInterimId}
                onChange={e => setSelectedInterimId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-purple-600 focus:bg-white cursor-pointer"
              >
                <option value="">-- Aucun Délégué Intérimaire (Intérim Désactivé) --</option>
                {users.map(u => (
                  <option key={u.UserID} value={u.UserID}>
                    {u.FullName} — ({u.Department}) [{u.Role}]
                  </option>
                ))}
              </select>
            </div>

            {selectedInterimId ? (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-purple-900 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-purple-600" />
                  <span>Délégué Sélectionné : {activeDelegateObj?.FullName || 'Utilisateur'}</span>
                </p>
                <p className="text-[11px] text-purple-700 font-medium">
                  Toutes les demandes de votre équipe pourront être validées par cet utilisateur. Ses propres demandes passeront directement sans validation.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 font-medium">
                Aucun intérimaire actif. Vous êtes actuellement le seul valideur des demandes de votre équipe.
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              {currentUser?.interimManagerId && (
                <button
                  type="button"
                  onClick={() => handleSave(null)}
                  disabled={saving}
                  className="py-2.5 px-4 rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X size={14} />
                  <span>Désactiver</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSave(selectedInterimId)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={14} />
                    <span>Enregistrer la Délégation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
