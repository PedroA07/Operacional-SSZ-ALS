
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Driver, OperationDefinition, User, Customer, Trip, TripStatus, PreStacking, Port, Category, CustomStatus } from '../../../types';
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
import { showToast } from '../../shared/SimpleToast';
import CustomSelect from '../../shared/CustomSelect';

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
  onDeleteTrip: (id: string) => void;
  density?: 'compact' | 'comfortable';
}

const MODALITIES = ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  user, type, categoryName, clientName, drivers, customers, allTrips, availableOps, categories, onNavigate, onLocateDriver, onDeleteTrip, density: initialDensity
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
  const [ports, setPorts] = useState<Port[]>([]);
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
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
      showToast('Prioridade atualizada com sucesso!', 'success');
    } catch (e) {
      showToast('Erro ao definir prioridade.', 'error');
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
  const [selectedScheduling, setSelectedScheduling] = useState<string>('TODOS');

  const loadAuxData = useCallback(async () => {
    const [p, ps, cs, ot] = await Promise.all([db.getPorts(), db.getPreStacking(), db.getCustomStatuses(), db.getOperationTypes()]);
    setPorts(p);
    setPreStackingUnits([...p, ...ps]);
    setCustomStatuses(cs);
    setOperationTypes(ot);
  }, []);

  useEffect(() => { loadAuxData(); }, [loadAuxData]);

  const handleUpdateStatus = async () => {
    if (!selectedTrip || isSavingStatus) return;
    setIsSavingStatus(true);
    const eventTime = new Date(statusTime).toISOString();
    const isCompleted = statusService.isTripCompleted(tempStatus, selectedTrip, customStatuses);
    const updatedTrip: Trip = { 
      ...selectedTrip, 
      status: tempStatus, 
      statusTime: eventTime, 
      isCompleted: isCompleted,
      statusHistory: [{ status: tempStatus, dateTime: eventTime, createdAt: new Date().toISOString() }, ...(selectedTrip.statusHistory || [])] 
    };
    try {
      if (await db.saveTrip(updatedTrip, user)) {
        setIsStatusModalOpen(false);
        window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
        showToast('Status atualizado com sucesso!', 'success');
      }
    } catch (e) { 
      showToast('Erro ao salvar status.', 'error'); 
    } finally { 
      setIsSavingStatus(false); 
    }
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
  }, [allTrips, categoryName, activeStatusTab, searchQuery, startDate, endDate, selectedFilterClient, filterTypes, filterDriverNames, customStatuses]);

  const tripColumns = useMemo(() => getOperationTableColumns(
    (t, s) => { setSelectedTrip(t); setTempStatus(s); setStatusTime(new Date().toISOString().slice(0,16)); setIsStatusModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsOCFormOpen(true); },
    (t) => { setSelectedTrip(t); setIsMinutaFormOpen(true); },
    (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
    async (id) => { onDeleteTrip(id); },
    () => window.dispatchEvent(new CustomEvent('als_force_global_refresh')),
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    (id) => { setLocationDriverId(id); setIsLocationModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsHistoryModalOpen(true); },
    handleSetPriority,
    drivers,
    categories,
    operationTypes
  ), [user, drivers, allTrips, categories, operationTypes]);

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
            <OperationFilters 
              selectedTypes={[]} 
              onTypesChange={() => {}} 
              selectedClients={selectedFilterClient === 'TODOS' ? [] : [selectedFilterClient]} 
              onClientsChange={(cl) => setSelectedFilterClient(cl[0] || 'TODOS')} 
              selectedDrivers={filterDriverNames} 
              onDriversChange={setFilterDriverNames} 
              selectedScheduling={selectedScheduling}
              onSchedulingChange={setSelectedScheduling}
              customers={categoryCustomers} 
              drivers={drivers} 
              hideModality 
            />
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

      {isOCFormOpen && selectedTrip && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="h-14 bg-blue-600 flex items-center justify-between px-6 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-tight leading-none">Ordem de Coleta</p>
                  <p className="text-white/60 text-[9px] font-bold uppercase mt-0.5">OS: {selectedTrip.os}</p>
                </div>
              </div>
              <button onClick={() => { setIsOCFormOpen(false); window.dispatchEvent(new CustomEvent('als_force_global_refresh')); }} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/40 text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <OrdemColetaForm
                drivers={drivers}
                customers={customers}
                ports={ports}
                onClose={() => { setIsOCFormOpen(false); window.dispatchEvent(new CustomEvent('als_force_global_refresh')); }}
                initialData={selectedTrip.ocFormData}
                tripId={selectedTrip.id}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {isMinutaFormOpen && selectedTrip && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="h-14 bg-slate-800 flex items-center justify-between px-6 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-tight leading-none">Minuta / Pré-Stacking</p>
                  <p className="text-white/60 text-[9px] font-bold uppercase mt-0.5">OS: {selectedTrip.os}</p>
                </div>
              </div>
              <button onClick={() => { setIsMinutaFormOpen(false); window.dispatchEvent(new CustomEvent('als_force_global_refresh')); }} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/40 text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <PreStackingForm
                drivers={drivers}
                customers={customers}
                ports={ports}
                onClose={() => { setIsMinutaFormOpen(false); window.dispatchEvent(new CustomEvent('als_force_global_refresh')); }}
                initialOS={selectedTrip.os}
              />
            </div>
          </div>
        </div>,
        document.body
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
                  <CustomSelect
                    value={tempStatus}
                    onChange={v => setTempStatus(v as TripStatus)}
                    options={statusService.getCustomOptions(selectedTrip, customStatuses).map(opt => ({ value: opt.value, label: opt.label }))}
                    inputClassName="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase"
                  />
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

      {isTripModalOpen && (
        <TripModal isOpen={isTripModalOpen} onClose={() => setIsTripModalOpen(false)} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
      )}

      {isHistoryModalOpen && selectedTrip && (
        <StatusHistoryManagerModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} trip={selectedTrip} allTrips={allTrips} user={user} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} />
      )}

      {isDriverDocsModalOpen && selectedTrip && (
        <DriverDocsViewerModal isOpen={isDriverDocsModalOpen} onClose={() => setIsDriverDocsModalOpen(false)} trip={selectedTrip} user={user} onSuccess={() => window.dispatchEvent(new CustomEvent('als_force_global_refresh'))} />
      )}

      <style>{` .table-compact table td { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; font-size: 9px !important; } `}</style>
    </div>
  );
};

export default GenericOperationView;
