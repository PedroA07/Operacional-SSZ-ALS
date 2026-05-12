import React, { useState, useEffect } from 'react';
import { db } from '../../../utils/storage';
import { CustomStatus, Customer, Port, PreStacking } from '../../../types';
import { showToast } from '../../shared/SimpleToast';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import CustomSelect from '../../shared/CustomSelect';

const MODALITIES = ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

interface FlowGroup {
  key: string;
  customerId: string;
  modality: string;
  destinationId: string;
  statuses: CustomStatus[];
}

// ── Botão toggle reutilizável ──────────────────────────────────────────────────
const Toggle: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
}> = ({ active, onClick, icon, label, activeClass }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${
      active
        ? `${activeClass} border-transparent shadow-sm`
        : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'
    }`}
  >
    {icon}
    <span className="hidden md:inline">{label}</span>
  </button>
);

const StatusManager: React.FC = () => {
  const [statuses,    setStatuses]    = useState<CustomStatus[]>([]);
  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [ports,       setPorts]       = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [loading,     setLoading]     = useState(true);

  const [isEditingFlow,    setIsEditingFlow]    = useState(false);
  const [currentFlow,      setCurrentFlow]      = useState<FlowGroup | null>(null);
  const [flowStatuses,     setFlowStatuses]     = useState<CustomStatus[]>([]);
  const [deletedStatusIds, setDeletedStatusIds] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, customerData, portsData, preStackingData] = await Promise.all([
        db.getCustomStatuses(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking(),
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

  // Agrupa status por regra (Cliente × Modalidade × Destino)
  const flowGroups = React.useMemo(() => {
    const groups = new Map<string, FlowGroup>();
    statuses.forEach(s => {
      const key = `${s.customerId || ''}-${s.modality || ''}-${s.destinationId || ''}`;
      if (!groups.has(key)) {
        groups.set(key, { key, customerId: s.customerId || '', modality: s.modality || '', destinationId: s.destinationId || '', statuses: [] });
      }
      groups.get(key)!.statuses.push(s);
    });
    groups.forEach(g => g.statuses.sort((a, b) => a.orderIndex - b.orderIndex));
    return Array.from(groups.values());
  }, [statuses]);

  const generateUUID = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

  const handleCreateFlow = () => {
    setCurrentFlow({ key: 'new', customerId: '', modality: '', destinationId: '', statuses: [] });
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

  const handleAddStatusToFlow = () => {
    const newStatus: CustomStatus = {
      id:            generateUUID(),
      name:          '',
      customerId:    currentFlow?.customerId   || undefined,
      modality:      currentFlow?.modality     || undefined,
      destinationId: currentFlow?.destinationId || undefined,
      orderIndex:    flowStatuses.length,
      color:         '#3b82f6',
      isFinal:         false,
      operationalOnly: false,
    };
    setFlowStatuses([...flowStatuses, newStatus]);
  };

  const handleRemoveStatusFromFlow = (id: string) => {
    setFlowStatuses(flowStatuses.filter(s => s.id !== id));
    if (statuses.some(s => s.id === id)) setDeletedStatusIds([...deletedStatusIds, id]);
  };

  const handleMoveStatus = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up'   && index === 0)                    return;
    if (direction === 'down' && index === flowStatuses.length - 1) return;
    const arr = [...flowStatuses];
    const swap = direction === 'up' ? index - 1 : index + 1;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    arr.forEach((s, i) => (s.orderIndex = i));
    setFlowStatuses(arr);
  };

  const handleUpdateStatus = (index: number, field: keyof CustomStatus, value: any) => {
    const arr = [...flowStatuses];
    arr[index] = { ...arr[index], [field]: value };
    setFlowStatuses(arr);
  };

  const handleSaveFlow = async () => {
    if (!currentFlow) return;
    if (flowStatuses.some(s => !s.name.trim())) {
      showToast('Todos os status devem ter um nome', 'error');
      return;
    }

    // Garante que existe ao menos um status final
    const hasFinal = flowStatuses.some(s => s.isFinal);
    if (flowStatuses.length > 0 && !hasFinal) {
      showToast('Marque ao menos um status como "Finaliza viagem" (🏁)', 'warning');
      return;
    }

    try {
      for (const id of deletedStatusIds) await db.deleteCustomStatus(id);

      for (let i = 0; i < flowStatuses.length; i++) {
        const s = flowStatuses[i];
        const result = await db.saveCustomStatus({
          ...s,
          customerId:    currentFlow.customerId    || undefined,
          modality:      currentFlow.modality      || undefined,
          destinationId: currentFlow.destinationId || undefined,
          orderIndex:    i,
          // isFinal e operationalOnly são controlados pelos toggles — não sobrescreve automaticamente
          isFinal:         s.isFinal         ?? false,
          operationalOnly: s.operationalOnly ?? false,
        });
        if (!result.success) throw new Error(`Falha ao salvar "${s.name}": ${result.error}`);
      }

      showToast('Fluxo salvo com sucesso', 'success');
      setIsEditingFlow(false);
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar fluxo', 'error');
    }
  };

  const handleDeleteFlow = async (group: FlowGroup) => {
    if (!window.confirm('Excluir todos os status deste fluxo?')) return;
    try {
      for (const s of group.statuses) await db.deleteCustomStatus(s.id);
      showToast('Fluxo excluído', 'success');
      loadData();
    } catch { showToast('Erro ao excluir fluxo', 'error'); }
  };

  // ── Helpers de destinos ──────────────────────────────────────────────────
  const getDestinationOptions = () => [
    ...customers.map(c => ({ id: c.id, type: 'CUSTOMER',     mainText: c.name, subText: 'Cliente',       originalData: { id: c.id } })),
    ...ports.map(p => ({     id: p.id, type: 'PORT',          mainText: p.name, subText: 'Porto',          originalData: { id: p.id } })),
    ...preStacking.map(p => ({ id: p.id, type: 'PRE_STACKING', mainText: p.name, subText: 'Pre-Stacking', originalData: { id: p.id } })),
  ];

  const getCustomerName  = (id: string) => customers.find(c => c.id === id)?.name || 'Todos os Clientes';
  const getDestinationName = (id: string) => {
    return customers.find(c => c.id === id)?.name
      || ports.find(p => p.id === id)?.name
      || preStacking.find(p => p.id === id)?.name
      || 'Todos os Destinos';
  };

  if (loading) return (
    <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">Carregando...</div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  TELA DE EDIÇÃO DE FLUXO
  // ══════════════════════════════════════════════════════════════════════════
  if (isEditingFlow && currentFlow) {
    const finalsCount = flowStatuses.filter(s => s.isFinal).length;

    return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {currentFlow.key === 'new' ? 'Novo Fluxo de Status' : 'Editar Fluxo de Status'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Configure as regras, ordem e propriedades de cada status
            </p>
          </div>
          <button onClick={() => setIsEditingFlow(false)}
            className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors font-bold">
            ✕
          </button>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
            <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">🏁</span>
            Finaliza a viagem — marca a OS como concluída (pode ter mais de um)
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
            <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-sm">🔒</span>
            Só painel operacional — não aparece para o motorista
          </div>
        </div>

        {/* Regras do fluxo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
          <div className="space-y-1">
            <AutocompleteSearch
              label="Cliente (Opcional)"
              data={customers}
              mapToAutocomplete={(c: Customer) => ({ id: c.id, type: 'CUSTOMER' as const, mainText: c.name, subText: c.cnpj || '', location: c.city || '', originalData: c })}
              onSelect={item => setCurrentFlow({ ...currentFlow, customerId: item?.id || '' })}
              onChange={val => { if (!val) setCurrentFlow({ ...currentFlow, customerId: '' }); }}
              placeholder="Todos os Clientes"
              initialValue={currentFlow.customerId ? getCustomerName(currentFlow.customerId) : ''}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Modalidade (Opcional)</label>
            <CustomSelect
              value={currentFlow.modality}
              onChange={v => setCurrentFlow({ ...currentFlow, modality: v })}
              placeholder="Todas as Modalidades"
              options={MODALITIES.map(m => ({ value: m, label: m }))}
              inputClassName="w-full px-6 py-4 rounded-2xl border-2 border-white bg-white font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none shadow-sm"
            />
          </div>
          <div className="space-y-1">
            <AutocompleteSearch
              label="Destino (Opcional)"
              data={getDestinationOptions()}
              mapToAutocomplete={(item: any) => item}
              onSelect={item => setCurrentFlow({ ...currentFlow, destinationId: item?.id || '' })}
              onChange={val => { if (!val) setCurrentFlow({ ...currentFlow, destinationId: '' }); }}
              placeholder="Todos os Destinos"
              initialValue={currentFlow.destinationId ? getDestinationName(currentFlow.destinationId) : ''}
            />
          </div>
        </div>

        {/* Sequência de Status */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase">Sequência de Status</h4>
              {finalsCount > 0 && (
                <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">
                  {finalsCount} opção{finalsCount > 1 ? 'ões' : ''} de finalização configurada{finalsCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              onClick={handleAddStatusToFlow}
              className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-200 transition-colors flex items-center gap-2"
            >
              + Adicionar Status
            </button>
          </div>

          <div className="space-y-3">
            {flowStatuses.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase">Nenhum status neste fluxo</p>
                <p className="text-[9px] text-slate-300 mt-1">Clique em "Adicionar Status" para começar</p>
              </div>
            ) : (
              flowStatuses.map((status, index) => (
                <div
                  key={status.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 shadow-sm transition-colors ${
                    status.isFinal
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : status.operationalOnly
                        ? 'bg-orange-50/40 border-orange-100'
                        : 'bg-white border-slate-100'
                  }`}
                >
                  {/* Setas de ordenação */}
                  <div className="flex flex-col gap-1 text-slate-300 shrink-0">
                    <button onClick={() => handleMoveStatus(index, 'up')}   disabled={index === 0}                      className="hover:text-blue-500 disabled:opacity-20 font-black text-xs leading-none">↑</button>
                    <button onClick={() => handleMoveStatus(index, 'down')} disabled={index === flowStatuses.length - 1} className="hover:text-blue-500 disabled:opacity-20 font-black text-xs leading-none">↓</button>
                  </div>

                  {/* Número de ordem */}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-[10px] shrink-0"
                    style={{ backgroundColor: status.color || '#3b82f6' }}>
                    {index + 1}
                  </div>

                  {/* Nome */}
                  <input
                    type="text"
                    value={status.name}
                    onChange={e => handleUpdateStatus(index, 'name', e.target.value.toUpperCase())}
                    placeholder="NOME DO STATUS"
                    className="flex-1 min-w-0 px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-800 uppercase text-[11px] focus:border-blue-400 transition-all outline-none"
                  />

                  {/* Cor */}
                  <input
                    type="color"
                    value={status.color || '#3b82f6'}
                    onChange={e => handleUpdateStatus(index, 'color', e.target.value)}
                    title="Cor do status"
                    className="w-10 h-10 rounded-xl cursor-pointer border-2 border-slate-100 p-0.5 shrink-0"
                  />

                  {/* Toggle: Finaliza viagem */}
                  <Toggle
                    active={!!status.isFinal}
                    onClick={() => handleUpdateStatus(index, 'isFinal', !status.isFinal)}
                    icon={<span>🏁</span>}
                    label="Finaliza"
                    activeClass="bg-emerald-100 text-emerald-700"
                  />

                  {/* Toggle: Só painel operacional */}
                  <Toggle
                    active={!!status.operationalOnly}
                    onClick={() => handleUpdateStatus(index, 'operationalOnly', !status.operationalOnly)}
                    icon={<span>🔒</span>}
                    label="Só painel"
                    activeClass="bg-orange-100 text-orange-600"
                  />

                  {/* Remover */}
                  <button
                    onClick={() => handleRemoveStatusFromFlow(status.id)}
                    className="w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors font-bold shrink-0"
                    title="Remover status"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
          <button onClick={() => setIsEditingFlow(false)}
            className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all">
            Cancelar
          </button>
          <button onClick={handleSaveFlow}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
            Salvar Fluxo
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  TELA DE LISTAGEM DE FLUXOS
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Fluxos de Status</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Gerencie a ordem dos status por operação
          </p>
        </div>
        <button onClick={handleCreateFlow}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2">
          + Novo Fluxo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flowGroups.map(group => {
          const finals          = group.statuses.filter(s => s.isFinal);
          const operationalOnly = group.statuses.filter(s => s.operationalOnly);

          return (
            <div key={group.key} className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 flex flex-col h-full">
              <div className="flex-1 space-y-4">

                {/* Regras */}
                <div className="space-y-2">
                  {[
                    { label: 'Cliente',    value: group.customerId    ? getCustomerName(group.customerId)     : 'Todos' },
                    { label: 'Modalidade', value: group.modality      || 'Todas' },
                    { label: 'Destino',    value: group.destinationId ? getDestinationName(group.destinationId) : 'Todos' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[8px] font-black uppercase">{label}</span>
                      <span className="text-[10px] font-bold text-slate-800 uppercase truncate">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Badges de resumo */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase">
                    {group.statuses.length} status
                  </span>
                  {finals.length > 0 && (
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase">
                      🏁 {finals.length} finalização{finals.length > 1 ? 'ões' : ''}
                    </span>
                  )}
                  {operationalOnly.length > 0 && (
                    <span className="px-2 py-1 bg-orange-50 text-orange-500 rounded-lg text-[8px] font-black uppercase">
                      🔒 {operationalOnly.length} só painel
                    </span>
                  )}
                </div>

                {/* Lista de status */}
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  {group.statuses.slice(0, 6).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0"
                        style={{ backgroundColor: s.color || '#3b82f6' }}>
                        {i + 1}
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 uppercase truncate flex-1">{s.name}</span>
                      <div className="flex gap-1 shrink-0">
                        {s.isFinal         && <span title="Finaliza viagem"     className="text-[9px]">🏁</span>}
                        {s.operationalOnly && <span title="Só painel operacional" className="text-[9px]">🔒</span>}
                      </div>
                    </div>
                  ))}
                  {group.statuses.length > 6 && (
                    <p className="text-[9px] font-bold text-slate-400 italic pl-6">
                      + {group.statuses.length - 6} status...
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t border-slate-200">
                <button onClick={() => handleEditFlow(group)}
                  className="flex-1 py-2 bg-white text-blue-600 border-2 border-blue-100 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-colors">
                  Editar Fluxo
                </button>
                <button onClick={() => handleDeleteFlow(group)}
                  className="w-10 h-10 bg-white text-red-500 border-2 border-red-100 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {flowGroups.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-400 uppercase">Nenhum fluxo configurado</p>
            <p className="text-[10px] text-slate-400 mt-1">Crie um novo fluxo para personalizar a operação</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusManager;
