import React, { useMemo, useState, useEffect } from 'react';
import { Driver, OperationDefinition, User, Customer, Trip, TripStatus, StatusHistoryEntry } from '../../../types';
import SmartOperationTable from './SmartOperationTable';
import { db } from '../../../utils/storage';
import { getOperationTableColumns } from './OperationTableColumns';
import TripModal from './TripModal';
import SchedulingEditModal from './SchedulingEditModal';
import OrdemColetaForm from '../forms/OrdemColetaForm';
import PreStackingForm from '../forms/PreStackingForm';

interface GenericOperationViewProps {
  user: User;
  type: 'category' | 'client';
  categoryName: string;
  clientName?: string;
  drivers: Driver[];
  customers: Customer[];
  availableOps: OperationDefinition[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
}

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  user,
  type, 
  categoryName, 
  clientName, 
  drivers,
  customers,
  availableOps,
  onNavigate
}) => {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isOCEditModalOpen, setIsOCEditModalOpen] = useState(false);
  const [isMinutaModalOpen, setIsMinutaModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [ports, setPorts] = useState<any[]>([]);
  
  // Abas principais (Geral vs Clientes)
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'clients'>(type === 'client' ? 'overview' : 'overview');
  // Abas de Status (Filtro de viagens)
  const [activeStatusTab, setActiveStatusTab] = useState<'pendente' | 'execucao' | 'concluida' | 'cancelada'>('execucao');

  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [docViewConfig, setDocViewConfig] = useState({ url: '', title: '' });

  const loadLocalData = async () => {
    const [t, cats, p, ps] = await Promise.all([
      db.getTrips(), 
      db.getCategories(),
      db.getPorts(),
      db.getPreStacking()
    ]);
    setAllTrips(t);
    setCategories(cats);
    setPorts([...p, ...ps]);
  };

  useEffect(() => {
    loadLocalData();
  }, [categoryName, clientName]);

  const handleOpenNewTrip = () => {
    setSelectedTrip(null);
    setIsTripModalOpen(true);
  };

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
    await db.saveTrip(updatedTrip, user);
    setIsStatusModalOpen(false);
    loadLocalData();
  };

  const handleEditOC = (trip: Trip) => {
    if (!trip.ocFormData) return;
    setSelectedTrip(trip);
    setIsOCEditModalOpen(true);
  };

  const handleEditMinuta = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsMinutaModalOpen(true);
  };

  const handleViewDoc = (url: string, title: string) => {
    setDocViewConfig({ url, title });
    setIsDocViewerOpen(true);
  };

  // Filtros de dados
  const filteredDrivers = drivers.filter(d => 
    d.operations.some(op => {
      if (type === 'category') return op.category.toUpperCase() === categoryName.toUpperCase();
      return op.category.toUpperCase() === categoryName.toUpperCase() && op.client.toUpperCase() === clientName?.toUpperCase();
    })
  );

  const linkedCustomers = useMemo(() => {
    return customers.filter(c => 
      c.operations?.some(op => op.toUpperCase() === categoryName.toUpperCase())
    );
  }, [customers, categoryName]);

  const filteredTrips = useMemo(() => {
    let result = allTrips.filter(t => {
      const matchCategory = t.category.toUpperCase() === categoryName.toUpperCase();
      if (type === 'category') return matchCategory;
      const matchClient = (t.customer.name.toUpperCase() === clientName?.toUpperCase()) || 
                          (t.subCategory?.toUpperCase() === clientName?.toUpperCase());
      return matchCategory && matchClient;
    });

    // Filtro por sub-abas de status
    if (activeStatusTab === 'pendente') {
      result = result.filter(t => t.status === 'Pendente');
    } else if (activeStatusTab === 'execucao') {
      const inExecution = [
        'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 
        'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 
        'Chegou no destino', 'Devolução do cheio'
      ];
      result = result.filter(t => inExecution.includes(t.status));
    } else if (activeStatusTab === 'concluida') {
      result = result.filter(t => t.status === 'Viagem concluída');
    } else if (activeStatusTab === 'cancelada') {
      result = result.filter(t => t.status === 'Viagem cancelada');
    }

    return result;
  }, [allTrips, categoryName, clientName, type, activeStatusTab]);

  const driverColumns = [
    { key: 'name', label: 'Motorista', render: (d: any) => (
      <div><p className="font-bold text-slate-800 uppercase text-[11px]">{d.name}</p><p className="text-[8px] text-slate-400 font-bold mt-0.5">{d.driverType}</p></div>
    )},
    { key: 'plateHorse', label: 'Placa Cavalo', render: (d: any) => <span className="font-mono font-black text-blue-600 text-xs">{d.plateHorse}</span> },
    { key: 'status', label: 'Status', render: (d: any) => (
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{d.status}</span>
    )}
  ];

  const tripColumns = getOperationTableColumns(
    openStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); },
    handleEditOC, handleEditMinuta, handleViewDoc,
    async (id) => { if(confirm('Excluir viagem?')) { await db.deleteTrip(id, user); loadLocalData(); } },
    loadLocalData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
      {/* HEADER DINÂMICO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 ${type === 'category' ? 'bg-slate-900' : 'bg-blue-600'} rounded-[2rem] flex items-center justify-center text-white font-black italic shadow-2xl shrink-0`}>
            {type === 'category' ? categoryName.substring(0, 2).toUpperCase() : clientName?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              {type === 'client' && (
                <button 
                  onClick={() => onNavigate({ type: 'category', categoryName })}
                  className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 hover:text-slate-600 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                {type === 'category' ? categoryName : clientName}
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">
              {type === 'category' ? 'Monitoramento de Categoria Master' : `Página Dedicada • ${categoryName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={handleOpenNewTrip} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3 active:scale-95">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
             Nova Programação
           </button>
        </div>
      </div>

      {/* NAVEGAÇÃO INTERNA (Somente para Categoria) */}
      {type === 'category' && (
        <div className="flex border-b border-slate-200 gap-8">
           <button 
             onClick={() => setActiveMainTab('overview')}
             className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeMainTab === 'overview' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Visão Geral Operacional
             {activeMainTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
           </button>
           <button 
             onClick={() => setActiveMainTab('clients')}
             className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeMainTab === 'clients' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Clientes Vinculados ({linkedCustomers.length})
             {activeMainTab === 'clients' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
           </button>
        </div>
      )}

      {activeMainTab === 'overview' || type === 'client' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 space-y-8">
            
            {/* SUB-ABAS DE STATUS */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2 w-fit">
               {[
                 { id: 'execucao', label: 'Em Execução', color: 'blue' },
                 { id: 'pendente', label: 'Pendentes', color: 'amber' },
                 { id: 'concluida', label: 'Concluídas', color: 'emerald' },
                 { id: 'cancelada', label: 'Canceladas', color: 'red' }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveStatusTab(tab.id as any)}
                   className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                     activeStatusTab === tab.id 
                     ? `bg-${tab.color}-600 text-white shadow-lg` 
                     : `bg-slate-50 text-slate-400 hover:bg-slate-100`
                   }`}
                 >
                   {tab.label}
                 </button>
               ))}
            </div>

            {/* TABELAS */}
            <div className="grid grid-cols-1 gap-8">
              {activeStatusTab === 'execucao' && (
                <SmartOperationTable 
                  userId={user.id} 
                  componentId={`op-drivers-${type}-${categoryName}`} 
                  title="Motoristas Ativos" 
                  columns={driverColumns} 
                  data={filteredDrivers} 
                  defaultVisibleKeys={['name', 'plateHorse', 'status']} 
                />
              )}
              
              <SmartOperationTable 
                userId={user.id} 
                componentId={`op-trips-${type}-${categoryName}-${activeStatusTab}`} 
                title={`Viagens ${activeStatusTab.charAt(0).toUpperCase() + activeStatusTab.slice(1)}`} 
                columns={tripColumns} 
                data={filteredTrips} 
                defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'destination_ship_booking', 'scheduling_info', 'actions']} 
              />
            </div>
          </div>
        </div>
      ) : (
        /* LISTA DE CLIENTES VINCULADOS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
           {linkedCustomers.map(client => {
             const clientTrips = allTrips.filter(t => t.category.toUpperCase() === categoryName.toUpperCase() && (t.customer.name === client.name || t.subCategory === client.name));
             const activeCount = clientTrips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada').length;
             
             return (
               <button 
                 key={client.id}
                 onClick={() => {
                   setActiveMainTab('overview'); // Reseta ao navegar
                   onNavigate({ type: 'client', categoryName, clientName: client.name });
                 }}
                 className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-left group"
               >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                      {client.name.substring(0,2).toUpperCase()}
                    </div>
                    {activeCount > 0 && (
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase">
                        {activeCount} Ativas
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-slate-800 uppercase text-sm leading-tight mb-2 group-hover:text-blue-600 transition-colors truncate">{client.legalName || client.name}</h3>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{client.city} - {client.state}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{clientTrips.length} Viagens Totais</p>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                    Acessar Painel <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
               </button>
             );
           })}
           {linkedCustomers.length === 0 && (
             <div className="col-span-full py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum cliente vinculado a esta categoria.</p>
             </div>
           )}
        </div>
      )}

      {/* MODALS */}
      <TripModal 
        isOpen={isTripModalOpen} 
        onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} 
        onSuccess={loadLocalData} 
        drivers={drivers} 
        customers={customers} 
        categories={categories} 
        editTrip={selectedTrip} 
        initialCategory={categoryName}
        initialCustomer={type === 'client' ? customers.find(c => c.name === clientName) : undefined}
      />

      <SchedulingEditModal 
        isOpen={isSchedulingModalOpen}
        onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }}
        trip={selectedTrip}
        onSuccess={loadLocalData}
        preStackingUnits={ports}
      />

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95">
             <div className="text-center border-b border-slate-100 pb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualizar Evento Operacional</p>
                <p className="text-lg font-black text-blue-600 uppercase mt-1">OS: {selectedTrip?.os}</p>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Selecione o Novo Status</label>
                   <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase outline-none focus:border-blue-500" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>
                      {['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Viagem concluída', 'Viagem cancelada'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora da Ocorrência</label>
                   <input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
                </div>
             </div>
             <div className="grid gap-3 pt-4">
                <button onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95">Confirmar Atualização</button>
                <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-3 hover:text-red-500 transition-colors">Cancelar</button>
             </div>
          </div>
        </div>
      )}

      {isOCEditModalOpen && selectedTrip && selectedTrip.ocFormData && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest">Editar Ordem de Coleta Original</h3>
                <button onClick={() => setIsOCEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
              <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsOCEditModalOpen(false); loadLocalData(); }} initialData={selectedTrip.ocFormData} />
           </div>
        </div>
      )}

      {isMinutaModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
              <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest">Formulário de Minuta Pre-Stacking</h3>
                <button onClick={() => setIsMinutaModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
              <PreStackingForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsMinutaModalOpen(false); loadLocalData(); }} initialOS={selectedTrip.os} />
           </div>
        </div>
      )}

      {isDocViewerOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-6xl h-full rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Visualizador de Documentos ALS</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dossiê: {docViewConfig.title}</p>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => {
                        const win = window.open('', '_blank');
                        if (win) {
                          win.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;">${docViewConfig.url.startsWith('data:image') ? `<img src="${docViewConfig.url}" style="max-width:100%;">` : `<embed width="100%" height="100%" src="${docViewConfig.url}" type="application/pdf">`}</body></html>`);
                          win.document.close();
                          win.print();
                        }
                    }} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all">Imprimir</button>
                    <button onClick={() => setIsDocViewerOpen(false)} className="w-12 h-12 flex items-center justify-center bg-slate-200 text-slate-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                 </div>
              </div>
              <div className="flex-1 bg-slate-100 relative overflow-auto flex justify-center items-center p-8">
                 {docViewConfig.url.startsWith('data:image') ? (
                    <img src={docViewConfig.url} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Documento" />
                 ) : (
                    <iframe width="100%" height="100%" style={{ border: 0 }} src={docViewConfig.url} title="Document Viewer"></iframe>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GenericOperationView;