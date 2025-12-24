

import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Trip, TripStatus, Category, OperationDefinition } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import NewTripModal from './operations/NewTripModal';
import CategoryManagerModal from './operations/CategoryManagerModal';
import GenericOperationView from './operations/GenericOperationView';

interface OperationsTabProps {
  user: User;
  drivers: Driver[];
  customers: Customer[];
  /* Added props passed from Dashboard */
  availableOps: OperationDefinition[];
  activeView: { type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string };
  setActiveView: (view: { type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string }) => void;
}

const OperationsTab: React.FC<OperationsTabProps> = ({ user, drivers, customers, availableOps, activeView, setActiveView }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterSub, setFilterSub] = useState<string>('TODAS');

  const loadData = async () => {
    const [t, c] = await Promise.all([db.getTrips(), db.getCategories()]);
    setTrips(t);
    setCategories(c);
  };

  useEffect(() => { loadData(); }, []);

  const filteredTrips = useMemo(() => {
    let result = trips;
    if (filterCategory !== 'TODAS') result = result.filter(t => t.category === filterCategory);
    if (filterSub !== 'TODAS') result = result.filter(t => t.subCategory === filterSub);
    return result;
  }, [trips, filterCategory, filterSub]);

  const openStatusEditor = (trip: Trip, status: TripStatus) => {
    setSelectedTrip(trip);
    setTempStatus(status);
    setStatusTime(new Date().toISOString().slice(0, 16));
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedTrip) return;
    const updatedTrip = { ...selectedTrip, status: tempStatus, statusTime: new Date(statusTime).toISOString() };
    await db.saveTrip(updatedTrip);
    setIsStatusModalOpen(false);
    loadData();
  };

  const columns = [
    { 
      key: 'dateTime', 
      label: '1. Programação', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
          <span className="text-blue-600 font-bold">{new Date(t.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    },
    { 
      key: 'os_status', 
      label: '2. OS / Status', 
      render: (t: Trip) => (
        <div className="space-y-1">
          <p className="font-black text-blue-600 text-sm">{t.os}</p>
          <div className="flex items-center gap-2">
            <select 
              value={t.status}
              onChange={(e) => openStatusEditor(t, e.target.value as TripStatus)}
              className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[9px] font-black uppercase outline-none hover:border-blue-400"
            >
              <option value="Pendente">Pendente</option>
              <option value="Retirada de vazio">Retirada Vazio</option>
              <option value="Retirada de cheio">Retirada Cheio</option>
              <option value="Chegada no cliente">Chegada Cliente</option>
              <option value="Nota fiscal enviada">NF Enviada</option>
              <option value="Agendamento Porto/Depot">Agendamento</option>
              <option value="Viagem concluída">Concluída</option>
            </select>
          </div>
        </div>
      )
    },
    {
      key: 'location',
      label: '3. Local Atendimento',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-700 uppercase leading-none">{t.customer?.name}</span>
          <span className="text-[9px] text-slate-400 mt-1">{t.customer?.city} - {t.customer?.state}</span>
        </div>
      )
    },
    {
      key: 'container_data',
      label: '4. Dados Container',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800">{t.container || '---'}</span>
          <div className="flex gap-2 text-[8px] font-bold text-slate-400 uppercase">
             <span>T: {t.tara || '---'}</span>
             <span>L: {t.seal || '---'}</span>
          </div>
        </div>
      )
    },
    { key: 'cva', label: '5. CVA', render: (t: Trip) => <span className="font-black text-emerald-600">{t.cva || '---'}</span> },
    { 
      key: 'driver', 
      label: '6. Motorista', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase leading-none">{t.driver?.name}</span>
          <span className="text-[8px] font-mono text-slate-400 mt-1">{t.driver?.plateHorse} / {t.driver?.plateTrailer}</span>
        </div>
      )
    },
    { 
      key: 'ship_booking', 
      label: '7. Navio / Booking', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700 uppercase leading-none">{t.ship || '---'}</span>
          <span className="text-[9px] font-black text-blue-500 mt-1 uppercase">BK: {t.booking || '---'}</span>
        </div>
      )
    }
  ];

  /* Handle showing GenericOperationView if activeView is not list */
  if (activeView.type !== 'list') {
    return (
      <GenericOperationView 
        user={user}
        type={activeView.type === 'category' ? 'category' : 'client'}
        categoryName={activeView.categoryName || ''}
        clientName={activeView.clientName}
        drivers={drivers}
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
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Operacional</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gestão de Viagens por Segmento</p>
           </div>
           <div className="flex gap-3">
              <button onClick={() => setIsCatModalOpen(true)} className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-black uppercase hover:bg-slate-50 transition-all">Config. Categorias</button>
              <button onClick={() => setIsTripModalOpen(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">Nova Programação</button>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => { setFilterCategory('TODAS'); setFilterSub('TODAS'); }} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterCategory === 'TODAS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Todas</button>
              {categories.filter(c => !c.parentId).map(cat => (
                <button key={cat.id} onClick={() => { setFilterCategory(cat.name); setFilterSub('TODAS'); }} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterCategory === cat.name ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{cat.name}</button>
              ))}
            </div>
          </div>

          {filterCategory !== 'TODAS' && categories.some(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === filterCategory) && (
            <div className="flex items-center gap-3 animate-in slide-in-from-left-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subcategoria:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setFilterSub('TODAS')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterSub === 'TODAS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Tudo em {filterCategory}</button>
                {categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === filterCategory).map(sub => (
                  <button key={sub.id} onClick={() => setFilterSub(sub.name)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${filterSub === sub.name ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>{sub.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <SmartOperationTable 
        userId={user.id} 
        componentId={`ops-table-${filterCategory}-${filterSub}`} 
        columns={columns} 
        data={filteredTrips} 
        title={filterCategory === 'TODAS' ? "Fila Operacional ALS" : `${filterCategory}${filterSub !== 'TODAS' ? ' › ' + filterSub : ''}`} 
      />

      <NewTripModal 
        isOpen={isTripModalOpen} 
        onClose={() => setIsTripModalOpen(false)} 
        onSuccess={loadData} 
        drivers={drivers} 
        customers={customers}
        categories={categories}
      />

      <CategoryManagerModal 
        isOpen={isCatModalOpen} 
        onClose={() => setIsCatModalOpen(false)} 
        categories={categories} 
        onSuccess={loadData} 
      />

      {/* Editor de Status */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Confirmar Evento:</p>
                <p className="text-lg font-black text-blue-600 uppercase">{tempStatus}</p>
             </div>
             <input type="datetime-local" className="w-full px-4 py-4 rounded-xl border-2 border-blue-100 bg-slate-50 font-black" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
             <button onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase">Atualizar Status</button>
             <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;
