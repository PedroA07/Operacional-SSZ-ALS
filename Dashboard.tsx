
import React, { useState, useEffect, useCallback } from 'react';
import { User, Driver, DashboardTab, Port, PreStacking, Customer, OperationDefinition, Staff, Trip } from './types';
import OverviewTab from './components/dashboard/OverviewTab';
import DriversTab from './components/dashboard/DriversTab';
import FormsTab from './components/dashboard/FormsTab';
import CustomersTab from './components/dashboard/CustomersTab';
import PortsTab from './components/dashboard/PortsTab';
import PreStackingTab from './components/dashboard/PreStackingTab';
import OperationsTab from './components/dashboard/OperationsTab';
import AdminTab from './components/dashboard/AdminTab';
import StaffTab from './components/dashboard/StaffTab';
import SystemTab from './components/dashboard/SystemTab';
import WeatherWidget from './components/dashboard/WeatherWidget';
import OnlineStatus from './components/dashboard/OnlineStatus';
import UserProfile from './components/dashboard/UserProfile';
import DatabaseStatus from './components/dashboard/DatabaseStatus';
import { DEFAULT_OPERATIONS } from './constants/operations';
import { db } from './utils/storage';
import { Icons } from './constants/icons';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.INICIO);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ 'Operações': false, 'Administrativo': false });
  const [sidebarState, setSidebarState] = useState<'open' | 'collapsed' | 'hidden'>('open');
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [availableOps] = useState<OperationDefinition[]>(DEFAULT_OPERATIONS);

  const [opsView, setOpsView] = useState<{ type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string }>({ type: 'list' });

  const loadAllData = useCallback(async () => {
    const [d, c, p, ps, s, t] = await Promise.all([
      db.getDrivers(), 
      db.getCustomers(), 
      db.getPorts(), 
      db.getPreStacking(), 
      db.getStaff(),
      db.getTrips()
    ]);
    setDrivers(d || []); 
    setCustomers(c || []); 
    setPorts(p || []); 
    setPreStacking(ps || []); 
    setStaffList(s || []);
    setTrips(t || []);
  }, []);

  useEffect(() => { 
    loadAllData();
    const syncInterval = setInterval(loadAllData, 30000);
    return () => clearInterval(syncInterval);
  }, [loadAllData]);

  const MenuItem = ({ tab, label, icon, adminOnly, children, forceActive = false }: any) => {
    if (adminOnly && user.role !== 'admin') return null;
    const isActive = forceActive || (tab ? activeTab === tab : false);
    const isExpanded = expandedMenus[label];
    return (
      <div className="w-full">
        <div className="flex items-center group">
          <button onClick={() => { if (tab) { setActiveTab(tab); if (tab === DashboardTab.OPERACOES) setOpsView({ type: 'list' }); } }} className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-slate-800/60 text-slate-400'}`}>
            <div className={`${isActive ? 'text-white' : 'text-slate-50 group-hover:text-white'}`}>{icon}</div>
            {sidebarState === 'open' && <span className="truncate">{label}</span>}
          </button>
          {children && sidebarState === 'open' && <button onClick={(e) => { e.stopPropagation(); setExpandedMenus(p => ({ ...p, [label]: !p[label] })); }} className={`p-3 text-slate-500 transition-all ${isExpanded ? 'rotate-180' : ''}`}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
        </div>
        {children && isExpanded && sidebarState === 'open' && <div className="ml-8 mt-1 space-y-1 border-l border-slate-800/50 pl-4 animate-in slide-in-from-top-2 duration-300">{children}</div>}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      <aside className={`${sidebarState === 'open' ? 'w-80' : sidebarState === 'collapsed' ? 'w-20' : 'w-0'} bg-[#0f172a] text-slate-400 flex flex-col shadow-[10px_0_50px_rgba(0,0,0,0.3)] z-50 transition-all duration-500 relative overflow-hidden`}>
        <div className="p-6 border-b border-slate-800/50 space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-blue-600 w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center text-white font-black italic shadow-xl shadow-blue-600/10">ALS</div>
            {sidebarState === 'open' && <span className="block font-black text-slate-100 tracking-[0.2em] text-xs uppercase whitespace-nowrap animate-in fade-in slide-in-from-left-4">ALS LOGÍSTICA</span>}
          </div>
          {sidebarState === 'open' && <WeatherWidget />}
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <MenuItem tab={DashboardTab.INICIO} label="Início" icon={<Icons.Inicio />} />
          <MenuItem tab={DashboardTab.OPERACOES} label="Operações" icon={<Icons.Operacoes />} forceActive={activeTab === DashboardTab.OPERACOES}>
            {availableOps.map(op => <button key={op.id} onClick={() => { setActiveTab(DashboardTab.OPERACOES); setOpsView({ type: 'category', id: op.id, categoryName: op.category }); }} className="w-full text-left py-1.5 px-3 text-[9px] font-bold uppercase text-slate-500 hover:text-white transition-colors">• {op.category}</button>)}
          </MenuItem>
          <MenuItem tab={DashboardTab.ADMINISTRATIVO} label="Financeiro" icon={<Icons.Clientes />} />
          <MenuItem tab={DashboardTab.MOTORISTAS} label="Motoristas" icon={<Icons.Motoristas />} />
          <MenuItem tab={DashboardTab.FORMULARIOS} label="Formulários" icon={<Icons.Formularios />} />
          <MenuItem tab={DashboardTab.CLIENTES} label="Clientes" icon={<Icons.Clientes />} />
          <MenuItem tab={DashboardTab.PORTOS} label="Portos" icon={<Icons.Portos />} />
          <MenuItem tab={DashboardTab.PRE_STACKING} label="Pré-Stacking" icon={<Icons.PreStacking />} />
          <div className="pt-6 pb-2">
             {sidebarState === 'open' && <p className="px-5 text-[8px] font-black text-slate-600 uppercase mb-3 tracking-[0.3em]">Administração</p>}
             <MenuItem tab={DashboardTab.COLABORADORES} label="Equipe ALS" icon={<Icons.Equipe />} />
             <MenuItem tab={DashboardTab.SISTEMA} label="Configurações" icon={<Icons.Configuracoes />} adminOnly />
          </div>
        </nav>
        <div className="p-5 border-t border-slate-800/50 bg-[#0f172a] space-y-4">
           {sidebarState === 'open' && <OnlineStatus staffList={staffList} />}
           <button onClick={onLogout} className="w-full text-[9px] text-red-500 font-black uppercase hover:bg-red-500/10 py-4 rounded-2xl flex items-center justify-center gap-3 border border-red-900/20 active:scale-95 transition-all duration-300">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2.5"/></svg>
             <span>Sair do Sistema</span>
           </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-40">
           <div className="flex items-center gap-5">
              <button onClick={() => setSidebarState(s => s === 'open' ? 'collapsed' : 'open')} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-90 border border-transparent hover:border-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em]">{activeTab}</h2>
           </div>
           <div className="flex items-center gap-6">
              <DatabaseStatus />
              <UserProfile user={user} />
           </div>
        </header>
        <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc] custom-scrollbar">
           {activeTab === DashboardTab.INICIO && <OverviewTab trips={trips} drivers={drivers} />}
           {activeTab === DashboardTab.OPERACOES && <OperationsTab user={user} availableOps={availableOps} drivers={drivers} customers={customers} activeView={opsView} setActiveView={setOpsView} />}
           {activeTab === DashboardTab.ADMINISTRATIVO && <AdminTab user={user} />}
           {activeTab === DashboardTab.MOTORISTAS && <DriversTab drivers={drivers} onSaveDriver={async (d, id) => { await db.saveDriver({...d, id: id || `drv-${Date.now()}`} as Driver); loadAllData(); }} onDeleteDriver={async id => { await db.deleteDriver(id); loadAllData(); }} availableOps={availableOps} />}
           {activeTab === DashboardTab.CLIENTES && <CustomersTab customers={customers} onSaveCustomer={async (c, id) => { await db.saveCustomer({...c, id: id || `cust-${Date.now()}`} as Customer); loadAllData(); }} onDeleteCustomer={async id => { await db.deleteCustomer(id); loadAllData(); }} isAdmin={user.role === 'admin'} />}
           {activeTab === DashboardTab.COLABORADORES && <StaffTab staffList={staffList} currentUser={user} onSaveStaff={async (s, p) => { await db.saveStaff(s, p); loadAllData(); }} onDeleteStaff={async id => { await db.deleteStaff(id); loadAllData(); }} />}
           {activeTab === DashboardTab.FORMULARIOS && <FormsTab drivers={drivers} customers={customers} ports={ports} />}
           {activeTab === DashboardTab.PORTOS && <PortsTab ports={ports} onSavePort={async (p, id) => { await db.savePort({...p, id: id || `prt-${Date.now()}`} as Port); loadAllData(); }} />}
           {activeTab === DashboardTab.PRE_STACKING && <PreStackingTab preStacking={preStacking} onSavePreStacking={async (p, id) => { await db.savePreStacking({...p, id: id || `ps-${Date.now()}`} as PreStacking); loadAllData(); }} />}
           {activeTab === DashboardTab.SISTEMA && <SystemTab onRefresh={loadAllData} driversCount={drivers.length} customersCount={customers.length} portsCount={ports.length} />}
        </div>
      </main>
    </div>
  );
};
export default Dashboard;
