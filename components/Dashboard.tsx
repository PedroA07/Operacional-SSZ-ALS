
import React, { useState, useEffect, useCallback } from 'react';
import { User, Driver, DashboardTab, Port, PreStacking, Customer, OperationDefinition, Staff, Trip, Category } from '../types';
import OverviewTab from './dashboard/OverviewTab';
import DriversTab from './dashboard/DriversTab';
import FormsTab from './dashboard/FormsTab';
import CustomersTab from './dashboard/CustomersTab';
import PortsTab from './dashboard/PortsTab';
import PreStackingTab from './dashboard/PreStackingTab';
import OperationsTab from './dashboard/OperationsTab';
import AdminTab from './dashboard/AdminTab';
import StaffTab from './dashboard/StaffTab';
import SystemTab from './dashboard/SystemTab';
import DocumentsTab from './dashboard/DocumentsTab';
import Sidebar from './dashboard/Sidebar';
import DatabaseStatus from './dashboard/DatabaseStatus';
import UserProfile from './dashboard/UserProfile';
import NotificationCenter from './dashboard/notifications/NotificationCenter';
import { DEFAULT_OPERATIONS } from '../constants/operations';
import { db } from '../utils/storage';

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
  const [availableOps] = useState<OperationDefinition[]>(DEFAULT_OPERATIONS);
  const [isLoading, setIsLoading] = useState(true);

  const [isDeleteTripModalOpen, setIsDeleteTripModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [opsView, setOpsView] = useState<{ type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string }>({ type: 'list' });

  const loadAllData = useCallback(async () => {
    try {
      const [d, c, p, ps, s, t, cats] = await Promise.all([
        db.getDrivers(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking(),
        db.getStaff(),
        db.getTrips(),
        db.getCategories()
      ]);

      setDrivers(d || []);
      setCustomers(c || []);
      setPorts(p || []);
      setPreStacking(ps || []);
      setStaffList(s || []);
      setTrips(t || []);
      setCategories(cats || []);
    } catch (e) {
      console.error("Erro na sincronização Direta:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadAllData();
    const refreshDataInterval = setInterval(loadAllData, 15000);
    const handleGlobalRefresh = () => loadAllData();
    window.addEventListener('als_force_global_refresh', handleGlobalRefresh);
    return () => {
      clearInterval(refreshDataInterval);
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
        await loadAllData();
        setIsDeleteTripModalOpen(false);
        setTripToDelete(null);
      } else {
        alert("Não foi possível excluir. Verifique sua conexão com o banco.");
      }
    } catch (e) {
      alert('Erro crítico de comunicação.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-6">Sincronizando com a nuvem ALS...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
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
              <button onClick={() => setSidebarState(s => s === 'open' ? 'collapsed' : 'open')} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-90 border border-transparent hover:border-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 12h16m-7 6h7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em]">{activeTab}</h2>
           </div>
           <div className="flex items-center gap-4">
              <DatabaseStatus />
              <NotificationCenter user={user} />
              <UserProfile user={user} />
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-10 bg-[#f8fafc] custom-scrollbar">
           {activeTab === DashboardTab.INICIO && <OverviewTab trips={trips} drivers={drivers} />}
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
               onRefresh={loadAllData}
             />
           )}
           {activeTab === DashboardTab.DOCUMENTOS && <DocumentsTab userId={user.id} trips={trips} onUpdateTrip={async (t) => { await db.saveTrip(t, user); await loadAllData(); }} />}
           {activeTab === DashboardTab.ADMINISTRATIVO && <AdminTab user={user} />}
           {activeTab === DashboardTab.MOTORISTAS && <DriversTab drivers={drivers} customers={customers} onSaveDriver={async (d, id) => { await db.saveDriver({...d, id: id || `drv-${Date.now()}`} as Driver, user); await loadAllData(); }} onDeleteDriver={async id => { await db.deleteDriver(id); await loadAllData(); }} availableOps={availableOps} />}
           {activeTab === DashboardTab.CLIENTES && <CustomersTab customers={customers} onSaveCustomer={async (c, id) => { await db.saveCustomer({...c, id: id || `cust-${Date.now()}`} as Customer, user); await loadAllData(); }} onDeleteCustomer={async id => { if(confirm('Excluir cliente?')) { await db.deleteCustomer(id); await loadAllData(); } }} isAdmin={user.role === 'admin'} />}
           {activeTab === DashboardTab.COLABORADORES && <StaffTab staffList={staffList} currentUser={user} onSaveStaff={async (s, p) => { await db.saveStaff(s, p); await loadAllData(); }} onDeleteStaff={async id => { await db.deleteStaff(id); await loadAllData(); }} />}
           {activeTab === DashboardTab.FORMULARIOS && <FormsTab drivers={drivers} customers={customers} ports={ports} preStacking={preStacking} />}
           {activeTab === DashboardTab.PORTOS && <PortsTab ports={ports} onSavePort={async (p, id) => { await db.savePort({...p, id: id || `prt-${Date.now()}`} as Port, user); await loadAllData(); }} onDeletePort={async id => { if(confirm('Excluir porto?')) { await db.deletePort(id); await loadAllData(); } }} />}
           {activeTab === DashboardTab.PRE_STACKING && <PreStackingTab preStacking={preStacking} onSavePreStacking={async (p, id) => { await db.savePreStacking({...p, id: id || `ps-${Date.now()}`} as PreStacking, user); await loadAllData(); }} onDeletePreStacking={async id => { if(confirm('Excluir unidade?')) { await db.deletePreStacking(id); await loadAllData(); } }} />}
           {activeTab === DashboardTab.SISTEMA && <SystemTab onRefresh={loadAllData} driversCount={drivers.length} customersCount={customers.length} portsCount={ports.length} />}
        </div>
      </main>

      {isDeleteTripModalOpen && tripToDelete && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
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
