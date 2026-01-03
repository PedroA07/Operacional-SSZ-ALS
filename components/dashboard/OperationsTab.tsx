
import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import TripModal from './operations/TripModal';
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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isOCEditModalOpen, setIsOCEditModalOpen] = useState(false);
  const [isMinutaModalOpen, setIsMinutaModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  
  const [filterTypes, setFilterTypes] = useState<string[]>(['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM']);
  const [filterClientNames, setFilterClientNames] = useState<string[]>([]);
  const [filterDriverNames, setFilterDriverNames] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterSub, setFilterSub] = useState<string>('TODAS');

  const loadData = async () => {
    const [t, c] = await Promise.all([db.getTrips(), db.getCategories()]);
    setTrips(t);
    setCategories(c);
  };

  useEffect(() => { 
    loadData(); 
    setFilterClientNames(customers.map(c => c.name));
    setFilterDriverNames(drivers.map(d => d.name));
  }, [customers, drivers]);

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
    await db.saveTrip(updatedTrip);
    setIsStatusModalOpen(false);
    loadData();
  };

  const handleEditTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsTripModalOpen(true);
  };

  const handleEditOC = (trip: Trip) => {
    if (!trip.ocFormData) return;
    setSelectedTrip(trip);
    setIsOCEditModalOpen(true);
  };

  const handleEditMinuta = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsMinutaModalOpen(true);
  };

  const handleDownloadMinuta = (trip: Trip) => {
    alert(`Gerando Minuta Direta para OS: ${trip.os}`);
  };

  const filteredTrips = useMemo(() => {
    let result = trips;
    if (filterCategory !== 'TODAS') result = result.filter(t => t.category === filterCategory);
    if (filterSub !== 'TODAS') result = result.filter(t => t.customer.name === filterSub || t.subCategory === filterSub);
    
    if (filterTypes.length > 0) result = result.filter(t => filterTypes.includes(t.type));
    if (filterClientNames.length > 0) result = result.filter(t => filterClientNames.includes(t.customer.name));
    if (filterDriverNames.length > 0) result = result.filter(t => filterDriverNames.includes(t.driver.name));
    
    return result;
  }, [trips, filterCategory, filterSub, filterTypes, filterClientNames, filterDriverNames]);

  const columns = getOperationTableColumns(
    openStatusEditor,
    handleEditTrip,
    handleEditOC,
    handleEditMinuta,
    handleDownloadMinuta,
    (id) => onDeleteTrip?.(id)
  );

  const STATUS_OPTIONS: TripStatus[] = [
    'Pendente', 
    'Retirada de vazio', 
    'Retirada do cheio', 
    'Em viagem', 
    'Chegou no cliente', 
    'Pegou NF', 
    'Saiu do cliente', 
    'Chegou no destino', 
    'Devolução do cheio',
    'Viagem concluída', 
    'Viagem cancelada'
  ];

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
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel de Operações ALS</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestão Completa de Fila e Rastreabilidade</p>
           </div>
           <button onClick={() => { setSelectedTrip(null); setIsTripModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">Nova Programação</button>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
           <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Visualizar Categoria Master</h3>
           <div className="flex flex-wrap gap-3">
              <button onClick={() => { setFilterCategory('TODAS'); setFilterSub('TODAS'); }} className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase ${filterCategory === 'TODAS' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>Visão Geral</button>
              {categories.filter(c => !c.parentId).map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => { 
                    setActiveView({ type: 'category', categoryName: cat.name });
                  }} 
                  className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-900 hover:text-white transition-all text-[10px] font-black uppercase"
                >
                  {cat.name}
                </button>
              ))}
           </div>
        </div>
      </div>

      <OperationFilters 
        selectedTypes={filterTypes}
        onTypesChange={setFilterTypes}
        selectedClients={filterClientNames}
        onClientsChange={setFilterClientNames}
        selectedDrivers={filterDriverNames}
        onDriversChange={setFilterDriverNames}
        customers={customers}
        drivers={drivers}
      />

      <SmartOperationTable 
        userId={user.id} 
        componentId={`ops-table-v10`} 
        columns={columns} 
        data={filteredTrips} 
        title={filterCategory === 'TODAS' ? "Programação Geral de Operações" : `${filterCategory} › ${filterSub}`}
        defaultVisibleKeys={['dateTime', 'os_status', 'customer', 'equipment', 'driver', 'destination', 'actions']}
      />

      <TripModal 
        isOpen={isTripModalOpen} 
        onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} 
        onSuccess={loadData} 
        drivers={drivers} 
        customers={customers} 
        categories={categories} 
        editTrip={selectedTrip} 
      />

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95">
             <div className="text-center border-b border-slate-100 pb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualizar Evento Operacional</p>
                <p className="text-lg font-black text-blue-600 uppercase mt-1">OS: {selectedTrip?.os}</p>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Selecione o Novo Status</label>
                   <select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase outline-none focus:border-blue-500" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                </div>
                
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora da Ocorrência</label>
                   <input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
                </div>
             </div>

             <div className="grid gap-3 pt-4">
                <button onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95">Confirmar Atualização</button>
                <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-3 hover:text-red-500 transition-colors">Cancelar</button>
             </div>
          </div>
        </div>
      )}

      {isOCEditModalOpen && selectedTrip && selectedTrip.ocFormData && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest">Editar Ordem de Coleta Original</h3>
                <button onClick={() => setIsOCEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
              <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsOCEditModalOpen(false); loadData(); }} initialData={selectedTrip.ocFormData} />
           </div>
        </div>
      )}

      {isMinutaModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
              <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest">Formulário de Minuta Pre-Stacking</h3>
                <button onClick={() => setIsMinutaModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
              <PreStackingForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsMinutaModalOpen(false); loadData(); }} initialOS={selectedTrip.os} />
           </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;
