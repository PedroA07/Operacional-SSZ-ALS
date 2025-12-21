
import React, { useState, useEffect, useRef } from 'react';
import { User, Driver, DashboardTab, Port, PreStacking, Customer, OperationDefinition, Staff, WeatherData } from '../types';
import OverviewTab from './dashboard/OverviewTab';
import DriversTab from './dashboard/DriversTab';
import FormsTab from './dashboard/FormsTab';
import CustomersTab from './dashboard/CustomersTab';
import PortsTab from './dashboard/PortsTab';
import PreStackingTab from './dashboard/PreStackingTab';
import OperationsTab from './dashboard/OperationsTab';
import StaffTab from './dashboard/StaffTab';
import SystemTab from './dashboard/SystemTab';
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
  const [sessionStartTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloud, setIsCloud] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [availableOps, setAvailableOps] = useState<OperationDefinition[]>(DEFAULT_OPERATIONS);

  const [opsView, setOpsView] = useState<{ type: 'list' | 'category' | 'client', id: string, categoryName: string, clientName: string }>({ 
    type: 'list', id: '', categoryName: '', clientName: '' 
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
      console.error("Falha ao carregar dados:", e); 
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setSessionDuration(`${h}:${m}:${s}`);
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
  }, [sessionStartTime]);

  const toggleMenu = (menu: string) => setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

  const MenuItem = ({ tab, label, subItems, adminOnly }: { tab?: DashboardTab, label: string, subItems?: { label: string, onClick: () => void }[], adminOnly?: boolean }) => {
    if (adminOnly && user.role !== 'admin') return null;
    
    const isExpanded = expandedMenus[label];
    const isActive = tab ? activeTab === tab : false;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => {
              if (tab) {
                setActiveTab(tab);
                if (tab === DashboardTab.OPERACOES) {
                  setOpsView({ type: 'list', id: '', categoryName: '', clientName: '' });
                }
              }
            }}
            className={`flex-1 flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'hover:bg-slate-800/60 text-slate-400'}`}
          >
            {label}
          </button>
          {subItems && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleMenu(label); }} 
              className={`p-3.5 rounded-xl hover:bg-slate-800 transition-all ${isExpanded ? 'rotate-180 text-blue-400' : 'text-slate-600'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
            </button>
          )}
        </div>
        {subItems && isExpanded && (
          <div className="ml-6 space-y-1 border-l border-slate-800/50 pl-4 animate-in slide-in-from-top-2 duration-200">
            {subItems.map((si, i) => (
              <button key={i} onClick={si.onClick} className="w-full text-left py-2.5 px-3 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors">
                • {si.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const myStaffData = staffList.find(s => s.id === user.staffId);

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      <aside className="w-72 bg-[#0f172a] text-slate-400 flex flex-col shadow-2xl z-50">
        <div className="p-8 border-b border-slate-800/50">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-blue-600 w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black italic shadow-xl">ALS</div>
            <div>
              <span className="block font-black text-slate-100 tracking-wider text-sm uppercase">ALS TRANSPORTES</span>
            </div>
          </div>

          <div className="bg-[#1e293b] p-5 rounded-[2rem] border border-slate-700/30 shadow-inner">
             <div className="flex justify-between items-center text-[9px] font-black uppercase text-blue-400 tracking-tighter">
               <span>{currentTime.toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
               <span className="text-slate-500">{currentTime.toLocaleDateString('pt-BR')}</span>
             </div>
             <div className="text-2xl font-black text-white font-mono tracking-tighter mt-1">{currentTime.toLocaleTimeString('pt-BR')}</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <MenuItem tab={DashboardTab.INICIO} label="Início" />
          <MenuItem 
            tab={DashboardTab.OPERACOES} 
            label="Operações" 
            subItems={availableOps.map(op => ({ 
              label: op.category, 
              onClick: () => {
                setActiveTab(DashboardTab.OPERACOES);
                setOpsView({ type: 'category', id: op.id, categoryName: op.category, clientName: '' });
              } 
            }))} 
          />
          <MenuItem tab={DashboardTab.MOTORISTAS} label="Motoristas" />
          <MenuItem 
            tab={DashboardTab.FORMULARIOS} 
            label="Formulários" 
            subItems={[
              { label: 'Ordem de Coleta', onClick: () => { setActiveTab(DashboardTab.FORMULARIOS); } },
              { label: 'Pré-Stacking', onClick: () => { setActiveTab(DashboardTab.FORMULARIOS); } }
            ]}
          />
          <MenuItem tab={DashboardTab.CLIENTES} label="Clientes" />
          <MenuItem tab={DashboardTab.PORTOS} label="Portos" />
          <MenuItem tab={DashboardTab.PRE_STACKING} label="Pré-Stacking" />
          
          <div className="pt-6 px-4">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Gerenciamento ALS</p>
            <MenuItem tab={DashboardTab.COLABORADORES} label="Equipe ALS" adminOnly />
            <MenuItem tab={DashboardTab.SISTEMA} label="Configurações" adminOnly />
          </div>
        </nav>

        <div className="p-6 border-t border-slate-800/50 bg-[#0f172a]">
           <button onClick={onLogout} className="w-full text-[9px] text-red-500 font-black uppercase hover:bg-red-500/10 py-3.5 rounded-xl transition-all tracking-widest border border-red-900/20 shadow-sm active:scale-95">
             Sair do Portal
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-40">
           <div className="flex items-center gap-4">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-[0.3em]">{activeTab}</h2>
              <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
              <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 ${isCloud ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                <span className={`text-[8px] font-black uppercase tracking-tighter ${isCloud ? 'text-emerald-600' : 'text-amber-600'}`}>
                  DB: {isCloud ? 'Nuvem' : 'Local'}
                </span>
              </div>
           </div>
           
           <div className="flex items-center gap-6 relative" ref={profileMenuRef}>
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100"
              >
                 <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-slate-800 uppercase group-hover:text-blue-600 transition-colors">{user.displayName}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{user.role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
                 </div>
                 <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-blue-400 shadow-lg group-hover:scale-105 transition-all">
                    {user.displayName.substring(0,2).toUpperCase()}
                 </div>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-3 w-72 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-6 animate-in slide-in-from-top-4 duration-300 z-[100] backdrop-blur-xl bg-white/95">
                  <div className="text-center mb-6 pb-6 border-b border-slate-50">
                    <div className="w-16 h-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-xl">
                      {user.displayName.substring(0,1).toUpperCase()}
                    </div>
                    <h4 className="font-black text-slate-800 uppercase text-xs">{user.displayName}</h4>
                    <p className="text-[8px] text-blue-500 font-bold uppercase tracking-widest mt-1">{user.position || 'OPERACIONAL'}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex flex-col gap-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Tempo Logado</span>
                      <span className="text-xs font-mono font-black text-slate-800">{sessionDuration}</span>
                    </div>
                    <div className="flex flex-col gap-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Membro Desde</span>
                      <span className="text-xs font-black text-slate-800">
                        {myStaffData ? new Date(myStaffData.registrationDate).toLocaleDateString('pt-BR') : 'Aguardando Sinc.'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button 
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (user.role === 'admin') {
                          setActiveTab(DashboardTab.COLABORADORES);
                        } else {
                          alert("Acesso restrito ao Administrador para edição de dados sensíveis.");
                        }
                      }}
                      className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md active:scale-95"
                    >
                      Editar Perfil
                    </button>
                    <button 
                      onClick={onLogout}
                      className="w-full py-3.5 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    >
                      Sair do Sistema
                    </button>
                  </div>
                </div>
              )}
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc] custom-scrollbar">
           {activeTab === DashboardTab.INICIO && <OverviewTab trips={[]} />}
           {activeTab === DashboardTab.OPERACOES && (
             <OperationsTab 
               availableOps={availableOps} 
               setAvailableOps={setAvailableOps} 
               drivers={drivers} 
               activeView={opsView} 
               setActiveView={setOpsView}
               vwSchedules={[]} 
               onSaveVWSchedule={()=>{}} 
               onUpdateVWStatus={()=>{}} 
             />
           )}
           {activeTab === DashboardTab.MOTORISTAS && (
             <DriversTab 
               drivers={drivers} 
               onSaveDriver={async (d, id) => { 
                 const newDriver = {...d, id: id || `drv-${Date.now()}`} as Driver;
                 setDrivers(prev => {
                   const idx = prev.findIndex(item => item.id === newDriver.id);
                   if (idx >= 0) {
                     const copy = [...prev]; copy[idx] = newDriver; return copy;
                   }
                   return [...prev, newDriver];
                 });
                 await db.saveDriver(newDriver); 
                 loadAllData(); 
               }} 
               onDeleteDriver={async id => { 
                 if(confirm("Deseja realmente excluir?")) { 
                    setDrivers(prev => prev.filter(d => d.id !== id));
                    await db.deleteDriver(id); 
                    loadAllData(); 
                 } 
               }} 
               availableOps={availableOps} 
             />
           )}
           {activeTab === DashboardTab.CLIENTES && (
             <CustomersTab 
               customers={customers} 
               onSaveCustomer={async (c, id) => { 
                 const newCust = {...c, id: id || `cust-${Date.now()}`} as Customer;
                 setCustomers(prev => {
                   const idx = prev.findIndex(item => item.id === newCust.id);
                   if (idx >= 0) {
                     const copy = [...prev]; copy[idx] = newCust; return copy;
                   }
                   return [...prev, newCust];
                 });
                 await db.saveCustomer(newCust); 
                 loadAllData(); 
               }} 
             />
           )}
           {activeTab === DashboardTab.PORTOS && (
             <PortsTab 
               ports={ports} 
               onSavePort={async (p, id) => { 
                 const newPort = {...p, id: id || `port-${Date.now()}`} as Port;
                 setPorts(prev => {
                   const idx = prev.findIndex(item => item.id === newPort.id);
                   if (idx >= 0) {
                     const copy = [...prev]; copy[idx] = newPort; return copy;
                   }
                   return [...prev, newPort];
                 });
                 await db.savePort(newPort); 
                 loadAllData(); 
               }} 
             />
           )}
           {activeTab === DashboardTab.PRE_STACKING && (
             <PreStackingTab 
               preStacking={preStacking} 
               onSavePreStacking={async (ps, id) => { 
                 const newItem = {...ps, id: id || `ps-${Date.now()}`} as PreStacking;
                 setPreStacking(prev => {
                   const idx = prev.findIndex(item => item.id === newItem.id);
                   if (idx >= 0) {
                     const copy = [...prev]; copy[idx] = newItem; return copy;
                   }
                   return [...prev, newItem];
                 });
                 await db.savePreStacking(newItem); 
                 loadAllData(); 
               }} 
             />
           )}
           {user.role === 'admin' && activeTab === DashboardTab.COLABORADORES && (
              <StaffTab 
                staffList={staffList} 
                currentUserRole={user.role}
                onSaveStaff={async (s, id) => { 
                  const newStaff = {...s, id: id || `stf-${Date.now()}`} as Staff;
                  setStaffList(prev => {
                    const idx = prev.findIndex(item => item.id === newStaff.id);
                    if (idx >= 0) {
                      const copy = [...prev]; copy[idx] = newStaff; return copy;
                    }
                    return [...prev, newStaff];
                  });
                  await db.saveStaff(newStaff); 
                  await loadAllData(); 
                }} 
                onDeleteStaff={async id => { 
                  if(confirm("Deseja realmente excluir este colaborador?")) { 
                    setStaffList(prev => prev.filter(s => s.id !== id));
                    await db.deleteStaff(id); 
                    await loadAllData(); 
                  } 
                }}
              />
           )}
           {user.role === 'admin' && activeTab === DashboardTab.SISTEMA && <SystemTab onRefresh={loadAllData} driversCount={drivers.length} customersCount={customers.length} portsCount={ports.length} />}
           {activeTab === DashboardTab.FORMULARIOS && (
             <FormsTab drivers={drivers} customers={customers} ports={ports} />
           )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
