
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Driver, OperationDefinition, User, Customer, Trip, TripStatus, StatusHistoryEntry, PreStacking, Port, Category } from '../../../types';
import SmartOperationTable from './SmartOperationTable';
import { db } from '../../../utils/storage';
import { getOperationTableColumns } from './OperationTableColumns';
import OperationRegisterAction from './OperationRegisterAction';
import SchedulingEditModal from './SchedulingEditModal';
import DriverDocsViewerModal from './DriverDocsViewerModal';
import DriverLocationModal from './DriverLocationModal';
import DocumentViewerModal from './DocumentViewerModal';
import ClientVisualizationPanel from './ClientVisualizationPanel';
import ViewFilters from './ViewFilters';
import StatusHistoryManagerModal from './StatusHistoryManagerModal';
import TripModal from './TripModal';

interface GenericOperationViewProps {
  user: User;
  type: 'category' | 'client';
  categoryName: string;
  clientName?: string;
  drivers: Driver[];
  customers: Customer[];
  allTrips: Trip[];
  availableOps: OperationDefinition[];
  categories: Category[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
  onLocateDriver: (driverId: string) => void;
}

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  user, type, categoryName, clientName, drivers, customers, allTrips, availableOps, categories, onNavigate, onLocateDriver
}) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [preStackingUnits, setPreStackingUnits] = useState<(Port | PreStacking)[]>([]);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  // Opções de Visualização
  const [activeStatusTab, setActiveStatusTab] = useState<'geral' | 'ativas' | 'concluida' | 'cancelada'>('ativas');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFilterClient, setSelectedFilterClient] = useState<string>(clientName || 'TODOS');
  const [viewMode, setViewMode] = useState<'compact' | 'comfortable'>('compact');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);

  const loadAuxData = useCallback(async () => {
    try {
      const [p, ps] = await Promise.all([db.getPorts(), db.getPreStacking()]);
      setPreStackingUnits([...(p || []), ...(ps || [])]);
    } catch (e) {}
  }, []);

  useEffect(() => { loadAuxData(); }, [loadAuxData]);

  const onLocalRefresh = () => {
    window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
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
    if (!selectedTrip || isSavingStatus) return;
    setIsSavingStatus(true);
    const nowStr = new Date().toISOString();
    const updatedTrip = { 
      ...selectedTrip, 
      status: tempStatus, 
      statusTime: new Date(statusTime).toISOString(), 
      statusHistory: [{ status: tempStatus, dateTime: new Date(statusTime).toISOString(), createdAt: nowStr }, ...(selectedTrip.statusHistory || [])] 
    };
    try {
      if (await db.saveTrip(updatedTrip, user)) {
        setIsStatusModalOpen(false);
        onLocalRefresh();
      }
    } catch (e) { alert("Erro ao atualizar."); } finally { setIsSavingStatus(false); }
  };

  const filteredTrips = useMemo(() => {
    let result = allTrips.filter(t => {
      const matchCategory = t.category?.toUpperCase() === categoryName.toUpperCase();
      if (selectedFilterClient !== 'TODOS') {
         return matchCategory && (t.customer?.name === selectedFilterClient || t.subCategory === selectedFilterClient);
      }
      return matchCategory;
    });

    if (activeStatusTab === 'ativas') {
      const active = ['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Chegou no Cragea', 'Aguardando carregar', 'Saiu do Cragea', 'Chegou na Volkswagen', 'Saiu da Volkswagen', 'Container sobre rodas'];
      result = result.filter(t => active.includes(t.status));
    } else if (activeStatusTab === 'concluida') result = result.filter(t => t.status === 'Viagem concluída');
    else if (activeStatusTab === 'cancelada') result = result.filter(t => t.status === 'Viagem cancelada');
    else if (activeStatusTab === 'geral') result = result.filter(t => t.status !== 'Viagem cancelada');

    if (showOnlyAlerts) {
      result = result.filter(t => t.isLate);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.os.toLowerCase().includes(q) || t.container?.toLowerCase().includes(q) || t.driver.name.toLowerCase().includes(q) || t.customer.name.toLowerCase().includes(q));
    }

    if (startDate || endDate) {
      result = result.filter(t => {
        const tripDate = t.dateTime.split('T')[0];
        if (startDate && tripDate < startDate) return false;
        if (endDate && tripDate > endDate) return false;
        return true;
      });
    }

    return result.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [allTrips, categoryName, activeStatusTab, searchQuery, startDate, endDate, selectedFilterClient, showOnlyAlerts]);

  const categoryCustomers = useMemo(() => {
    const names = new Set(allTrips.filter(t => t.category === categoryName).map(t => t.customer.name));
    return customers.filter(c => names.has(c.name));
  }, [allTrips, categoryName, customers]);

  const tripColumns = getOperationTableColumns(
    openStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); }, 
    (t) => { setSelectedTrip(t); },
    (t) => {},
    (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
    async (id) => { if(confirm('Excluir viagem?')) { await db.deleteTrip(id, user); onLocalRefresh(); } },
    onLocalRefresh,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    onLocateDriver,
    (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsHistoryModalOpen(true); }
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 ${type === 'category' ? 'bg-slate-900' : 'bg-blue-600'} rounded-[2rem] flex items-center justify-center text-white font-black shadow-2xl shrink-0`}>{categoryName.substring(0, 2).toUpperCase()}</div>
          <div><div className="flex items-center gap-3">{type === 'client' && (<button onClick={() => onNavigate({ type: 'category', categoryName })} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>)}<h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{categoryName}</h1></div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">{selectedFilterClient !== 'TODOS' ? `Filtro Ativo: ${selectedFilterClient}` : 'Monitoramento Geral de Categoria'}</p></div>
        </div>
        <OperationRegisterAction user={user} drivers={drivers} customers={customers} categories={categories} initialCategory={categoryName} onSuccess={onLocalRefresh} variant="primary" />
      </header>

      <ClientVisualizationPanel 
        customers={categoryCustomers}
        selectedClient={selectedFilterClient}
        onClientChange={setSelectedFilterClient}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showOnlyAlerts={showOnlyAlerts}
        onToggleAlerts={() => setShowOnlyAlerts(!showOnlyAlerts)}
      />

      <ViewFilters searchQuery={searchQuery} onSearchChange={setSearchQuery} startDate={startDate} onStartDateChange={setStartDate} endDate={endDate} onEndDateChange={setEndDate} onClear={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setSelectedFilterClient('TODOS'); }} />
      
      <div className={viewMode === 'compact' ? 'table-compact' : ''}>
        <SmartOperationTable userId={user.id} componentId={`op-trips-${categoryName}`} title={`Painel Operacional › ${categoryName}`} columns={tripColumns} data={filteredTrips} defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'actions']} />
      </div>

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6">
             <div className="text-center shrink-0"><p className="text-lg font-black text-blue-600 uppercase">OS: {selectedTrip?.os}</p></div>
             <div className="space-y-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Novo Status</label><select className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase" value={tempStatus} onChange={e => setTempStatus(e.target.value as TripStatus)}>{['Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 'Devolução do cheio', 'Viagem concluída', 'Viagem cancelada'].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Data/Hora Evento</label><input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} /></div>
             </div>
             <div className="grid gap-3 pt-4"><button disabled={isSavingStatus} onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 active:scale-95">{isSavingStatus ? 'Processando...' : 'Confirmar Atualização'}</button><button onClick={() => setIsStatusModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase py-3">Cancelar</button></div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && selectedTrip && <StatusHistoryManagerModal isOpen={isHistoryModalOpen} onClose={() => { setIsHistoryModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} user={user} onSuccess={onLocalRefresh} />}
      {isTripModalOpen && selectedTrip && <TripModal isOpen={isTripModalOpen} onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} onSuccess={onLocalRefresh} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />}
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={onLocalRefresh} preStackingUnits={preStackingUnits} />
      {isDriverDocsModalOpen && selectedTrip && (<DriverDocsViewerModal isOpen={isDriverDocsModalOpen} onClose={() => { setIsDriverDocsModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} user={user} onSuccess={onLocalRefresh} />)}
      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />

      <style>{`
        .table-compact table td { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; font-size: 9px !important; }
        .table-compact table th { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
      `}</style>
    </div>
  );
};

export default GenericOperationView;
