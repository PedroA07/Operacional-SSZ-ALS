
import React, { useState, useEffect, useMemo } from 'react';
import { User, Driver, Customer, Trip, TripStatus, Category, OperationDefinition } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
import NewTripModal from './operations/NewTripModal';
import CategoryManagerModal from './operations/CategoryManagerModal';
import GenericOperationView from './operations/GenericOperationView';
import OrdemColetaForm from './forms/OrdemColetaForm';

interface OperationsTabProps {
  user: User;
  drivers: Driver[];
  customers: Customer[];
  availableOps: OperationDefinition[];
  activeView: { type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string };
  setActiveView: (view: any) => void;
}

const OperationsTab: React.FC<OperationsTabProps> = ({ user, drivers, customers, availableOps, activeView, setActiveView }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isOCEditModalOpen, setIsOCEditModalOpen] = useState(false);
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

  const openOCEditor = (trip: Trip) => {
    setSelectedTrip(trip);
    setIsOCEditModalOpen(true);
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
      key: 'oc_gestao',
      label: '3. Gestão OC',
      render: (t: Trip) => (
        <div className="flex items-center gap-2">
          {t.ocFormData ? (
            <button 
              onClick={() => openOCEditor(t)}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="3"/></svg>
              PDF / Editar
            </button>
          ) : (
            <span className="text-[8px] text-slate-300 font-bold uppercase italic tracking-widest">Manual</span>
          )}
        </div>
      )
    },
    {
      key: 'location',
      label: '4. Local Atendimento',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-700 uppercase leading-none">{t.customer?.name}</span>
          <span className="text-[9px] text-slate-400 mt-1">{t.customer?.city} - {t.customer?.state}</span>
        </div>
      )
    },
    {
      key: 'container_data',
      label: '5. Dados Container',
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
    { key: 'cva', label: '6. CVA', render: (t: Trip) => <span className="font-black text-emerald-600">{t.cva || '---'}</span> },
    { 
      key: 'driver', 
      label: '7. Motorista', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase leading-none">{t.driver?.name}</span>
          <span className="text-[8px] font-mono text-slate-400 mt-1">{t.driver?.plateHorse} / {t.driver?.plateTrailer}</span>
        </div>
      )
    }
  ];

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
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-8">
        <div className="flex items-center justify-between">
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel Operacional</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Navegação por Segmentos e Categorias</p>
           </div>
           <div className="flex gap-3">
              <button onClick={() => setIsCatModalOpen(true)} className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-black uppercase hover:bg-slate-50 transition-all">Config. Categorias</button>
              <button onClick={() => setIsTripModalOpen(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">Nova Programação</button>
           </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
           <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Acesso Rápido por Categoria</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <button onClick={() => { setFilterCategory('TODAS'); setFilterSub('TODAS'); }} className={`p-4 rounded-2xl border transition-all text-center group ${filterCategory === 'TODAS' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-blue-500'}`}>
                 <p className={`text-[10px] font-black uppercase ${filterCategory === 'TODAS' ? 'text-white' : 'text-slate-700'}`}>Geral</p>
                 <p className={`text-[8px] font-bold mt-1 uppercase ${filterCategory === 'TODAS' ? 'text-blue-200' : 'text-slate-400'}`}>Todas Viagens</p>
              </button>
              {categories.filter(c => !c.parentId).map(cat => (
                <button key={cat.id} onClick={() => { setFilterCategory(cat.name); setFilterSub('TODAS'); }} className={`p-4 rounded-2xl border transition-all text-center group ${filterCategory === cat.name ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-blue-500'}`}>
                   <p className={`text-[10px] font-black uppercase ${filterCategory === cat.name ? 'text-white' : 'text-slate-700'}`}>{cat.name}</p>
                   <p className={`text-[8px] font-bold mt-1 uppercase ${filterCategory === cat.name ? 'text-slate-400' : 'text-slate-400'}`}>Acessar Área</p>
                </button>
              ))}
           </div>

           {filterCategory !== 'TODAS' && (
              <div className="mt-6 pt-6 border-t border-slate-200 animate-in slide-in-from-top-4">
                 <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Subcategorias em {filterCategory}</h3>
                 <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFilterSub('TODAS')} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${filterSub === 'TODAS' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>Exibir Tudo</button>
                    {categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === filterCategory).map(sub => (
                      <button key={sub.id} onClick={() => setFilterSub(sub.name)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${filterSub === sub.name ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>{sub.name}</button>
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
        title={filterCategory === 'TODAS' ? "Fila OperacionalALS" : `${filterCategory}${filterSub !== 'TODAS' ? ' › ' + filterSub : ''}`} 
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

      {/* MODAL PARA REEDIÇÃO DE OC */}
      {isOCEditModalOpen && selectedTrip && selectedTrip.ocFormData && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
           <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h3 className="font-black text-sm uppercase tracking-widest">Reemissão / Edição de Ordem de Coleta (Sincronizada)</h3>
                <button onClick={() => setIsOCEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              </div>
              <OrdemColetaForm 
                drivers={drivers} 
                customers={customers} 
                ports={[]} 
                onClose={() => { setIsOCEditModalOpen(false); loadData(); }} 
                initialData={selectedTrip.ocFormData} 
              />
           </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;
