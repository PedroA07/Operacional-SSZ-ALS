
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { User, Driver, DashboardTab, Port, PreStacking, Customer, OperationDefinition, Staff, Trip, Category, AvantidaRecord, SealBatch, EmailTemplate, Beneficiary, MonitoredShip } from './types';
import Sidebar from './components/dashboard/Sidebar';
import WeatherWidget from './components/dashboard/WeatherWidget';
import OnlineStatus from './components/dashboard/OnlineStatus';
import DatabaseStatus from './components/dashboard/DatabaseStatus';
import UserProfile from './components/dashboard/UserProfile';
import NotificationCenter from './components/dashboard/notifications/NotificationCenter';
import EmailCenter from './components/dashboard/email/EmailCenter';
import NotificationToast from './components/dashboard/notifications/NotificationToast';
import SimpleToast from './components/shared/SimpleToast';
import FeedbackModal from './components/shared/FeedbackModal';
import { db, supabase } from './utils/storage';
import { Icons } from './constants/icons';

// Tabs carregadas sob demanda — reduz o bundle inicial significativamente
const OverviewTab        = lazy(() => import('./components/dashboard/OverviewTab'));
const DriversTab         = lazy(() => import('./components/dashboard/DriversTab'));
const BeneficiariesTab   = lazy(() => import('./components/dashboard/beneficiaries/BeneficiariesTab'));
const FormsTab           = lazy(() => import('./components/dashboard/FormsTab'));
const CustomersTab       = lazy(() => import('./components/dashboard/CustomersTab'));
const PortsTab           = lazy(() => import('./components/dashboard/PortsTab'));
const PreStackingTab     = lazy(() => import('./components/dashboard/PreStackingTab'));
const OperationsTab      = lazy(() => import('./components/dashboard/OperationsTab'));
const AdminTab           = lazy(() => import('./components/dashboard/AdminTab'));
const StaffTab           = lazy(() => import('./components/dashboard/StaffTab'));
const SystemTab          = lazy(() => import('./components/dashboard/SystemTab'));
const DocumentsTab       = lazy(() => import('./components/dashboard/DocumentsTab'));
const StaysTab           = lazy(() => import('./components/dashboard/StaysTab'));
const LoginsTab          = lazy(() => import('./components/dashboard/LoginsTab'));
const LacresTab          = lazy(() => import('./components/dashboard/LacresTab'));
const AvantidaTab        = lazy(() => import('./components/dashboard/AvantidaTab'));
const OrganizationTab    = lazy(() => import('./components/dashboard/OrganizationTab'));
const ColetaDoDiaTab     = lazy(() => import('./components/dashboard/ColetaDoDiaTab'));
const AutomationsTab     = lazy(() => import('./components/dashboard/AutomationsTab'));
const HandoverTab        = lazy(() => import('./components/dashboard/HandoverTab'));
const ExternalUsersManager = lazy(() => import('./components/dashboard/third-party/ExternalUsersManager'));
const ExternalPortal     = lazy(() => import('./components/dashboard/third-party/ExternalPortal'));
const NaviosTab          = lazy(() => import('./components/dashboard/ships/NaviosTab'));

const TabFallback = () => (
  <div className="flex-1 flex items-center justify-center py-24">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── ErrorBoundary — captura erros de runtime e chunks do Vercel ──────────────
interface EBState { hasError: boolean; isChunkError: boolean; msg: string }
class TabErrorBoundary extends React.Component<
  { children: React.ReactNode; tabKey: string },
  EBState
> {
  state: EBState = { hasError: false, isChunkError: false, msg: '' };

  static getDerivedStateFromError(err: any): EBState {
    const msg: string = err?.message ?? String(err);
    const isChunkError =
      err?.name === 'ChunkLoadError' ||
      /loading chunk|loading css chunk|failed to fetch dynamically imported/i.test(msg);
    return { hasError: true, isChunkError, msg };
  }

  componentDidCatch(err: any) {
    // ChunkLoadError após deploy do Vercel → recarrega a página automaticamente
    if (this.state.isChunkError) {
      console.warn('[ErrorBoundary] ChunkLoadError detectado — recarregando...', err?.message);
      window.location.reload();
    } else {
      console.error('[ErrorBoundary] Erro capturado:', err);
    }
  }

  componentDidUpdate(prev: { tabKey: string }) {
    // Limpa o erro ao trocar de aba (permite o usuário navegar normalmente)
    if (prev.tabKey !== this.props.tabKey && this.state.hasError) {
      this.setState({ hasError: false, isChunkError: false, msg: '' });
    }
  }

  render() {
    if (this.state.hasError && !this.state.isChunkError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-700 uppercase tracking-widest mb-1">Algo deu errado</p>
            <p className="text-xs text-slate-400 font-medium max-w-xs">{this.state.msg || 'Erro inesperado nesta página.'}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, isChunkError: false, msg: '' })}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30">
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [avantidaRecords, setAvantidaRecords] = useState<AvantidaRecord[]>([]);
  const [sealBatches, setSealBatches] = useState<SealBatch[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [ships, setShips] = useState<MonitoredShip[]>([]);
  
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));

  const [feedback, setFeedback] = useState<{ show: boolean; title: string; message: string; type: any; onConfirm?: () => void }>({
    show: false, title: '', message: '', type: 'info'
  });

  const [isDeleteTripModalOpen, setIsDeleteTripModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [opsView, setOpsView] = useState<{ type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string }>({ type: 'list' });
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // CONSTRUÇÃO DINÂMICA DAS OPERAÇÕES BASEADA NO BANCO DE DADOS
  const availableOps = useMemo<OperationDefinition[]>(() => {
    return categories
      .filter(cat => !cat.parentId) // Apenas categorias principais
      .map(cat => {
        // Busca clientes que possuem esta categoria vinculada em seu perfil
        const linkedClients = customers
          .filter(c => c.operations?.some(op => op.toUpperCase() === cat.name.toUpperCase()))
          .map(c => ({ name: c.name, hasDedicatedPage: true }));

        return {
          id: cat.id,
          category: cat.name,
          color: cat.color,
          clients: linkedClients
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [categories, customers]);

  const loadAllData = useCallback(async (isInitial = false, silent = false) => {
    if (isInitial) setIsLoadingInitial(true);
    if (!silent) setIsSyncing(true);

    try {
      const responses = await Promise.allSettled([
        db.getDrivers(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking(),
        db.getStaff(),
        db.getTrips(),
        db.getCategories(),
        db.getAvantidaRecords(),
        db.getSealBatches(),
        db.getEmailTemplates(),
        db.getBeneficiaries(),
        db.getMonitoredShips()
      ]);

      if (responses[0].status === 'fulfilled') setDrivers(responses[0].value);
      if (responses[1].status === 'fulfilled') setCustomers(responses[1].value);
      if (responses[2].status === 'fulfilled') setPorts(responses[2].value);
      if (responses[3].status === 'fulfilled') setPreStacking(responses[3].value);
      if (responses[4].status === 'fulfilled') setStaffList(responses[4].value);
      if (responses[5].status === 'fulfilled') setTrips(responses[5].value);
      if (responses[6].status === 'fulfilled') setCategories(responses[6].value);
      if (responses[7].status === 'fulfilled') setAvantidaRecords(responses[7].value);
      if (responses[8].status === 'fulfilled') setSealBatches(responses[8].value);
      if (responses[9].status === 'fulfilled') setEmailTemplates(responses[9].value);
      if (responses[10].status === 'fulfilled') setBeneficiaries(responses[10].value);
      if (responses[11].status === 'fulfilled') setShips(responses[11].value);

      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
      console.error("Erro na sincronização ALS:", e);
    } finally {
      setIsLoadingInitial(false);
      if (!silent) setIsSyncing(false);
    }
  }, []);

  // Atualiza apenas trips — usado pelo realtime para evitar recarregar todas as 12 tabelas
  const loadTripsOnly = useCallback(async () => {
    try {
      const data = await db.getTrips();
      setTrips(data);
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
      console.error('[loadTripsOnly]', e);
    }
  }, []);

  useEffect(() => {
    // Purga silenciosa de registros com mais de 90 dias (form_history + notifications)
    db.purgeOldHistory().catch(() => {});

    loadAllData(true);

    // Polling de 5 minutos — fallback caso o realtime caia; realtime cobre as mudanças frequentes
    const refreshDataInterval = setInterval(() => loadAllData(false, true), 300000);

    // Debounce de 3s: só recarrega trips (não as 12 tabelas); aguarda rajadas de updates em lote
    const debouncedTripsRefresh = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => loadTripsOnly(), 3000);
    };

    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, debouncedTripsRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'seal_records' }, debouncedTripsRefresh)
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') setIsRealtimeActive(true);
        });
    }

    const handleGlobalRefresh = () => loadAllData(false);
    window.addEventListener('als_force_global_refresh', handleGlobalRefresh);

    return () => {
      clearInterval(refreshDataInterval);
      if (channel) supabase?.removeChannel(channel);
      window.removeEventListener('als_force_global_refresh', handleGlobalRefresh);
    };
  }, [loadAllData, loadTripsOnly]);

  const handleDeleteTripRequest = (id: string) => {
    const trip = trips.find(t => t.id === id);
    if (trip) {
      setTripToDelete(trip);
      setIsDeleteTripModalOpen(true);
    }
  };

  const executeDeleteTrip = async () => {
    if (!tripToDelete) return;
    setIsDeleting(true);
    try {
      const success = await db.deleteTrip(tripToDelete.id, user);
      if (success) {
        await loadAllData(false);
        setIsDeleteTripModalOpen(false);
        setTripToDelete(null);
      }
    } catch (e) {
      setFeedback({ show: true, title: 'Erro Crítico', message: 'Falha na comunicação.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoadingInitial) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-6">ALS Transportes...</p>
      </div>
    );
  }

  const cycleSidebar = () => {
    setSidebarState(current => {
      if (current === 'open') return 'collapsed';
      if (current === 'collapsed') return 'hidden';
      return 'open';
    });
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      <NotificationToast />
      <SimpleToast />
      
      <FeedbackModal 
        isOpen={feedback.show} 
        onClose={() => setFeedback({ ...feedback, show: false })}
        title={feedback.title}
        message={feedback.message}
        type={feedback.type}
        onConfirm={feedback.onConfirm}
      />
      

      <Sidebar 
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarState={sidebarState}
        setSidebarState={setSidebarState}
        expandedMenus={expandedMenus}
        setExpandedMenus={setExpandedMenus}
        availableOps={availableOps}
        setOpsView={setOpsView}
        staffList={staffList}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-40">
           <div className="flex items-center gap-5">
              <button onClick={cycleSidebar} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-90 border border-transparent hover:border-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 12h16m-7 6h7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{activeTab}</h2>
           </div>
           <div className="flex items-center gap-4">
              <DatabaseStatus />
              <EmailCenter user={user} trips={trips} />
              <NotificationCenter user={user} />
              <UserProfile user={user} />
           </div>
        </header>
        
        <div id="dashboard-scroll" className="flex-1 overflow-y-auto overflow-x-hidden p-10 bg-[#f8fafc] custom-scrollbar">
         <TabErrorBoundary tabKey={activeTab}>
         <Suspense fallback={<TabFallback />}>
           {activeTab === DashboardTab.INICIO && (
             <OverviewTab 
               trips={trips} 
               drivers={drivers} 
               avantidaRecords={avantidaRecords}
               sealBatches={sealBatches}
               onRefresh={() => loadAllData(false)} 
               lastSyncTime={lastSyncTime} 
               isSyncing={isSyncing} 
               user={user}
             />
           )}
           {activeTab === DashboardTab.HANDOVER && (
             <HandoverTab
               user={user}
               trips={trips}
               drivers={drivers}
               customers={customers}
               ports={ports}
               staffList={staffList}
             />
           )}
           {activeTab === DashboardTab.OPERACOES && (
             <OperationsTab 
               user={user} 
               availableOps={availableOps} 
               drivers={drivers} 
               customers={customers} 
               ports={ports}
               trips={trips}
               categories={categories}
               preStacking={preStacking}
               activeView={opsView} 
               setActiveView={setOpsView} 
               onDeleteTrip={handleDeleteTripRequest}
               onRefresh={() => loadAllData(false)}
             />
           )}
           {activeTab === DashboardTab.ESTADIAS && <StaysTab categories={categories} userId={user.id} />}
           {activeTab === DashboardTab.DOCUMENTOS && <DocumentsTab userId={user.id} trips={trips} onUpdateTrip={async (t) => { await db.saveTrip(t, user); await loadAllData(false); }} />}
           {activeTab === DashboardTab.ADMINISTRATIVO && <AdminTab user={user} />}
           {activeTab === DashboardTab.LOGINS && <LoginsTab />}
           {activeTab === DashboardTab.LACRES && <LacresTab userId={user.id} />}
           {activeTab === DashboardTab.AVANTIDA && <AvantidaTab userId={user.id} />}
           {activeTab === DashboardTab.MOTORISTAS && <DriversTab userId={user.id} drivers={drivers} customers={customers} onSaveDriver={async (d, id) => { await db.saveDriver({...d, id: id || `drv-${Date.now()}`} as Driver, user); await loadAllData(false); }} onDeleteDriver={async id => { await db.deleteDriver(id); await loadAllData(false); }} availableOps={availableOps} />}
           {activeTab === DashboardTab.BENEFICIARIOS && <BeneficiariesTab userId={user.id} beneficiaries={beneficiaries} onSave={async (b) => { await db.saveBeneficiary(b); await loadAllData(false); }} onDelete={async (id) => { await db.deleteBeneficiary(id); await loadAllData(false); }} />}
           {activeTab === DashboardTab.CLIENTES && <CustomersTab userId={user.id} customers={customers} onSaveCustomer={async (c, id) => {
              const success = await db.saveCustomer({...c, id: id || `cust-${Date.now()}`} as Customer, user);
              if (success) {
                await loadAllData(false);
                setFeedback({ show: true, title: 'Sucesso', message: 'Cliente salvo com sucesso!', type: 'success' });
              } else {
                setFeedback({ show: true, title: 'Erro', message: 'Falha ao salvar cliente. Verifique o console.', type: 'error' });
              }
            }} onDeleteCustomer={async id => { if(confirm('Excluir cliente?')) { await db.deleteCustomer(id); await loadAllData(false); } }} isAdmin={user.role === 'admin'} />}
           {activeTab === DashboardTab.COLABORADORES && <StaffTab staffList={staffList} currentUser={user} onSaveStaff={async (s, p) => { await db.saveStaff(s, p); await loadAllData(false); }} onDeleteStaff={async id => { await db.deleteStaff(id); await loadAllData(true); }} categories={categories} />}
           {activeTab === DashboardTab.FORMULARIOS && <FormsTab user={user} drivers={drivers} customers={customers} ports={ports} preStacking={preStacking} />}
           {activeTab === DashboardTab.PORTOS && <PortsTab userId={user.id} ports={ports} onSavePort={async (p, id) => {
              const success = await db.savePort({...p, id: id || `prt-${Date.now()}`} as Port, user); 
              if (success) {
                await loadAllData(false);
                setFeedback({ show: true, title: 'Sucesso', message: 'Porto salvo com sucesso!', type: 'success' });
              } else {
                setFeedback({ show: true, title: 'Erro', message: 'Falha ao salvar porto. Verifique o console.', type: 'error' });
              }
            }} onDeletePort={async id => { if(confirm('Excluir porto?')) { await db.deletePort(id); await loadAllData(false); } }} />}
           {activeTab === DashboardTab.PRE_STACKING && <PreStackingTab userId={user.id} preStacking={preStacking} onSavePreStacking={async (p, id) => {
              const success = await db.savePreStacking({...p, id: id || `ps-${Date.now()}`} as PreStacking, user); 
              if (success) {
                await loadAllData(false);
                setFeedback({ show: true, title: 'Sucesso', message: 'Unidade salva com sucesso!', type: 'success' });
              } else {
                setFeedback({ show: true, title: 'Erro', message: 'Falha ao salvar unidade. Verifique o console.', type: 'error' });
              }
            }} onDeletePreStacking={async id => { if(confirm('Excluir unidade?')) { await db.deletePreStacking(id); await loadAllData(false); } }} />}
           {activeTab === DashboardTab.SISTEMA && <SystemTab onRefresh={() => loadAllData(false)} driversCount={drivers.length} customersCount={customers.length} portsCount={ports.length} />}
           {activeTab === DashboardTab.AUTOMACOES && <AutomationsTab />}
           {activeTab === DashboardTab.NAVIOS && <NaviosTab user={user} trips={trips} />}
           {activeTab === DashboardTab.ORGANIZACAO && (
             <OrganizationTab
               userId={user.id}
               trips={trips}
               ports={ports}
               preStacking={preStacking}
               drivers={drivers}
               customers={customers}
               onRefresh={() => loadAllData(false)}
             />
           )}
           {activeTab === DashboardTab.COLETA_DIA && (
             <ColetaDoDiaTab 
               userId={user.id} 
               trips={trips} 
               emailTemplates={emailTemplates}
               onRefresh={() => loadAllData(false)} 
             />
           )}
           {activeTab === DashboardTab.EXTERNAL_USERS && (
             <ExternalUsersManager onRefresh={() => loadAllData(false)} />
           )}
           {activeTab === DashboardTab.EXTERNAL_PORTAL && (
             <ExternalPortal user={user} trips={trips} />
           )}
         </Suspense>
         </TabErrorBoundary>
        </div>
      </main>

      {isDeleteTripModalOpen && tripToDelete && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-100">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/>
                    </svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Excluir Viagem</h3>
                    <p className="text-sm text-slate-400 mt-2">Deseja remover permanentemente esta programação?</p>
                    <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-1">
                       <p className="text-[9px] font-black text-blue-600 uppercase">OS:</p>
                       <p className="text-sm font-black text-slate-700 uppercase">{tripToDelete.os}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                      onClick={() => { setIsDeleteTripModalOpen(false); setTripToDelete(null); }}
                      className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      disabled={isDeleting}
                      onClick={executeDeleteTrip}
                      className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
