
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Driver, OperationDefinition, User, Customer, Trip, TripStatus, PreStacking, Port, Category } from '../../../types';
import SmartOperationTable from './SmartOperationTable';
import { db } from '../../../utils/storage';
import { getOperationTableColumns } from './OperationTableColumns';
import OperationRegisterAction from './OperationRegisterAction';
import SchedulingEditModal from './SchedulingEditModal';
import DriverDocsViewerModal from './DriverDocsViewerModal';
import DocumentViewerModal from './DocumentViewerModal';
import ViewFilters from './ViewFilters';
import StatusHistoryManagerModal from './StatusHistoryManagerModal';
import TripModal from './TripModal';
import DateRangeFilter from './DateRangeFilter';

interface GenericOperationViewProps {
  user: User;
  type: 'category' | 'client';
  categoryName: string;
  clientName?: string;
  drivers: Driver[];
  customers: Customer[];
  allTrips: Trip[];
  availableOps: OperationDefinition[];
  categories: Category[];
  onNavigate: (view: { type: 'list' | 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
  onLocateDriver: (driverId: string) => void;
  density?: 'compact' | 'comfortable';
}

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  user, type, categoryName, clientName, drivers, customers, allTrips, availableOps, categories, onNavigate, onLocateDriver, density: initialDensity
}) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [preStackingUnits, setPreStackingUnits] = useState<(Port | PreStacking)[]>([]);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  // FILTROS DE STATUS PADRONIZADOS
  const [activeStatusTab, setActiveStatusTab] = useState<'geral' | 'ativas' | 'concluida' | 'cancelada'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFilterClient, setSelectedFilterClient] = useState<string>(clientName || 'TODOS');
  
  const [clientSearchText, setClientSearchText] = useState('');
  const [localDensity, setLocalDensity] = useState<'compact' | 'comfortable'>(initialDensity || 'compact');

  const loadAuxData = useCallback(async () => {
    const [p, ps] = await Promise.all([db.getPorts(), db.getPreStacking()]);
    setPreStackingUnits([...p, ...ps]);
  }, []);

  useEffect(() => { loadAuxData(); }, [loadAuxData]);

  const handleUpdateStatus = async () => {
    if (!selectedTrip || isSavingStatus) return;
    setIsSavingStatus(true);
    const now = new Date().toISOString();
    const eventTime = new Date(statusTime).toISOString();

    const updatedTrip: Trip = { 
      ...selectedTrip, 
      status: tempStatus, 
      statusTime: eventTime, 
      statusHistory: [{ status: tempStatus, dateTime: eventTime, createdAt: now }, ...(selectedTrip.statusHistory || [])] 
    };

    try {
      if (await db.saveTrip(updatedTrip, user)) {
        setIsStatusModalOpen(false);
        window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
      }
    } catch (e) { 
      alert("Erro ao atualizar status."); 
    } finally { 
      setIsSavingStatus(false); 
    }
  };

  const categoryCustomers = useMemo(() => {
    const names = new Set(allTrips.filter(t => t.category === categoryName).map(t => t.customer.name));
    return customers
      .filter(c => names.has(c.name))
      .filter(c => c.name.toUpperCase().includes(clientSearchText.toUpperCase()))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [allTrips, categoryName, customers, clientSearchText]);

  const filteredTrips = useMemo(() => {
    let result = allTrips.filter(t => {
      if (!t.category) return false;
      const matchCategory = t.category.toUpperCase() === categoryName.toUpperCase();
      if (selectedFilterClient !== 'TODOS') {
         return matchCategory && (t.customer?.name === selectedFilterClient || t.subCategory === selectedFilterClient);
      }
      return matchCategory;
    });

    if (activeStatusTab === 'ativas') {
      const active = ['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Chegou no Cragea', 'Aguardando carregar', 'Saiu do Cragea', 'Chegou na Volkswagen', 'Saiu da Volkswagen', 'Container sobre rodas'];
      result = result.filter(t => active.includes(t.status));
    } else if (activeStatusTab === 'concluida') result = result.filter(t => t.status === 'Viagem concluída');
    else if (activeStatusTab === 'cancelada') result = result.filter(t => t.status === 'Viagem cancelada');
    else if (activeStatusTab === 'geral') result = result.filter(t => t.status !== 'Viagem cancelada');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.os.toLowerCase().includes(q) || t.container?.toLowerCase().includes(q) || t.driver.name.toLowerCase().includes(q));
    }

    if (startDate || endDate) {
      result = result.filter(t => {
        const tripDate = t.dateTime.substring(0, 10);
        if (startDate && tripDate < startDate) return false;
        if (endDate && tripDate > endDate) return false;
        return true;
      });
    }

    return result.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [allTrips, categoryName, activeStatusTab, searchQuery, startDate, endDate, selectedFilterClient]);

  const tripColumns = getOperationTableColumns(
    (t, s) => { setSelectedTrip(t); setTempStatus(s); const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); setStatusTime(d.toISOString().slice(0,16)); setIsStatusModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); }, 
    (t) => { setSelectedTrip(t); },
    (t) => {},
    (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
    async (id) => { if(confirm('Excluir?')) { await db.deleteTrip(id, user); window.dispatchEvent(new CustomEvent('als_force_global_refresh')); } },
    () => window.dispatchEvent(new CustomEvent('als_force_global_refresh')),
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    onLocateDriver,
    (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsHistoryModalOpen(true); }
  );

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 ${selectedFilterClient === 'TODOS' ? 'bg-slate-900' : 'bg-blue-600'} rounded-[2rem] flex items-center justify-center text-white font-black shadow-2xl shrink-0 transition-colors`}>{categoryName.substring(0, 2).toUpperCase()}</div>
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => onNavigate({ type: 'list', categoryName })} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{categoryName}</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1 ml-11">{selectedFilterClient === 'TODOS' ? 'Visão Consolidada da Categoria' : `Monitorando: ${selectedFilterClient}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button onClick={() => setLocalDensity('compact')} className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${localDensity === 'compact' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Compacto</button>
              <button onClick={() => setLocalDensity('comfortable')} className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${localDensity === 'comfortable' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Amplo</button>
           </div>
           <OperationRegisterAction user={user} drivers={drivers} customers={customers} categories={categories} initialCategory={categoryName} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} variant="primary" />
        </div>
      </header>

      {/* FILTROS DE STATUS PADRONIZADOS */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
         <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
           {['geral', 'ativas', 'concluida', 'cancelada'].map(tab => (
             <button 
               key={tab} 
               onClick={() => setActiveStatusTab(tab as any)} 
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeStatusTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}
             >
               {tab === 'ativas' ? 'Fila Ativa' : tab === 'concluida' ? 'Concluídas' : tab === 'cancelada' ? 'Canceladas' : 'Visão Geral'}
             </button>
           ))}
         </div>
         
         <div className="flex-1 w-full max-w-md">
            <div className="relative">
              <input 
                type="text" 
                placeholder="BUSCAR OS, CONTAINER, MOTORISTA..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 text-[10px] font-black uppercase focus:border-blue-500 focus:bg-white transition-all outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
            </div>
         </div>

         <DateRangeFilter 
            startDate={startDate} 
            onStartDateChange={setStartDate} 
            endDate={endDate} 
            onEndDateChange={setEndDate} 
            onClear={() => { setStartDate(''); setEndDate(''); }} 
         />
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Filtrar por Cliente desta Categoria</h3>
               <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Selecione para restringir a lista de monitoramento</p>
            </div>
            <div className="relative w-full md:w-64">
               <input 
                 type="text" 
                 placeholder="BUSCAR CLIENTE..." 
                 className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all"
                 value={clientSearchText}
                 onChange={e => setClientSearchText(e.target.value)}
               />
               <svg className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>
            </div>
         </div>

         <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            <button onClick={() => setSelectedFilterClient('TODOS')} className={`px-8 py-4 rounded-[1.6rem] text-[10px] font-black uppercase transition-all whitespace-nowrap border ${selectedFilterClient === 'TODOS' ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'text-slate-400 bg-slate-50 border-slate-100 hover:bg-white'}`}>Todos os Clientes</button>
            {categoryCustomers.map(c => (
              <button key={c.id} onClick={() => setSelectedFilterClient(c.name)} className={`px-8 py-4 rounded-[1.6rem] text-[10px] font-black uppercase transition-all whitespace-nowrap border ${selectedFilterClient === c.name ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'text-slate-400 bg-slate-50 border-slate-100 hover:bg-white'}`}>{c.name}</button>
            ))}
         </div>
      </div>
      
      <div className={localDensity === 'compact' ? 'table-compact' : ''}>
        <SmartOperationTable userId={user.id} componentId={`op-trips-${categoryName}-${selectedFilterClient}`} title={`Cargas Filtradas: ${selectedFilterClient}`} columns={tripColumns} data={filteredTrips} defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'actions']} />
      </div>

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6">
             <div className="text-center shrink-0"><p className="text-lg font-black text-blue-600 uppercase">OS: {selectedTrip?.os}</p></div>
             <div className="space-y-4">
                <div className="space-y-1"><label className={labelClass}>Novo Status</label><select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>{['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Viagem concluída', 'Viagem cancelada'].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                <div className="space-y-1"><label className={labelClass}>Data/Hora Evento</label><input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} /></div>
             </div>
             <div className="grid gap-3 pt-4"><button disabled={isSavingStatus} onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 active:scale-95">{isSavingStatus ? 'Gravando...' : 'Atualizar Posição'}</button><button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-3">Cancelar</button></div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && selectedTrip && <StatusHistoryManagerModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} trip={selectedTrip} user={user} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} />}
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => setIsSchedulingModalOpen(false)} trip={selectedTrip} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} preStackingUnits={preStackingUnits} />
      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />
      {isTripModalOpen && <TripModal isOpen={isTripModalOpen} onClose={() => setIsTripModalOpen(false)} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} initialCategory={categoryName} />}
      {isDriverDocsModalOpen && selectedTrip && <DriverDocsViewerModal isOpen={isDriverDocsModalOpen} onClose={() => setIsDriverDocsModalOpen(false)} trip={selectedTrip} user={user} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} />}
      
      <style>{`
        .table-compact table td { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; font-size: 9px !important; }
        .table-compact table th { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; }
      `}</style>
    </div>
  );
};

export default GenericOperationView;
