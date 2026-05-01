
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Driver, DashboardTab, Port, PreStacking, Customer, OperationDefinition, Staff, Trip, Category, AvantidaRecord, SealBatch, EmailTemplate } from './types';
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
import DocumentsTab from './components/dashboard/DocumentsTab';
import StaysTab from './components/dashboard/StaysTab';
import LoginsTab from './components/dashboard/LoginsTab';
import LacresTab from './components/dashboard/LacresTab';
import AvantidaTab from './components/dashboard/AvantidaTab';
import OrganizationTab from './components/dashboard/OrganizationTab';
import ColetaDoDiaTab from './components/dashboard/ColetaDoDiaTab';
import AutomationsTab from './components/dashboard/AutomationsTab';
import ExternalUsersManager from './components/dashboard/third-party/ExternalUsersManager';
import ExternalPortal from './components/dashboard/third-party/ExternalPortal';
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
        db.getEmailTemplates()
      ]);

      if (responses[0].status === 'fulfilled') setDrivers(responses[0].value);
      if (responses[1].status === 'fulfilled') setCustomers(responses[1].value);
      if (responses[2].status === 'fulfilled') setPorts(responses[2].value);
      if (responses[3].status === 'fulfilled') setPreStacking(responses[3].value);
      if (responses[4].status === 'fulfilled') setStaffList(responses[4].value);
      if (responses[5].status === 'fulfilled') {
        console.log("Trips carregadas:", responses[5].value);
        setTrips(responses[5].value);
      }
      if (responses[6].status === 'fulfilled') setCategories(responses[6].value);
      if (responses[7].status === 'fulfilled') setAvantidaRecords(responses[7].value);
      if (responses[8].status === 'fulfilled') setSealBatches(responses[8].value);
      if (responses[9].status === 'fulfilled') setEmailTemplates(responses[9].value);

      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (e) {
      console.error("Erro na sincronização ALS:", e);
    } finally {
      setIsLoadingInitial(false);
      if (!silent) setIsSyncing(false);
    }
  }, []);

  useEffect(() => { 
    loadAllData(true);

    const refreshDataInterval = setInterval(() => loadAllData(false, true), 30000);

    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
          loadAllData(false, true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'seal_records' }, () => {
          loadAllData(false, true);
        })
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
  }, [loadAllData]);

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
      
      {(isSyncing || isRealtimeActive) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-top-4">
           <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-50 animate-pulse' : 'bg-emerald-50'}`}></div>
           <span className="text-[8px] font-black text-white uppercase tracking-widest">
             {isSyncing ? 'Sincronizando...' : 'Tempo Real Ativo'}
           </span>
        </div>
      )}

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
        
        <div id="dashboard-scroll" className="flex-1 overflow-y-auto p-10 bg-[#f8fafc] custom-scrollbar">
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
           {activeTab === DashboardTab.LACRES && <LacresTab />}
           {activeTab === DashboardTab.AVANTIDA && <AvantidaTab userId={user.id} />}
           {activeTab === DashboardTab.MOTORISTAS && <DriversTab drivers={drivers} customers={customers} onSaveDriver={async (d, id) => { await db.saveDriver({...d, id: id || `drv-${Date.now()}`} as Driver, user); await loadAllData(false); }} onDeleteDriver={async id => { await db.deleteDriver(id); await loadAllData(false); }} availableOps={availableOps} />}
           {activeTab === DashboardTab.CLIENTES && <CustomersTab customers={customers} onSaveCustomer={async (c, id) => { 
              const success = await db.saveCustomer({...c, id: id || `cust-${Date.now()}`} as Customer, user); 
              if (success) {
                await loadAllData(false);
                setFeedback({ show: true, title: 'Sucesso', message: 'Cliente salvo com sucesso!', type: 'success' });
              } else {
                setFeedback({ show: true, title: 'Erro', message: 'Falha ao salvar cliente. Verifique o console.', type: 'error' });
              }
            }} onDeleteCustomer={async id => { if(confirm('Excluir cliente?')) { await db.deleteCustomer(id); await loadAllData(false); } }} isAdmin={user.role === 'admin'} />}
           {activeTab === DashboardTab.COLABORADORES && <StaffTab staffList={staffList} currentUser={user} onSaveStaff={async (s, p) => { await db.saveStaff(s, p); await loadAllData(false); }} onDeleteStaff={async id => { await db.deleteStaff(id); await loadAllData(true); }} categories={categories} />}
           {activeTab === DashboardTab.FORMULARIOS && <FormsTab drivers={drivers} customers={customers} ports={ports} preStacking={preStacking} />}
           {activeTab === DashboardTab.PORTOS && <PortsTab ports={ports} onSavePort={async (p, id) => { 
              const success = await db.savePort({...p, id: id || `prt-${Date.now()}`} as Port, user); 
              if (success) {
                await loadAllData(false);
                setFeedback({ show: true, title: 'Sucesso', message: 'Porto salvo com sucesso!', type: 'success' });
              } else {
                setFeedback({ show: true, title: 'Erro', message: 'Falha ao salvar porto. Verifique o console.', type: 'error' });
              }
            }} onDeletePort={async id => { if(confirm('Excluir porto?')) { await db.deletePort(id); await loadAllData(false); } }} />}
           {activeTab === DashboardTab.PRE_STACKING && <PreStackingTab preStacking={preStacking} onSavePreStacking={async (p, id) => { 
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
           {activeTab === DashboardTab.ORGANIZACAO && (
             <OrganizationTab 
               userId={user.id} 
               trips={trips} 
               ports={ports} 
               preStacking={preStacking}
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
