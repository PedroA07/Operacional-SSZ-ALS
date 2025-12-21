
import React, { useState, useEffect, useRef } from 'react';
import { User, Driver, DashboardTab, Trip, OperationDefinition, Customer, Port, PreStacking, VWSchedule, VWStatus } from '../types';
import OverviewTab from './dashboard/OverviewTab';
import DriversTab from './dashboard/DriversTab';
import FormsTab from './dashboard/FormsTab';
import CustomersTab from './dashboard/CustomersTab';
import PortsTab from './dashboard/PortsTab';
import PreStackingTab from './dashboard/PreStackingTab';
import OperationsTab from './dashboard/OperationsTab';
import { DEFAULT_OPERATIONS } from '../constants/operations';
import { db } from '../utils/storage';

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.INICIO);
  const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
  const [isFormsMenuOpen, setIsFormsMenuOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeOpView, setActiveOpView] = useState<{ type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string }>({ type: 'list' });
  const [selectedFormToOpen, setSelectedFormToOpen] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  
  // ESTADOS SINCRONIZADOS
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [availableOps, setAvailableOps] = useState<OperationDefinition[]>(DEFAULT_OPERATIONS);

  const loadAllData = async () => {
    setIsSyncing(true);
    try {
      const [d, c, p, ps] = await Promise.all([
        db.getDrivers(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking()
      ]);
      setDrivers(d);
      setCustomers(c);
      setPorts(p);
      setPreStacking(ps);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveDriver = async (data: Partial<Driver>, id?: string) => {
    const now = new Date().toLocaleDateString('pt-BR');
    let driverToSave: Driver;
    
    if (id) {
      const existing = drivers.find(d => d.id === id);
      const statusChanged = existing?.status !== data.status;
      driverToSave = { 
        ...existing, 
        ...data, 
        statusLastChangeDate: statusChanged ? now : existing?.statusLastChangeDate 
      } as Driver;
    } else {
      driverToSave = { 
        ...data, 
        id: `drv-${Date.now()}`, 
        registrationDate: now, 
        statusLastChangeDate: now, 
        tripsCount: 0 
      } as Driver;
    }

    await db.saveDriver(driverToSave);
    loadAllData(); // Recarrega para garantir sincronia com outros usuários
  };

  const handleDeleteDriver = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este motorista do banco compartilhado?')) {
      await db.deleteDriver(id);
      loadAllData();
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSyncing(true);
      const success = await db.importBackup(file);
      if (success) {
        alert('Dados restaurados com sucesso na nuvem!');
        loadAllData();
      } else {
        alert('Erro ao importar arquivo.');
      }
      setIsSyncing(false);
    }
  };

  const handleSaveCustomer = async (data: Partial<Customer>, id?: string) => {
    const customer = { ...data, id: id || `cust-${Date.now()}`, registrationDate: new Date().toLocaleDateString('pt-BR') } as Customer;
    await db.saveCustomer(customer);
    loadAllData();
  };

  const handleSavePort = async (data: Partial<Port>, id?: string) => {
    const port = { ...data, id: id || `port-${Date.now()}`, registrationDate: new Date().toLocaleDateString('pt-BR') } as Port;
    await db.savePort(port);
    loadAllData();
  };

  const handleSavePreStacking = async (data: Partial<PreStacking>, id?: string) => {
    const item = { ...data, id: id || `pre-${Date.now()}`, registrationDate: new Date().toLocaleDateString('pt-BR') } as PreStacking;
    await db.savePreStacking(item);
    loadAllData();
  };

  const navigateToClient = (catName: string, catId: string, clientName: string) => {
    setActiveTab(DashboardTab.OPERACOES);
    setActiveOpView({ type: 'client', id: catId, categoryName: catName, clientName: clientName });
  };

  const navigateToCategory = (catId: string, catName: string) => {
    setActiveTab(DashboardTab.OPERACOES);
    setActiveOpView({ type: 'category', id: catId, categoryName: catName });
  };

  const openSpecificForm = (formType: string) => {
    setSelectedFormToOpen(formType);
    setActiveTab(DashboardTab.FORMULARIOS);
  };

  const toggleCat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-600">
      <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={handleImportBackup} />
      
      <aside className="w-64 bg-[#0f172a] text-slate-400 flex flex-col shadow-2xl z-50">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-inner font-black italic">ALS</div>
            <span className="font-bold text-slate-100 tracking-wider text-xs uppercase">ALS Transportes</span>
          </div>
          
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-blue-400">
              <span>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(currentTime).toUpperCase()}</span>
              <span className="text-slate-500">{currentTime.toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="text-xl font-black text-white font-mono">{currentTime.toLocaleTimeString('pt-BR')}</div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <button onClick={() => setActiveTab(DashboardTab.INICIO)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${activeTab === DashboardTab.INICIO ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>Início</button>

          <div className="space-y-1">
            <div className={`flex items-center rounded-xl overflow-hidden ${activeTab === DashboardTab.OPERACOES ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
              <button onClick={() => { setActiveTab(DashboardTab.OPERACOES); setActiveOpView({ type: 'list' }); setIsOpsMenuOpen(true); }} className="flex-1 text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Operações</button>
              <button onClick={() => setIsOpsMenuOpen(!isOpsMenuOpen)} className="p-3 border-l border-white/5 hover:bg-white/5"><svg className={`w-3 h-3 transition-transform ${isOpsMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg></button>
            </div>
            {isOpsMenuOpen && (
              <div className="pl-4 space-y-1 mt-1">
                {availableOps.map(op => (
                  <div key={op.id}>
                    <div className="flex items-center hover:bg-slate-800/50 rounded-lg group">
                      <button onClick={() => navigateToCategory(op.id, op.category)} className="flex-1 text-left px-4 py-2 text-[9px] font-bold uppercase text-slate-500 group-hover:text-blue-400">{op.category}</button>
                      <button onClick={(e) => toggleCat(e, op.id)} className="p-2 text-slate-600 hover:text-white"><svg className={`w-2.5 h-2.5 transition-transform ${expandedCats.includes(op.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg></button>
                    </div>
                    {expandedCats.includes(op.id) && (
                      <div className="pl-6 border-l border-slate-800 ml-4 space-y-1">
                        {op.clients.map((c, i) => (
                          <button key={i} onClick={() => navigateToClient(op.category, op.id, c.name)} className="w-full text-left py-1.5 text-[8px] font-bold uppercase text-slate-600 hover:text-blue-300">• {c.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setActiveTab(DashboardTab.MOTORISTAS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest ${activeTab === DashboardTab.MOTORISTAS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>Motoristas</button>
          
          <div className="space-y-1">
             <div className={`flex items-center rounded-xl overflow-hidden ${activeTab === DashboardTab.FORMULARIOS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>
                <button onClick={() => { setActiveTab(DashboardTab.FORMULARIOS); setSelectedFormToOpen(null); }} className="flex-1 text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Formulários</button>
                <button onClick={() => setIsFormsMenuOpen(!isFormsMenuOpen)} className="p-3 border-l border-white/5 hover:bg-white/5"><svg className={`w-3 h-3 transition-transform ${isFormsMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg></button>
             </div>
             {isFormsMenuOpen && (
               <div className="pl-8 py-2 space-y-2">
                 <button onClick={() => openSpecificForm('ORDEM_COLETA')} className="w-full text-left text-[8px] font-bold uppercase text-slate-500 hover:text-blue-400 tracking-tighter">ORDEM DE COLETA</button>
                 <button onClick={() => openSpecificForm('PRE_STACKING')} className="w-full text-left text-[8px] font-bold uppercase text-slate-500 hover:text-blue-400 tracking-tighter">PRÉ-STACKING</button>
               </div>
             )}
          </div>

          <button onClick={() => setActiveTab(DashboardTab.CLIENTES)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest ${activeTab === DashboardTab.CLIENTES ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>Clientes</button>
          <button onClick={() => setActiveTab(DashboardTab.PORTOS)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest ${activeTab === DashboardTab.PORTOS ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>Portos</button>
          <button onClick={() => setActiveTab(DashboardTab.PRE_STACKING)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest ${activeTab === DashboardTab.PRE_STACKING ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}>Pré-Stacking</button>
        </nav>
        
        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full text-[9px] text-red-400 font-bold uppercase hover:text-red-300">Sair do Portal</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{activeTab}</h2>
             {isSyncing && (
               <div className="flex items-center gap-2 animate-pulse">
                 <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                 <span className="text-[8px] font-black text-blue-500 uppercase">Sincronizando Nuvem...</span>
               </div>
             )}
          </div>
          <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${db.isCloudActive() ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                <div className={`w-2 h-2 rounded-full ${db.isCloudActive() ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <span className="text-[8px] font-black uppercase tracking-tighter">{db.isCloudActive() ? 'Nuvem Compartilhada Ativa' : 'Apenas Local'}</span>
             </div>
             <button onClick={() => importFileRef.current?.click()} className="text-[8px] font-black text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">IMPORTAR DB</button>
             <button onClick={() => db.exportBackup()} className="text-[8px] font-black text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50">BACKUP DB</button>
             <span className="text-[10px] font-bold text-slate-400 uppercase">{user?.username}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === DashboardTab.INICIO && <OverviewTab trips={[]} />}
          {activeTab === DashboardTab.OPERACOES && <OperationsTab availableOps={availableOps} setAvailableOps={setAvailableOps} drivers={drivers} activeView={activeOpView} setActiveView={setActiveOpView} vwSchedules={[]} onSaveVWSchedule={()=>{}} onUpdateVWStatus={()=>{}} />}
          {activeTab === DashboardTab.MOTORISTAS && <DriversTab drivers={drivers} onSaveDriver={handleSaveDriver} onDeleteDriver={handleDeleteDriver} availableOps={availableOps} />}
          {activeTab === DashboardTab.CLIENTES && <CustomersTab customers={customers} onSaveCustomer={handleSaveCustomer} />}
          {activeTab === DashboardTab.PORTOS && <PortsTab ports={ports} onSavePort={handleSavePort} />}
          {activeTab === DashboardTab.PRE_STACKING && <PreStackingTab preStacking={preStacking} onSavePreStacking={handleSavePreStacking} />}
          {activeTab === DashboardTab.FORMULARIOS && <FormsTab drivers={drivers} customers={customers} ports={ports} initialFormId={selectedFormToOpen} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
