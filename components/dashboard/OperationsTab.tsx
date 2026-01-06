
import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import TripModal from './operations/TripModal';
import SchedulingEditModal from './operations/SchedulingEditModal';
import CategoryManagerModal from './operations/CategoryManagerModal';
import GenericOperationView from './operations/GenericOperationView';
import OperationFilters from './operations/OperationFilters';
import OrdemColetaForm from './forms/OrdemColetaForm';
import PreStackingForm from './forms/PreStackingForm';
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isOCEditModalOpen, setIsOCEditModalOpen] = useState(false);
  const [isMinutaModalOpen, setIsMinutaModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [docViewConfig, setDocViewConfig] = useState({ url: '', title: '' });

  // Estados de Filtro - Normalizados
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

  useEffect(() => { 
    loadData(); 
  }, []);

  useEffect(() => {
    localStorage.setItem('als_filter_types', JSON.stringify(filterTypes));
  }, [filterTypes]);

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

  const filteredTrips = useMemo(() => {
    let result = [...trips];
    
    // Normalização para comparação segura
    if (filterCategory && filterCategory !== 'TODAS') {
      result = result.filter(t => t.category?.toUpperCase() === filterCategory.toUpperCase());
    }
    
    if (filterTypes.length > 0) {
      result = result.filter(t => filterTypes.includes(t.type?.toUpperCase()));
    }
    
    if (filterClientNames.length > 0) {
      result = result.filter(t => filterClientNames.includes(t.customer?.name));
    }
    
    if (filterDriverNames.length > 0) {
      result = result.filter(t => filterDriverNames.includes(t.driver?.name));
    }
    
    if (filterStartDate) {
      result = result.filter(t => t.dateTime >= filterStartDate);
    }
    
    if (filterEndDate) {
      result = result.filter(t => t.dateTime <= filterEndDate + 'T23:59:59');
    }
    
    return result;
  }, [trips, filterCategory, filterTypes, filterClientNames, filterDriverNames, filterStartDate, filterEndDate]);

  const columns = getOperationTableColumns(
    openStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsOCEditModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsMinutaModalOpen(true); },
    (url, title) => { setDocViewConfig({ url, title }); setIsDocViewerOpen(true); },
    async (id) => { if(onDeleteTrip) onDeleteTrip(id); },
    loadData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user
  );

  const handleClearAllFilters = () => {
    setFilterTypes(['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM']);
    setFilterClientNames([]);
    setFilterDriverNames([]);
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCategory('TODAS');
  };

  if (activeView.type !== 'list') {
    return (
      <GenericOperationView 
        user={user} 
        type={activeView.type === 'category' ? 'category' : 'client'} 
        categoryName={activeView.categoryName || ''} 
        clientName={activeView.clientName} 
        drivers={drivers} 
        customers={customers}
        availableOps={availableOps} 
        onNavigate={setActiveView} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel de Operações ALS</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestão de Viagens em Tempo Real</p>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setIsCategoryModalOpen(true)} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">Nova Categoria</button>
             <button onClick={() => { setSelectedTrip(null); setIsTripModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
               Nova Programação
             </button>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
           <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Abrir Visão por Categoria</h3>
           <div className="flex flex-wrap gap-3">
              <button onClick={() => setFilterCategory('TODAS')} className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase ${filterCategory === 'TODAS' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>Lista Geral</button>
              {categories.filter(c => !c.parentId).map(cat => (
                <button key={cat.id} onClick={() => setActiveView({ type: 'category', categoryName: cat.name })} className="px-6 py-3 bg-white border border-slate-200 hover:border-blue-600 hover:text-blue-600 rounded-xl transition-all text-[10px] font-black uppercase flex items-center gap-2 group">
                  <span>{cat.name}</span>
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ))}
           </div>
        </div>
      </div>

      <OperationFilters selectedTypes={filterTypes} onTypesChange={setFilterTypes} selectedClients={filterClientNames} onClientsChange={setFilterClientNames} selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} customers={customers} drivers={drivers} />
      
      <div className="flex justify-between items-center mb-6">
        <button onClick={handleClearAllFilters} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Limpar filtros da lista</button>
        <div className="flex gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
           <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Início</label><input type="date" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} /></div>
           <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase ml-1">Fim</label><input type="date" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} /></div>
        </div>
      </div>

      <SmartOperationTable userId={user.id} componentId="ops-main-table" title="Monitoramento Operacional Global" columns={columns} data={filteredTrips} defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'destination_ship_booking', 'scheduling_info', 'actions']} />

      <TripModal isOpen={isTripModalOpen} onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} onSuccess={loadData} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
      <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} categories={categories} onSuccess={loadData} actingUser={user} />
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
