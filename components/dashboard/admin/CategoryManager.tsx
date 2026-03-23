
import React, { useState, useEffect } from 'react';
import { db } from '../../../utils/storage';
import { Category } from '../../../types';
import CategoryManagerModal from '../operations/CategoryManagerModal';

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await db.getCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Categorias de Operação</h3>
          <p className="text-xs text-slate-500 mt-1">Gerencie as categorias e subcategorias de viagens</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
        >
          Configurar Categorias
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm">Carregando...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Nenhuma categoria cadastrada.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.filter(c => !c.parentId).map(cat => (
            <div key={cat.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#3b82f6' }}></div>
                <span className="text-sm font-bold text-slate-700">{cat.name}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {categories.filter(sub => sub.parentId === cat.id).map(sub => (
                  <span key={sub.id} className="text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                    {sub.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <CategoryManagerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          categories={categories}
          onSuccess={() => {
            loadCategories();
            setIsModalOpen(false);
          }}
          actingUser={{ role: 'admin' } as any}
        />
      )}
    </div>
  );
}
