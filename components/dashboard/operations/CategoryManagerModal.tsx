
import React, { useState } from 'react';
import { Category } from '../../../types';
import { db } from '../../../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess: () => void;
}

const CategoryManagerModal: React.FC<Props> = ({ isOpen, onClose, categories, onSuccess }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await db.saveCategory({ name, parentId: parentId || undefined });
    setName('');
    setParentId('');
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest">Gestão de Categorias</h3>
          <button onClick={onClose}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </div>
        
        <form onSubmit={handleAdd} className="p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Nova Categoria/Subcategoria</label>
            <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold uppercase" placeholder="NOME DA CATEGORIA" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">Vincular à Categoria Pai (Opcional)</label>
            <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={parentId} onChange={e => setParentId(e.target.value)}>
              <option value="">NENHUMA (SERÁ CATEGORIA PRINCIPAL)</option>
              {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all">Cadastrar Categoria</button>
        </form>

        <div className="p-8 pt-0 border-t border-slate-100 max-h-60 overflow-y-auto">
          <p className="text-[9px] font-black text-slate-300 uppercase mb-4 mt-4 tracking-widest">Existentes no Sistema</p>
          <div className="space-y-2">
            {categories.filter(c => !c.parentId).map(parent => (
              <div key={parent.id} className="space-y-1">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-700">{parent.name}</span>
                </div>
                {categories.filter(sub => sub.parentId === parent.id).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-2 ml-6 bg-white rounded-lg border border-dashed border-slate-200">
                    <span className="text-[9px] font-bold text-slate-500">• {sub.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;
