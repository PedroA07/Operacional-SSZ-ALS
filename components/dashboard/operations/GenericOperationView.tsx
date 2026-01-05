
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
  
  // Estados do Visualizador de Documentos
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
    await db.saveTrip(updatedTrip);
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

  const tripColumns = getOperationTableColumns(
    openStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); },
    handleEditOC,
    handleEditMinuta,
    handleViewDoc,
    async (id) => { if(confirm('Excluir viagem?')) { await db.deleteTrip(id); loadLocalData(); } },
    loadLocalData,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); }
  );

  const STATUS_OPTIONS: TripStatus[] = [
    'Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 
    'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 
    'Devolução do cheio', 'Viagem concluída', 'Viagem cancelada'
  ];

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

        <div className="flex items-center gap-4">
           <button 
             onClick={handleOpenNewTrip}
             className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-3"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
             Nova Programação
           </button>
           <div className="h-12 w-[1px] bg-slate-200 mx-2"></div>
           <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm text-center">
             <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Motoristas</p>
             <p className="text-2xl font-black text-slate-800">{filteredDrivers.length}</p>
           </div>
           <div className="bg-blue-600 px-6 py-4 rounded-2xl shadow-lg shadow-blue-600/20 text-center">
             <p className="text-[8px] font-black text-blue-100 uppercase mb-1">Viagens</p>
             <p className="text-2xl font-black text-white">{filteredTrips.length}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 space-y-8">
          <SmartOperationTable 
            userId={user.id}
            componentId={`op-drivers-${type}-${categoryName}-${clientName || 'all'}`}
            title="Motoristas Autorizados na Operação"
            columns={driverColumns}
            data={filteredDrivers}
            defaultVisibleKeys={['name', 'plateHorse', 'status']}
          />

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
              <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsOCEditModalOpen(false); loadLocalData(); }} initialData={selectedTrip.ocFormData} />
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
              <PreStackingForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsMinutaModalOpen(false); loadLocalData(); }} initialOS={selectedTrip.os} />
           </div>
        </div>
      )}
    </div>
  );
};

export default GenericOperationView;
