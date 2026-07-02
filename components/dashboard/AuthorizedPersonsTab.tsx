import React, { useState, useEffect, useMemo } from 'react';
import { AuthorizedPerson } from '../../types';
import { db } from '../../utils/storage';
import { maskCPF, maskRG, maskPlate } from '../../utils/masks';

const emptyForm = (): AuthorizedPerson => ({ id: '', name: '', cpf: '', rg: '', veiculo: '' });

const AuthorizedPersonsTab: React.FC = () => {
  const [persons, setPersons] = useState<AuthorizedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<AuthorizedPerson>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadPersons = async () => {
    setLoading(true);
    try {
      setPersons(await db.getAuthorizedPersons());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPersons(); }, []);

  const resetForm = () => { setForm(emptyForm()); setEditingId(null); };

  const handleEdit = (p: AuthorizedPerson) => {
    setForm({ ...p });
    setEditingId(p.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      const payload: AuthorizedPerson = {
        id: editingId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ap-${Date.now()}`),
        name: form.name.trim().toUpperCase(),
        cpf: form.cpf?.trim() || undefined,
        rg: form.rg?.trim() || undefined,
        veiculo: form.veiculo?.trim().toUpperCase() || undefined,
        createdAt: form.createdAt || new Date().toISOString(),
      };
      const ok = await db.saveAuthorizedPerson(payload);
      if (ok) { resetForm(); await loadPersons(); }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover esta pessoa autorizada?')) return;
    await db.deleteAuthorizedPerson(id);
    if (editingId === id) resetForm();
    await loadPersons();
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return persons.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.cpf || '').includes(search) ||
      (p.veiculo || '').toLowerCase().includes(q)
    );
  }, [persons, search]);

  const inputClasses = 'w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 text-[11px] font-bold uppercase focus:border-rose-500 focus:bg-white outline-none transition-all placeholder:text-slate-300';
  const labelClass = 'text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
      {/* Formulário de cadastro / edição */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
            {editingId ? 'Editar Pessoa' : 'Nova Pessoa Autorizada'}
          </h3>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-[9px] font-black text-slate-400 uppercase hover:text-slate-600">Cancelar</button>
          )}
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Nome</label>
          <input className={inputClasses} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="NOME COMPLETO" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelClass}>CPF</label>
            <input className={inputClasses} value={form.cpf || ''} onChange={e => setForm(f => ({ ...f, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>RG</label>
            <input className={inputClasses} value={form.rg || ''} onChange={e => setForm(f => ({ ...f, rg: maskRG(e.target.value) }))} placeholder="00.000.000-0" />
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Veículo (Placa)</label>
          <input className={`${inputClasses} font-mono tracking-widest`} value={form.veiculo || ''} onChange={e => setForm(f => ({ ...f, veiculo: maskPlate(e.target.value) }))} placeholder="ABC1D23" />
        </div>
        <button
          type="submit"
          disabled={isSaving || !form.name.trim()}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Adicionar Pessoa'}
        </button>
      </form>

      {/* Lista */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Pessoas Autorizadas</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Selecionáveis nos memorandos · {persons.length} cadastrada(s)</p>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="BUSCAR NOME, CPF OU PLACA..."
            className="px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[10px] font-bold uppercase focus:border-rose-500 outline-none transition-all placeholder:text-slate-300 sm:w-64"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-[10px] font-black uppercase tracking-widest">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            {persons.length === 0 ? 'Nenhuma pessoa autorizada cadastrada.' : 'Nenhum resultado para a busca.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(p => (
              <div key={p.id} className="flex items-center gap-4 py-3.5 group">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-800 uppercase truncate">{p.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    {p.cpf && <span className="text-[9px] font-bold text-slate-400 uppercase">CPF: <span className="text-slate-600 font-mono">{p.cpf}</span></span>}
                    {p.rg && <span className="text-[9px] font-bold text-slate-400 uppercase">RG: <span className="text-slate-600 font-mono">{p.rg}</span></span>}
                    {p.veiculo && <span className="text-[9px] font-bold text-slate-400 uppercase">Veículo: <span className="text-slate-700 font-mono">{p.veiculo}</span></span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(p)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="2.5" /></svg>
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Remover">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorizedPersonsTab;
