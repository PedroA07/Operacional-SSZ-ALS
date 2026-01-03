
import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import TripModal from './operations/TripModal';
import CategoryManagerModal from './operations/CategoryManagerModal';
import GenericOperationView from './operations/GenericOperationView';
import OperationFilters from './operations/OperationFilters';
import OrdemColetaForm from './forms/OrdemColetaForm';
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
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  
  const [filterType, setFilterType] = useState('TODOS');
  const [filterClientNames, setFilterClientNames] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterSub, setFilterSub] = useState<string>('TODAS');

  const loadData = async () => {
    const [t, c] = await Promise.all([db.getTrips(), db.getCategories()]);
    setTrips(t);
    setCategories(c);
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
    // Para simplificar, abriremos o modal de edição principal ou um específico se houvesse,
    // mas aqui o usuário quer poder configurar os dados da minuta.
    setSelectedTrip(trip);
    setIsTripModalOpen(true); 
  };

  const handleDownloadMinuta = (trip: Trip) => {
    alert(`Gerando Minuta PDF para OS: ${trip.os}\n(Utilizando template de Pré-Stacking cadastrado)`);
    // Aqui seria chamada a função do jsPDF com o template de PreStackingTemplate.tsx
  };

  const filteredTrips = useMemo(() => {
    let result = trips;
    if (filterCategory !== 'TODAS') result = result.filter(t => t.category === filterCategory);
    if (filterSub !== 'TODAS') result = result.filter(t => t.customer.name === filterSub || t.subCategory === filterSub);
    if (filterType !== 'TODOS') result = result.filter(t => t.type === filterType);
    if (filterClientNames.length > 0) {
      result = result.filter(t => filterClientNames.includes(t.customer.name));
    }
    return result;
  }, [trips, filterCategory, filterSub, filterType, filterClientNames]);

  const columns = getOperationTableColumns(
    openStatusEditor,
    handleEditTrip,
    handleEditOC,
    handleEditMinuta,
    handleDownloadMinuta,
    (id) => onDeleteTrip?.(id)
  );

  if (activeView.type !== 'list') {
    return <GenericOperationView user={user} type={activeView.type === 'category' ? 'category' : 'client'} categoryName={activeView.categoryName || ''} clientName={activeView.clientName} drivers={drivers} availableOps={availableOps} onNavigate={setActiveView} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestão Operacional de Viagens</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sincronização em tempo real (Nuvem/Local)</p>
           </div>
           <button onClick={() => { setSelectedTrip(null); setIsTripModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">Nova Programação</button>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
           <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Monitoramento por Categoria Master</h3>
           <div className="flex flex-wrap gap-3">
              <button onClick={() => { setFilterCategory('TODAS'); setFilterSub('TODAS'); }} className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase ${filterCategory === 'TODAS' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>Geral</button>
              {categories.filter(c => !c.parentId).map(cat => (
                <button key={cat.id} onClick={() => { setFilterCategory(cat.name); setFilterSub('TODAS'); }} className={`px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase ${filterCategory === cat.name ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>{cat.name}</button>
              ))}
           </div>
        </div>
      </div>

      <OperationFilters 
        selectedType={filterType}
        onTypeChange={setFilterType}
        selectedClients={filterClientNames}
        onClientsChange={setFilterClientNames}
        customers={customers}
      />

      <SmartOperationTable 
        userId={user.id} 
        componentId={`ops-table-v7`} 
        columns={columns} 
        data={filteredTrips} 
        title={filterCategory === 'TODAS' ? "Todas as Viagens em Aberto" : `${filterCategory} › ${filterSub}`}
        defaultVisibleKeys={['dateTime', 'type', 'os_status', 'customer', 'equipment', 'driver', 'actions']}
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
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
             <div className="text-center"><p className="text-[10px] font-black text-slate-400 uppercase">Confirmar Evento:</p><p className="text-lg font-black text-blue-600 uppercase">{tempStatus}</p></div>
             <input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-blue-100 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
             <button onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700">Atualizar Status</button>
             <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-2">Cancelar</button>
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
    </div>
  );
};

export default OperationsTab;
