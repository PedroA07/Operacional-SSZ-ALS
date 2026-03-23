import React, { useState, useEffect } from 'react';
import { db } from '../../../utils/storage';

export default function OperationTypesManager() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3B82F6');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [defaultTypeId, setDefaultTypeId] = useState<string>('');

  useEffect(() => {
    loadTypes();
    const savedDefault = localStorage.getItem('defaultOperationType');
    if (savedDefault) setDefaultTypeId(savedDefault);
  }, []);

  const handleSetDefault = (id: string) => {
    if (defaultTypeId === id) {
      setDefaultTypeId('');
      localStorage.removeItem('defaultOperationType');
    } else {
      setDefaultTypeId(id);
      localStorage.setItem('defaultOperationType', id);
    }
  };

  const loadTypes = async () => {
    setLoading(true);
    try {
      const data = await db.getOperationTypes();
      setTypes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: any) => {
    setEditingId(type.id);
    setNewTypeName(type.name);
    setNewTypeColor(type.color || '#3B82F6');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewTypeName('');
    setNewTypeColor('#3B82F6');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    
    setIsSaving(true);
    try {
      const newType = {
        id: editingId || undefined,
        name: newTypeName.trim().toUpperCase(),
        color: newTypeColor
      };
      const success = await db.saveOperationType(newType);
      if (success) {
        setEditingId(null);
        setNewTypeName('');
        setNewTypeColor('#3B82F6');
        await loadTypes();
      } else {
        alert('Erro ao salvar tipo de operação.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este tipo de operação?')) return;
    
    try {
      const success = await db.deleteOperationType(id);
      if (success) {
        await loadTypes();
      } else {
        alert('Erro ao remover tipo de operação.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tipos de Programação</h3>
        <p className="text-xs text-slate-500 mt-1">Gerencie as modalidades de viagem (Exportação, Importação, etc.) que aparecem em Nova Programação e OC</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          placeholder="Ex: EXPORTAÇÃO, IMPORTAÇÃO, COLETA..."
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSaving}
        />
        <input
          type="color"
          value={newTypeColor}
          onChange={(e) => setNewTypeColor(e.target.value)}
          className="w-12 h-12 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
          disabled={isSaving}
          title="Cor de destaque"
        />
        {editingId && (
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-300 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving || !newTypeName.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Salvando...' : editingId ? 'Salvar' : 'Adicionar'}
        </button>
      </form>

      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm">Carregando...</div>
      ) : types.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Nenhum tipo de operação cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map(type => (
            <div key={type.id} className={`flex items-center justify-between p-3 border rounded-xl group transition-all ${defaultTypeId === type.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }}></div>
                <span className="text-sm font-bold text-slate-700">{type.name}</span>
                {defaultTypeId === type.id && <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">Padrão</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(type)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleSetDefault(type.id)}
                  className={`p-1.5 rounded-lg transition-all ${defaultTypeId === type.id ? 'text-yellow-500 bg-yellow-50' : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50 opacity-0 group-hover:opacity-100'}`}
                  title={defaultTypeId === type.id ? "Remover padrão" : "Definir como padrão"}
                >
                  <svg className="w-4 h-4" fill={defaultTypeId === type.id ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Remover"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
