
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Driver, OperationDefinition, User, Customer, Trip, TripStatus, PreStacking, Port, Category } from '../../../types';
import { db } from '../../../utils/storage';
import { getOperationTableColumns } from './OperationTableColumns';
import SmartOperationTable from './SmartOperationTable';
import OperationRegisterAction from './OperationRegisterAction';
import SchedulingEditModal from './SchedulingEditModal';
import DriverDocsViewerModal from './DriverDocsViewerModal';
import DocumentViewerModal from './DocumentViewerModal';
import StatusHistoryManagerModal from './StatusHistoryManagerModal';
import TripModal from './TripModal';
import TripDetailsViewerModal from './TripDetailsViewerModal';
import DateRangeFilter from './DateRangeFilter';
import OperationFilters from './OperationFilters';
import OrdemColetaForm from '../forms/OrdemColetaForm';
import PreStackingForm from '../forms/PreStackingForm';
import DriverLocationModal from './DriverLocationModal';
import { statusService } from '../../../utils/statusService';

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

const MODALITIES = ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  user, type, categoryName, clientName, drivers, customers, allTrips, availableOps, categories, onNavigate, onLocateDriver, density: initialDensity
}) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isTripDetailsOpen, setIsTripDetailsOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [isOCFormOpen, setIsOCFormOpen] = useState(false);
  const [isMinutaFormOpen, setIsMinutaFormOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationDriverId, setLocationDriverId] = useState<string | null>(null);
  
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [preStackingUnits, setPreStackingUnits] = useState<(Port | PreStacking)[]>([]);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  const handleSetPriority = async (trip: Trip) => {
    if (isSavingStatus) return;
    setIsSavingStatus(true);
    try {
      const otherDriverPriorityTrips = allTrips.filter(t => 
        t.driver.id === trip.driver.id && 
        t.id !== trip.id && 
        t.isPriority
      );
      for (const t of otherDriverPriorityTrips) {
        await db.saveTrip({ ...t, isPriority: false }, user);
      }
      await db.saveTrip({ ...trip, isPriority: !trip.isPriority }, user);
      window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
    } catch (e) {
      alert("Erro ao definir prioridade.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const [activeStatusTab, setActiveStatusTab] = useState<'geral' | 'ativas' | 'concluida' | 'cancelada'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const today = new Date().toLocaleDateString('en-CA');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  const [localDensity, setLocalDensity] = useState<'compact' | 'comfortable'>(initialDensity || 'compact');
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterDriverNames, setFilterDriverNames] = useState<string[]>([]);
  const [selectedFilterClient, setSelectedFilterClient] = useState<string>(clientName || 'TODOS');

  const loadAuxData = useCallback(async () => {
    const [p, ps] = await Promise.all([db.getPorts(), db.getPreStacking()]);
    setPreStackingUnits([...p, ...ps]);
  }, []);

  useEffect(() => { loadAuxData(); }, [loadAuxData]);

  const handleUpdateStatus = async () => {
    if (!selectedTrip || isSavingStatus) return;
    setIsSavingStatus(true);
    const eventTime = new Date(statusTime).toISOString();
    const updatedTrip: Trip = { 
      ...selectedTrip, 
      status: tempStatus, 
      statusTime: eventTime, 
      statusHistory: [{ status: tempStatus, dateTime: eventTime, createdAt: new Date().toISOString() }, ...(selectedTrip.statusHistory || [])] 
    };
    try {
      if (await db.saveTrip(updatedTrip, user)) {
        setIsStatusModalOpen(false);
        window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
      }
    } catch (e) { alert("Erro."); } finally { setIsSavingStatus(false); }
  };

  const categoryCustomers = useMemo(() => {
    const normCategory = categoryName.toUpperCase();
    return customers.filter(c => c.operations?.some(op => op.toUpperCase() === normCategory)).sort((a,b) => a.name.localeCompare(b.name));
  }, [categoryName, customers]);

  const filteredTrips = useMemo(() => {
    let result = allTrips.filter(t => t.category?.toUpperCase() === categoryName.toUpperCase());

    if (selectedFilterClient !== 'TODOS') result = result.filter(t => t.customer?.name === selectedFilterClient);
    if (filterTypes.length > 0) result = result.filter(t => filterTypes.includes(t.type?.toUpperCase()));
    if (filterDriverNames.length > 0) result = result.filter(t => filterDriverNames.includes(t.driver?.name));

    if (activeStatusTab === 'ativas') {
      const active = ['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Chegou no Cragea', 'Aguardando carregar', 'Saiu do Cragea', 'Chegou na Volkswagen', 'Saiu da Volkswagen', 'Container sobre rodas'];
      result = result.filter(t => active.includes(t.status));
    } else if (activeStatusTab === 'concluida') result = result.filter(t => t.status === 'Viagem concluída');
    else if (activeStatusTab === 'cancelada') result = result.filter(t => t.status === 'Viagem cancelada');
    else if (activeStatusTab === 'geral') result = result.filter(t => t.status !== 'Viagem cancelada');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.os.toLowerCase().includes(q) || (t.container && t.container.toLowerCase().includes(q)) || (t.driver && t.driver.name.toLowerCase().includes(q)));
    }

    if (startDate || endDate) {
      result = result.filter(t => {
        const tripDate = t.dateTime ? t.dateTime.substring(0, 10) : "";
        if (!tripDate) return false;
        if (startDate && tripDate < startDate) return false;
        if (endDate && tripDate > endDate) return false;
        return true;
      });
    }
    return result.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [allTrips, categoryName, activeStatusTab, searchQuery, startDate, endDate, selectedFilterClient, filterTypes, filterDriverNames]);

  const tripColumns = useMemo(() => getOperationTableColumns(
    (t, s) => { setSelectedTrip(t); setTempStatus(s); setStatusTime(new Date().toISOString().slice(0,16)); setIsStatusModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsOCFormOpen(true); },
    (t) => { setSelectedTrip(t); setIsMinutaFormOpen(true); },
    (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
    async (id) => { if(confirm('Excluir?')) { await db.deleteTrip(id, user); window.dispatchEvent(new CustomEvent('als_force_global_refresh')); } },
    () => window.dispatchEvent(new CustomEvent('als_force_global_refresh')),
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    (id) => { setLocationDriverId(id); setIsLocationModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsHistoryModalOpen(true); },
    handleSetPriority,
    drivers 
  ), [user, drivers, allTrips]);

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 ${selectedFilterClient === 'TODOS' ? 'bg-slate-900' : 'bg-blue-600'} rounded-[2rem] flex items-center justify-center text-white font-black shadow-2xl shrink-0 transition-colors`}>{categoryName.substring(0, 2).toUpperCase()}</div>
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => onNavigate({ type: 'list', categoryName })} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-blue-50 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{categoryName}</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1 ml-11">{selectedFilterClient === 'TODOS' ? 'Visão Consolidada' : `Filtrando: ${selectedFilterClient}`}</p>
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

      {/* PAINEL DE FILTROS SINCRONIZADO */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
         <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-full lg:w-auto">
              {['geral', 'ativas', 'concluida', 'cancelada'].map(tab => (
                <button key={tab} onClick={() => setActiveStatusTab(tab as any)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeStatusTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>{tab === 'ativas' ? 'Fila Ativa' : tab === 'concluida' ? 'Concluídas' : tab === 'cancelada' ? 'Canceladas' : 'Visão Geral'}</button>
              ))}
            </div>
            
            <div className="flex-1 w-full max-md relative group">
               <input 
                 type="text" 
                 placeholder="BUSCAR NESTA CATEGORIA..."
                 className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-[10px] font-black uppercase focus:border-blue-500 focus:bg-white transition-all outline-none"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
               <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
            </div>

            <DateRangeFilter startDate={startDate} onStartDateChange={setStartDate} endDate={endDate} onEndDateChange={setEndDate} onClear={() => { setStartDate(''); setEndDate(''); }} />
         </div>

         {/* ATALHOS DE MODALIDADE */}
         <div className="flex flex-col gap-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade da Operação</p>
            <div className="flex flex-wrap gap-2">
               <button 
                 onClick={() => setFilterTypes([])}
                 className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterTypes.length === 0 ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400'}`}
               >
                 Tudo
               </button>
               {MODALITIES.map(m => (
                 <button 
                   key={m}
                   onClick={() => setFilterTypes(prev => prev.includes(m) ? prev.filter(t => t !== m) : [...prev, m])}
                   className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterTypes.includes(m) ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-500'}`}
                 >
                   {m}
                 </button>
               ))}
            </div>
         </div>

         <div className="pt-4 border-t border-slate-50">
            <OperationFilters selectedTypes={[]} onTypesChange={() => {}} selectedClients={selectedFilterClient === 'TODOS' ? [] : [selectedFilterClient]} onClientsChange={(cl) => setSelectedFilterClient(cl[0] || 'TODOS')} selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} customers={categoryCustomers} drivers={drivers} hideModality />
         </div>
      </div>
      
      <div className={localDensity === 'compact' ? 'table-compact' : ''}>
        <SmartOperationTable 
          userId={user.id} 
          componentId={`op-trips-${categoryName}-${selectedFilterClient}`} 
          title={`${categoryName} › ${selectedFilterClient}`} 
          columns={tripColumns} 
          data={filteredTrips} 
          onRowClick={(t) => { setSelectedTrip(t); setIsTripDetailsOpen(true); }}
          defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'ship_booking', 'customer', 'destination_sch', 'finance', 'actions']} 
        />
      </div>

      {isTripDetailsOpen && selectedTrip && <TripDetailsViewerModal isOpen={isTripDetailsOpen} onClose={() => setIsTripDetailsOpen(false)} trip={selectedTrip} user={user} onManageHistory={() => setIsHistoryModalOpen(true)} />}
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => setIsSchedulingModalOpen(false)} trip={selectedTrip} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} preStackingUnits={preStackingUnits} />
      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />
      <DriverLocationModal isOpen={isLocationModalOpen} onClose={() => { setIsLocationModalOpen(false); setLocationDriverId(null); }} driverId={locationDriverId} />

      <style>{` .table-compact table td { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; font-size: 9px !important; } `}</style>
    </div>
  );
};

export default GenericOperationView;
