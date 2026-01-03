
import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db, supabase } from '../../utils/storage';
import NewTripModal from './operations/NewTripModal';
import CategoryManagerModal from './operations/CategoryManagerModal';
import GenericOperationView from './operations/GenericOperationView';
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
  
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterSub, setFilterSub] = useState<string>('TODAS');

  const loadData = async () => {
    const [t, c] = await Promise.all([db.getTrips(), db.getCategories()]);
    setTrips(t);
    setCategories(c);
  };

  useEffect(() => { loadData(); }, []);

  const filteredTrips = useMemo(() => {
    let result = trips;
    if (filterCategory !== 'TODAS') result = result.filter(t => t.category === filterCategory);
    if (filterSub !== 'TODAS') result = result.filter(t => t.subCategory === filterSub);
    return result;
  }, [trips, filterCategory, filterSub]);

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
    
    const newEntry: StatusHistoryEntry = {
      status: tempStatus,
      dateTime: new Date(statusTime).toISOString()
    };

    const updatedTrip = { 
      ...selectedTrip, 
      status: tempStatus, 
      statusTime: newEntry.dateTime,
      statusHistory: [newEntry, ...(selectedTrip.statusHistory || [])] 
    };
    
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
          <span className="text-[8px] font-black uppercase text-slate-400 mt-1">{t.type}</span>
        </div>
      )
    },
    { 
      key: 'os_status', 
      label: '2. OS / Status (Histórico)', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <div className="flex items-center justify-between group/os mb-1">
            <p className="font-black text-blue-700 text-xs tracking-tighter">OS: {t.os}</p>
            <select 
              value={t.status}
              onChange={(e) => openStatusEditor(t, e.target.value as TripStatus)}
              className="ml-2 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black uppercase outline-none hover:border-blue-400 cursor-pointer"
            >
              <option value="Pendente">Atualizar...</option>
              <option value="Retirada de vazio">Retirada Vazio</option>
              <option value="Retirada de cheio">Retirada Cheio</option>
              <option value="Chegada no cliente">Chegada Cliente</option>
              <option value="Nota fiscal enviada">NF Enviada</option>
              <option value="Agendamento Porto/Depot">Agendamento</option>
              <option value="Viagem concluída">Concluída</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
             {(t.statusHistory || []).map((step, idx) => (
               <div key={idx} className={`flex items-center justify-between gap-2 px-2 py-1 rounded-md border text-[7px] font-black uppercase ${idx === 0 ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100 opacity-60'}`}>
                  <span className="truncate">{step.status}</span>
                  <span className="shrink-0 font-mono">
                    {new Date(step.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} {new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                  </span>
               </div>
             ))}
             {(!t.statusHistory || t.statusHistory.length === 0) && (
               <div className="px-2 py-1 bg-slate-50 text-slate-300 rounded-md border border-slate-100 text-[7px] font-black uppercase italic">Aguardando Início</div>
             )}
          </div>
        </div>
      )
    },
    {
      key: 'customer',
      label: '3. Local Atendimento',
      render: (t: Trip) => (
        <div className="flex flex-col space-y-0.5 max-w-[220px]">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight break-words">{t.customer?.legalName || t.customer?.name}</span>
          {t.customer?.legalName && t.customer.name !== t.customer.legalName && (
             <span className="text-[8px] font-bold text-slate-500 uppercase">FANTASIA: {t.customer.name}</span>
          )}
          <span className="text-[8px] font-mono text-slate-400">CNPJ: {maskCNPJ(t.customer?.cnpj || '')}</span>
          <span className="text-[9px] font-black text-blue-600 mt-1 uppercase italic">{t.customer?.city} - {t.customer?.state}</span>
        </div>
      )
    },
    {
      key: 'destination',
      label: '4. Local Destino',
      render: (t: Trip) => (
        <div className="flex flex-col space-y-0.5">
          <span className="font-black text-slate-700 uppercase text-[10px] leading-tight break-words">{t.destination?.name || '---'}</span>
          <span className="text-[9px] font-black text-emerald-600 uppercase italic">
            {t.destination?.city ? `${t.destination.city} - ${t.destination.state}` : 'Não Definido'}
          </span>
        </div>
      )
    },
    {
      key: 'container_data',
      label: '5. Equipamento',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 text-[11px]">{t.container || '---'}</span>
          <div className="flex gap-2 text-[8px] font-bold text-slate-400 uppercase mt-0.5">
             <span>T: {t.tara || '---'}</span>
             <span>L: {t.seal || '---'}</span>
          </div>
          {t.cva && <span className="text-[8px] font-black text-blue-500 mt-1 uppercase">CVA: {t.cva}</span>}
        </div>
      )
    },
    { 
      key: 'driver', 
      label: '6. Motorista', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight break-words">{t.driver?.name}</span>
          <span className="text-[8px] font-mono font-bold text-slate-500">{maskCPF(t.driver?.cpf || '')}</span>
          <div className="flex gap-1.5 mt-1">
             <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded font-mono text-[9px] font-black">{t.driver?.plateHorse}</span>
             <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono text-[9px] font-black border border-slate-200">{t.driver?.plateTrailer}</span>
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Opções',
      render: (t: Trip) => (
        <div className="flex items-center gap-1">
           {t.ocFormData && (
             <button 
                onClick={() => { setSelectedTrip(t); setIsOCEditModalOpen(true); }}
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar Ordem de Coleta"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2.5"/></svg>
             </button>
           )}
           <button 
              onClick={() => onDeleteTrip?.(t.id)}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Excluir Programação"
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
           </button>
        </div>
      )
    }
  ];

  if (activeView.type !== 'list') {
    return (
      <GenericOperationView 
        user={user}
        type={activeView.type === 'category' ? 'category' : 'client'}
        categoryName={activeView.categoryName || ''}
        clientName={activeView.clientName}
        drivers={drivers}
        availableOps={availableOps}
        onNavigate={setActiveView}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-8">
        <div className="flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Operacional</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Navegação por Segmentos e Categorias</p>
           </div>
           <div className="flex gap-3">
              <button onClick={() => setIsCatModalOpen(true)} className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-black uppercase hover:bg-slate-50 transition-all">Config. Categorias</button>
              <button onClick={() => setIsTripModalOpen(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">Nova Programação</button>
           </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
           <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Acesso Rápido por Categoria</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <button onClick={() => { setFilterCategory('TODAS'); setFilterSub('TODAS'); }} className={`p-4 rounded-2xl border transition-all text-center group ${filterCategory === 'TODAS' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-blue-500'}`}>
                 <p className={`text-[10px] font-black uppercase ${filterCategory === 'TODAS' ? 'text-white' : 'text-slate-700'}`}>Geral</p>
                 <p className={`text-[8px] font-bold mt-1 uppercase ${filterCategory === 'TODAS' ? 'text-blue-200' : 'text-slate-400'}`}>Todas Viagens</p>
              </button>
              {categories.filter(c => !c.parentId).map(cat => (
                <button key={cat.id} onClick={() => { setFilterCategory(cat.name); setFilterSub('TODAS'); }} className={`p-4 rounded-2xl border transition-all text-center group ${filterCategory === cat.name ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-blue-500'}`}>
                   <p className={`text-[10px] font-black uppercase ${filterCategory === cat.name ? 'text-white' : 'text-slate-700'}`}>{cat.name}</p>
                   <p className={`text-[8px] font-bold mt-1 uppercase ${filterCategory === cat.name ? 'text-slate-400' : 'text-slate-400'}`}>Acessar Área</p>
                </button>
              ))}
           </div>

           {filterCategory !== 'TODAS' && (
              <div className="mt-6 pt-6 border-t border-slate-200 animate-in slide-in-from-top-4">
                 <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Subcategorias em {filterCategory}</h3>
                 <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFilterSub('TODAS')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${filterSub === 'TODAS' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>Exibir Tudo</button>
                    {categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === filterCategory).map(sub => (
                      <button key={sub.id} onClick={() => setFilterSub(sub.name)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${filterSub === sub.name ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>{sub.name}</button>
                    ))}
                 </div>
              </div>
           )}
        </div>
      </div>

      <SmartOperationTable 
        userId={user.id} 
        componentId={`ops-table-${filterCategory}-${filterSub}`} 
        columns={columns} 
        data={filteredTrips} 
        title={filterCategory === 'TODAS' ? "Fila Operacional ALS" : `${filterCategory}${filterSub !== 'TODAS' ? ' › ' + filterSub : ''}`} 
      />

      <NewTripModal 
        isOpen={isTripModalOpen} 
        onClose={() => setIsTripModalOpen(false)} 
        onSuccess={loadData} 
        drivers={drivers} 
        customers={customers}
        categories={categories}
      />

      <CategoryManagerModal 
        isOpen={isCatModalOpen} 
        onClose={() => setIsCatModalOpen(false)} 
        categories={categories} 
        onSuccess={loadData} 
      />

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Confirmar Evento:</p>
                <p className="text-lg font-black text-blue-600 uppercase">{tempStatus}</p>
             </div>
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
              <OrdemColetaForm 
                drivers={drivers} 
                customers={customers} 
                ports={ports} 
                onClose={() => { setIsOCEditModalOpen(false); loadData(); }} 
                initialData={selectedTrip.ocFormData} 
              />
           </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;
