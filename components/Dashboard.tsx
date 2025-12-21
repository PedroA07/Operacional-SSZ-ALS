
import React, { useState, useEffect } from 'react';
import { User, Driver, DashboardTab, Port, PreStacking, Customer, OperationDefinition, Staff, WeatherData } from '../types';
import OverviewTab from './dashboard/OverviewTab';
import DriversTab from './dashboard/DriversTab';
import FormsTab from './dashboard/FormsTab';
import CustomersTab from './dashboard/CustomersTab';
import PortsTab from './dashboard/PortsTab';
import PreStackingTab from './dashboard/PreStackingTab';
import OperationsTab from './dashboard/OperationsTab';
import StaffTab from './dashboard/StaffTab';
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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [onlineUsersCount, setOnlineUsersCount] = useState(1);
  const [isCloud, setIsCloud] = useState(false);
  
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
        db.getDrivers(), db.getCustomers(), db.getPorts(), db.getPreStacking(), db.getStaff()
      ]);
      setDrivers(d); setCustomers(c); setPorts(p); setPreStacking(ps); setStaffList(s);
      // Mantém contador em 1 (usuário atual) até integração de presença real
      setOnlineUsersCount(1);
    } catch (e) { console.error("Falha ao carregar dados:", e); }
    setIsSyncing(false);
  };

  const loadWeather = async () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,weathercode&timezone=auto`);
        const data = await resp.json();
        const conds: any = { 0: 'Céu Limpo', 1: 'Pouco Nublado', 2: 'Nublado', 3: 'Encoberto', 61: 'Chuva' };
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          condition: conds[data.current_weather.weathercode] || 'Estável',
          icon: data.current_weather.weathercode === 0 ? '☀️' : '☁️',
          forecastNextDay: { temp: Math.round(data.daily.temperature_2m_max[1]), condition: conds[data.daily.weathercode[1]] || 'Estável' }
        });
      } catch (e) { console.error("Erro clima:", e); }
    });
  };

  useEffect(() => {
    loadAllData(); loadWeather();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMenu = (menu: string) => setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

  const MenuItem = ({ tab, label, subItems }: { tab?: DashboardTab, label: string, subItems?: { label: string, onClick: () => void }[] }) => {
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
             {weather && (
               <div className="pt-3 border-t border-slate-700/50 mt-3 flex items-center gap-3">
                  <span className="text-xl">{weather.icon}</span>
                  <div>
                    <p className="text-sm font-black text-white leading-none">{weather.temp}°C</p>
                    <p className="text-[8px] font-bold uppercase text-slate-500">{weather.condition}</p>
                  </div>
               </div>
             )}
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
              { label: 'Ordem de Coleta', onClick: () => setActiveTab(DashboardTab.FORMULARIOS) },
              { label: 'Pré-Stacking', onClick: () => setActiveTab(DashboardTab.FORMULARIOS) }
            ]}
          />
          <MenuItem tab={DashboardTab.CLIENTES} label="Clientes" />
          <MenuItem tab={DashboardTab.PORTOS} label="Portos" />
          <MenuItem tab={DashboardTab.PRE_STACKING} label="Pré-Stacking" />
          {user.role === 'admin' && (
            <div className="pt-6 px-4">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Administração</p>
              <MenuItem tab={DashboardTab.COLABORADORES} label="Equipe ALS" />
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800/50 bg-[#0f172a] space-y-4">
           <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{onlineUsersCount} Usuário Ativo</span>
           </div>
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
                  Database: {isCloud ? 'Cloud Sync' : 'Local Mode'}
                </span>
              </div>
           </div>
           
           <div className="flex items-center gap-6">
              {isSyncing && <span className="text-[8px] font-black text-blue-500 animate-pulse uppercase tracking-widest">Sincronizando...</span>}
              <div className="flex items-center gap-3">
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-800 uppercase">{user.displayName}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{user.position || user.role}</p>
                 </div>
                 <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-blue-400 shadow-xl">
                    {user.displayName.substring(0,2).toUpperCase()}
                 </div>
              </div>
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
                 await db.saveDriver({...d, id: id || `drv-${Date.now()}`} as Driver); 
                 loadAllData(); 
               }} 
               onDeleteDriver={async id => { 
                 if(confirm("Deseja realmente excluir este motorista?")) { await db.deleteDriver(id); loadAllData(); } 
               }} 
               availableOps={availableOps} 
             />
           )}
           {activeTab === DashboardTab.CLIENTES && (
             <CustomersTab 
               customers={customers} 
               onSaveCustomer={async (c, id) => { await db.saveCustomer({...c, id: id || `cust-${Date.now()}`} as Customer); loadAllData(); }} 
             />
           )}
           {activeTab === DashboardTab.PORTOS && (
             <PortsTab 
               ports={ports} 
               onSavePort={async (p, id) => { await db.savePort({...p, id: id || `port-${Date.now()}`} as Port); loadAllData(); }} 
             />
           )}
           {activeTab === DashboardTab.PRE_STACKING && (
             <PreStackingTab 
               preStacking={preStacking} 
               onSavePreStacking={async (ps, id) => { await db.savePreStacking({...ps, id: id || `ps-${Date.now()}`} as PreStacking); loadAllData(); }} 
             />
           )}
           {activeTab === DashboardTab.COLABORADORES && <StaffTab staffList={staffList} onSaveStaff={async (s, id) => { await db.saveStaff({...s, id: id || `stf-${Date.now()}`} as Staff); loadAllData(); }} />}
           {activeTab === DashboardTab.FORMULARIOS && (
             <FormsTab drivers={drivers} customers={customers} ports={ports} />
           )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
