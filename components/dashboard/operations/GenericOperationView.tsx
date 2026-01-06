
import React, { useMemo, useState, useEffect } from 'react';
import { Driver, OperationDefinition, User, Customer, Trip, TripStatus, StatusHistoryEntry } from '../../../types';
import SmartOperationTable from './SmartOperationTable';
import { db } from '../../../utils/storage';
import { getOperationTableColumns } from './OperationTableColumns';
import TripModal from './TripModal';
import SchedulingEditModal from './SchedulingEditModal';
import OrdemColetaForm from '../forms/OrdemColetaForm';
import PreStackingForm from '../forms/PreStackingForm';

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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isOCEditModalOpen, setIsOCEditModalOpen] = useState(false);
  const [isMinutaModalOpen, setIsMinutaModalOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [ports, setPorts] = useState<any[]>([]);
  
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [docViewConfig, setDocViewConfig] = useState({ url: '', title: '' });

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

  const handleOpenNewTrip = () => {
    setSelectedTrip(null);
    setIsTripModalOpen(true);
  };

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
    const newEntry: StatusHistoryEntry = { 
      status: tempStatus, 
      dateTime: new Date(statusTime).toISOString() 
    };
    const updatedTrip = { 
      ...selectedTrip, 
      status: tempStatus, 
      statusTime: newEntry.dateTime, 
      statusHistory: [newEntry, ...(selectedTrip.statusHistory || [])] 
    };
    await db.saveTrip(updatedTrip, user);
    setIsStatusModalOpen(false);
    loadLocalData();
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

  const handleViewDoc = (url: string, title: string) => {
    setDocViewConfig({ url, title });
    setIsDocViewerOpen(true);
  };

  const filteredDrivers = drivers.filter(d => 
    d.operations.some(op => {
      if (type === 'category') return op.category.toUpperCase() === categoryName.toUpperCase();
      return op.category.toUpperCase() === categoryName.toUpperCase() && op.client.toUpperCase() === clientName?.toUpperCase();
    })
  );

  const filteredTrips = useMemo(() => {
    return allTrips.filter(t => {
      const matchCategory = t.category.toUpperCase() === categoryName.toUpperCase();
      if (type === 'category') return matchCategory;
      const matchClient = (t.customer.name.toUpperCase() === clientName?.toUpperCase()) || 
                          (t.subCategory?.toUpperCase() === clientName?.toUpperCase());
      return matchCategory && matchClient;
    });
  }, [allTrips, categoryName, clientName, type]);

  const linkedCustomers = useMemo(() => {
    return customers.filter(c => 
      c.operations?.some(op => op.toUpperCase() === categoryName.toUpperCase())
    );
  }, [customers, categoryName]);

  const driverColumns = [
    { key: 'name', label: 'Motorista', render: (d: any) => (
      <div><p className="font-bold text-slate-800 uppercase text-[11px]">{d.name}</p><p className="text-[8px] text-slate-400 font-bold mt-0.5">{d.driverType}</p></div>
    )},
    { key: 'plateHorse', label: 'Placa Cavalo', render: (d: any) => <span className="font-mono font-black text-blue-600 text-xs">{d.plateHorse}</span> },
    { key: 'status', label: 'Status', render: (d: any) => (
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>{d.status}</span>
    )}
  ];

  const tripColumns = getOperationTableColumns(
    openStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); },
    handleEditOC, handleEditMinuta, handleViewDoc,
    async (id) => { if(confirm('Excluir viagem?')) { await db.deleteTrip(id, user); loadLocalData(); } },
    loadLocalData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 ${type === 'category' ? 'bg-slate-900' : 'bg-blue-600'} rounded-[2rem] flex items-center justify-center text-white font-black italic shadow-2xl`}>{type === 'category' ? categoryName.substring(0, 2).toUpperCase() : clientName?.substring(0, 2).toUpperCase()}</div>
          <div><h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">{type === 'category' ? categoryName : clientName}</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">{type === 'category' ? 'Monitoramento de Categoria Master' : `Página Dedicada • ${categoryName}`}</p></div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleOpenNewTrip} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3 active:scale-95"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>Nova Programação</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 space-y-8">
          <SmartOperationTable userId={user.id} componentId={`op-drivers-${type}-${categoryName}`} title="Motoristas" columns={driverColumns} data={filteredDrivers} defaultVisibleKeys={['name', 'plateHorse', 'status']} />
          <SmartOperationTable userId={user.id} componentId={`op-trips-${type}-${categoryName}`} title="Histórico e Programação" columns={tripColumns} data={filteredTrips} defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'destination_ship_booking', 'scheduling_info', 'actions']} />
        </div>
      </div>
      <TripModal isOpen={isTripModalOpen} onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} onSuccess={loadLocalData} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
    </div>
  );
};

export default GenericOperationView;
