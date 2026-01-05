import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, StatusHistoryEntry } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import TripModal from './operations/TripModal';
import SchedulingEditModal from './operations/SchedulingEditModal';
import CategoryManagerModal from './operations/CategoryManagerModal';
import GenericOperationView from './operations/GenericOperationView';
import OperationFilters from './operations/OperationFilters';
import OrdemColetaForm from '../forms/OrdemColetaForm';
import PreStackingForm from '../forms/PreStackingForm';
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
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [docViewConfig, setDocViewConfig] = useState({ url: '', title: '' });

  // Estados de Filtro com Inicialização via LocalStorage
  const [filterTypes, setFilterTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('als_filter_types');
    return saved ? JSON.parse(saved) : ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];
  });
  
  const [filterClientNames, setFilterClientNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('als_filter_clients');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [filterDriverNames, setFilterDriverNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('als_filter_drivers');
    return saved ? JSON.parse(saved) : [];
  });

  const [filterCategory, setFilterCategory] = useState<string>('TODAS');
  const [filterSub, setFilterSub] = useState<string>('TODAS');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const loadData = async () => {
    const [t, c] = await Promise.all([db.getTrips(), db.getCategories()]);
    setTrips(t);
    setCategories(c);
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  // Inicialização padrão caso não haja filtros salvos (Apenas na primeira carga dos dados)
  useEffect(() => {
    if (customers.length > 0 && filterClientNames.length === 0 && !localStorage.getItem('als_filter_clients')) {
      setFilterClientNames(customers.map(c => c.name));
    }
    if (drivers.length > 0 && filterDriverNames.length === 0 && !localStorage.getItem('als_filter_drivers')) {
      setFilterDriverNames(drivers.map(d => d.name));
    }
  }, [customers, drivers]);

  // Salvar filtros no LocalStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('als_filter_types', JSON.stringify(filterTypes));
  }, [filterTypes]);

  useEffect(() => {
    if (filterClientNames.length > 0) {
      localStorage.setItem('als_filter_clients', JSON.stringify(filterClientNames));
    }
  }, [filterClientNames]);

  useEffect(() => {
    if (filterDriverNames.length > 0) {
      localStorage.setItem('als_filter_drivers', JSON.stringify(filterDriverNames));
    }
  }, [filterDriverNames]);

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

  const handleEditScheduling = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsSchedulingModalOpen(true);
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

  const handlePrintDocInViewer = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${docViewConfig.title}</title></head>
          <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;">
            ${docViewConfig.url.startsWith('data:image') 
              ? `<img src="${docViewConfig.url}" style="max-width:100%; height:auto;">`
              : `<embed width="100%" height="100%" src="${docViewConfig.url}" type="application/pdf">`
            }
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  const filteredTrips = useMemo(() => {
    let result = trips;
    if (filterCategory !== 'TODAS') result = result.filter(t => t.category === filterCategory);
    if (filterSub !== 'TODAS') result = result.filter(t => t.customer.name === filterSub || t.subCategory === filterSub);
    
    if (filterTypes.length > 0) result = result.filter(t => filterTypes.includes(t.type));
    if (filterClientNames.length > 0) result = result.filter(t => filterClientNames.includes(t.customer.name));
    if (filterDriverNames.length > 0) result = result.filter(t => filterDriverNames.includes(t.driver.name));
    
    if (filterStartDate) {
      result = result.filter(t => t.dateTime >= filterStartDate);
    }
    if (filterEndDate) {
      result = result.filter(t => t.dateTime <= filterEndDate + 'T23:59:59');
    }
    
    return result;
  }, [trips, filterCategory, filterSub, filterTypes, filterClientNames, filterDriverNames, filterStartDate, filterEndDate]);

  const columns = getOperationTableColumns(
    openStatusEditor,
    handleEditTrip,
    handleEditOC,
    handleEditMinuta,
    handleViewDoc,
    (id) => onDeleteTrip?.(id),
    loadData,
    handleEditScheduling
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

  const handleClearAllFilters = () => {
    const allTypes = ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];
    const allClients = customers.map(c => c.name);
    const allDrivers = drivers.map(d => d.name);
    
    setFilterTypes(allTypes);
    setFilterClientNames(allClients);
    setFilterDriverNames(allDrivers);
    
    localStorage.setItem('als_filter_types', JSON.stringify(allTypes));
    localStorage.setItem('als_filter_clients', JSON.stringify(allClients));
    localStorage.setItem('als_filter_drivers', JSON.stringify(allDrivers));
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
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
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
        
        <div className="flex justify-between items-center mb-6">
          <button onClick={handleClearAllFilters} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Limpar todos os filtros</button>
        </div>

        <SmartOperationTable 
          userId={user.id}
          componentId="ops-main-table"
          title="Painel Geral de Operações"
          columns={columns}
          data={filteredTrips}
          defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'customer', 'destination_ship_booking', 'scheduling_info', 'actions']}
        />
      </div>

      <TripModal 
        isOpen={isTripModalOpen} 
        onClose={() => { setIsTripModalOpen(false); setSelectedTrip(null); }} 
        onSuccess={loadData} 
        drivers={drivers} 
        customers={customers} 
        categories={categories} 
        editTrip={selectedTrip} 
      />

      <SchedulingEditModal 
        isOpen={isSchedulingModalOpen}
        onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }}
        trip={selectedTrip}
        onSuccess={loadData}
        preStackingUnits={ports}
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
                <button onClick={() => setIsMinutaModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
              <PreStackingForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsMinutaModalOpen(false); loadData(); }} initialOS={selectedTrip.os} />
           </div>
        </div>
      )}

      {isDocViewerOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-6xl h-full rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Visualizador de Documentos ALS</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Dossiê: {docViewConfig.title}</p>
                 </div>
                 <div className="flex gap-4">
                    <button 
                      onClick={handlePrintDocInViewer}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all"
                    >
                       Imprimir
                    </button>
                    <button onClick={() => setIsDocViewerOpen(false)} className="w-12 h-12 flex items-center justify-center bg-slate-200 text-slate-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                 </div>
              </div>
              <div className="flex-1 bg-slate-100 relative overflow-auto flex justify-center items-center p-8">
                 {docViewConfig.url.startsWith('data:image') ? (
                    <img src={docViewConfig.url} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Documento" />
                 ) : (
                    <iframe 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        src={docViewConfig.url}
                        title="Document Viewer"
                    ></iframe>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Fix: Added missing default export to fix module resolution error in Dashboard files
export default OperationsTab;