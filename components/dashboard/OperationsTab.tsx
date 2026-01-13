
import React, { useState, useMemo, useRef } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry, PreStacking } from '../../types';
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
import CopyAllStatusesAction from './operations/CopyAllStatusesAction';
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
  
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [locationDriverId, setLocationDriverId] = useState<string | null>(null);
  
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  const [activeStatusTab, setActiveStatusTab] = useState<'geral' | 'ativas' | 'concluida' | 'cancelada'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  
  // MODIFICAÇÃO: Inicia sem filtro de data para mostrar todos os registros carregados
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterClientNames, setFilterClientNames] = useState<string[]>([]);
  const [filterDriverNames, setFilterDriverNames] = useState<string[]>([]);

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
        onRefresh();
      }
    } catch (e) { alert("Erro de rede."); } finally { setIsSavingStatus(false); }
  };

  const filteredTrips = useMemo(() => {
    let result = [...trips];
    
    // Filtro de Aba de Status
    if (activeStatusTab === 'ativas') {
      const active = ['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Chegou no Cragea', 'Aguardando carregar', 'Saiu do Cragea', 'Chegou na Volkswagen', 'Saiu da Volkswagen', 'Container sobre rodas'];
      result = result.filter(t => active.includes(t.status));
    } else if (activeStatusTab === 'concluida') result = result.filter(t => t.status === 'Viagem concluída');
    else if (activeStatusTab === 'cancelada') result = result.filter(t => t.status === 'Viagem cancelada');
    else if (activeStatusTab === 'geral') result = result.filter(t => t.status !== 'Viagem cancelada');

    // Filtros por colunas
    if (filterTypes.length > 0) result = result.filter(t => t.type && filterTypes.includes(t.type.toUpperCase()));
    if (filterClientNames.length > 0) result = result.filter(t => t.customer && filterClientNames.includes(t.customer.name));
    if (filterDriverNames.length > 0) result = result.filter(t => t.driver && filterDriverNames.includes(t.driver.name));
    
    // Filtro de Data com Proteção (Travas de segurança)
    if (startDate || endDate) {
      result = result.filter(t => {
        if (!t.dateTime) return false;
        const tripDate = t.dateTime.substring(0, 10);
        if (startDate && tripDate < startDate) return false;
        if (endDate && tripDate > endDate) return false;
        return true;
      });
    }

    // Busca Textual Geral
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.os && t.os.toLowerCase().includes(q)) || 
        (t.container && t.container.toLowerCase().includes(q)) || 
        (t.driver && t.driver.name.toLowerCase().includes(q)) || 
        (t.customer && t.customer.name.toLowerCase().includes(q)) ||
        (t.booking && t.booking.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => (a.dateTime || '').localeCompare(b.dateTime || ''));
  }, [trips, activeStatusTab, filterTypes, filterClientNames, filterDriverNames, startDate, endDate, searchQuery]);

  const columns = useMemo(() => getOperationTableColumns(
    (t, s) => { setSelectedTrip(t); setTempStatus(s); const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); setStatusTime(d.toISOString().slice(0,16)); setIsStatusModalOpen(true); },
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
    drivers
  ), [user, onRefresh, onDeleteTrip, drivers]);

  if (activeView.type !== 'list') {
    return (
      <GenericOperationView 
        user={user} type={activeView.type === 'category' ? 'category' : 'client'} 
        categoryName={activeView.categoryName || ''} clientName={activeView.clientName} 
        drivers={drivers} customers={customers} availableOps={availableOps} onNavigate={setActiveView}
        onLocateDriver={(id) => { setLocationDriverId(id); setIsLocationModalOpen(true); }} allTrips={trips} categories={categories}
        density={density}
      />
    );
  }

  const currentStatusOptions = selectedTrip ? statusService.getOptions(selectedTrip) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="flex-1 w-full"><CategoryNavigation availableOps={availableOps} customers={customers} onNavigate={setActiveView} /></div>
        <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
           <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button onClick={() => setDensity('compact')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${density === 'compact' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Compacto</button>
              <button onClick={() => setDensity('comfortable')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${density === 'comfortable' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Amplo</button>
           </div>
           <div className="flex gap-3">
              <CategoryControl onOpenManager={() => setIsCategoryModalOpen(true)} />
              <CopyAllStatusesAction trips={filteredTrips} allTrips={trips} />
              <OperationRegisterAction user={user} drivers={drivers} customers={customers} categories={categories} onSuccess={onRefresh} variant="dark" />
           </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
           <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex gap-1 w-full lg:w-auto overflow-x-auto">
             {['geral', 'ativas', 'concluida', 'cancelada'].map(tab => (
               <button key={tab} onClick={() => setActiveStatusTab(tab as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeStatusTab === tab ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{tab === 'ativas' ? 'Fila Ativa' : tab === 'concluida' ? 'Concluídas' : tab === 'cancelada' ? 'Canceladas' : 'Visão Geral'}</button>
             ))}
           </div>
           
           <div className="flex-1 w-full max-w-md relative group">
              <input 
                type="text" 
                placeholder="BUSCAR OS, CONTAINER, MOTORISTA NA TELA..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-slate-50 bg-white text-[10px] font-black uppercase focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
           </div>

           <DateRangeFilter startDate={startDate} onStartDateChange={setStartDate} endDate={endDate} onEndDateChange={setEndDate} onClear={() => { setStartDate(''); setEndDate(''); }} />
        </div>
        
        <OperationFilters selectedTypes={filterTypes} onTypesChange={setFilterTypes} selectedClients={filterClientNames} onClientsChange={setFilterClientNames} selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} customers={customers} drivers={drivers} />
        
        <div className={density === 'compact' ? 'table-compact' : ''}>
           <SmartOperationTable 
             userId={user.id} 
             componentId="ops-global" 
             title={`Painel Geral ALS`} 
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
          <div className="p-6 bg-blue-600 text-white flex justify-between items-center shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black italic">OC</div>
                <h3 className="font-black text-sm uppercase tracking-widest">Edição de Ordem de Coleta: {selectedTrip.os}</h3>
             </div>
             <button onClick={() => setIsOCFormOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
             </button>
          </div>
          <OrdemColetaForm 
            drivers={drivers} 
            customers={customers} 
            ports={ports} 
            onClose={() => { setIsOCFormOpen(false); onRefresh(); }} 
            initialData={selectedTrip.ocFormData} 
            tripId={selectedTrip.id}
          />
        </div>
      )}

      {isTripModalOpen && (
        <TripModal isOpen={isTripModalOpen} onClose={() => setIsTripModalOpen(false)} onSuccess={onRefresh} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
      )}

      {isTripDetailsOpen && selectedTrip && (
        <TripDetailsViewerModal isOpen={isTripDetailsOpen} onClose={() => setIsTripDetailsOpen(false)} trip={selectedTrip} user={user} />
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
             <div className="text-center shrink-0">
               <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Inserção de Novo Status</p>
               <p className="text-xl font-black text-slate-800 uppercase">OS: {selectedTrip.os}</p>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Próxima Etapa Operacional</label>
                  <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>
                    {currentStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora Real do Evento</label>
                  <input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
                </div>
             </div>
             <div className="grid gap-3 pt-4">
                <button disabled={isSavingStatus} onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 active:scale-95">
                  {isSavingStatus ? 'Gravando...' : 'Confirmar Registro'}
                </button>
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
