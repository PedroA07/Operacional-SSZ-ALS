
import React, { useState } from 'react';
import { OperationDefinition, Driver, VWSchedule, VWStatus, Customer } from '../../types';
import GenericOperationView from './operations/GenericOperationView';
import VWTab from './VWTab';

interface OperationsTabProps {
  availableOps: OperationDefinition[];
  setAvailableOps: React.Dispatch<React.SetStateAction<OperationDefinition[]>>;
  drivers: Driver[];
  customers: Customer[];
  activeView: { type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string };
  setActiveView: (view: any) => void;
  vwSchedules: VWSchedule[];
  onSaveVWSchedule: (schedule: Partial<VWSchedule>, id?: string) => void;
  onUpdateVWStatus: (id: string, status: VWStatus, time: string) => void;
}

const OperationsTab: React.FC<OperationsTabProps> = ({ 
  availableOps, 
  setAvailableOps, 
  drivers,
  customers,
  activeView,
  setActiveView,
  vwSchedules,
  onSaveVWSchedule,
  onUpdateVWStatus
}) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingClient, setIsAddingClient] = useState<{ open: boolean, categoryId?: string }>({ open: false });
  const [newClientName, setNewClientName] = useState('');
  const [createDedicatedPage, setCreateDedicatedPage] = useState(false);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newOp: OperationDefinition = {
      id: `op-${Math.random().toString(36).substr(2, 9)}`,
      category: newCatName.toUpperCase(),
      clients: []
    };
    setAvailableOps([...availableOps, newOp]);
    setNewCatName('');
    setIsAddingCategory(false);
  };

  const handleAddClient = () => {
    const targetCatId = isAddingClient.categoryId || (activeView.type !== 'list' ? activeView.id : '');
    if (!newClientName.trim() || !targetCatId) return;
    
    setAvailableOps(prev => prev.map(op => {
      if (op.id === targetCatId) {
        return {
          ...op,
          clients: [...op.clients, { name: newClientName.toUpperCase(), hasDedicatedPage: createDedicatedPage }]
        };
      }
      return op;
    }));
    setNewClientName('');
    setCreateDedicatedPage(false);
    setIsAddingClient({ open: false });
  };

  const renderBreadcrumbs = () => (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
        <button 
          onClick={() => setActiveView({ type: 'list' })}
          className={`transition-colors ${activeView.type === 'list' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          GERENCIAMENTO CENTRAL
        </button>
        {activeView.type === 'category' && (
          <>
            <span className="text-slate-300">/</span>
            <button 
              onClick={() => setActiveView({ type: 'category', id: activeView.id, categoryName: activeView.categoryName })}
              className={`transition-colors ${activeView.type === 'category' ? 'text-blue-600' : 'text-slate-400'}`}
            >
              {activeView.categoryName}
            </button>
          </>
        )}
        {activeView.type === 'client' && (
          <>
            <span className="text-slate-300">/</span>
            <button 
               onClick={() => setActiveView({ type: 'category', id: activeView.id, categoryName: activeView.categoryName })}
               className="text-slate-400 hover:text-blue-600"
            >
              {activeView.categoryName}
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-blue-600">{activeView.clientName}</span>
          </>
        )}
      </div>
    </div>
  );

  if (activeView.type === 'client' && (activeView.clientName?.toUpperCase() === 'VOLKSWAGEN')) {
    return (
      <div className="space-y-6">
        {renderBreadcrumbs()}
        <VWTab 
          schedules={vwSchedules} 
          drivers={drivers} 
          onSaveSchedule={onSaveVWSchedule} 
          onUpdateStatus={onUpdateVWStatus} 
        />
      </div>
    );
  }

  if (activeView.type === 'category' || activeView.type === 'client') {
    return (
      <div className="space-y-6">
        {renderBreadcrumbs()}
        <GenericOperationView 
          type={activeView.type}
          categoryName={activeView.categoryName!}
          clientName={activeView.clientName}
          drivers={drivers}
          availableOps={availableOps}
          onNavigate={(view) => setActiveView(view)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Painel Operacional</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Gestão de Categorias e Monitoramento Dedicado</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            Nova Categoria
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {availableOps.map(op => (
          <div key={op.id} className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-400 transition-all group">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg text-lg">
                  {op.category.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase text-base">{op.category}</h3>
                  <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{op.clients.length} SUB-ITENS OPERACIONAIS</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveView({ type: 'category', id: op.id, categoryName: op.category })}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
              >
                Gerenciar
              </button>
            </div>
            <div className="flex-1 p-8 space-y-6">
              <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-blue-500 pl-3">Clientes Vinculados</p>
                <div className="flex flex-wrap gap-3">
                  {op.clients.map((client, i) => (
                    <button
                      key={i}
                      onClick={() => client.hasDedicatedPage && setActiveView({ type: 'client', id: op.id, categoryName: op.category, clientName: client.name })}
                      className={`px-4 py-3 rounded-2xl text-[9px] font-bold uppercase border transition-all flex items-center gap-2 ${client.hasDedicatedPage ? 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                    >
                      {client.name}
                      {client.hasDedicatedPage && <div className="w-1.5 h-1.5 bg-current rounded-full shadow-sm"></div>}
                    </button>
                  ))}
                  <button 
                    onClick={() => setIsAddingClient({ open: true, categoryId: op.id })}
                    className="px-4 py-3 rounded-2xl text-[9px] font-black uppercase border border-dashed border-slate-300 text-slate-300 hover:border-blue-500 hover:text-blue-500 transition-all"
                  >
                    + VINCULAR CLIENTE
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAddingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Nova Categoria</h3>
              <button onClick={() => setIsAddingCategory(false)} className="text-slate-300 hover:text-red-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome da Categoria</label>
                <input type="text" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all" placeholder="EX: CARGA FRACIONADA" value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
              </div>
              <button onClick={handleAddCategory} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">Criar Categoria</button>
            </div>
          </div>
        </div>
      )}

      {isAddingClient.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Novo Vínculo</h3>
              <button onClick={() => setIsAddingClient({ open: false })} className="text-slate-300 hover:text-red-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Cliente</label>
                <input type="text" className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all" placeholder="EX: SCANIA BRASIL" value={newClientName} onChange={e => setNewClientName(e.target.value)} autoFocus />
              </div>
              <div className="flex items-center gap-4 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                <div className="flex-1">
                  <p className="text-[11px] font-black text-blue-600 uppercase">Página Dedicada?</p>
                  <p className="text-[8px] text-blue-400 font-bold uppercase leading-tight mt-1">Habilita uma sub-aba com monitoramento específico para este cliente.</p>
                </div>
                <button onClick={() => setCreateDedicatedPage(!createDedicatedPage)} className={`w-14 h-8 rounded-full p-1 transition-all flex items-center shadow-inner ${createDedicatedPage ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'}`}><div className="w-6 h-6 bg-white rounded-full shadow-lg"></div></button>
              </div>
              <button onClick={handleAddClient} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">Vincular e Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTab;
