
import React, { useState, useEffect } from 'react';
import { Category, User } from '../../../types';
import { db } from '../../../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSuccess: () => void;
  actingUser: User;
}

const CategoryManagerModal: React.FC<Props> = ({ isOpen, onClose, categories, onSuccess, actingUser }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [color, setColor] = useState('#3b82f6'); // Default blue

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setParentId('');
    setColor('#3b82f6');
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setParentId(category.parentId || '');
    setColor(category.color || '#3b82f6');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    const categoryData: Partial<Category> = {
      id: editingId || `cat-${Date.now()}`,
      name,
      parentId: parentId || undefined,
      color
    };

    const success = await db.saveCategory(categoryData, actingUser);
    if (!success) {
      alert('Erro ao salvar categoria. Verifique as permissões ou se a coluna "color" existe na tabela.');
      return;
    }
    resetForm();
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest">Configurações de Categorias</h3>
          <button onClick={onClose}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </div>
        
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase">{editingId ? 'Editar Categoria' : 'Nova Categoria/Subcategoria'}</label>
            <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold uppercase" placeholder="NOME DA CATEGORIA" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase">Vincular à Categoria Pai</label>
              <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold text-xs" value={parentId} onChange={e => setParentId(e.target.value)}>
                <option value="">NENHUMA (PRINCIPAL)</option>
                {categories.filter(c => !c.parentId && c.id !== editingId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase">Cor da Categoria</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-12 h-12 rounded-xl border-none cursor-pointer" value={color} onChange={e => setColor(e.target.value)} />
                <span className="text-xs font-mono font-bold text-slate-600 uppercase">{color}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="flex-1 py-4 bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all">Cancelar</button>
            )}
            <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all">
              {editingId ? 'Salvar Alterações' : 'Cadastrar Categoria'}
            </button>
          </div>
        </form>

        <div className="p-8 pt-0 border-t border-slate-100 max-h-60 overflow-y-auto">
          <p className="text-[9px] font-black text-slate-300 uppercase mb-4 mt-4 tracking-widest">Existentes no Sistema</p>
          <div className="space-y-2">
            {categories.filter(c => !c.parentId).map(parent => (
              <div key={parent.id} className="space-y-1">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: parent.color || '#3b82f6' }}></div>
                    <span className="text-[10px] font-black text-slate-700">{parent.name}</span>
                  </div>
                  <button onClick={() => handleEdit(parent)} className="text-blue-600 hover:text-blue-800 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </div>
                {categories.filter(sub => sub.parentId === parent.id).map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-2 ml-6 bg-white rounded-lg border border-dashed border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color || parent.color || '#3b82f6' }}></div>
                      <span className="text-[9px] font-bold text-slate-500">{sub.name}</span>
                    </div>
                    <button onClick={() => handleEdit(sub)} className="text-blue-600 hover:text-blue-800 p-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
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
