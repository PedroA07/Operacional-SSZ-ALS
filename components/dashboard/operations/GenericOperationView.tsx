
import React, { useMemo, useState, useEffect } from 'react';
import { Driver, OperationDefinition, User, Customer, Trip } from '../../../types';
import SmartOperationTable from './SmartOperationTable';
import { maskCNPJ } from '../../../utils/masks';
import { db } from '../../../utils/storage';
import { getOperationTableColumns } from './OperationTableColumns';
import TripModal from './TripModal';
import SchedulingEditModal from './SchedulingEditModal';

interface GenericOperationViewProps {
  user: User;
  type: 'category' | 'client';
  categoryName: string;
  clientName?: string;
  drivers: Driver[];
  customers: Customer[];
  availableOps: OperationDefinition[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
}

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  user,
  type, 
  categoryName, 
  clientName, 
  drivers,
  customers,
  availableOps,
  onNavigate
}) => {
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [ports, setPorts] = useState<any[]>([]);

  const loadLocalData = async () => {
    const [t, cats, p, ps] = await Promise.all([
      db.getTrips(), 
      db.getCategories(),
      db.getPorts(),
      db.getPreStacking()
    ]);
    setAllTrips(t);
    setCategories(cats);
    setPorts([...p, ...ps]);
  };

  useEffect(() => {
    loadLocalData();
  }, [categoryName, clientName]);

  // REGRA: Filtrar apenas motoristas vinculados a esta operação específica
  const filteredDrivers = drivers.filter(d => 
    d.operations.some(op => {
      if (type === 'category') return op.category.toUpperCase() === categoryName.toUpperCase();
      return op.category.toUpperCase() === categoryName.toUpperCase() && op.client.toUpperCase() === clientName?.toUpperCase();
    })
  );

  // REGRA: Filtrar viagens vinculadas a esta categoria/cliente
  const filteredTrips = useMemo(() => {
    return allTrips.filter(t => {
      const matchCategory = t.category.toUpperCase() === categoryName.toUpperCase();
      if (type === 'category') return matchCategory;
      
      const matchClient = (t.customer.name.toUpperCase() === clientName?.toUpperCase()) || 
                          (t.subCategory?.toUpperCase() === clientName?.toUpperCase());
      return matchCategory && matchClient;
    });
  }, [allTrips, categoryName, clientName, type]);

  // REGRA: Buscar todos os clientes da base que possuem esta categoria vinculada
  const linkedCustomers = useMemo(() => {
    return customers.filter(c => 
      c.operations?.some(op => op.toUpperCase() === categoryName.toUpperCase())
    );
  }, [customers, categoryName]);

  const driverColumns = [
    { key: 'name', label: 'Motorista', render: (d: any) => (
      <div>
        <p className="font-bold text-slate-800 uppercase text-[11px]">{d.name}</p>
        <p className="text-[8px] text-slate-400 font-bold mt-0.5">{d.driverType}</p>
      </div>
    )},
    { key: 'plateHorse', label: 'Placa Cavalo', render: (d: any) => <span className="font-mono font-black text-blue-600 text-xs">{d.plateHorse}</span> },
    { key: 'status', label: 'Status', render: (d: any) => (
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
        {d.status}
      </span>
    )}
  ];

  // Reuso das colunas de operação para manter consistência total
  const tripColumns = getOperationTableColumns(
    () => {}, // openStatusEditor - aqui poderíamos implementar se necessário
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); },
    () => {}, // handleEditOC
    () => {}, // handleEditMinuta
    (url, title) => window.open(url, '_blank'),
    async (id) => { if(confirm('Excluir viagem?')) { await db.deleteTrip(id); loadLocalData(); } },
    loadLocalData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); }
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 ${type === 'category' ? 'bg-slate-900' : 'bg-blue-600'} rounded-[2rem] flex items-center justify-center text-white font-black italic shadow-2xl`}>
            {type === 'category' ? categoryName.substring(0, 2).toUpperCase() : clientName?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">
              {type === 'category' ? categoryName : clientName}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">
              {type === 'category' ? 'Monitoramento de Categoria Master' : `Página Dedicada • ${categoryName}`}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
           <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm text-center">
             <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Motoristas Autorizados</p>
             <p className="text-2xl font-black text-slate-800">{filteredDrivers.length}</p>
           </div>
           <div className="bg-blue-600 px-6 py-4 rounded-2xl shadow-lg shadow-blue-600/20 text-center">
             <p className="text-[8px] font-black text-blue-100 uppercase mb-1">Total de Viagens</p>
             <p className="text-2xl font-black text-white">{filteredTrips.length}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 space-y-8">
          
          {/* TABELA DE MOTORISTAS AUTORIZADOS */}
          <SmartOperationTable 
            userId={user.id}
            componentId={`op-drivers-${type}-${categoryName}-${clientName || 'all'}`}
            title="Motoristas Autorizados na Operação"
            columns={driverColumns}
            data={filteredDrivers}
            defaultVisibleKeys={['name', 'plateHorse', 'status']}
          />

          {/* TABELA DE VIAGENS DA OPERAÇÃO */}
          <SmartOperationTable 
            userId={user.id}
            componentId={`op-trips-${type}-${categoryName}-${clientName || 'all'}`}
            title={`Histórico e Programação: ${type === 'category' ? categoryName : clientName}`}
            columns={tripColumns}
            data={filteredTrips}
            defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'scheduling_info', 'actions']}
          />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest mb-6 border-b border-slate-100 pb-4">
              {type === 'category' ? 'Clientes Vinculados' : 'Outros Clientes'}
            </h3>
            <div className="space-y-3">
              {linkedCustomers.map((cust) => (
                <button 
                  key={cust.id}
                  onClick={() => onNavigate({ type: 'client', categoryName: categoryName, clientName: cust.name })}
                  className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-3 group ${clientName === cust.name ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-50' : 'bg-slate-50 border-slate-100 hover:border-blue-400 hover:bg-white'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black italic text-[10px] ${clientName === cust.name ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {cust.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-800 uppercase leading-tight truncate">
                      {cust.name}
                    </p>
                  </div>
                  <svg className={`w-3 h-3 transition-colors ${clientName === cust.name ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2">Resumo da Operação</p>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Em Viagem</p>
                <p className="text-xl font-black text-emerald-400">{filteredTrips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada' && t.status !== 'Pendente').length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Concluídas</p>
                <p className="text-xl font-black text-white">{filteredTrips.filter(t => t.status === 'Viagem concluída').length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TripModal 
        isOpen={isTripModalOpen} 
        onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} 
        onSuccess={loadLocalData} 
        drivers={drivers} 
        customers={customers} 
        categories={categories} 
        editTrip={selectedTrip} 
      />

      <SchedulingEditModal 
        isOpen={isSchedulingModalOpen}
        onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }}
        trip={selectedTrip}
        onSuccess={loadLocalData}
        preStackingUnits={ports}
      />
    </div>
  );
};

export default GenericOperationView;
