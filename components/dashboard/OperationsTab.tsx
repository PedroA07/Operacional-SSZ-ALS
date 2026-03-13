
import React, { useState, useMemo, useEffect } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, PreStacking, CustomStatus } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import OperationRegisterAction from './operations/OperationRegisterAction';
import SchedulingEditModal from './operations/SchedulingEditModal';
import DriverDocsViewerModal from './operations/DriverDocsViewerModal';
import DocumentViewerModal from './operations/DocumentViewerModal';
import DriverLocationModal from './operations/DriverLocationModal';
import GenericOperationView from './operations/GenericOperationView';
import OperationFilters from './operations/OperationFilters';
import DateRangeFilter from './operations/DateRangeFilter';
import CategoryNavigation from './operations/CategoryNavigation';
import CategoryControl from './operations/CategoryControl';
import CategoryManagerModal from './operations/CategoryManagerModal';
import OrdemColetaForm from './forms/OrdemColetaForm';
import PreStackingForm from './forms/PreStackingForm';
import StatusHistoryManagerModal from './operations/StatusHistoryManagerModal';
import TripModal from './operations/TripModal';
import TripDetailsViewerModal from './operations/TripDetailsViewerModal';
import { getOperationTableColumns } from './operations/OperationTableColumns';
import { statusService } from '../../utils/statusService';

interface OperationsTabProps {
  user: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  trips: Trip[];
  categories: Category[];
  preStacking: PreStacking[];
  availableOps: OperationDefinition[];
  activeView: { type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string };
  setActiveView: (view: any) => void;
  onDeleteTrip: (id: string) => void;
  onRefresh: () => void;
}

const MODALITIES = ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

const OperationsTab: React.FC<OperationsTabProps> = ({ 
  user, drivers, customers, ports, trips, categories, preStacking, availableOps, activeView, setActiveView, onDeleteTrip, onRefresh 
}) => {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [isOCFormOpen, setIsOCFormOpen] = useState(false);
  const [isMinutaFormOpen, setIsMinutaFormOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isTripDetailsOpen, setIsTripDetailsOpen] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [locationDriverId, setLocationDriverId] = useState<string | null>(null);
  
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  const handleSetPriority = async (trip: Trip) => {
    if (isSavingStatus) return;
    setIsSavingStatus(true);
    try {
      // Desmarca outras prioridades do mesmo motorista
      const otherDriverPriorityTrips = trips.filter(t => 
        t.driver.id === trip.driver.id && 
        t.id !== trip.id && 
        t.isPriority
      );

      for (const t of otherDriverPriorityTrips) {
        await db.saveTrip({ ...t, isPriority: false }, user);
      }

      // Alterna a prioridade da viagem selecionada
      await db.saveTrip({ ...trip, isPriority: !trip.isPriority }, user);
      onRefresh();
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
  
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterClientNames, setFilterClientNames] = useState<string[]>([]);
  const [filterDriverNames, setFilterDriverNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const statuses = await db.getCustomStatuses();
        setCustomStatuses(statuses);
      } catch (error) {
        console.error('Erro ao buscar status personalizados:', error);
      }
    };
    fetchStatuses();
  }, []);

  // Converte data ISO para local no formato do input datetime-local
  const formatISOToInput = (isoString?: string) => {
    const date = isoString ? new Date(isoString) : new Date();
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleOpenStatusEditor = (t: Trip, s: TripStatus) => {
    setSelectedTrip(t);
    setTempStatus(s);
    setStatusTime(formatISOToInput()); // Pega a hora local agora
    setIsStatusModalOpen(true);
  };

  const availableStatusesForSelectedTrip = useMemo(() => {
    if (!selectedTrip) return [];
    return statusService.getCustomOptions(selectedTrip, customStatuses);
  }, [selectedTrip, customStatuses]);

  const handleUpdateStatus = async () => {
    if (!selectedTrip || isSavingStatus) return;
    setIsSavingStatus(true);
    
    try {
      let eventTime = new Date().toISOString();
      if (statusTime) {
        const parsedDate = new Date(statusTime);
        if (!isNaN(parsedDate.getTime())) {
          eventTime = parsedDate.toISOString();
        }
      }

      const isCompleted = statusService.isTripCompleted(tempStatus, selectedTrip, customStatuses);
      const updatedTrip: Trip = { 
        ...selectedTrip, 
        status: tempStatus, 
        statusTime: eventTime, 
        isCompleted: isCompleted,
        statusHistory: [{ status: tempStatus, dateTime: eventTime, createdAt: new Date().toISOString() }, ...(selectedTrip.statusHistory || [])] 
      };
      
      if (await db.saveTrip(updatedTrip, user)) {
        setIsStatusModalOpen(false);
        onRefresh();
      }
    } catch (e: any) { 
      alert(`Erro ao salvar status: ${e.message || 'Erro desconhecido'}`); 
      console.error("Erro ao salvar status:", e);
    } finally { 
      setIsSavingStatus(false); 
    }
  };

  const filteredTrips = useMemo(() => {
    let result = [...trips];
    if (activeStatusTab === 'ativas') {
      result = result.filter(t => {
        const isComp = t.isCompleted || statusService.isTripCompleted(t.status, t, customStatuses);
        return !isComp && t.status !== 'Viagem cancelada';
      });
    } else if (activeStatusTab === 'concluida') {
      result = result.filter(t => t.isCompleted || statusService.isTripCompleted(t.status, t, customStatuses));
    } else if (activeStatusTab === 'cancelada') {
      result = result.filter(t => t.status === 'Viagem cancelada');
    } else if (activeStatusTab === 'geral') {
      result = result.filter(t => t.status !== 'Viagem cancelada');
    }

    if (filterTypes.length > 0) result = result.filter(t => filterTypes.includes(t.type?.toUpperCase()));
    if (filterClientNames.length > 0) result = result.filter(t => filterClientNames.includes(t.customer?.name));
    if (filterDriverNames.length > 0) result = result.filter(t => filterDriverNames.includes(t.driver?.name));
    
    if (startDate || endDate) {
      result = result.filter(t => {
        const tripDate = t.dateTime.substring(0, 10);
        if (startDate && tripDate < startDate) return false;
        if (endDate && tripDate > endDate) return false;
        return true;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.os.toLowerCase().includes(q) || 
        (t.container && t.container.toLowerCase().includes(q)) || 
        (t.driver && t.driver.name.toLowerCase().includes(q)) || 
        (t.customer && t.customer.name.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips, activeStatusTab, filterTypes, filterClientNames, filterDriverNames, startDate, endDate, searchQuery, customStatuses]);

  const columns = useMemo(() => getOperationTableColumns(
    handleOpenStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsOCFormOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsMinutaFormOpen(true); }, 
    (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
    async (id) => onDeleteTrip(id),
    onRefresh,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    (id) => { setLocationDriverId(id); setIsLocationModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsHistoryModalOpen(true); },
    handleSetPriority,
    drivers 
  ), [user, onRefresh, onDeleteTrip, drivers, trips]);

  if (activeView.type !== 'list') {
    return (
      <GenericOperationView 
        user={user} type={activeView.type === 'category' ? 'category' : 'client'} 
        categoryName={activeView.categoryName || ''} clientName={activeView.clientName} 
        drivers={drivers} customers={customers} availableOps={availableOps} onNavigate={setActiveView}
        onLocateDriver={(id) => { setLocationDriverId(id); setIsLocationModalOpen(true); }} allTrips={trips} categories={categories}
        onDeleteTrip={onDeleteTrip}
        density={density}
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="flex-1 w-full"><CategoryNavigation availableOps={availableOps} onNavigate={setActiveView} /></div>
        <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
           <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button onClick={() => setDensity('compact')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${density === 'compact' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Compacto</button>
              <button onClick={() => setDensity('comfortable')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${density === 'comfortable' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Amplo</button>
           </div>
           <div className="flex gap-3">
              <CategoryControl onOpenManager={() => setIsCategoryModalOpen(true)} />
              <OperationRegisterAction user={user} drivers={drivers} customers={customers} categories={categories} onSuccess={onRefresh} variant="dark" />
           </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 space-y-6">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
           <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 w-full lg:w-auto overflow-x-auto">
                {['geral', 'ativas', 'concluida', 'cancelada'].map(tab => (
                  <button key={tab} onClick={() => setActiveStatusTab(tab as any)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeStatusTab === tab ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{tab === 'ativas' ? 'Fila Ativa' : tab === 'concluida' ? 'Concluídas' : tab === 'cancelada' ? 'Canceladas' : 'Visão Geral'}</button>
                ))}
              </div>
              
              <div className="flex-1 w-full max-w-md relative group">
                 <input 
                   type="text" 
                   placeholder="BUSCAR OS, CONTAINER OU MOTORISTA..."
                   className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-[10px] font-black uppercase focus:border-blue-500 focus:bg-white transition-all outline-none"
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
                 <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <DateRangeFilter startDate={startDate} onStartDateChange={setStartDate} endDate={endDate} onEndDateChange={setEndDate} onClear={() => { setStartDate(''); setEndDate(''); }} />
           </div>

           <div className="flex flex-col gap-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtro por Tipo de Operação</p>
              <div className="flex flex-wrap gap-2">
                 <button 
                   onClick={() => setFilterTypes([])}
                   className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterTypes.length === 0 ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                 >
                   Todas as Modalidades
                 </button>
                 {MODALITIES.map(m => (
                   <button 
                     key={m}
                     onClick={() => setFilterTypes(prev => prev.includes(m) ? prev.filter(t => t !== m) : [...prev, m])}
                     className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${filterTypes.includes(m) ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-500 hover:text-blue-600'}`}
                   >
                     {m}
                   </button>
                 ))}
              </div>
           </div>

           <OperationFilters selectedTypes={[]} onTypesChange={() => {}} selectedClients={filterClientNames} onClientsChange={setFilterClientNames} selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} customers={customers} drivers={drivers} hideModality />
        </div>
        
        <div className={density === 'compact' ? 'table-compact' : ''}>
           <SmartOperationTable 
             userId={user.id} 
             componentId="ops-global" 
             title={`Painel Operacional Sincronizado`} 
             columns={columns} 
             data={filteredTrips} 
             hideInternalSearch
             onRowClick={(t) => { setSelectedTrip(t); setIsTripDetailsOpen(true); }}
             defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'ship_booking', 'customer', 'destination_sch', 'finance', 'actions']} 
           />
        </div>
      </div>

      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />
      <DriverLocationModal isOpen={isLocationModalOpen} onClose={() => { setIsLocationModalOpen(false); setLocationDriverId(null); }} driverId={locationDriverId} />
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={onRefresh} preStackingUnits={[...ports, ...preStacking]} />
      {isHistoryModalOpen && selectedTrip && <StatusHistoryManagerModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} trip={selectedTrip} allTrips={trips} user={user} onSuccess={onRefresh} />}
      
      {isOCFormOpen && selectedTrip && (
        <div className="fixed inset-0 z-[3000] bg-white animate-in slide-in-from-bottom duration-500 overflow-hidden flex flex-col">
          <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsOCFormOpen(false); onRefresh(); }} initialData={selectedTrip.ocFormData} tripId={selectedTrip.id} />
        </div>
      )}

      {isMinutaFormOpen && selectedTrip && (
        <div className="fixed inset-0 z-[3000] bg-white animate-in slide-in-from-bottom duration-500 overflow-hidden flex flex-col">
          <PreStackingForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsMinutaFormOpen(false); onRefresh(); }} initialOS={selectedTrip.os} />
        </div>
      )}

      {isTripModalOpen && (
        <TripModal isOpen={isTripModalOpen} onClose={() => setIsTripModalOpen(false)} onSuccess={onRefresh} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
      )}

      {isTripDetailsOpen && selectedTrip && (
        <TripDetailsViewerModal isOpen={isTripDetailsOpen} onClose={() => setIsTripDetailsOpen(false)} trip={selectedTrip} user={user} onManageHistory={() => setIsHistoryModalOpen(true)} />
      )}

      {isDriverDocsModalOpen && selectedTrip && (
        <DriverDocsViewerModal isOpen={isDriverDocsModalOpen} onClose={() => setIsDriverDocsModalOpen(false)} trip={selectedTrip} user={user} onSuccess={onRefresh} />
      )}

      {isCategoryModalOpen && (
        <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} categories={categories} onSuccess={onRefresh} actingUser={user} />
      )}

      {isStatusModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6">
             <div className="text-center">
               <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Registro de Status</p>
               <p className="text-xl font-black text-slate-800 uppercase">OS: {selectedTrip.os}</p>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status</label>
                  <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>
                    {availableStatusesForSelectedTrip.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora Real</label>
                  <input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
                </div>
             </div>
             <div className="grid gap-3 pt-4">
                <button disabled={isSavingStatus} onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700">Confirmar Registro</button>
                <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-center text-[10px] font-black text-slate-400 uppercase py-3">Cancelar</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .table-compact table td { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; font-size: 9px !important; }
        .table-compact table th { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; }
      `}</style>
    </div>
  );
};

export default OperationsTab;
