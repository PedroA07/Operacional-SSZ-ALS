
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
import { sessionManager } from '../utils/session';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.INICIO);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
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
    const timer = setInterval(async () => {
      const now = new Date();
      const loginTime = new Date(user.lastLogin).getTime();
      const diff = now.getTime() - loginTime;
      
      if (diff > 0) {
        const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setSessionDuration(`${hours}:${minutes}:${seconds}`);
      }

      // 1. HEARTBEAT: Só envia sinal se a aba estiver VISÍVEL e ATIVA
      if (now.getSeconds() % 30 === 0 && document.visibilityState === 'visible') {
        db.updateHeartbeat(user.id);
      }

      // 2. SEGURANÇA: Verifica se houve alteração de privilégios a cada 60 segundos
      if (now.getSeconds() === 0) {
        const isValid = await sessionManager.validateIntegrity(user);
        if (!isValid) {
          alert("Sua sessão expirou devido a uma alteração cadastral ou de segurança.");
          onLogout();
        }
      }
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
  }, [user, onLogout]);

  const toggleMenuExpansion = (key: string) => {
    setExpandedMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
              } else if (children) {
                toggleMenuExpansion(label);
              }
            }}
            className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800/60 text-slate-400'}`}
          >
            {icon || <div className="w-4 h-4 rounded bg-white/10 flex-shrink-0" />}
            {sidebarState === 'open' && <span className="truncate">{label}</span>}
          </button>
          
          {children && sidebarState === 'open' && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleMenuExpansion(label); }}
              className={`p-3 text-slate-500 hover:text-white transition-all ${isExpanded ? 'rotate-180' : ''}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
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

  const handleEditProfile = () => {
    setIsProfileMenuOpen(false);
    if (user.staffId) {
       setActiveTab(DashboardTab.COLABORADORES);
       setForceProfileModal(user.staffId);
    }
  };

  const cycleSidebar = () => {
    if (sidebarState === 'open') setSidebarState('collapsed');
    else if (sidebarState === 'collapsed') setSidebarState('hidden');
    else setSidebarState('open');
  };

  const myStaffData = staffList.find(s => s.id === user.staffId);
  const displayEmail = user.emailCorp || myStaffData?.emailCorp || 'financeiro@als.com.br';
  const displayPhone = user.phoneCorp || myStaffData?.phoneCorp || '(13) 99762-0041';

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
          <MenuItem tab={DashboardTab.INICIO} label="Início" />
          <MenuItem tab={DashboardTab.OPERACOES} label="Operações" forceActive={activeTab === DashboardTab.OPERACOES}>
            {availableOps.map(op => (
              <div key={op.id} className="group/cat">
                <div className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-800/40 rounded-lg group">
                  <button onClick={() => { setActiveTab(DashboardTab.OPERACOES); setOpsView({ type: 'category', id: op.id, categoryName: op.category }); }} className="text-[9px] font-bold uppercase text-slate-500 hover:text-white transition-colors flex-1 text-left">• {op.category}</button>
                  {op.clients.length > 0 && (
                    <button onClick={() => toggleMenuExpansion(`op-${op.id}`)} className="p-1 text-slate-600 hover:text-blue-400">
                      <svg className={`w-2.5 h-2.5 transition-transform ${expandedMenus[`op-${op.id}`] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
                    </button>
                  )}
                </div>
                {expandedMenus[`op-${op.id}`] && (
                  <div className="ml-4 space-y-1 mb-2 animate-in slide-in-from-left-1">
                    {op.clients.map((client, idx) => (
                      <button key={idx} onClick={() => { if (client.hasDedicatedPage) { setActiveTab(DashboardTab.OPERACOES); setOpsView({ type: 'client', id: op.id, categoryName: op.category, clientName: client.name }); } }} className={`w-full text-left py-1 text-[8px] font-black uppercase transition-colors px-2 rounded hover:bg-slate-800/30 ${client.hasDedicatedPage ? 'text-blue-500 hover:text-blue-300' : 'text-slate-600 opacity-60 cursor-default'}`}>└ {client.name}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </MenuItem>
          <MenuItem tab={DashboardTab.MOTORISTAS} label="Motoristas" />
          <MenuItem tab={DashboardTab.FORMULARIOS} label="Formulários" forceActive={activeTab === DashboardTab.FORMULARIOS}>
            <button onClick={() => handleFormClick('ORDEM_COLETA')} className="w-full text-left px-2 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded">• Ordem de Coleta</button>
            <button onClick={() => handleFormClick('PRE_STACKING')} className="w-full text-left px-2 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded">• Pré-Stacking</button>
            <button onClick={() => handleFormClick('LIBERACAO_VAZIO')} className="w-full text-left px-2 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded">• Liberação Vazio</button>
            <button onClick={() => handleFormClick('RETIRADA_CHEIO')} className="w-full text-left px-2 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-slate-800/30 rounded">• Retirada Cheio</button>
          </MenuItem>
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
              <button onClick={cycleSidebar} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7" strokeWidth="2.5" strokeLinecap="round"/></svg></button>
              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">{activeTab}</h2>
           </div>
           
           <div className="flex items-center gap-4 relative" ref={profileMenuRef}>
              <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                 <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black text-slate-800 uppercase group-hover:text-blue-600 transition-colors leading-none">{user.displayName || 'Usuário'}</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-none">{user.position || 'Operacional'}</p>
                 </div>
                 <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center font-black text-blue-400 text-xs overflow-hidden shadow-md group-hover:scale-105 transition-all">
                    {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : (user.displayName || 'A').substring(0,1).toUpperCase()}
                 </div>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-[100] animate-in slide-in-from-top-4 backdrop-blur-xl bg-white/95">
                  <div className="text-center mb-5 pb-5 border-b border-slate-50">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black mx-auto mb-3 overflow-hidden shadow-lg border-4 border-white">
                      {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : (user.displayName || 'A').substring(0,1).toUpperCase()}
                    </div>
                    <h4 className="font-black text-slate-800 uppercase text-xs">{user.displayName}</h4>
                    <p className="text-[8px] text-blue-500 font-bold uppercase tracking-widest mt-1">{user.position || 'OPERACIONAL'}</p>
                    <div className="mt-4 bg-slate-900 text-white p-3 rounded-2xl shadow-inner border border-white/5 overflow-hidden text-left">
                       <p className="text-[7px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Tempo de Sessão</p>
                       <div className="text-lg font-black font-mono tracking-tighter">{sessionDuration}</div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-5">
                    <div className="flex flex-col gap-0.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[7px] font-black text-slate-400 uppercase">E-mail Corporativo</span><span className="text-[9px] font-bold text-slate-800 lowercase break-all">{displayEmail}</span></div>
                    <div className="flex flex-col gap-0.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[7px] font-black text-slate-400 uppercase">Telefone Corp.</span><span className="text-[9px] font-bold text-slate-800">{displayPhone}</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <button onClick={handleEditProfile} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md active:scale-95">Editar Perfil</button>
                    <button onClick={onLogout} className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95">Sair do Sistema</button>
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
           {activeTab === DashboardTab.FORMULARIOS && <FormsTab drivers={drivers} customers={customers} ports={ports} initialFormId={selectedFormId} />}
           {user.role === 'admin' && activeTab === DashboardTab.SISTEMA && <SystemTab onRefresh={loadAllData} driversCount={drivers.length} customersCount={customers.length} portsCount={ports.length} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
