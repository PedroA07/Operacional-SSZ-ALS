import React, { useState, useEffect } from 'react';
import { db } from '../../../utils/storage';
import { CustomStatus, Customer, Port, PreStacking } from '../../../types';
import { showToast } from '../../shared/SimpleToast';
import AutocompleteSearch from '../../shared/AutocompleteSearch';

const MODALITIES = ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

interface FlowGroup {
  key: string;
  customerId: string;
  modality: string;
  destinationId: string;
  statuses: CustomStatus[];
}

const StatusManager: React.FC = () => {
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditingFlow, setIsEditingFlow] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<FlowGroup | null>(null);
  const [flowStatuses, setFlowStatuses] = useState<CustomStatus[]>([]);
  const [deletedStatusIds, setDeletedStatusIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, customerData, portsData, preStackingData] = await Promise.all([
        db.getCustomStatuses(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking()
      ]);
      setStatuses(statusData);
      setCustomers(customerData);
      setPorts(portsData);
      setPreStacking(preStackingData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar status por regra
  const flowGroups = React.useMemo(() => {
    const groups = new Map<string, FlowGroup>();
    statuses.forEach(s => {
      const key = `${s.customerId || ''}-${s.modality || ''}-${s.destinationId || ''}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          customerId: s.customerId || '',
          modality: s.modality || '',
          destinationId: s.destinationId || '',
          statuses: []
        });
      }
      groups.get(key)!.statuses.push(s);
    });

    // Ordenar os status dentro de cada grupo
    groups.forEach(group => {
      group.statuses.sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return Array.from(groups.values());
  }, [statuses]);

  const handleCreateFlow = () => {
    setCurrentFlow({
      key: 'new',
      customerId: '',
      modality: '',
      destinationId: '',
      statuses: []
    });
    setFlowStatuses([]);
    setDeletedStatusIds([]);
    setIsEditingFlow(true);
  };

  const handleEditFlow = (group: FlowGroup) => {
    setCurrentFlow({ ...group });
    setFlowStatuses([...group.statuses]);
    setDeletedStatusIds([]);
    setIsEditingFlow(true);
  };

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleAddStatusToFlow = () => {
    const newStatus: CustomStatus = {
      id: generateUUID(),
      name: 'Novo Status',
      customerId: currentFlow?.customerId || undefined,
      modality: currentFlow?.modality || undefined,
      destinationId: currentFlow?.destinationId || undefined,
      orderIndex: flowStatuses.length,
      color: '#3b82f6'
    };
    setFlowStatuses([...flowStatuses, newStatus]);
  };

  const handleRemoveStatusFromFlow = (id: string) => {
    setFlowStatuses(flowStatuses.filter(s => s.id !== id));
    if (statuses.some(s => s.id === id)) {
      setDeletedStatusIds([...deletedStatusIds, id]);
    }
  };

  const handleMoveStatus = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === flowStatuses.length - 1) return;

    const newStatuses = [...flowStatuses];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newStatuses[index];
    newStatuses[index] = newStatuses[swapIndex];
    newStatuses[swapIndex] = temp;

    // Atualizar orderIndex
    newStatuses.forEach((s, i) => s.orderIndex = i);
    setFlowStatuses(newStatuses);
  };

  const handleUpdateStatusInFlow = (index: number, field: keyof CustomStatus, value: any) => {
    const newStatuses = [...flowStatuses];
    newStatuses[index] = { ...newStatuses[index], [field]: value };
    setFlowStatuses(newStatuses);
  };

  const handleSaveFlow = async () => {
    if (!currentFlow) return;

    // Validar nomes vazios
    if (flowStatuses.some(s => !s.name.trim())) {
      showToast('Todos os status devem ter um nome', 'error');
      return;
    }

    try {
      // Deletar status removidos
      for (const id of deletedStatusIds) {
        await db.deleteCustomStatus(id);
      }

      // Salvar/Atualizar status
      for (let i = 0; i < flowStatuses.length; i++) {
        const s = flowStatuses[i];
        const result = await db.saveCustomStatus({
          ...s,
          customerId: currentFlow.customerId || undefined,
          modality: currentFlow.modality || undefined,
          destinationId: currentFlow.destinationId || undefined,
          orderIndex: i, // Garantir a ordem correta
          isFinal: i === flowStatuses.length - 1 // O último é o final
        });
        if (!result.success) {
          throw new Error(`Falha ao salvar status "${s.name}": ${result.error}`);
        }
      }

      showToast('Fluxo de status salvo com sucesso', 'success');
      setIsEditingFlow(false);
      loadData();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao salvar fluxo', 'error');
    }
  };

  const handleDeleteFlow = async (group: FlowGroup) => {
    if (window.confirm('Deseja realmente excluir todos os status deste fluxo?')) {
      try {
        for (const s of group.statuses) {
          await db.deleteCustomStatus(s.id);
        }
        showToast('Fluxo excluído com sucesso', 'success');
        loadData();
      } catch (error) {
        showToast('Erro ao excluir fluxo', 'error');
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

  const getDestinationOptions = () => {
    const options: any[] = [];
    customers.forEach(c => options.push({ id: c.id, type: 'CUSTOMER', mainText: c.name, subText: 'Cliente', originalData: { id: c.id } }));
    ports.forEach(p => options.push({ id: p.id, type: 'PORT', mainText: p.name, subText: 'Porto', originalData: { id: p.id } }));
    preStacking.forEach(p => options.push({ id: p.id, type: 'PRE_STACKING', mainText: p.name, subText: 'Pre-Stacking', originalData: { id: p.id } }));
    return options;
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Todos os Clientes';
  const getDestinationName = (id: string) => {
    const c = customers.find(c => c.id === id);
    if (c) return c.name;
    const p = ports.find(p => p.id === id);
    if (p) return p.name;
    const ps = preStacking.find(p => p.id === id);
    if (ps) return ps.name;
    return 'Todos os Destinos';
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">Carregando...</div>;
  }

  if (isEditingFlow && currentFlow) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {currentFlow.key === 'new' ? 'Novo Fluxo de Status' : 'Editar Fluxo de Status'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure as regras e a ordem dos status</p>
          </div>
          <button 
            onClick={() => setIsEditingFlow(false)}
            className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors font-bold"
          >
            X
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
          <div className="space-y-1">
            <AutocompleteSearch
              label="Cliente (Opcional)"
              data={customers}
              mapToAutocomplete={mapCustomerToAutocomplete}
              onSelect={(item) => setCurrentFlow({ ...currentFlow, customerId: item?.id || '' })}
              onChange={(val) => {
                if (!val) setCurrentFlow({ ...currentFlow, customerId: '' });
              }}
              placeholder="Todos os Clientes"
              initialValue={currentFlow.customerId ? customers.find(c => c.id === currentFlow.customerId)?.name : ''}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Modalidade (Opcional)</label>
            <select 
              className="w-full px-6 py-4 rounded-2xl border-2 border-white bg-white font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none shadow-sm"
              value={currentFlow.modality}
              onChange={e => setCurrentFlow({ ...currentFlow, modality: e.target.value })}
            >
              <option value="">Todas as Modalidades</option>
              {MODALITIES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <AutocompleteSearch
              label="Destino (Opcional)"
              data={getDestinationOptions()}
              mapToAutocomplete={(item: any) => item}
              onSelect={(item) => setCurrentFlow({ ...currentFlow, destinationId: item?.id || '' })}
              onChange={(val) => {
                if (!val) setCurrentFlow({ ...currentFlow, destinationId: '' });
              }}
              placeholder="Todos os Destinos"
              initialValue={currentFlow.destinationId ? getDestinationName(currentFlow.destinationId) : ''}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black text-slate-800 uppercase">Sequência de Status</h4>
            <button 
              onClick={handleAddStatusToFlow}
              className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-200 transition-colors flex items-center gap-2"
            >
              + Adicionar Status
            </button>
          </div>

          <div className="space-y-3">
            {flowStatuses.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase">Nenhum status neste fluxo</p>
              </div>
            ) : (
              flowStatuses.map((status, index) => (
                <div key={status.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm group">
                  <div className="flex flex-col gap-1 text-slate-300">
                    <button onClick={() => handleMoveStatus(index, 'up')} disabled={index === 0} className="hover:text-blue-500 disabled:opacity-30 font-black text-xs">↑</button>
                    <button onClick={() => handleMoveStatus(index, 'down')} disabled={index === flowStatuses.length - 1} className="hover:text-blue-500 disabled:opacity-30 font-black text-xs">↓</button>
                  </div>
                  
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-slate-400 bg-slate-50 text-xs">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={status.name}
                      onChange={e => handleUpdateStatusInFlow(index, 'name', e.target.value)}
                      placeholder="Nome do Status"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none"
                    />
                  </div>

                  <div className="w-24">
                    <input 
                      type="color" 
                      value={status.color || '#3b82f6'}
                      onChange={e => handleUpdateStatusInFlow(index, 'color', e.target.value)}
                      className="w-full h-12 rounded-xl cursor-pointer border-0 p-0"
                    />
                  </div>

                  <button 
                    onClick={() => handleRemoveStatusFromFlow(status.id)}
                    className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors font-bold"
                  >
                    X
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
          <button 
            onClick={() => setIsEditingFlow(false)}
            className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveFlow}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/40 transition-all flex items-center gap-2"
          >
            Salvar Fluxo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Fluxos de Status</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gerencie a ordem dos status por operação</p>
        </div>
        <button 
          onClick={handleCreateFlow}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          + Novo Fluxo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flowGroups.map(group => (
          <div key={group.key} className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 flex flex-col h-full">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black uppercase">Cliente</span>
                  <span className="text-[10px] font-bold text-slate-800 uppercase truncate">{group.customerId ? getCustomerName(group.customerId) : 'Todos'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black uppercase">Modalidade</span>
                  <span className="text-[10px] font-bold text-slate-800 uppercase truncate">{group.modality || 'Todas'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black uppercase">Destino</span>
                  <span className="text-[10px] font-bold text-slate-800 uppercase truncate">{group.destinationId ? getDestinationName(group.destinationId) : 'Todos'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-3">{group.statuses.length} Status na sequência:</p>
                <div className="space-y-2">
                  {group.statuses.slice(0, 4).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: s.color || '#3b82f6' }}>
                        {i + 1}
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 uppercase truncate">{s.name}</span>
                    </div>
                  ))}
                  {group.statuses.length > 4 && (
                    <div className="text-[10px] font-bold text-slate-400 italic pl-6">
                      + {group.statuses.length - 4} status...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200">
              <button 
                onClick={() => handleEditFlow(group)}
                className="flex-1 py-2 bg-white text-blue-600 border-2 border-blue-100 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-colors"
              >
                Editar Fluxo
              </button>
              <button 
                onClick={() => handleDeleteFlow(group)}
                className="w-10 h-10 bg-white text-red-500 border-2 border-red-100 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors font-bold"
              >
                X
              </button>
            </div>
          </div>
        ))}

        {flowGroups.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-400 uppercase">Nenhum fluxo de status configurado</p>
            <p className="text-[10px] text-slate-400 mt-1">Crie um novo fluxo para personalizar a operação</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusManager;
