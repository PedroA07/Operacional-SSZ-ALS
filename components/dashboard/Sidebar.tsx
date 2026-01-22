
import React from 'react';
import { User, DashboardTab, OperationDefinition, Staff } from '../../types';
import WeatherWidget from './WeatherWidget';
import OnlineStatus from './OnlineStatus';
import { Icons } from '../../constants/icons';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  sidebarState: 'open' | 'collapsed' | 'hidden';
  setSidebarState: (state: 'open' | 'collapsed' | 'hidden') => void;
  expandedMenus: Record<string, boolean>;
  setExpandedMenus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  availableOps: OperationDefinition[];
  setOpsView: (view: any) => void;
  staffList: Staff[];
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  sidebarState,
  expandedMenus,
  setExpandedMenus,
  availableOps,
  setOpsView,
  staffList
}) => {
  
  const MenuItem = ({ tab, label, icon, adminOnly, children, forceActive = false }: any) => {
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
              } 
            }} 
            className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-slate-800/60 text-slate-400'}`}
          >
            <div className={`${isActive ? 'text-white' : 'text-slate-50 group-hover:text-white'}`}>{icon}</div>
            {sidebarState === 'open' && <span className="truncate">{label}</span>}
          </button>
          {children && sidebarState === 'open' && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setExpandedMenus(p => ({ ...p, [label]: !p[label] })); 
              }} 
              className={`p-3 text-slate-500 transition-all ${isExpanded ? 'rotate-180' : ''}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        {children && isExpanded && sidebarState === 'open' && (
          <div className="ml-8 mt-1 space-y-1 border-l border-slate-800/50 pl-4 animate-in slide-in-from-top-2 duration-300">
            {children}
          </div>
        )}
      </div>
    );
  };

  if (sidebarState === 'hidden') return null;

  return (
    <aside className={`${sidebarState === 'open' ? 'w-80' : 'w-20'} bg-[#0f172a] text-slate-400 flex flex-col shadow-[10px_0_50px_rgba(0,0,0,0.3)] z-50 transition-all duration-500 relative overflow-hidden`}>
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
          {availableOps.map(op => (
            <button 
              key={op.id} 
              onClick={() => { 
                setActiveTab(DashboardTab.OPERACOES); 
                setOpsView({ type: 'category', id: op.id, categoryName: op.category }); 
              }} 
              className="w-full text-left py-1.5 px-3 text-[9px] font-bold uppercase text-slate-500 hover:text-white transition-colors"
            >
              • {op.category}
            </button>
          ))}
        </MenuItem>
        <MenuItem tab={DashboardTab.DOCUMENTOS} label="Documentação" icon={<Icons.Formularios />} />
        <MenuItem tab={DashboardTab.ADMINISTRATIVO} label="Financeiro" icon={<Icons.Clientes />} />
        <MenuItem tab={DashboardTab.MOTORISTAS} label="Motoristas" icon={<Icons.Motoristas />} />
        <MenuItem tab={DashboardTab.FORMULARIOS} label="Formulários" icon={<Icons.Formularios />} />
        <MenuItem tab={DashboardTab.CLIENTES} label="Clientes" icon={<Icons.Clientes />} />
        <MenuItem tab={DashboardTab.PORTOS} label="Portos" icon={<Icons.Portos />} />
        <MenuItem tab={DashboardTab.PRE_STACKING} label="Pré-Stacking" icon={<Icons.PreStacking />} />
        
        <MenuItem label="Outros" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>}>
            <button onClick={() => setActiveTab(DashboardTab.LOGINS)} className={`w-full text-left py-1.5 px-3 text-[9px] font-bold uppercase transition-colors ${activeTab === DashboardTab.LOGINS ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>
              • Cofre de Logins
            </button>
            <button onClick={() => setActiveTab(DashboardTab.LACRES)} className={`w-full text-left py-1.5 px-3 text-[9px] font-bold uppercase transition-colors ${activeTab === DashboardTab.LACRES ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>
              • Controle de Lacres
            </button>
            <button onClick={() => setActiveTab(DashboardTab.AVANTIDA)} className={`w-full text-left py-1.5 px-3 text-[9px] font-bold uppercase transition-colors ${activeTab === DashboardTab.AVANTIDA ? 'text-blue-400' : 'text-slate-500 hover:text-white'}`}>
              • Avantida
            </button>
        </MenuItem>

        <div className="pt-6 pb-2">
           {sidebarState === 'open' && <p className="px-5 text-[8px] font-black text-slate-600 uppercase mb-3 tracking-[0.3em]">Administração</p>}
           <MenuItem tab={DashboardTab.COLABORADORES} label="Equipe ALS" icon={<Icons.Equipe />} />
           <MenuItem tab={DashboardTab.SISTEMA} label="Configurações" icon={<Icons.Configuracoes />} adminOnly />
        </div>
      </nav>
      
      <div className="p-5 border-t border-slate-800/50 bg-[#0f172a] space-y-4">
         {sidebarState === 'open' && <OnlineStatus staffList={staffList} currentUser={user} />}
         <button onClick={onLogout} className="w-full text-[9px] text-red-500 font-black uppercase hover:bg-red-500/10 py-4 rounded-2xl flex items-center justify-center gap-3 border border-red-900/20 active:scale-95 transition-all duration-300">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2.5"/>
           </svg>
           {sidebarState === 'open' && <span>Sair do Sistema</span>}
         </button>
      </div>
    </aside>
  );
};

export default Sidebar;
