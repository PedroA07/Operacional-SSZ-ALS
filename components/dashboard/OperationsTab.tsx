import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry, PreStacking } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import TripModal from './operations/TripModal';
import SchedulingEditModal from './operations/SchedulingEditModal';
import DriverDocsViewerModal from './operations/DriverDocsViewerModal';
import DocumentViewerModal from './operations/DocumentViewerModal';
import DriverLocationModal from './operations/DriverLocationModal';
import GenericOperationView from './operations/GenericOperationView';
import OperationFilters from './operations/OperationFilters';
import DateRangeFilter from './operations/DateRangeFilter';
import CategoryNavigation from './operations/CategoryNavigation';
import OrdemColetaForm from './forms/OrdemColetaForm';
import PreStackingForm from './forms/PreStackingForm';
import VWStatusSelector from './operations/VWStatusSelector';
import { getOperationTableColumns } from './operations/OperationTableColumns';

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
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [isOCFormOpen, setIsOCFormOpen] = useState(false);
  const [isMinutaFormOpen, setIsMinutaFormOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [locationDriverId, setLocationDriverId] = useState<string | null>(null);

  // Estados de Filtro
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

  useEffect(() => {
    localStorage.setItem(`als_opt_types_${user.id}`, JSON.stringify(filterTypes));
    localStorage.setItem(`als_opt_clients_${user.id}`, JSON.stringify(filterClientNames));
    localStorage.setItem(`als_opt_drivers_${user.id}`, JSON.stringify(filterDriverNames));
  }, [filterTypes, filterClientNames, filterDriverNames, user.id]);

  const loadData = async () => {
    try {
      const [t, c, ps] = await Promise.all([db.getTrips(), db.getCategories(), db.getPreStacking()]);
      setTrips(t || []);
      setCategories(c || []);
      setPreStacking(ps || []);
    } catch (e) {}
  };

  useEffect(() => { 
    loadData();
    // Reduzido para 60s
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async () => {
    if (!selectedTrip) return;
    const newEntry: StatusHistoryEntry = { status: tempStatus, dateTime: new Date(statusTime).toISOString() };
    const updatedTrip = { ...selectedTrip, status: tempStatus, statusTime: newEntry.dateTime, statusHistory: [newEntry, ...(selectedTrip.statusHistory || [])] };
    await db.saveTrip(updatedTrip, user);
    setIsStatusModalOpen(false);
    loadData();
  };

  const handleLocateDriver = (driverId: string) => {
    setLocationDriverId(driverId);
    setIsLocationModalOpen(true);
  };

  const isVWCrageaTrip = useMemo(() => {
    if (!selectedTrip) return false;
    const isVW = selectedTrip.customer?.name?.toUpperCase().includes('VOLKSWAGEN');
    const isCragea = selectedTrip.destination?.name?.toUpperCase().includes('CRAGEA') || 
                     selectedTrip.scheduling?.location?.toUpperCase().includes('CRAGEA');
    return isVW && isCragea;
  }, [selectedTrip]);

  const filteredTrips = useMemo(() => {
    let result = [...trips];
    if (filterTypes.length > 0) result = result.filter(t => filterTypes.includes(t.type?.toUpperCase()));
    if (filterClientNames.length > 0) result = result.filter(t => filterClientNames.includes(t.customer?.name));
    if (filterDriverNames.length > 0) result = result.filter(t => filterDriverNames.includes(t.driver?.name));
    
    if (startDate) result = result.filter(t => t.dateTime >= startDate);
    if (endDate) result = result.filter(t => t.dateTime <= endDate + 'T23:59:59');

    return result;
  }, [trips, filterTypes, filterClientNames, filterDriverNames, startDate, endDate]);

  const columns = getOperationTableColumns(
    (t, s) => { setSelectedTrip(t); setTempStatus(s); setStatusTime(new Date().toISOString().slice(0, 16)); setIsStatusModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsOCFormOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsMinutaFormOpen(true); }, 
    (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
    async (id) => { if(onDeleteTrip) onDeleteTrip(id); },
    loadData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    handleLocateDriver,
    (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); }
  );

  if (activeView.type !== 'list') {
    return (
      <GenericOperationView 
        user={user} type={activeView.type === 'category' ? 'category' : 'client'} 
        categoryName={activeView.categoryName || ''} clientName={activeView.clientName} 
        drivers={drivers} customers={customers} availableOps={availableOps} onNavigate={setActiveView}
        onLocateDriver={handleLocateDriver}
      />
    );
  }

  return (
    <div className="space-y-8">
      <CategoryNavigation availableOps={availableOps} customers={customers} onNavigate={setActiveView} />

      <div className="pt-8 border-t border-slate-200">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
           <OperationFilters 
             selectedTypes={filterTypes} onTypesChange={setFilterTypes} 
             selectedClients={filterClientNames} onClientsChange={setFilterClientNames} 
             selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} 
             customers={customers} drivers={drivers} 
           />
           <DateRangeFilter 
             startDate={startDate} onStartDateChange={setStartDate}
             endDate={endDate} onEndDateChange={setEndDate}
             onClear={() => { setStartDate(''); setEndDate(''); }}
           />
        </div>
        
        <SmartOperationTable userId={user.id} componentId="ops-global" title="Monitoramento Global" columns={columns} data={filteredTrips} defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'actions']} />
      </div>

      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />
      <DriverLocationModal isOpen={isLocationModalOpen} onClose={() => { setIsLocationModalOpen(false); setLocationDriverId(null); }} driverId={locationDriverId} />
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={loadData} preStackingUnits={[...ports, ...preStacking]} />

      {isOCFormOpen && selectedTrip && (
        <div className="fixed inset-0 z-[800] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-[1700px] h-[95vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
              <header className="px-8 py-5 bg-blue-600 text-white flex justify-between items-center">
                 <h3 className="font-black text-xs uppercase tracking-widest">Edição de Ordem de Coleta › OS {selectedTrip.os}</h3>
                 <button onClick={() => setIsOCFormOpen(false)} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </header>
              <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsOCFormOpen(false); loadData(); }} initialData={{ ...selectedTrip.ocFormData, os: selectedTrip.os, driverId: selectedTrip.driver.id, remetenteId: selectedTrip.customer.id, destinatarioId: selectedTrip.destination?.id || '' }} />
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
              <PreStackingForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsMinutaFormOpen(false); loadData(); }} initialOS={selectedTrip.os} />
           </div>
        </div>
      )}

      <TripModal isOpen={isTripModalOpen} onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} onSuccess={loadData} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
      {selectedTrip && <DriverDocsViewerModal isOpen={isDriverDocsModalOpen} onClose={() => { setIsDriverDocsModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} user={user} onSuccess={loadData} />}
      
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
             <div className="text-center border-b border-slate-100 pb-6 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualizar Evento</p>
                <p className="text-lg font-black text-blue-600 uppercase mt-1">OS: {selectedTrip?.os}</p>
             </div>

             <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {isVWCrageaTrip ? (
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
                <button onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95">Confirmar Atualização</button>
                <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-3 hover:text-red-500 transition-colors">Cancelar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;