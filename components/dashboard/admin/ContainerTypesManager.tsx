import React, { useState, useEffect } from 'react';
import { db } from '../../../utils/storage';
import { ContainerType } from '../../../types';

export default function ContainerTypesManager() {
  const [types, setTypes] = useState<ContainerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTypeName, setNewTypeName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const data = await db.getContainerTypes();
      setTypes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    
    setIsSaving(true);
    try {
      const newType = {
        id: `ct-${Date.now()}`,
        name: newTypeName.trim()
      };
      await db.saveContainerType(newType);
      setNewTypeName('');
      await loadTypes();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este tipo de container?')) return;
    
    try {
      await db.deleteContainerType(id);
      await loadTypes();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tipos de Container</h3>
        <p className="text-xs text-slate-500 mt-1">Gerencie os tipos de container disponíveis nos formulários</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          placeholder="Ex: 40HC, 20DC, 40NOR..."
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSaving}
        />
        <button
          type="submit"
          disabled={isSaving || !newTypeName.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Salvando...' : 'Adicionar'}
        </button>
      </form>

      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm">Carregando...</div>
      ) : types.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Nenhum tipo de container cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {types.map(type => (
            <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group">
              <span className="text-sm font-bold text-slate-700">{type.name}</span>
              <button
                onClick={() => handleDelete(type.id)}
                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="Remover"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
