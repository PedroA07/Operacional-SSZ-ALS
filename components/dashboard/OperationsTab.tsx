
import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import TripModal from './operations/TripModal';
import CategoryManagerModal from './operations/CategoryManagerModal';
import GenericOperationView from './operations/GenericOperationView';
import OperationFilters from './operations/OperationFilters';
import OrdemColetaForm from './forms/OrdemColetaForm';
import { maskCPF, maskCNPJ } from '../../utils/masks';

interface OperationsTabProps {
  user: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  availableOps: OperationDefinition[];
  activeView: { type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string };
  setActiveView: (view: any) => void;
  onDeleteTrip?: (id: string) => void;
}

const OperationsTab: React.FC<OperationsTabProps> = ({ user, drivers, customers, ports, availableOps, activeView, setActiveView, onDeleteTrip }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isOCEditModalOpen, setIsOCEditModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  
  // Filtros de Tabela
  const [filterType, setFilterType] = useState('TODOS');
  const [filterClientName, setFilterClientName] = useState('TODOS');
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterSub, setFilterSub] = useState<string>('TODAS');

  const loadData = async () => {
    const [t, c] = await Promise.all([db.getTrips(), db.getCategories()]);
    setTrips(t);
    setCategories(c);
  };

  useEffect(() => { loadData(); }, []);

  // Clientes que possuem a categoria selecionada vinculada no cadastro
  const linkedCustomersInCategory = useMemo(() => {
    if (filterCategory === 'TODAS') return [];
    return customers.filter(c => c.operations?.some(op => op.toUpperCase() === filterCategory.toUpperCase()));
  }, [customers, filterCategory]);

  const filteredTrips = useMemo(() => {
    let result = trips;
    if (filterCategory !== 'TODAS') result = result.filter(t => t.category === filterCategory);
    if (filterSub !== 'TODAS') {
      // Se filterSub veio do clique em um cliente vinculado
      result = result.filter(t => t.customer.name === filterSub || t.subCategory === filterSub);
    }
    if (filterType !== 'TODOS') result = result.filter(t => t.type === filterType);
    if (filterClientName !== 'TODOS') result = result.filter(t => t.customer.name === filterClientName);
    
    return result;
  }, [trips, filterCategory, filterSub, filterType, filterClientName]);

  const openStatusEditor = (trip: Trip, status: TripStatus) => {
    setSelectedTrip(trip);
    setTempStatus(status);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setStatusTime(now.toISOString().slice(0, 16));
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedTrip) return;
    const newEntry: StatusHistoryEntry = { status: tempStatus, dateTime: new Date(statusTime).toISOString() };
    const updatedTrip = { ...selectedTrip, status: tempStatus, statusTime: newEntry.dateTime, statusHistory: [newEntry, ...(selectedTrip.statusHistory || [])] };
    await db.saveTrip(updatedTrip);
    setIsStatusModalOpen(false);
    loadData();
  };

  const columns = [
    { 
      key: 'dateTime', 
      label: '1. Programação', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
          <span className="text-blue-600 font-bold">{new Date(t.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    },
    { 
        key: 'type', 
        label: '2. Operação', 
        render: (t: Trip) => (
          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
            t.type === 'EXPORTAÇÃO' ? 'bg-blue-100 text-blue-700' : 
            t.type === 'IMPORTAÇÃO' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
          }`}>
            {t.type}
          </span>
        )
      },
    { 
      key: 'os_status', 
      label: '3. OS / Histórico', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <div className="flex items-center justify-between mb-1 group/os">
            <p className="text-xs font-black text-blue-700 tracking-tighter">OS: {t.os}</p>
            <select value={t.status} onChange={(e) => openStatusEditor(t, e.target.value as TripStatus)} className="ml-2 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black uppercase outline-none hover:border-blue-400 cursor-pointer">
              <option value="Pendente">Atualizar...</option>
              {['Retirada de vazio', 'Retirada de cheio', 'Chegada no cliente', 'Nota fiscal enviada', 'Agendamento Porto/Depot', 'Viagem concluída'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
             {(t.statusHistory || []).slice(0, 1).map((step, idx) => (
               <div key={idx} className="flex items-center justify-between gap-2 px-2 py-1 rounded-md border text-[7px] font-black uppercase bg-blue-600 text-white border-blue-700 shadow-sm">
                  <span className="truncate">{step.status}</span>
                  <span className="shrink-0 font-mono">{new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
               </div>
             ))}
          </div>
        </div>
      )
    },
    {
      key: 'customer',
      label: '4. Cliente / Local',
      render: (t: Trip) => (
        <div className="flex flex-col space-y-0.5 max-w-[180px]">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight truncate">{t.customer?.name}</span>
          <span className="text-[9px] font-black text-blue-600 uppercase italic">{t.customer?.city} - {t.customer?.state}</span>
        </div>
      )
    },
    {
      key: 'cva',
      label: '5. CVA',
      render: (t: Trip) => (
        <div className="flex flex-col">
          {t.cva ? (
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[9px] font-black text-center">{t.cva}</span>
          ) : (
            <span className="text-slate-300 italic text-[9px]">Não Inf.</span>
          )}
        </div>
      )
    },
    {
      key: 'container_data',
      label: '6. Equipamento',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 text-[11px]">{t.container || '---'}</span>
          <div className="flex gap-2 text-[8px] font-bold text-slate-400 uppercase mt-0.5">
             <span>T: {t.tara || '---'}</span>
             <span>L: {t.seal || '---'}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'driver', 
      label: '7. Motorista', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight truncate">{t.driver?.name}</span>
          <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded font-mono text-[9px] font-black w-fit mt-1">{t.driver?.plateHorse}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Opções',
      render: (t: Trip) => (
        <div className="flex items-center gap-1">
           <button onClick={() => { setSelectedTrip(t); setIsTripModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edição Direta (CVA/OS/DADOS)">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2.5"/></svg>
           </button>
           {t.ocFormData && (
             <button onClick={() => { setSelectedTrip(t); setIsOCEditModalOpen(true); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Abrir Formulário OC Original">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
             </button>
           )}
           <button onClick={() => onDeleteTrip?.(t.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
           </button>
        </div>
      )
    }
  ];

  if (activeView.type !== 'list') {
    return <GenericOperationView user={user} type={activeView.type === 'category' ? 'category' : 'client'} categoryName={activeView.categoryName || ''} clientName={activeView.clientName} drivers={drivers} availableOps={availableOps} onNavigate={setActiveView} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Operacional</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sincronização e Gestão de Viagens</p>
           </div>
           <div className="flex gap-3">
              <button onClick={() => { setSelectedTrip(null); setIsTripModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">Nova Programação</button>
           </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
           <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Filtrar por Categoria Master</h3>
           <div className="flex flex-wrap gap-3">
              <button onClick={() => { setFilterCategory('TODAS'); setFilterSub('TODAS'); }} className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase ${filterCategory === 'TODAS' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>Geral</button>
              {categories.filter(c => !c.parentId).map(cat => (
                <button key={cat.id} onClick={() => { setFilterCategory(cat.name); setFilterSub('TODAS'); }} className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase ${filterCategory === cat.name ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>{cat.name}</button>
              ))}
           </div>

           {filterCategory !== 'TODAS' && (
              <div className="mt-6 pt-6 border-t border-slate-200 animate-in slide-in-from-top-4 space-y-4">
                 <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Subcategorias de Sistema</h3>
                    <div className="flex flex-wrap gap-2">
                       <button onClick={() => setFilterSub('TODAS')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterSub === 'TODAS' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>Tudo</button>
                       {categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === filterCategory).map(sub => (
                         <button key={sub.id} onClick={() => setFilterSub(sub.name)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterSub === sub.name ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>{sub.name}</button>
                       ))}
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] ml-2">Clientes Vinculados a {filterCategory}</h3>
                    <div className="flex flex-wrap gap-2">
                       {linkedCustomersInCategory.map(cust => (
                         <button key={cust.id} onClick={() => setFilterSub(cust.name)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterSub === cust.name ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{cust.name}</button>
                       ))}
                       {linkedCustomersInCategory.length === 0 && <p className="text-[8px] text-slate-300 font-bold uppercase ml-2 italic">Nenhum cliente vinculado a esta categoria.</p>}
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      <OperationFilters 
        selectedType={filterType}
        onTypeChange={setFilterType}
        selectedClient={filterClientName}
        onClientChange={setFilterClientName}
        customers={customers}
      />

      <SmartOperationTable 
        userId={user.id} 
        componentId={`ops-table-v2`} 
        columns={columns} 
        data={filteredTrips} 
        title={filterCategory === 'TODAS' ? "Todas as Viagens do Sistema" : `${filterCategory} › ${filterSub}`} 
      />

      <TripModal 
        isOpen={isTripModalOpen} 
        onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} 
        onSuccess={loadData} 
        drivers={drivers} 
        customers={customers}
        categories={categories}
        editTrip={selectedTrip}
      />

      <CategoryManagerModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} categories={categories} onSuccess={loadData} />

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
             <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase">Confirmar Evento:</p><p className="text-lg font-black text-blue-600 uppercase">{tempStatus}</p></div>
             <input type="datetime-local" className="w-full px-4 py-4 rounded-xl border-2 border-blue-100 bg-slate-50 font-black" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
             <button onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase">Atualizar Status</button>
             <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase">Cancelar</button>
          </div>
        </div>
      )}

      {isOCEditModalOpen && selectedTrip && selectedTrip.ocFormData && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest">Reemissão / Edição de Ordem de Coleta</h3>
                <button onClick={() => setIsOCEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
              <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsOCEditModalOpen(false); loadData(); }} initialData={selectedTrip.ocFormData} />
           </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;
