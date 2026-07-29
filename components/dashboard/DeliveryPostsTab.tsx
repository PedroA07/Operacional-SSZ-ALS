
import React, { useState, useEffect, useMemo } from 'react';
import { DeliveryPost, User } from '../../types';
import { maskCEP, maskPhone } from '../../utils/masks';
import { Icons } from '../../constants/icons';
import { db } from '../../utils/storage';
import ListFilters from './shared/ListFilters';

interface DeliveryPostsTabProps {
  user?: User;
}

const emptyForm: Partial<DeliveryPost> = {
  name: '', address: '', neighborhood: '', city: '', state: '', zipCode: '', phone: '', hours: '', notes: '',
};

const DeliveryPostsTab: React.FC<DeliveryPostsTabProps> = ({ user }) => {
  const [posts, setPosts] = useState<DeliveryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<Partial<DeliveryPost>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<DeliveryPost | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const data = await db.getDeliveryPosts();
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = !q ? [...posts] : posts.filter(p =>
      [p.name, p.city, p.state, p.address, p.neighborhood, p.phone].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
    result.sort((a, b) => {
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'recent') return (b.registrationDate || '').localeCompare(a.registrationDate || '');
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [posts, searchQuery, sortBy]);

  const openModal = (p?: DeliveryPost) => {
    setForm(p || emptyForm);
    setEditingId(p?.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !form.name?.trim()) return;
    setSaving(true);
    const ok = await db.saveDeliveryPost({ ...form, id: editingId }, user);
    setSaving(false);
    if (ok) {
      setIsModalOpen(false);
      fetchPosts();
    } else {
      alert('Erro ao salvar o posto de entrega. Verifique se a migração foi aplicada no banco.');
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await db.deleteDeliveryPost(toDelete.id);
    setToDelete(null);
    fetchPosts();
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <ListFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            placeholder="PESQUISAR POSTO / CIDADE / TELEFONE..."
          />
        </div>
        <button onClick={() => openModal()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 shrink-0 h-[58px] mt-[-24px]">Novo Posto</button>
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Postos de Entrega de Documentos</h3>
        <span className="text-[10px] font-black text-slate-400">{filtered.length} {filtered.length === 1 ? 'posto' : 'postos'}</span>
      </div>

      {loading ? (
        <div className="py-20 text-center"><div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-20 text-center">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nenhum posto cadastrado</p>
          <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Cadastre os locais onde os documentos podem ser entregues</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all flex flex-col overflow-hidden">
              <div className="p-5 flex items-start gap-3 border-b border-slate-100">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 uppercase text-[12px] leading-tight">{p.name}</p>
                  {(p.city || p.state) && <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{[p.city, p.state].filter(Boolean).join(' - ')}</p>}
                </div>
              </div>
              <div className="p-5 space-y-2 flex-1">
                {p.address && <p className="text-[10px] font-bold text-slate-600 uppercase leading-tight">{p.address}{p.neighborhood ? `, ${p.neighborhood}` : ''}</p>}
                {p.phone && <p className="text-[10px] font-black text-blue-600">{maskPhone(p.phone)}</p>}
                {p.hours && <p className="text-[9px] font-bold text-slate-500 uppercase"><span className="text-slate-400">Horário:</span> {p.hours}</p>}
                {p.notes && <p className="text-[9px] font-medium text-slate-400 italic leading-snug">{p.notes}</p>}
              </div>
              <div className="px-5 pb-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                <button onClick={() => openModal(p)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="2.5"/></svg></button>
                <button onClick={() => setToDelete(p)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Icons.Excluir /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal cadastro/edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                  <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.2em]">{editingId ? 'Editar Posto' : 'Novo Posto de Entrega'}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Local de entrega de documentos</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white border border-slate-200 text-slate-300 hover:text-red-500 rounded-full flex items-center justify-center transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-[#fcfdfe]">
              <div className="space-y-1">
                <label className={labelClass}>Nome do Posto / Local</label>
                <input required type="text" className={inputClasses} value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="EX: POSTO GRAAL KM 158" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1"><label className={labelClass}>Telefone</label><input type="text" className={inputClasses} value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} /></div>
                <div className="space-y-1"><label className={labelClass}>Horário de Funcionamento</label><input type="text" className={inputClasses} value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value.toUpperCase() })} placeholder="EX: SEG A SEX, 8H-18H" /></div>
              </div>
              <div className="space-y-1"><label className={labelClass}>Logradouro e Número</label><input type="text" className={inputClasses} value={form.address} onChange={e => setForm({ ...form, address: e.target.value.toUpperCase() })} placeholder="RUA, AVENIDA, Nº, RODOVIA KM" /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1"><label className={labelClass}>Bairro</label><input type="text" className={inputClasses} value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-1"><label className={labelClass}>CEP</label><input type="text" className={inputClasses} value={form.zipCode} onChange={e => setForm({ ...form, zipCode: maskCEP(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-1"><label className={labelClass}>Cidade</label><input type="text" className={inputClasses} value={form.city} onChange={e => setForm({ ...form, city: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-1"><label className={labelClass}>UF</label><input type="text" maxLength={2} className={inputClasses} value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} /></div>
              </div>
              <div className="space-y-1"><label className={labelClass}>Observações</label><textarea rows={3} className={`${inputClasses} !normal-case resize-none`} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Instruções de entrega, ponto de referência, responsável..." /></div>

              <button type="submit" disabled={saving} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all mt-2 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3">
                {saving ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : 'Salvar Posto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Exclusão */}
      {toDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner"><Icons.Excluir /></div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Excluir Posto</h3>
                <p className="text-xs text-slate-400 mt-2">Remover permanentemente {toDelete.name}?</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setToDelete(null)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
                <button onClick={handleDelete} className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPostsTab;
