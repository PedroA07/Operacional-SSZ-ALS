
import React, { useState, useEffect, useRef } from 'react';
import { User, Driver, DashboardTab, Port, PreStacking, Customer, OperationDefinition, Staff } from '../types';
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
import { DEFAULT_OPERATIONS } from '../constants/operations';
import { db } from '../utils/storage';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.INICIO);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloud, setIsCloud] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState<'open' | 'collapsed' | 'hidden'>('open');
  const [forceProfileModal, setForceProfileModal] = useState<string | null>(null);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [availableOps, setAvailableOps] = useState<OperationDefinition[]>(DEFAULT_OPERATIONS);

  const [opsView, setOpsView] = useState<{ type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string }>({ 
    type: 'list'
  });

  const loadAllData = async () => {
    setIsSyncing(true);
    setIsCloud(db.isCloudActive());
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
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const loginTime = new Date(user.lastLogin).getTime();
      const diff = now.getTime() - loginTime;
      if (diff > 0) {
        const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setSessionDuration(`${hours}:${minutes}:${seconds}`);
      }
      if (now.getSeconds() % 30 === 0) db.updateHeartbeat(user.id);
    }, 1000);

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user.id, user.lastLogin]);

  const MenuItem = ({ tab, label, icon, adminOnly }: { tab?: DashboardTab, label: string, icon?: React.ReactNode, adminOnly?: boolean }) => {
    if (adminOnly && user.role !== 'admin') return null;
    const isActive = tab ? activeTab === tab : false;
    const isCollapsed = sidebarState === 'collapsed';

    return (
      <button 
        onClick={() => {
          if (tab) {
            setActiveTab(tab);
            if (tab === DashboardTab.OPERACOES) setOpsView({ type: 'list' });
          }
        }}
        title={isCollapsed ? label : ''}
        className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800/60 text-slate-400'}`}
      >
        {icon || <div className="w-4 h-4 rounded bg-white/10 flex-shrink-0" />}
        {sidebarState === 'open' && <span className="truncate">{label}</span>}
      </button>
    );
  };

  const handleEditProfile = () => {
    setIsProfileMenuOpen(false);
    if (user.staffId) {
       setActiveTab(DashboardTab.COLABORADORES);
       setForceProfileModal(user.staffId);
    }
  };

  const myStaffData = staffList.find(s => s.id === user.staffId);
  const displayStatus = user.status || myStaffData?.status || 'Ativo';

  const cycleSidebar = () => {
    if (sidebarState === 'open') setSidebarState('collapsed');
    else if (sidebarState === 'collapsed') setSidebarState('hidden');
    else setSidebarState('open');
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      {/* SIDEBAR DINÂMICA */}
      <aside className={`
        ${sidebarState === 'open' ? 'w-72' : sidebarState === 'collapsed' ? 'w-20' : 'w-0'} 
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
          <MenuItem tab={DashboardTab.INICIO} label="Início" />
          <MenuItem tab={DashboardTab.OPERACOES} label="Operações" />
          <MenuItem tab={DashboardTab.MOTORISTAS} label="Motoristas" />
          <MenuItem tab={DashboardTab.FORMULARIOS} label="Formulários" />
          <MenuItem tab={DashboardTab.CLIENTES} label="Clientes" />
          <MenuItem tab={DashboardTab.PORTOS} label="Portos" />
          <MenuItem tab={DashboardTab.PRE_STACKING} label="Pré-Stacking" />
          
          <div className="pt-4 pb-2">
             {sidebarState === 'open' && <p className="px-4 text-[7px] font-black text-slate-600 uppercase mb-2 tracking-[0.2em]">Administração</p>}
             <MenuItem tab={DashboardTab.COLABORADORES} label="Equipe ALS" />
             <MenuItem tab={DashboardTab.SISTEMA} label="Configurações" adminOnly />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800/50 bg-[#0f172a] space-y-3">
           {sidebarState === 'open' && <OnlineStatus staffList={staffList} />}
           <button onClick={onLogout} className="w-full text-[8px] text-red-500 font-black uppercase hover:bg-red-500/10 py-3 rounded-xl flex items-center justify-center gap-2 border border-red-900/20 active:scale-95 transition-all">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="3"/></svg>
             {sidebarState === 'open' && <span>Encerrar Sessão</span>}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-40">
           <div className="flex items-center gap-4">
              <button onClick={cycleSidebar} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-90" title="Alternar Visualização Lateral">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 12h16m-7 6h7" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">{activeTab}</h2>
           </div>
           
           <div className="flex items-center gap-4 relative" ref={profileMenuRef}>
              <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100">
                 <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black text-slate-800 uppercase leading-none">{user.displayName || 'Usuário'}</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user.position || 'Operacional'}</p>
                 </div>
                 <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center font-black text-blue-400 text-xs overflow-hidden shadow-md">
                    {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : (user.displayName || 'A').substring(0,1).toUpperCase()}
                 </div>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-[100] animate-in slide-in-from-top-4 backdrop-blur-xl bg-white/95">
                  <div className="text-center mb-4 pb-4 border-b border-slate-50">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-black mx-auto mb-3 overflow-hidden shadow-lg">
                      {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : (user.displayName || 'A').substring(0,1).toUpperCase()}
                    </div>
                    <h4 className="font-black text-slate-800 uppercase text-[10px]">{user.displayName}</h4>
                    <p className="text-[7px] text-blue-500 font-bold uppercase mt-0.5">{user.position || 'OPERACIONAL'}</p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                       <span className="px-2 py-0.5 rounded-lg text-[7px] font-black uppercase border bg-emerald-50 text-emerald-600 border-emerald-100">{displayStatus}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <button onClick={handleEditProfile} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md active:scale-95">
                      Editar Perfil
                    </button>
                    <button onClick={onLogout} className="w-full py-2.5 bg-red-50 text-red-500 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95">
                      Sair do Sistema
                    </button>
                  </div>
                </div>
              )}
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc] custom-scrollbar">
           {activeTab === DashboardTab.INICIO && <OverviewTab trips={[]} />}
           {activeTab === DashboardTab.MOTORISTAS && <DriversTab drivers={drivers} onSaveDriver={async (d, id) => { await db.saveDriver({...d, id: id || `drv-${Date.now()}`} as Driver); loadAllData(); }} onDeleteDriver={async id => { if(confirm("Apagar?")) { await db.deleteDriver(id); loadAllData(); } }} availableOps={availableOps} />}
           {activeTab === DashboardTab.COLABORADORES && <StaffTab staffList={staffList} currentUser={user} forceEditStaffId={forceProfileModal} onCloseForceEdit={() => setForceProfileModal(null)} onSaveStaff={async (s, p) => { await db.saveStaff(s, p); await loadAllData(); }} onDeleteStaff={async id => { if(confirm("Apagar?")) { await db.deleteStaff(id); loadAllData(); } }} />}
           {activeTab === DashboardTab.OPERACOES && <OperationsTab availableOps={availableOps} setAvailableOps={setAvailableOps} drivers={drivers} activeView={opsView} setActiveView={setOpsView} vwSchedules={[]} onSaveVWSchedule={()=>{}} onUpdateVWStatus={()=>{}} />}
           {activeTab === DashboardTab.CLIENTES && <CustomersTab customers={customers} onSaveCustomer={async (c, id) => { await db.saveCustomer({...c, id: id || `cust-${Date.now()}`} as Customer); loadAllData(); }} />}
           {activeTab === DashboardTab.PORTOS && <PortsTab ports={ports} onSavePort={async (p, id) => { await db.savePort({...p, id: id || `port-${Date.now()}`} as Port); loadAllData(); }} />}
           {activeTab === DashboardTab.PRE_STACKING && <PreStackingTab preStacking={preStacking} onSavePreStacking={async (ps, id) => { await db.savePreStacking({...ps, id: id || `ps-${Date.now()}`} as PreStacking); loadAllData(); }} />}
           {activeTab === DashboardTab.FORMULARIOS && <FormsTab drivers={drivers} customers={customers} ports={ports} />}
           {user.role === 'admin' && activeTab === DashboardTab.SISTEMA && <SystemTab onRefresh={loadAllData} driversCount={drivers.length} customersCount={customers.length} portsCount={ports.length} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
