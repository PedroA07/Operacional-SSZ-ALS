
import React, { useState, useEffect } from 'react';
import { db } from '../../../utils/storage';
import { CustomStatus, Customer } from '../../../types';
import { showToast } from '../../shared/SimpleToast';
import AutocompleteSearch from '../../shared/AutocompleteSearch';

const StatusManager: React.FC = () => {
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<CustomStatus>>({
    name: '',
    customerId: '',
    orderIndex: 0,
    color: '#3b82f6'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, customerData] = await Promise.all([
        db.getCustomStatuses(),
        db.getCustomers()
      ]);
      setStatuses(statusData);
      setCustomers(customerData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      showToast('O nome do status é obrigatório', 'error');
      return;
    }

    const status: CustomStatus = {
      id: editingId || crypto.randomUUID(),
      name: formData.name!,
      customerId: formData.customerId || undefined,
      orderIndex: formData.orderIndex || statuses.length,
      color: formData.color || '#3b82f6'
    };

    const success = await db.saveCustomStatus(status);
    if (success) {
      showToast('Status salvo com sucesso', 'success');
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', customerId: '', orderIndex: 0, color: '#3b82f6' });
      loadData();
    } else {
      showToast('Erro ao salvar status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Deseja realmente excluir este status?')) {
      const success = await db.deleteCustomStatus(id);
      if (success) {
        showToast('Status excluído', 'success');
        loadData();
      }
    }
  };

  const mapCustomerToAutocomplete = (item: Customer) => ({
    id: item.id,
    type: 'CUSTOMER' as const,
    mainText: item.name,
    subText: item.cnpj || '',
    location: item.city || '',
    originalData: item
  });

  const generalStatuses = statuses.filter(s => !s.customerId);
  const customerStatuses = statuses.filter(s => s.customerId);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gerenciador de Status</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure status gerais ou específicos por cliente</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', customerId: '', orderIndex: statuses.length, color: '#3b82f6' });
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all"
        >
          Novo Status
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Status</label>
              <input 
                type="text" 
                className="w-full px-6 py-4 rounded-2xl border-2 border-white bg-white font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none shadow-sm"
                placeholder="EX: CHEGOU NO CLIENTE"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Cor do Status</label>
              <div className="flex items-center gap-4">
                <input 
                  type="color" 
                  className="w-12 h-12 rounded-xl border-none cursor-pointer"
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                />
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">{formData.color}</span>
              </div>
            </div>
            <div className="space-y-1">
              <AutocompleteSearch 
                label="Cliente (Deixe vazio para Status Geral)"
                placeholder="Pesquisar cliente..."
                data={customers}
                onSelect={(c) => setFormData({ ...formData, customerId: c.id })}
                mapToAutocomplete={mapCustomerToAutocomplete}
                initialValue={customers.find(c => c.id === formData.customerId)?.name || ''}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ordem de Exibição</label>
              <input 
                type="number" 
                className="w-full px-6 py-4 rounded-2xl border-2 border-white bg-white font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none shadow-sm"
                value={formData.orderIndex}
                onChange={e => setFormData({ ...formData, orderIndex: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-6 py-3 bg-white text-slate-400 rounded-xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all"
            >
              Salvar Status
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Status Gerais</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generalStatuses.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold uppercase italic p-4">Nenhum status geral cadastrado.</p>
            ) : (
              generalStatuses.map(status => (
                <div key={status.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 uppercase">{status.name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">Ordem: {status.orderIndex}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingId(status.id);
                        setFormData(status);
                        setIsAdding(false);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(status.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Status por Cliente</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerStatuses.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold uppercase italic p-4">Nenhum status de cliente cadastrado.</p>
            ) : (
              customerStatuses.map(status => {
                const customer = customers.find(c => c.id === status.customerId);
                return (
                  <div key={status.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                      <div>
                        <p className="text-[11px] font-black text-slate-800 uppercase">{status.name}</p>
                        <p className="text-[8px] text-emerald-600 font-bold uppercase">{customer?.name || 'Cliente não encontrado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingId(status.id);
                          setFormData(status);
                          setIsAdding(false);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(status.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StatusManager;
