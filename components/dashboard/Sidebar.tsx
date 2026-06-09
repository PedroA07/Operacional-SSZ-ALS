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
  
  const MenuItem = ({ tab, label, icon, adminOnly, thirdPartyOnly, children, forceActive = false }: any) => {
    if (adminOnly && user.role !== 'admin') return null;
    if (thirdPartyOnly && user.role !== 'third_party') return null;
    const isActive = forceActive || (tab ? activeTab === tab : false);
    const isExpanded = expandedMenus[label];

    return (
      <div className="w-full">
        <div className="flex items-center group">
          <button
            title={sidebarState !== 'open' ? label : undefined}
            onClick={() => {
              if (tab) {
                setActiveTab(tab);
                if (tab === DashboardTab.OPERACOES) setOpsView({ type: 'list' });
              }
            }}
            className={`flex-1 flex items-center gap-3 rounded-xl transition-all duration-200 font-bold text-[10px] uppercase tracking-widest relative overflow-hidden
              ${sidebarState === 'open' ? 'px-4 py-3' : 'px-0 py-3 justify-center'}
              ${isActive
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/25'
                : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
          >
            {isActive && <span className="absolute left-0 inset-y-1.5 w-0.5 bg-white/50 rounded-full" />}
            <div className={`shrink-0 transition-transform duration-200 ${isActive ? 'text-white scale-105' : 'text-slate-400 group-hover:text-slate-200'}`}>{icon}</div>
            {sidebarState === 'open' && <span className="truncate">{label}</span>}
          </button>
          {children && sidebarState === 'open' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedMenus(p => ({ ...p, [label]: !p[label] }));
              }}
              className={`p-2.5 rounded-lg text-slate-600 hover:text-slate-300 transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        {children && isExpanded && sidebarState === 'open' && (
          <div className="ml-7 mt-1 space-y-0.5 border-l border-slate-700/40 pl-3 animate-in slide-in-from-top-2 duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  if (sidebarState === 'hidden') return null;

  return (
    <aside className={`${sidebarState === 'open' ? 'w-72' : 'w-[72px]'} bg-[#0b1120] text-slate-400 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.35)] z-50 transition-all duration-300 shrink-0 overflow-hidden`}>
      <div className={`border-b border-white/5 ${sidebarState === 'open' ? 'p-5' : 'p-3.5'} space-y-3`}>
        <div className={`flex items-center ${sidebarState === 'open' ? 'gap-3' : 'justify-center'}`}>
          <div className="bg-white min-w-[38px] w-[38px] h-[38px] rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 overflow-hidden ring-2 ring-white/10">
            <img src="/logo.jpg" alt="ALS" className="w-full h-full object-cover" />
          </div>
          {sidebarState === 'open' && (
            <div className="animate-in fade-in slide-in-from-left-3 duration-200 overflow-hidden">
              <p className="font-black text-white tracking-[0.15em] text-xs uppercase leading-tight">ALS</p>
              <p className="font-bold text-slate-500 text-[9px] uppercase tracking-widest">Logística SSZ</p>
            </div>
          )}
        </div>
        {sidebarState === 'open' && <WeatherWidget />}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <MenuItem tab={DashboardTab.INICIO} label="Início" icon={<Icons.Inicio />} />
        <MenuItem tab={DashboardTab.HANDOVER} label="Passagem de Serviço" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
        } />
        <MenuItem tab={DashboardTab.OPERACOES} label="Operações" icon={<Icons.Operacoes />} forceActive={activeTab === DashboardTab.OPERACOES}>
          {availableOps.map(op => (
            <button
              key={op.id}
              onClick={() => {
                setActiveTab(DashboardTab.OPERACOES);
                setOpsView({ type: 'category', id: op.id, categoryName: op.category });
              }}
              className="w-full text-left py-1.5 px-3 text-[9px] font-bold uppercase text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all"
            >
              {op.category}
            </button>
          ))}
        </MenuItem>
        <MenuItem tab={DashboardTab.ORGANIZACAO} label="Organização" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
        <MenuItem tab={DashboardTab.COLETA_DIA} label="Coleta do Dia" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
        <MenuItem tab={DashboardTab.EMISSOES} label="Emissões" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
        <MenuItem tab={DashboardTab.FORMULARIOS} label="Formulários" icon={<Icons.Formularios />} />
        <MenuItem tab={DashboardTab.AUTOMACOES} label="Automações" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>} adminOnly />
        <MenuItem tab={DashboardTab.EXTERNAL_PORTAL} label="Portal Externo" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" /></svg>} thirdPartyOnly />
        <MenuItem tab={DashboardTab.DOCUMENTOS} label="Documentação" icon={<Icons.Formularios />} />
        <MenuItem tab={DashboardTab.ADMINISTRATIVO} label="Financeiro" icon={<Icons.Clientes />} />
        <MenuItem tab={DashboardTab.TABELA_FRETE} label="Tabela de Frete" icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M3 3h18v18H3z"/>
          </svg>
        } />
        <MenuItem tab={DashboardTab.ESTADIAS} label="Estadias" icon={<Icons.Estadias />} />
        <MenuItem tab={DashboardTab.MOTORISTAS} label="Motoristas" icon={<Icons.Motoristas />} />
        <MenuItem tab={DashboardTab.BENEFICIARIOS} label="Beneficiários" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
        <MenuItem tab={DashboardTab.CLIENTES} label="Clientes" icon={<Icons.Clientes />} />
        <MenuItem tab={DashboardTab.PORTOS} label="Portos" icon={<Icons.Portos />} />
        <MenuItem tab={DashboardTab.NAVIOS} label="Navios" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M3 13l1.5 5.5A1 1 0 005.46 20h13.08a1 1 0 00.96-.5L21 13M3 13h18M3 13l2-8h14l2 8M12 3v10"/></svg>} />
        <MenuItem tab={DashboardTab.PRE_STACKING} label="Pré-Stacking" icon={<Icons.PreStacking />} />
        <MenuItem tab={DashboardTab.VALORES_PRE_STACKING} label="Valores Pré-Stacking" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>} />
        
        <MenuItem label="Outros" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>}>
          {([
            { tab: DashboardTab.LOGINS, label: 'Cofre de Logins' },
            { tab: DashboardTab.LACRES, label: 'Controle de Lacres' },
            { tab: DashboardTab.AVANTIDA, label: 'Avantida' },
          ] as const).map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full text-left py-1.5 px-3 text-[9px] font-bold uppercase rounded-lg transition-all ${activeTab === item.tab ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
            >
              {item.label}
            </button>
          ))}
        </MenuItem>

        <div className="pt-4 pb-2">
          {sidebarState === 'open' && (
            <div className="flex items-center gap-2 px-4 mb-2">
              <div className="h-px flex-1 bg-slate-800/60" />
              <p className="text-[7px] font-black text-slate-600 uppercase tracking-[0.3em] shrink-0">Admin</p>
              <div className="h-px flex-1 bg-slate-800/60" />
            </div>
          )}
           <MenuItem tab={DashboardTab.COLABORADORES} label="Equipe ALS" icon={<Icons.Equipe />} />
           <MenuItem tab={DashboardTab.EXTERNAL_USERS} label="Usuários Externos" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>} adminOnly />
           <MenuItem tab={DashboardTab.SISTEMA} label="Configurações" icon={<Icons.Configuracoes />} adminOnly />
        </div>
      </nav>
      
      <div className={`border-t border-white/5 ${sidebarState === 'open' ? 'p-4' : 'p-3'} space-y-3`}>
        {sidebarState === 'open' && <OnlineStatus staffList={staffList} currentUser={user} />}
        <button
          onClick={onLogout}
          title={sidebarState !== 'open' ? 'Sair do sistema' : undefined}
          className={`w-full text-[9px] text-red-400/80 font-black uppercase hover:bg-red-500/10 hover:text-red-400 rounded-xl flex items-center gap-3 border border-red-900/20 hover:border-red-800/40 active:scale-95 transition-all duration-200
            ${sidebarState === 'open' ? 'px-4 py-3 justify-start' : 'py-3 justify-center'}`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2.5"/>
          </svg>
          {sidebarState === 'open' && <span>Sair do Sistema</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;