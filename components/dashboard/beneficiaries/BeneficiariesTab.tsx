
import React, { useState, useMemo, useEffect } from 'react';
import { Beneficiary, User } from '../../../types';
import { db } from '../../../utils/storage';
import BeneficiaryModal from './BeneficiaryModal';

interface BeneficiariesTabProps {
  userId: string;
  beneficiaries: Beneficiary[];
  onSave: (b: Beneficiary) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const StatusBadge: React.FC<{ status: Beneficiary['status'] }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
    status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
    {status}
  </span>
);

const BeneficiariesTab: React.FC<BeneficiariesTabProps> = ({ userId, beneficiaries, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Ativo' | 'Inativo'>('todos');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [usersLoading, setUsersLoading] = useState(true);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    const ids = beneficiaries.map(b => b.userId).filter(Boolean) as string[];
    if (!ids.length) { setUsersLoading(false); return; }
    setUsersLoading(true);
    db.getUsers().then(users => {
      const map: Record<string, User> = {};
      users.forEach(u => { if (ids.includes(u.id)) map[u.id] = u; });
      setUsersMap(map);
    }).catch(err => {
      console.error('[BeneficiariesTab] getUsers:', err?.message || err);
    }).finally(() => setUsersLoading(false));
  }, [beneficiaries]);

  const toggleReveal = (benId: string) => {
    setRevealedPasswords(prev => {
      const next = new Set(prev);
      next.has(benId) ? next.delete(benId) : next.add(benId);
      return next;
    });
  };

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return beneficiaries
      .filter(b => {
        const matchSearch =
          b.name.toLowerCase().includes(q) ||
          (b.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          (b.cnpj || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
          b.phone.includes(q) ||
          (b.email || '').toLowerCase().includes(q);
        const matchStatus = statusFilter === 'todos' || b.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [beneficiaries, search, statusFilter]);

  const handleOpen = (b?: Beneficiary) => {
    setEditing(b || null);
    setIsModalOpen(true);
  };

  const handleSave = async (b: Beneficiary) => {
    try {
      await onSave(b);
      setIsModalOpen(false);
      showToast('Beneficiário salvo com sucesso.');
      // Recarrega usuários para refletir novo login (se criado no modal)
      db.getUsers().then(users => {
        const map: Record<string, User> = {};
        users.forEach(u => { map[u.id] = u; });
        setUsersMap(map);
      }).catch(() => {});
    } catch {
      showToast('Erro ao salvar beneficiário.', 'err');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
      showToast('Beneficiário removido.');
    } catch {
      showToast('Erro ao remover beneficiário.', 'err');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDoc = (b: Beneficiary) => {
    const doc = b.cpf || b.cnpj || '';
    if (!doc) return '—';
    return doc;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Beneficiários</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
            {beneficiaries.length} cadastrado{beneficiaries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
        >
          + Novo Beneficiário
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, documento, telefone ou e-mail..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
        {(['todos', 'Ativo', 'Inativo'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'}`}
          >
            {s === 'todos' ? 'Todos' : s}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            {search || statusFilter !== 'todos' ? 'Nenhum resultado encontrado' : 'Nenhum beneficiário cadastrado'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(b => (
            <div key={b.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 uppercase text-[12px] leading-tight truncate">{b.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">{formatDoc(b)}</p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-bold">{b.phone || '—'}</span>
                </div>
                {b.email && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-bold truncate">{b.email}</span>
                  </div>
                )}
                {b.paymentPreference && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="font-bold">{b.paymentPreference}</span>
                    {b.pixKey && <span className="text-slate-400 truncate">· {b.pixKey}</span>}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {/* Acesso ao portal: credenciais */}
                {b.userId && usersMap[b.userId] ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                      </svg>
                      <span className="text-[8px] font-black uppercase tracking-widest text-blue-600">Acesso ao Portal</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Usuário</p>
                        <p className="text-[10px] font-mono font-black text-slate-700 break-all">{usersMap[b.userId].username}</p>
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Senha</p>
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] font-mono font-black text-slate-700 break-all flex-1">
                            {revealedPasswords.has(b.id)
                              ? (usersMap[b.userId].password || '—')
                              : '••••••••'}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleReveal(b.id); }}
                            className="text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                            title={revealedPasswords.has(b.id) ? 'Ocultar senha' : 'Revelar senha'}
                          >
                            {revealedPasswords.has(b.id) ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {b.userId && usersLoading ? (
                      <>
                        <svg className="w-3 h-3 text-amber-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Carregando acesso...</span>
                      </>
                    ) : (
                      <>
                        <div className={`w-2 h-2 rounded-full ${b.userId ? 'bg-red-300' : 'bg-slate-300'}`} />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          {b.userId ? 'Usuário não encontrado' : 'Sem acesso ao portal'}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpen(b)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[8px] font-black uppercase transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(b.id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[8px] font-black uppercase transition-all"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BeneficiaryModal */}
      <BeneficiaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editing={editing}
      />

      {/* Confirm Delete */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-5">
            <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Confirmar remoção</h3>
            <p className="text-[11px] text-slate-500 font-bold">
              Tem certeza que deseja remover o beneficiário{' '}
              <span className="text-slate-800">{beneficiaries.find(b => b.id === confirmDeleteId)?.name}</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeneficiariesTab;
