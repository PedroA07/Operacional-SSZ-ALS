
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
import VWStatusSelector from './operations/VWStatusSelector';
import StatusHistoryManagerModal from './operations/StatusHistoryManagerModal';
import TripModal from './operations/TripModal';
import { getOperationTableColumns } from './operations/OperationTableColumns';

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
  
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [locationDriverId, setLocationDriverId] = useState<string | null>(null);
  
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const isUpdatingRef = useRef(false);

  const [activeStatusTab, setActiveStatusTab] = useState<'geral' | 'ativas' | 'concluida' | 'cancelada'>('ativas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [filterTypes, setFilterTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem(`als_opt_types_${user.id}`);
    return saved ? JSON.parse(saved) : ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];
  });
  
  const [filterClientNames, setFilterClientNames] = useState<string[]>(() => {
    const saved = localStorage.getItem(`als_opt_clients_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [filterDriverNames, setFilterDriverNames] = useState<string[]>(() => {
    const saved = localStorage.getItem(`als_opt_drivers_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const handleUpdateStatus = async () => {
    if (!selectedTrip || isSavingStatus) return;
    
    setIsSavingStatus(true);
    isUpdatingRef.current = true;

    const newEntry: StatusHistoryEntry = { 
      status: tempStatus, 
      dateTime: new Date(statusTime).toISOString() 
    };

    const updatedTrip: Trip = { 
      ...selectedTrip, 
      status: tempStatus, 
      statusTime: newEntry.dateTime, 
      statusHistory: [newEntry, ...(selectedTrip.statusHistory || [])] 
    };

    try {
      const success = await db.saveTrip(updatedTrip, user);
      if (!success) throw new Error("Erro de banco");
      setIsStatusModalOpen(false);
      onRefresh();
    } catch (e) {
      alert("Erro ao sincronizar status.");
    } finally {
      isUpdatingRef.current = false;
      setIsSavingStatus(false);
    }
  };

  const openStatusEditor = (t: Trip, s: TripStatus) => {
    setSelectedTrip(t);
    setTempStatus(s);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setStatusTime(now.toISOString().slice(0, 16));
    setIsStatusModalOpen(true);
  };

  const openHistoryManager = (t: Trip) => {
    setSelectedTrip(t);
    setIsHistoryModalOpen(true);
  };

  const handleLocateDriver = (driverId: string) => {
    setLocationDriverId(driverId);
    setIsLocationModalOpen(true);
  };

  const isVWCrageaTrip = (t: Trip | null) => {
    if (!t) return false;
    const isVW = t.customer?.name?.toUpperCase().includes('VOLKSWAGEN');
    const isCragea = t.destination?.name?.toUpperCase().includes('CRAGEA') || 
                     t.scheduling?.location?.toUpperCase().includes('CRAGEA');
    return isVW && isCragea;
  };

  const filteredTrips = useMemo(() => {
    let result = [...trips];

    if (activeStatusTab === 'ativas') {
      const activeStatuses: TripStatus[] = [
        'Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 
        'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 
        'Devolução do cheio', 'Chegou no Cragea', 'Aguardando carregar', 
        'Saiu do Cragea', 'Chegou na Volkswagen', 'Saiu da Volkswagen', 'Container sobre rodas'
      ];
      result = result.filter(t => activeStatuses.includes(t.status));
    } else if (activeStatusTab === 'concluida') {
      result = result.filter(t => t.status === 'Viagem concluída');
    } else if (activeStatusTab === 'cancelada') {
      result = result.filter(t => t.status === 'Viagem cancelada');
    } else if (activeStatusTab === 'geral') {
      result = result.filter(t => t.status !== 'Viagem cancelada');
    }

    if (filterTypes.length > 0) result = result.filter(t => filterTypes.includes(t.type?.toUpperCase()));
    if (filterClientNames.length > 0) result = result.filter(t => filterClientNames.includes(t.customer?.name));
    if (filterDriverNames.length > 0) result = result.filter(t => filterDriverNames.includes(t.driver?.name));
    
    if (startDate) result = result.filter(t => t.dateTime >= startDate);
    if (endDate) result = result.filter(t => t.dateTime <= endDate + 'T23:59:59');

    return result;
  }, [trips, activeStatusTab, filterTypes, filterClientNames, filterDriverNames, startDate, endDate]);

  const columns = getOperationTableColumns(
    openStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsOCFormOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsMinutaFormOpen(true); }, 
    (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
    async (id) => { if(onDeleteTrip) onDeleteTrip(id); },
    onRefresh,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    handleLocateDriver,
    (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); },
    openHistoryManager
  );

  if (activeView.type !== 'list') {
    return (
      <GenericOperationView 
        user={user} type={activeView.type === 'category' ? 'category' : 'client'} 
        categoryName={activeView.categoryName || ''} clientName={activeView.clientName} 
        drivers={drivers} customers={customers} availableOps={availableOps} onNavigate={setActiveView}
        onLocateDriver={handleLocateDriver} allTrips={trips} categories={categories}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="flex-1">
           <CategoryNavigation availableOps={availableOps} customers={customers} onNavigate={setActiveView} />
        </div>
        <div className="pb-2 flex gap-3">
           <CategoryControl onOpenManager={() => setIsCategoryModalOpen(true)} />
           <OperationRegisterAction 
             user={user}
             drivers={drivers}
             customers={customers}
             categories={categories}
             onSuccess={onRefresh}
             variant="dark"
           />
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
           <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex gap-1 w-full lg:w-auto">
             {[
               { id: 'geral', label: 'Visão Geral (Ativas + Concl.)', color: 'slate' },
               { id: 'ativas', label: 'Viagens Ativas', color: 'blue' },
               { id: 'concluida', label: 'Concluídas', color: 'emerald' },
               { id: 'cancelada', label: 'Canceladas', color: 'amber' }
             ].map(tab => (
               <button 
                 key={tab.id} 
                 onClick={() => setActiveStatusTab(tab.id as any)}
                 className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                   activeStatusTab === tab.id 
                   ? `bg-${tab.color === 'slate' ? 'slate-900' : (tab.color === 'emerald' ? 'emerald-600' : (tab.color === 'amber' ? 'amber-500' : 'blue-600'))} text-white shadow-lg` 
                   : 'bg-transparent text-slate-400 hover:bg-slate-50'
                 }`}
               >
                 {tab.label}
               </button>
             ))}
           </div>

           <DateRangeFilter 
             startDate={startDate} onStartDateChange={setStartDate}
             endDate={endDate} onEndDateChange={setEndDate}
             onClear={() => { setStartDate(''); setEndDate(''); }}
           />
        </div>

        <OperationFilters 
          selectedTypes={filterTypes} onTypesChange={setFilterTypes} 
          selectedClients={filterClientNames} onClientsChange={setFilterClientNames} 
          selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} 
          customers={customers} drivers={drivers} 
        />
        
        <SmartOperationTable 
          userId={user.id} 
          componentId="ops-global" 
          title={`Monitoramento Global: ${activeStatusTab === 'geral' ? 'Visão Geral (Ativas + Concluídas)' : activeStatusTab === 'ativas' ? 'Fila Ativa' : activeStatusTab.toUpperCase()}`} 
          columns={columns} 
          data={filteredTrips} 
          defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'actions']} 
        />
      </div>

      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />
      <DriverLocationModal isOpen={isLocationModalOpen} onClose={() => { setIsLocationModalOpen(false); setLocationDriverId(null); }} driverId={locationDriverId} />
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={onRefresh} preStackingUnits={[...ports, ...preStacking]} />

      {isOCFormOpen && selectedTrip && (
        <div className="fixed inset-0 z-[800] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-[1700px] h-[95vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              <header className="px-8 py-5 bg-blue-600 text-white flex justify-between items-center">
                 <h3 className="font-black text-xs uppercase tracking-widest">Edição de Ordem de Coleta › OS {selectedTrip.os}</h3>
                 <button onClick={() => setIsOCFormOpen(false)} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </header>
              <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsOCFormOpen(false); onRefresh(); }} initialData={{ ...selectedTrip.ocFormData, os: selectedTrip.os, driverId: selectedTrip.driver.id, remetenteId: selectedTrip.customer.id, destinatarioId: selectedTrip.destination?.id || '' }} />
           </div>
        </div>
      )}

      {isMinutaFormOpen && selectedTrip && (
        <div className="fixed inset-0 z-[800] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-[1700px] h-[95vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              <header className="px-8 py-5 bg-emerald-600 text-white flex justify-between items-center">
                 <h3 className="font-black text-xs uppercase tracking-widest">Edição de Minuta › OS {selectedTrip.os}</h3>
                 <button onClick={() => setIsMinutaFormOpen(false)} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </header>
              <PreStackingForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsMinutaFormOpen(false); onRefresh(); }} initialOS={selectedTrip.os} />
           </div>
        </div>
      )}

      {selectedTrip && <DriverDocsViewerModal isOpen={isDriverDocsModalOpen} onClose={() => { setIsDriverDocsModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} user={user} onSuccess={onRefresh} />}
      
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
             <div className="text-center border-b border-slate-100 pb-6 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualizar Evento</p>
                <p className="text-lg font-black text-blue-600 uppercase mt-1">OS: {selectedTrip?.os}</p>
             </div>

             <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {isVWCrageaTrip(selectedTrip) ? (
                  <VWStatusSelector currentStatus={tempStatus} onSelect={setTempStatus} />
                ) : (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Novo Status</label>
                    <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase outline-none focus:border-blue-500" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>
                      {['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Viagem concluída', 'Viagem cancelada'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora</label>
                  <input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
                </div>
             </div>

             <div className="grid gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button 
                  disabled={isSavingStatus}
                  onClick={handleUpdateStatus} 
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingStatus ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Gravando...
                    </>
                  ) : 'Confirmar Atualização'}
                </button>
                <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-3 hover:text-red-500 transition-colors">Cancelar</button>
             </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && selectedTrip && (
        <StatusHistoryManagerModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => { setIsHistoryModalOpen(false); setSelectedTrip(null); }} 
          trip={selectedTrip} 
          user={user} 
          onSuccess={() => { onRefresh(); setIsHistoryModalOpen(false); }} 
        />
      )}

      {isTripModalOpen && selectedTrip && (
        <TripModal 
          isOpen={isTripModalOpen} 
          onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} 
          onSuccess={onRefresh} 
          drivers={drivers} 
          customers={customers} 
          categories={categories} 
          editTrip={selectedTrip} 
        />
      )}

      {isCategoryModalOpen && (
        <CategoryManagerModal 
          isOpen={isCategoryModalOpen} 
          onClose={() => setIsCategoryModalOpen(false)} 
          categories={categories} 
          onSuccess={onRefresh} 
          actingUser={user} 
        />
      )}
    </div>
  );
};

export default OperationsTab;
