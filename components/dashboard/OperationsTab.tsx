
import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import TripModal from './operations/TripModal';
import SchedulingEditModal from './operations/SchedulingEditModal';
import DriverDocsViewerModal from './operations/DriverDocsViewerModal';
import GenericOperationView from './operations/GenericOperationView';
import OperationFilters from './operations/OperationFilters';
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
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [trackedDriver, setTrackedDriver] = useState<Driver | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  
  const [filterTypes, setFilterTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('als_filter_types');
    return saved ? JSON.parse(saved) : ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];
  });
  
  const [filterClientNames, setFilterClientNames] = useState<string[]>([]);
  const [filterDriverNames, setFilterDriverNames] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const loadData = async () => {
    const [t, c] = await Promise.all([db.getTrips(), db.getCategories()]);
    setTrips(t || []);
    setCategories(c || []);
  };

  useEffect(() => { loadData(); }, []);

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
    const newEntry: StatusHistoryEntry = { status: tempStatus, dateTime: new Date(statusTime).toISOString() };
    const updatedTrip = { ...selectedTrip, status: tempStatus, statusTime: newEntry.dateTime, statusHistory: [newEntry, ...(selectedTrip.statusHistory || [])] };
    await db.saveTrip(updatedTrip, user);
    setIsStatusModalOpen(false);
    loadData();
  };

  const handleLocateDriver = async (driverId: string) => {
    const allDrivers = await db.getDrivers();
    const found = allDrivers.find(d => String(d.id) === String(driverId));
    if (found) {
      setTrackedDriver(found);
      setIsLocationModalOpen(true);
    } else {
      alert("Motorista não localizado.");
    }
  };

  const handleViewDriverDocs = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsDriverDocsModalOpen(true);
  };

  const filteredTrips = useMemo(() => {
    let result = [...trips];
    if (filterCategory && filterCategory !== 'TODAS') result = result.filter(t => t.category?.toUpperCase() === filterCategory.toUpperCase());
    if (filterTypes.length > 0) result = result.filter(t => filterTypes.includes(t.type?.toUpperCase()));
    if (filterClientNames.length > 0) result = result.filter(t => filterClientNames.includes(t.customer?.name));
    if (filterDriverNames.length > 0) result = result.filter(t => filterDriverNames.includes(t.driver?.name));
    if (filterStartDate) result = result.filter(t => t.dateTime >= filterStartDate);
    if (filterEndDate) result = result.filter(t => t.dateTime <= filterEndDate + 'T23:59:59');
    return result;
  }, [trips, filterCategory, filterTypes, filterClientNames, filterDriverNames, filterStartDate, filterEndDate]);

  const columns = getOperationTableColumns(
    openStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); },
    (t) => { setSelectedTrip(t); }, 
    (t) => { setSelectedTrip(t); }, 
    (url, title) => { window.open(url, '_blank'); },
    async (id) => { if(onDeleteTrip) onDeleteTrip(id); },
    loadData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    handleLocateDriver,
    handleViewDriverDocs
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
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel de Operações</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestão e Monitoramento de Viagens</p>
          </div>
          <button onClick={() => { setSelectedTrip(null); setIsTripModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
            Nova Programação
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {availableOps.map(op => (
             <button 
               key={op.id}
               onClick={() => setActiveView({ type: 'category', id: op.id, categoryName: op.category })}
               className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left hover:bg-white hover:border-blue-500 hover:shadow-xl transition-all group"
             >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all mb-4">
                  <span className="font-black italic text-sm">{op.category.substring(0,2).toUpperCase()}</span>
                </div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-tight">{op.category}</h4>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Acessar Monitoramento</p>
             </button>
           ))}
        </div>
      </div>

      <OperationFilters selectedTypes={filterTypes} onTypesChange={setFilterTypes} selectedClients={filterClientNames} onClientsChange={setFilterClientNames} selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} customers={customers} drivers={drivers} />
      
      <SmartOperationTable userId={user.id} componentId="ops-main-table" title="Monitoramento Global" columns={columns} data={filteredTrips} defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'actions']} />

      {isLocationModalOpen && trackedDriver && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Localização em Tempo Real</p>
                       <h3 className="text-lg font-black uppercase">{trackedDriver.name}</h3>
                    </div>
                 </div>
                 <button onClick={() => setIsLocationModalOpen(false)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
                 </button>
              </div>
              <div className="flex-1 bg-slate-100 relative">
                 {trackedDriver.currentLat && trackedDriver.currentLng ? (
                   <iframe 
                      width="100%" height="100%" style={{ border: 0 }} 
                      src={`https://maps.google.com/maps?q=${trackedDriver.currentLat},${trackedDriver.currentLng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                   ></iframe>
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                      <h4 className="text-xl font-black text-slate-800 uppercase">Sem Sinal de GPS</h4>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <TripModal isOpen={isTripModalOpen} onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} onSuccess={loadData} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={loadData} preStackingUnits={ports} />
      
      {isDriverDocsModalOpen && selectedTrip && (
        <DriverDocsViewerModal 
          isOpen={isDriverDocsModalOpen}
          onClose={() => { setIsDriverDocsModalOpen(false); setSelectedTrip(null); }}
          trip={selectedTrip}
          user={user}
          onSuccess={loadData}
        />
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95">
             <div className="text-center border-b border-slate-100 pb-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualizar Evento</p><p className="text-lg font-black text-blue-600 uppercase mt-1">OS: {selectedTrip?.os}</p></div>
             <div className="space-y-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Novo Status</label><select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase outline-none focus:border-blue-500" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>{['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Viagem concluída', 'Viagem cancelada'].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora</label><input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} /></div>
             </div>
             <div className="grid gap-3 pt-4"><button onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95">Confirmar Atualização</button><button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-3 hover:text-red-500 transition-colors">Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;
