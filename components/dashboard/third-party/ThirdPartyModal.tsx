
import React, { useState, useEffect } from 'react';
import { User, Category, OperationType, ColetaTipoViagemOption } from '../../../types';
import { Icons } from '../../../constants/icons';
import { db } from '../../../utils/storage';

interface ThirdPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => Promise<void>;
  editingUser: User | null;
}

const TRIP_FIELDS = [
  { id: 'category_only', label: 'Categoria' },
  { id: 'type_only', label: 'Tipo de Programação (Modalidade)' },
  { id: 'os_only', label: 'OS' },
  { id: 'equipment', label: 'Container (Equipamento)' },
  { id: 'customer', label: 'Local de Atendimento (Cliente)' },
  { id: 'destination_sch', label: 'Destino' },
  { id: 'ship_only', label: 'Navio' },
  { id: 'booking_only', label: 'Booking' },
  { id: 'status_only', label: 'Status' },
  { id: 'is_scheduled_only', label: 'Agendado (Sim/Não)' },
  { id: 'dateTime', label: 'Data e Hora Programada' },
  { id: 'driver', label: 'Motorista' },
  { id: 'actions', label: 'Documentos' },
];

const FILTER_OPTIONS = [
  { id: 'search', label: 'Busca (OS, Container, Motorista)' },
  { id: 'date_range', label: 'Período de Data' },
];

const ThirdPartyModal: React.FC<ThirdPartyModalProps> = ({ isOpen, onClose, onSave, editingUser }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    displayName: '',
    username: '',
    password: '',
    role: 'third_party',
    status: 'Ativo',
    thirdPartyConfig: {
      visibleFields: ['os', 'status', 'dateTime'],
      allowedCategories: [],
      allowedTypes: [],
      visibleFilters: ['search', 'date_range']
    }
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [cats, ops] = await Promise.all([
          db.getCategories(),
          db.getOperationTypes()
        ]);
        setCategories(cats);
        setOperationTypes(ops);
      } catch (error) {
        console.error("Erro ao carregar opções:", error);
      }
    };
    if (isOpen) {
      loadOptions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        ...editingUser,
        password: editingUser.password || '',
        thirdPartyConfig: {
          visibleFields: editingUser.thirdPartyConfig?.visibleFields || ['os_info', 'scheduled_date', 'status'],
          allowedCategories: editingUser.thirdPartyConfig?.allowedCategories || [],
          allowedTypes: editingUser.thirdPartyConfig?.allowedTypes || [],
          visibleFilters: editingUser.thirdPartyConfig?.visibleFilters || ['search', 'date_range']
        }
      });
    } else {
      setFormData({
        displayName: '',
        username: '',
        password: '',
        role: 'third_party',
        status: 'Ativo',
        thirdPartyConfig: {
          visibleFields: ['os_info', 'scheduled_date', 'status'],
          allowedCategories: [],
          allowedTypes: [],
          visibleFilters: ['search', 'date_range']
        }
      });
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName || !formData.username || (!editingUser && !formData.password)) return;

    setIsProcessing(true);
    try {
      const userToSave: User = {
        id: editingUser?.id || `tp-${Date.now()}`,
        displayName: formData.displayName!,
        username: formData.username!,
        password: formData.password,
        role: 'third_party',
        status: formData.status || 'Ativo',
        lastLogin: editingUser?.lastLogin || '',
        thirdPartyConfig: formData.thirdPartyConfig,
      };
      await onSave(userToSave);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar terceiro:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleField = (fieldId: string) => {
    const currentFields = formData.thirdPartyConfig?.visibleFields || [];
    const newFields = currentFields.includes(fieldId)
      ? currentFields.filter(f => f !== fieldId)
      : [...currentFields, fieldId];
    
    setFormData({
      ...formData,
      thirdPartyConfig: {
        ...formData.thirdPartyConfig,
        visibleFields: newFields
      }
    });
  };

  const toggleCategory = (categoryName: string) => {
    const currentCats = formData.thirdPartyConfig?.allowedCategories || [];
    const newCats = currentCats.includes(categoryName)
      ? currentCats.filter(c => c !== categoryName)
      : [...currentCats, categoryName];
    
    setFormData({
      ...formData,
      thirdPartyConfig: {
        ...formData.thirdPartyConfig,
        visibleFields: formData.thirdPartyConfig?.visibleFields || [],
        allowedCategories: newCats
      }
    });
  };

  const toggleType = (typeName: string) => {
    const currentTypes = formData.thirdPartyConfig?.allowedTypes || [];
    const newTypes = currentTypes.includes(typeName)
      ? currentTypes.filter(t => t !== typeName)
      : [...currentTypes, typeName];
    
    setFormData({
      ...formData,
      thirdPartyConfig: {
        ...formData.thirdPartyConfig,
        visibleFields: formData.thirdPartyConfig?.visibleFields || [],
        allowedTypes: newTypes
      }
    });
  };

  const toggleFilter = (filterId: string) => {
    const currentFilters = formData.thirdPartyConfig?.visibleFilters || [];
    const newFilters = currentFilters.includes(filterId)
      ? currentFilters.filter(f => f !== filterId)
      : [...currentFilters, filterId];
    
    setFormData({
      ...formData,
      thirdPartyConfig: {
        ...formData.thirdPartyConfig,
        visibleFields: formData.thirdPartyConfig?.visibleFields || [],
        visibleFilters: newFilters
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {editingUser ? 'Editar Acesso Portal Externo' : 'Novo Acesso Portal Externo'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração de Acesso Externo</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-red-500 transition-all shadow-sm border border-transparent hover:border-slate-200">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                required
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                placeholder="Ex: Transportadora XYZ"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuário de Acesso</label>
              <input 
                required
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                placeholder="Ex: xyz_logistica"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <input 
                type="text"
                required={!editingUser}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                placeholder={editingUser ? "Deixe em branco para manter" : "Senha de acesso"}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Campos Visíveis</h4>
              <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Selecione o que o terceiro poderá visualizar</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              {TRIP_FIELDS.map(field => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => toggleField(field.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    formData.thirdPartyConfig?.visibleFields.includes(field.id)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                    formData.thirdPartyConfig?.visibleFields.includes(field.id)
                      ? 'bg-white border-white text-blue-600'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    {formData.thirdPartyConfig?.visibleFields.includes(field.id) && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{field.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Filtros Visíveis</h4>
              <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Selecione quais filtros estarão disponíveis</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              {FILTER_OPTIONS.map(filter => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => toggleFilter(filter.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    formData.thirdPartyConfig?.visibleFilters?.includes(filter.id)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                    formData.thirdPartyConfig?.visibleFilters?.includes(filter.id)
                      ? 'bg-white border-white text-blue-600'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    {formData.thirdPartyConfig?.visibleFilters?.includes(filter.id) && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{filter.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Categorias Permitidas</h4>
              <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Filtro de viagens por categoria</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.name)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    formData.thirdPartyConfig?.allowedCategories?.includes(cat.name)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                    formData.thirdPartyConfig?.allowedCategories?.includes(cat.name)
                      ? 'bg-white border-white text-blue-600'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    {formData.thirdPartyConfig?.allowedCategories?.includes(cat.name) && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{cat.name}</span>
                </button>
              ))}
              {categories.length === 0 && (
                <div className="col-span-full text-center text-[10px] text-slate-400 font-bold uppercase py-4">
                  Nenhuma categoria cadastrada
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Tipos de Programação Permitidos</h4>
              <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Filtro de viagens por tipo</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              {operationTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => toggleType(type.name)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    formData.thirdPartyConfig?.allowedTypes?.includes(type.name)
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                    formData.thirdPartyConfig?.allowedTypes?.includes(type.name)
                      ? 'bg-white border-white text-blue-600'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    {formData.thirdPartyConfig?.allowedTypes?.includes(type.name) && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight leading-tight">{type.name}</span>
                </button>
              ))}
              {operationTypes.length === 0 && (
                <div className="col-span-full text-center text-[10px] text-slate-400 font-bold uppercase py-4">
                  Nenhum tipo de programação cadastrado
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isProcessing}
              className="flex-[2] py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? 'Salvando...' : editingUser ? 'Atualizar Acesso' : 'Criar Acesso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ThirdPartyModal;
