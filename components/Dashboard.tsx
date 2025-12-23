
import React, { useState, useEffect, useRef } from 'react';
import { User, Driver, DashboardTab, Port, PreStacking, Customer, OperationDefinition, Staff, VWSchedule, VWStatus } from '../types';
import OverviewTab from './dashboard/OverviewTab';
import DriversTab from './dashboard/DriversTab';
import FormsTab from './dashboard/FormsTab';
import CustomersTab from './dashboard/CustomersTab';
import PortsTab from './dashboard/PortsTab';
import PreStackingTab from './dashboard/PreStackingTab';
import OperationsTab from './dashboard/OperationsTab';
import StaffTab from './dashboard/StaffTab';
import SystemTab from './dashboard/SystemTab';
import WeatherWidget from './dashboard/WeatherWidget';
import OnlineStatus from './dashboard/OnlineStatus';
import DatabaseStatus from './dashboard/DatabaseStatus';
import { DEFAULT_OPERATIONS } from '../constants/operations';
import { db } from '../utils/storage';
import { sessionManager } from '../utils/session';
import { Icons } from '../constants/icons';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.INICIO);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Operações': false,
    'Formulários': false
  });
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState<'open' | 'collapsed' | 'hidden'>('open');
  const [forceProfileModal, setForceProfileModal] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [availableOps, setAvailableOps] = useState<OperationDefinition[]>(DEFAULT_OPERATIONS);
  const [vwSchedules, setVwSchedules] = useState<VWSchedule[]>([]);

  const [opsView, setOpsView] = useState<{ type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string }>({ 
    type: 'list'
  });

  const loadAllData = async () => {
    try {
      const [d, c, p, ps, s] = await Promise.all([
        db.getDrivers(), 
        db.getCustomers(), 
        db.getPorts(), 
        db.getPreStacking(), 
        db.getStaff()
      ]);
      setDrivers(d || []); 
      setCustomers(c || []); 
      setPorts(p || []); 
      setPreStacking(ps || []); 
      setStaffList(s || []);
    } catch (e) { 
      console.error("Erro ao carregar dados:", e); 
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user]);

  const handleFormClick = (formId: string) => {
    setSelectedFormId(null);
    setTimeout(() => {
      setActiveTab(DashboardTab.FORMULARIOS);
      setSelectedFormId(formId);
    }, 10);
  };

  const MenuItem = ({ 
    tab, 
    label, 
    icon, 
    adminOnly, 
    children,
    forceActive = false
  }: { 
    tab?: DashboardTab, 
    label: string, 
    icon?: React.ReactNode, 
    adminOnly?: boolean,
    children?: React.ReactNode,
    forceActive?: boolean
  }) => {
    if (adminOnly && user.role !== 'admin') return null;
    const isActive = forceActive || (tab ? activeTab === tab : false);
    const isExpanded = expandedMenus[label];

    return (
      <div className="w-full">
        <div className="flex items-center group">
          <button 
            onClick={() => {
              if (tab) {
                setActiveTab(tab);
                if (tab === DashboardTab.OPERACOES) setOpsView({ type: 'list' });
                if (tab !== DashboardTab.FORMULARIOS) setSelectedFormId(null);
              }
            }}
            className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800/60 text-slate-400'}`}
          >
            <div className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`}>
              {icon}
            </div>
            {sidebarState === 'open' && <span className="truncate">{label}</span>}
          </button>
          
          {children && sidebarState === 'open' && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] })); 
              }}
              className={`p-3 text-slate-500 hover:text-white transition-all ${isExpanded ? 'rotate-180' : ''}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
        
        {children && isExpanded && sidebarState === 'open' && (
          <div className="ml-8 mt-1 space-y-1 border-l border-slate-800/50 pl-4 animate-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      <aside className={`
        ${sidebarState === 'open' ? 'w-80' : sidebarState === 'collapsed' ? 'w-20' : 'w-0'} 
        bg-[#0f172a] text-slate-400 flex flex-col shadow-2xl z-50 transition-all duration-300 relative overflow-hidden
      `}>
        <div className="p-5 border-b border-slate-800/50 space-y-4">
          <div className="flex items-center gap-3 mb-2 overflow-hidden">
            <div className="bg-blue-600 w-9 h-9 min-w-[36px] rounded-xl flex items-center justify-center text-white font-black italic">ALS</div>
            {sidebarState === 'open' && <span className="block font-black text-slate-100 tracking-wider text-xs uppercase whitespace-nowrap">ALS TRANSPORTES</span>}
          </div>
          {sidebarState === 'open' && <WeatherWidget />}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          <MenuItem tab={DashboardTab.INICIO} label="Início" icon={<Icons.Inicio />} />
          
          <MenuItem tab={DashboardTab.OPERACOES} label="Operações" icon={<Icons.Operacoes />} forceActive={activeTab === DashboardTab.OPERACOES}>
            {availableOps.map(op => (
              <button key={op.id} onClick={() => { setActiveTab(DashboardTab.OPERACOES); setOpsView({ type: 'category', id: op.id, categoryName: op.category }); }} className="w-full text-left py-1.5 px-3 hover:bg-slate-800/40 rounded-lg text-[9px] font-bold uppercase text-slate-500 hover:text-white transition-colors">• {op.category}</button>
            ))}
          </MenuItem>

          <MenuItem tab={DashboardTab.MOTORISTAS} label="Motoristas" icon={<Icons.Motoristas />} />
          
          <MenuItem tab={DashboardTab.FORMULARIOS} label="Formulários" icon={<Icons.Formularios />} forceActive={activeTab === DashboardTab.FORMULARIOS}>
            <button onClick={() => handleFormClick('ORDEM_COLETA')} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded transition-all">• Ordem de Coleta</button>
            <button onClick={() => handleFormClick('PRE_STACKING')} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded transition-all">• Pré-Stacking</button>
            <button onClick={() => handleFormClick('LIBERACAO_VAZIO')} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded transition-all">• Liberação Vazio</button>
            <button onClick={() => handleFormClick('DEVOLUCAO_VAZIO')} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded transition-all">• Devolução Vazio</button>
            <button onClick={() => handleFormClick('RETIRADA_CHEIO')} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded transition-all">• Retirada Cheio</button>
          </MenuItem>

          <MenuItem tab={DashboardTab.CLIENTES} label="Clientes" icon={<Icons.Clientes />} />
          <MenuItem tab={DashboardTab.PORTOS} label="Portos" icon={<Icons.Portos />} />
          <MenuItem tab={DashboardTab.PRE_STACKING} label="Pré-Stacking" icon={<Icons.PreStacking />} />
          
          <div className="pt-4 pb-2">
             {sidebarState === 'open' && <p className="px-4 text-[7px] font-black text-slate-600 uppercase mb-2 tracking-[0.2em]">Administração</p>}
             <MenuItem tab={DashboardTab.COLABORADORES} label="Equipe ALS" icon={<Icons.Equipe />} />
             <MenuItem tab={DashboardTab.SISTEMA} label="Configurações" icon={<Icons.Configuracoes />} adminOnly />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800/50 bg-[#0f172a] space-y-3">
           {sidebarState === 'open' && <OnlineStatus staffList={staffList} />}
           <button onClick={onLogout} className="w-full text-[8px] text-red-500 font-black uppercase hover:bg-red-500/10 py-3 rounded-xl flex items-center justify-center gap-2 border border-red-900/20 active:scale-95 transition-all">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
             {sidebarState === 'open' && <span>Encerrar Sessão</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-40">
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarState(s => s === 'open' ? 'collapsed' : 'open')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              <div className="h-6 w-[1px] bg-slate-200"></div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">{activeTab}</h2>
           </div>
           
           <div className="flex items-center gap-4 relative">
              <DatabaseStatus />
              <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
                 <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black text-slate-800 uppercase leading-none">{user.displayName}</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">{user.position}</p>
                 </div>
                 <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center font-black text-blue-400 text-xs overflow-hidden shadow-md">
                    {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : user.displayName[0]}
                 </div>
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc] custom-scrollbar">
           {activeTab === DashboardTab.INICIO && <OverviewTab trips={[]} />}
           {activeTab === DashboardTab.MOTORISTAS && <DriversTab drivers={drivers} onSaveDriver={async (d, id) => { await db.saveDriver({...d, id: id || `drv-${Date.now()}`} as Driver); loadAllData(); }} onDeleteDriver={async id => { if(confirm("Apagar?")) { await db.deleteDriver(id); loadAllData(); } }} availableOps={availableOps} />}
           {activeTab === DashboardTab.CLIENTES && <CustomersTab customers={customers} onSaveCustomer={async (c, id) => { await db.saveCustomer({...c, id: id || `cust-${Date.now()}`} as Customer); loadAllData(); }} onDeleteCustomer={async id => { if(confirm("Deseja realmente apagar este cliente?")) { await db.deleteCustomer(id); loadAllData(); } }} isAdmin={user.role === 'admin'} />}
           {activeTab === DashboardTab.COLABORADORES && <StaffTab staffList={staffList} currentUser={user} forceEditStaffId={forceProfileModal} onCloseForceEdit={() => setForceProfileModal(null)} onSaveStaff={async (s, p) => { await db.saveStaff(s, p); await loadAllData(); }} onDeleteStaff={async id => { if(confirm("Apagar?")) { await db.deleteStaff(id); loadAllData(); } }} />}
           {activeTab === DashboardTab.FORMULARIOS && <FormsTab drivers={drivers} customers={customers} ports={ports} initialFormId={selectedFormId} />}
           {activeTab === DashboardTab.PORTOS && <PortsTab ports={ports} onSavePort={async (p, id) => { await db.savePort({...p, id: id || `prt-${Date.now()}`} as Port); loadAllData(); }} />}
           {activeTab === DashboardTab.PRE_STACKING && <PreStackingTab preStacking={preStacking} onSavePreStacking={async (ps, id) => { await db.savePreStacking({...ps, id: id || `ps-${Date.now()}`} as PreStacking); loadAllData(); }} />}
           {activeTab === DashboardTab.SISTEMA && <SystemTab onRefresh={loadAllData} driversCount={drivers.length} customersCount={customers.length} portsCount={ports.length} />}
           {activeTab === DashboardTab.OPERACOES && (
             <OperationsTab 
                availableOps={availableOps} 
                setAvailableOps={setAvailableOps} 
                drivers={drivers} 
                activeView={opsView} 
                setActiveView={setOpsView}
                vwSchedules={vwSchedules}
                onSaveVWSchedule={async (s, id) => { loadAllData(); }}
                onUpdateVWStatus={async (id, status, time) => { loadAllData(); }}
             />
           )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
