
import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import TripModal from './operations/TripModal';
import SchedulingEditModal from './operations/SchedulingEditModal';
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
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [trackedDriver, setTrackedDriver] = useState<Driver | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [docViewConfig, setDocViewConfig] = useState({ url: '', title: '' });

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
      alert("Motorista não localizado no banco de dados.");
    }
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
    (url, title) => { setDocViewConfig({ url, title }); setIsDocViewerOpen(true); },
    async (id) => { if(onDeleteTrip) onDeleteTrip(id); },
    loadData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    handleLocateDriver
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
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitoramento Global</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestão de Viagens ALS em Tempo Real</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => { setSelectedTrip(null); setIsTripModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
               Nova Programação
             </button>
          </div>
        </div>

        {/* CARDS DE ACESSO RÁPIDO ÀS CATEGORIAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {availableOps.map(op => (
             <button 
               key={op.id}
               onClick={() => setActiveView({ type: 'category', id: op.id, categoryName: op.category })}
               className="p-5 bg-slate-50 border border-slate-100 rounded-3xl text-left hover:bg-blue-50 hover:border-blue-200 transition-all group"
             >
                <div className="flex items-center justify-between mb-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 transition-colors">
                      <span className="text-slate-400 font-black italic text-xs group-hover:text-white uppercase">{op.category.substring(0,2)}</span>
                   </div>
                   <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                </div>
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-tight leading-none group-hover:text-blue-700">{op.category}</h4>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Acessar Painel</p>
             </button>
           ))}
        </div>
      </div>

      <OperationFilters selectedTypes={filterTypes} onTypesChange={setFilterTypes} selectedClients={filterClientNames} onClientsChange={setFilterClientNames} selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} customers={customers} drivers={drivers} />
      
      <SmartOperationTable userId={user.id} componentId="ops-main-table" title="Lista Geral de Viagens" columns={columns} data={filteredTrips} defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'destination_ship_booking', 'scheduling_info', 'actions']} />

      {/* MODAL DE RASTREAMENTO SATELITAL CORRIGIDO */}
      {isLocationModalOpen && trackedDriver && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1.5">Localização do Dispositivo</p>
                       <h3 className="text-lg font-black uppercase truncate leading-none">{trackedDriver.name}</h3>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Placa: {trackedDriver.plateHorse} | Atualizado em: {trackedDriver.lastLocationAt ? new Date(trackedDriver.lastLocationAt).toLocaleTimeString('pt-BR') : 'Sem sinal GPS'}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsLocationModalOpen(false)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
                 </button>
              </div>
              <div className="flex-1 bg-slate-100 relative">
                 {trackedDriver.currentLat && trackedDriver.currentLng && Math.abs(trackedDriver.currentLat) > 0 ? (
                   <iframe 
                      key={`${trackedDriver.currentLat}-${trackedDriver.currentLng}`}
                      width="100%" height="100%" style={{ border: 0 }} 
                      src={`https://maps.google.com/maps?q=${trackedDriver.currentLat},${trackedDriver.currentLng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                   ></iframe>
                 ) : (
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-slate-50">
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100"><svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg></div>
                      <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Sem sinal de GPS</h4>
                      <p className="text-slate-400 text-sm mt-3 max-w-md font-medium leading-relaxed">O dispositivo do motorista ainda não registrou coordenadas geográficas válidas. <br/> O rastreio só inicia quando o motorista abre uma viagem no Portal ALS e autoriza o uso da localização.</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <TripModal isOpen={isTripModalOpen} onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} onSuccess={loadData} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={loadData} preStackingUnits={ports} />

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95">
             <div className="text-center border-b border-slate-100 pb-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualizar Evento Operacional</p><p className="text-lg font-black text-blue-600 uppercase mt-1">OS: {selectedTrip?.os}</p></div>
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
