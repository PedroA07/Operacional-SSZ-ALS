
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Driver, OperationDefinition, User, Customer, Trip, TripStatus, StatusHistoryEntry, PreStacking, Port, Category } from '../../../types';
import SmartOperationTable from './SmartOperationTable';
import { db } from '../../../utils/storage';
import { getOperationTableColumns } from './OperationTableColumns';
import OperationRegisterAction from './OperationRegisterAction';
import SchedulingEditModal from './SchedulingEditModal';
import DriverDocsViewerModal from './DriverDocsViewerModal';
import DriverLocationModal from './DriverLocationModal';
import DocumentViewerModal from './DocumentViewerModal';
import VWStatusSelector from './VWStatusSelector';
import ViewFilters from './ViewFilters';
import { maskCNPJ } from '../../../utils/masks';

interface GenericOperationViewProps {
  user: User;
  type: 'category' | 'client';
  categoryName: string;
  clientName?: string;
  drivers: Driver[];
  customers: Customer[];
  availableOps: OperationDefinition[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
  onLocateDriver: (driverId: string) => void;
}

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  user, type, categoryName, clientName, drivers, customers, availableOps, onNavigate, onLocateDriver
}) => {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  
  const [locationDriverId, setLocationDriverId] = useState<string | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [preStackingUnits, setPreStackingUnits] = useState<(Port | PreStacking)[]>([]);
  const [isDriversCollapsed, setIsDriversCollapsed] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'clients'>('overview');
  const [activeStatusTab, setActiveStatusTab] = useState<'geral' | 'ativas' | 'concluida' | 'cancelada'>('ativas');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLocalData = useCallback(async () => {
    try {
      const [t, cats, p, ps] = await Promise.all([db.getTrips(), db.getCategories(), db.getPorts(), db.getPreStacking()]);
      setAllTrips(t || []);
      setCategories(cats || []);
      setPreStackingUnits([...(p || []), ...(ps || [])]);
    } catch (e) {
      console.error("Erro em visualização genérica:", e);
    }
  }, []);

  useEffect(() => {
    loadLocalData();
    const interval = setInterval(loadLocalData, 30000);
    return () => clearInterval(interval);
  }, [loadLocalData]);

  const openStatusEditor = (trip: Trip, status: TripStatus) => {
    setSelectedTrip(trip);
    setTempStatus(status);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setStatusTime(now.toISOString().slice(0, 16));
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedTrip || isSavingStatus) return;
    
    setIsSavingStatus(true);
    const newEntry: StatusHistoryEntry = { status: tempStatus, dateTime: new Date(statusTime).toISOString() };
    const updatedTrip = { 
      ...selectedTrip, 
      status: tempStatus, 
      statusTime: newEntry.dateTime, 
      statusHistory: [newEntry, ...(selectedTrip.statusHistory || [])] 
    };

    try {
      // Otimismo visual
      setAllTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
      
      const success = await db.saveTrip(updatedTrip, user);
      if (!success) throw new Error("Database error");
      
      setIsStatusModalOpen(false);
      await loadLocalData();
    } catch (e) {
      alert("Falha ao atualizar status no banco de dados.");
      await loadLocalData();
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleLocateDriverInternal = (driverId: string) => {
    setLocationDriverId(driverId);
    setIsLocationModalOpen(true);
  };

  const handleViewDriverDocs = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsDriverDocsModalOpen(true);
  };

  const handleOpenDocModal = (url: string, title: string) => {
    setPreviewDocData({ url, title });
    setIsDocViewerOpen(true);
  };

  const isVWCrageaTrip = useMemo(() => {
    if (!selectedTrip) return false;
    const isVW = selectedTrip.customer?.name?.toUpperCase().includes('VOLKSWAGEN');
    const isCragea = selectedTrip.destination?.name?.toUpperCase().includes('CRAGEA') || 
                     selectedTrip.scheduling?.location?.toUpperCase().includes('CRAGEA');
    return isVW && isCragea;
  }, [selectedTrip]);

  const filteredDrivers = drivers.filter(d => 
    d.operations.some(op => {
      const matchCat = op.category.toUpperCase() === categoryName.toUpperCase();
      if (type === 'category') return matchCat;
      return matchCat && op.client.toUpperCase() === clientName?.toUpperCase();
    })
  );

  const linkedCustomers = useMemo(() => customers.filter(c => c.operations?.some(op => op.toUpperCase() === categoryName.toUpperCase())), [customers, categoryName]);

  const filteredTrips = useMemo(() => {
    let result = allTrips.filter(t => {
      const matchCategory = t.category?.toUpperCase() === categoryName.toUpperCase();
      if (type === 'category') return matchCategory;
      const matchClient = (t.customer?.name?.toUpperCase() === clientName?.toUpperCase()) || (t.subCategory?.toUpperCase() === clientName?.toUpperCase());
      return matchCategory && matchClient;
    });

    if (activeStatusTab === 'ativas') {
      const activeStatuses = ['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Chegou no Cragea', 'Aguardando carregar', 'Saiu do Cragea', 'Chegou na Volkswagen', 'Saiu da Volkswagen', 'Container sobre rodas'];
      result = result.filter(t => activeStatuses.includes(t.status));
    } else if (activeStatusTab === 'concluida') {
      result = result.filter(t => t.status === 'Viagem concluída');
    } else if (activeStatusTab === 'cancelada') {
      result = result.filter(t => t.status === 'Viagem cancelada');
    } else if (activeStatusTab === 'geral') {
      result = result.filter(t => t.status !== 'Viagem cancelada');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.os.toLowerCase().includes(q) || t.container?.toLowerCase().includes(q) || t.driver.name.toLowerCase().includes(q) || t.customer.name.toLowerCase().includes(q) || t.ship?.toLowerCase().includes(q) || t.booking?.toLowerCase().includes(q));
    }

    if (startDate) result = result.filter(t => t.dateTime >= startDate);
    if (endDate) result = result.filter(t => t.dateTime <= endDate + 'T23:59:59');

    return result;
  }, [allTrips, categoryName, clientName, type, activeStatusTab, searchQuery, startDate, endDate]);

  const currentDedicatedCustomer = useMemo(() => {
    if (type !== 'client') return undefined;
    return customers.find(c => c.name.toUpperCase() === clientName?.toUpperCase());
  }, [customers, clientName, type]);

  const driverColumns = [
    { key: 'name', label: 'Motorista', render: (d: any) => (<div><p className="font-bold text-slate-800 uppercase text-[11px]">{d.name}</p><p className="text-[8px] text-slate-400 font-bold mt-0.5">{d.driverType}</p></div>)},
    { key: 'plateHorse', label: 'Placa Cavalo', render: (d: any) => <span className="font-mono font-black text-blue-600 text-xs">{d.plateHorse}</span> },
    { key: 'status', label: 'Status', render: (d: any) => (<span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{d.status}</span>)}
  ];

  const tripColumns = getOperationTableColumns(
    openStatusEditor,
    (t) => { setSelectedTrip(t); loadLocalData(); }, 
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(false); /* Simula clique no menu se necessário mas melhor abrir modal específico */ },
    (t) => {}, // Minuta
    handleOpenDocModal,
    async (id) => { if(confirm('Excluir viagem permanentemente?')) { await db.deleteTrip(id, user); loadLocalData(); } },
    loadLocalData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    handleLocateDriverInternal,
    handleViewDriverDocs
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 ${type === 'category' ? 'bg-slate-900' : 'bg-blue-600'} rounded-[2rem] flex items-center justify-center text-white font-black italic shadow-2xl shrink-0`}>{type === 'category' ? categoryName.substring(0, 2).toUpperCase() : clientName?.substring(0, 2).toUpperCase()}</div>
          <div><div className="flex items-center gap-3">{type === 'client' && (<button onClick={() => onNavigate({ type: 'category', categoryName })} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 hover:text-slate-600 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>)}<h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">{type === 'category' ? categoryName : clientName}</h1></div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">{type === 'category' ? 'Monitoramento de Categoria Master' : `Página Dedicada • ${categoryName}`}</p></div>
        </div>
        
        <OperationRegisterAction 
          user={user}
          drivers={drivers}
          customers={customers}
          categories={categories}
          initialCategory={categoryName}
          initialCustomer={currentDedicatedCustomer}
          onSuccess={loadLocalData}
          variant="primary"
        />
      </div>

      <div className="flex border-b border-slate-200 gap-8">
           <button onClick={() => setActiveMainTab('overview')} className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeMainTab === 'overview' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Visão Geral Operacional{activeMainTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}</button>
           <button onClick={() => setActiveMainTab('clients')} className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeMainTab === 'clients' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Clientes Vinculados ({linkedCustomers.length}){activeMainTab === 'clients' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}</button>
      </div>

      {activeMainTab === 'overview' || type === 'client' ? (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2 w-fit shrink-0">
                  {[
                    { id: 'geral', label: 'Visão Geral', color: 'slate' },
                    { id: 'ativas', label: 'Em Aberto', color: 'blue' }, 
                    { id: 'concluida', label: 'Concluídas', color: 'emerald' }, 
                    { id: 'cancelada', label: 'Canceladas', color: 'amber' }
                  ].map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => setActiveStatusTab(tab.id as any)} 
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                        activeStatusTab === tab.id 
                        ? `bg-${tab.color === 'slate' ? 'slate-900' : tab.color + '-600'} text-white shadow-lg` 
                        : `bg-slate-50 text-slate-400 hover:bg-slate-100`
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
            </div>
            <ViewFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} startDate={startDate} onStartDateChange={setStartDate} endDate={endDate} onEndDateChange={setEndDate} onClear={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }} />
            <div className="grid grid-cols-1 gap-8">
              {activeStatusTab === 'ativas' && filteredDrivers.length > 0 && !searchQuery && !startDate && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motoristas Vinculados</h4><button onClick={() => setIsDriversCollapsed(!isDriversCollapsed)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200"><svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isDriversCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="text-[8px] font-black uppercase">{isDriversCollapsed ? 'Mostrar' : 'Encolher'}</span></button></div>
                  {!isDriversCollapsed && (<div className="animate-in fade-in slide-in-from-top-2 duration-300"><SmartOperationTable userId={user.id} componentId={`op-drivers-${type}-${categoryName}`} title="" columns={driverColumns} data={filteredDrivers} defaultVisibleKeys={['name', 'plateHorse', 'status']} /></div>)}
                </div>
              )}
              <SmartOperationTable userId={user.id} componentId={`op-trips-${type}-${categoryName}-${activeStatusTab}`} title={`Fila de Viagens: ${activeStatusTab === 'geral' ? 'Visão Geral (Ativas + Concluídas)' : activeStatusTab === 'ativas' ? 'Pendentes & Em Execução' : activeStatusTab.toUpperCase()}`} columns={tripColumns} data={filteredTrips} defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'actions']} />
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
           {linkedCustomers.map(client => (
            <button 
              key={client.id} 
              onClick={() => { setActiveMainTab('overview'); onNavigate({ type: 'client', categoryName, clientName: client.name }); }} 
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all text-left group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                  {client.name.substring(0,2).toUpperCase()}
                </div>
                <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[7px] font-black uppercase tracking-tighter border border-emerald-100">Ativo</div>
              </div>
              
              <div className="flex-1 space-y-4">
                 <div className="space-y-1">
                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">Nome Fantasia</span>
                    <h3 className="font-black text-blue-600 uppercase text-[12px] leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
                      {client.name}
                    </h3>
                    <div className="pt-2">
                       <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">Razão Social</span>
                       <p className="text-[9px] font-bold text-slate-500 uppercase italic mt-1 line-clamp-1">{client.legalName || client.name}</p>
                    </div>
                 </div>

                 <div className="space-y-3 border-t border-slate-50 pt-4">
                    <div className="flex flex-col">
                       <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Documento CNPJ</span>
                       <span className="text-[9px] font-mono font-bold text-blue-600">{maskCNPJ(client.cnpj)}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Localidade</span>
                       <span className="text-[9px] font-black text-slate-700 uppercase">{client.city} - {client.state}</span>
                    </div>
                 </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-[8px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                 Visualizar Unidade
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </button>
           ))}
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
             <div className="text-center border-b border-slate-100 pb-6 shrink-0"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualizar Evento</p><p className="text-lg font-black text-blue-600 uppercase mt-1">OS: {selectedTrip?.os}</p></div>
             <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {isVWCrageaTrip ? (<VWStatusSelector currentStatus={tempStatus} onSelect={setTempStatus} />) : (<div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Novo Status</label><select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase outline-none focus:border-blue-500" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>{['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Viagem concluída', 'Viagem cancelada'].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>)}
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora do Evento</label><input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} /></div>
             </div>
             <div className="grid gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button 
                  disabled={isSavingStatus}
                  onClick={handleUpdateStatus} 
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                   {isSavingStatus ? (<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : 'Confirmar Atualização'}
                </button>
                <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-3 hover:text-red-500 transition-colors">Cancelar</button>
             </div>
          </div>
        </div>
      )}

      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={loadLocalData} preStackingUnits={preStackingUnits} />
      <DriverLocationModal isOpen={isLocationModalOpen} onClose={() => { setIsLocationModalOpen(false); setLocationDriverId(null); }} driverId={locationDriverId} />
      {isDriverDocsModalOpen && selectedTrip && (<DriverDocsViewerModal isOpen={isDriverDocsModalOpen} onClose={() => { setIsDriverDocsModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} user={user} onSuccess={loadLocalData} />)}
      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />
    </div>
  );
};

export default GenericOperationView;
