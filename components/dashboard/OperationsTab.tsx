
import React, { useState, useEffect, useMemo } from 'react';
import { OperationDefinition, Driver, Customer, User, Trip, TripStatus } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';

interface OperationsTabProps {
  user: User;
  drivers: Driver[];
  customers: Customer[];
  availableOps: OperationDefinition[];
  activeView: any;
  setActiveView: any;
}

const OperationsTab: React.FC<OperationsTabProps> = ({ user, drivers, availableOps, activeView, setActiveView }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('TODAS');

  const loadTrips = async () => {
    const data = await db.getTrips();
    setTrips(data);
  };

  useEffect(() => { loadTrips(); }, []);

  const filteredTrips = useMemo(() => {
    if (filterCategory === 'TODAS') return trips;
    return trips.filter(t => t.category === filterCategory);
  }, [trips, filterCategory]);

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
    loadTrips();
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
            {t.statusTime && <span className="text-[8px] font-bold text-slate-400">às {new Date(t.statusTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>
      )
    },
    {
      key: 'location',
      label: '3. Local de Atendimento',
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
    { 
      key: 'driver', 
      label: '5. Motorista', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase leading-none">{t.driver?.name}</span>
          <span className="text-[8px] font-mono text-slate-400 mt-1">CPF: {t.driver?.cpf} | {t.driver?.plateHorse} / {t.driver?.plateTrailer}</span>
        </div>
      )
    },
    { 
      key: 'ship_booking', 
      label: '6. Navio / Booking', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700 uppercase leading-none">{t.ship || '---'}</span>
          <span className="text-[9px] font-black text-blue-500 mt-1 uppercase">BK: {t.booking || '---'}</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setFilterCategory('TODAS')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filterCategory === 'TODAS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todas</button>
            {availableOps.map(op => (
              <button key={op.id} onClick={() => setFilterCategory(op.category)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filterCategory === op.category ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{op.category}</button>
            ))}
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">Nova Programação</button>
      </div>

      <SmartOperationTable 
        userId={user.id} 
        componentId={`ops-table-${filterCategory}`} 
        columns={columns} 
        data={filteredTrips} 
        title={`Fila Operacional: ${filterCategory}`} 
      />

      {/* Modal e Status Modal permanecem similares, apenas garantindo os novos campos */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4">
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Confirmar Evento:</p>
                <p className="text-lg font-black text-blue-600 uppercase">{tempStatus}</p>
             </div>
             <input type="datetime-local" className="w-full px-4 py-4 rounded-xl border-2 border-blue-100 bg-slate-50 font-black" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
             <button onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase">Confirmar e Atualizar</button>
             <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;
