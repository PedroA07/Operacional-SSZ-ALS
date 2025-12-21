
import React, { useState, useEffect } from 'react';
import { User, Driver, VWSchedule, DashboardTab, VWStatus, Customer, Port, PreStacking } from '../types';
import { GoogleGenAI } from '@google/genai';
import OverviewTab from './dashboard/OverviewTab';
import DriversTab from './dashboard/DriversTab';
import VWTab from './dashboard/VWTab';
import FormsTab from './dashboard/FormsTab';
import CustomersTab from './dashboard/CustomersTab';
import PortsTab from './dashboard/PortsTab';
import PreStackingTab from './dashboard/PreStackingTab';

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.INICIO);
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>('Analise de rota pendente...');
  
  const [drivers, setDrivers] = useState<Driver[]>([
    { 
      id: 'drv1', name: 'RICARDO SILVA', cpf: '123.456.789-00', rg: '12.345.678-9', cnh: '12345678901', 
      plateHorse: 'ABC-1234', plateTrailer: 'XYZ-9876', operations: [], phone: '(11) 98888-7777', email: 'ricardo@ssz.com', 
      whatsappGroupName: 'ALS FROTAS NORTE', whatsappGroupLink: 'https://chat.whatsapp.com/test1', tripsCount: 12,
      registrationDate: '01/10/2023', status: 'Ativo', statusLastChangeDate: '01/10/2023', driverType: 'Frota'
    }
  ]);

  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 'cust1',
      name: 'VOLKSWAGEN DO BRASIL',
      address: 'Rua Volkswagen, 123',
      neighborhood: 'Distrito Industrial',
      city: 'Taubaté',
      state: 'SP',
      zipCode: '12000-000',
      cnpj: '59.104.422/0001-50',
      registrationDate: '10/01/2023',
      operations: ['Aliança']
    }
  ]);

  const [ports, setPorts] = useState<Port[]>([
    {
      id: 'port1',
      name: 'PORTO DE SANTOS (BTP)',
      address: 'Avenida Engenheiro Augusto Barata, s/n',
      neighborhood: 'Alemoa',
      city: 'Santos',
      state: 'SP',
      zipCode: '11095-907',
      cnpj: '11.455.039/0001-34',
      registrationDate: '15/05/2023'
    }
  ]);

  const [preStacking, setPreStacking] = useState<PreStacking[]>([
    {
      id: 'pre1',
      name: 'EQUALIP (CUBATÃO)',
      cnpj: '12.345.678/0001-90',
      zipCode: '11570-000',
      address: 'Rodovia Cônego Domênico Rangoni, s/n',
      neighborhood: 'Distrito Industrial',
      city: 'Cubatão',
      state: 'SP',
      registrationDate: '20/08/2023'
    }
  ]);

  const [vwSchedules, setVwSchedules] = useState<VWSchedule[]>([
    {
      id: '101', dateTime: '2023-10-27T08:30', os: 'VW-99231', container: 'SUDU772134-2', cva: 'CVA-8821',
      driverName: 'RICARDO SILVA', cpf: '123.456.789-00', plateHorse: 'ABC-1234', plateTrailer: 'XYZ-9876',
      origin: 'Cragea - SJC', destination: 'VW - Taubaté', status: 'Pendente'
    }
  ]);

  useEffect(() => {
    fetchAiInsights();
  }, [activeTab]);

  const fetchAiInsights = async () => {
    setLoadingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = "Crie uma frase curta e motivacional sobre logística e eficiência operacional.";
      if (activeTab === DashboardTab.PRE_STACKING) prompt = "Uma frase curta sobre a importância do pré-stacking e terminais retroportuários.";
      if (activeTab === DashboardTab.PORTOS) prompt = "Uma frase curta sobre eficiência portuária.";
      
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiInsight(response.text || 'Operação segura e eficiente.');
    } catch (err) {
      setAiInsight('Excelência em cada quilômetro rodado.');
    } finally {
      setLoadingInsight(false);
    }
  };

  const onSaveDriver = (driverData: Partial<Driver>, id?: string) => {
    const today = new Date().toLocaleDateString('pt-BR');
    if (id) {
      setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...driverData } as Driver : d));
    } else {
      const newDriver: Driver = {
        ...driverData,
        id: Math.random().toString(36).substr(2, 9),
        registrationDate: today,
        status: driverData.status || 'Ativo',
        tripsCount: 0
      } as Driver;
      setDrivers(prev => [...prev, newDriver]);
    }
  };

  const onSaveCustomer = (customerData: Partial<Customer>, id?: string) => {
    if (id) {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...customerData } as Customer : c));
    } else {
      const newCustomer: Customer = {
        ...customerData,
        id: Math.random().toString(36).substr(2, 9),
        registrationDate: new Date().toLocaleDateString('pt-BR')
      } as Customer;
      setCustomers(prev => [...prev, newCustomer]);
    }
  };

  const onSavePort = (portData: Partial<Port>, id?: string) => {
    if (id) {
      setPorts(prev => prev.map(p => p.id === id ? { ...p, ...portData } as Port : p));
    } else {
      const newPort: Port = {
        ...portData,
        id: Math.random().toString(36).substr(2, 9),
        registrationDate: new Date().toLocaleDateString('pt-BR')
      } as Port;
      setPorts(prev => [...prev, newPort]);
    }
  };

  const onSavePreStacking = (data: Partial<PreStacking>, id?: string) => {
    if (id) {
      setPreStacking(prev => prev.map(p => p.id === id ? { ...p, ...data } as PreStacking : p));
    } else {
      const newEntry: PreStacking = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        registrationDate: new Date().toLocaleDateString('pt-BR')
      } as PreStacking;
      setPreStacking(prev => [...prev, newEntry]);
    }
  };

  const onSaveVWSchedule = (data: Partial<VWSchedule>, id?: string) => {
    if (id) {
      setVwSchedules(prev => prev.map(s => s.id === id ? { ...s, ...data } as VWSchedule : s));
    } else {
      const newSchedule: VWSchedule = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        status: 'Pendente'
      } as VWSchedule;
      setVwSchedules(prev => [...prev, newSchedule]);
    }
  };

  const onUpdateVWStatus = (id: string, status: VWStatus, time: string) => {
    setVwSchedules(prev => prev.map(s => s.id === id ? { ...s, status } as VWSchedule : s));
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-600">
      <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col">
        <div className="p-8 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-inner font-black italic">ALS</div>
          <span className="font-bold text-slate-100 tracking-wider text-xs uppercase">ALS Transportes</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          {[
            { id: DashboardTab.INICIO, label: 'Inicio', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6h6zm7 0V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v10h6zm7 0v-8a2 2 0 00-2-2h-2a2 2 0 00-2 2v8h6z' },
            { id: DashboardTab.MOTORISTAS, label: 'Motoristas', icon: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-18v8m-5.66 5.66L12 12m5.66 5.66L12 12' },
            { id: DashboardTab.CLIENTES, label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { id: DashboardTab.PORTOS, label: 'Portos', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { id: DashboardTab.PRE_STACKING, label: 'Pré-Stacking', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
            { id: DashboardTab.VOLKSWAGEN, label: 'Volkswagen', customIcon: <img src="https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg" className="w-5 h-5 object-contain grayscale brightness-200" alt="VW" /> },
            { id: DashboardTab.FORMULARIOS, label: 'Formulários', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as DashboardTab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-slate-100'}`}>
              {tab.customIcon ? tab.customIcon : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={(tab as any).icon} /></svg>}
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full py-2 text-[9px] text-red-400 font-bold hover:text-red-300 uppercase tracking-widest transition-colors">Sair</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{activeTab.replace('_', ' ')}</h2>
          <div className="flex items-center gap-4">
             <div className="text-right leading-tight">
               <p className="text-xs font-bold text-slate-700 uppercase">{user?.username}</p>
               <p className="text-[9px] text-emerald-500 font-black uppercase tracking-tighter">Status: Ativo</p>
             </div>
             <div className="w-9 h-9 bg-slate-100 rounded-full border-2 border-slate-200 flex items-center justify-center font-black text-[10px] text-slate-400 italic">ALS</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === DashboardTab.INICIO && <OverviewTab vwCount={vwSchedules.length} driversCount={drivers.length} routesCount={1} loadingInsight={loadingInsight} aiInsight={aiInsight} />}
          {activeTab === DashboardTab.MOTORISTAS && <DriversTab drivers={drivers} onSaveDriver={onSaveDriver} />}
          {activeTab === DashboardTab.CLIENTES && <CustomersTab customers={customers} onSaveCustomer={onSaveCustomer} />}
          {activeTab === DashboardTab.PORTOS && <PortsTab ports={ports} onSavePort={onSavePort} />}
          {activeTab === DashboardTab.PRE_STACKING && <PreStackingTab preStacking={preStacking} onSavePreStacking={onSavePreStacking} />}
          {activeTab === DashboardTab.VOLKSWAGEN && <VWTab schedules={vwSchedules} drivers={drivers} onSaveSchedule={onSaveVWSchedule} onUpdateStatus={onUpdateVWStatus} />}
          {activeTab === DashboardTab.FORMULARIOS && <FormsTab drivers={drivers} customers={customers} ports={ports} />}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
