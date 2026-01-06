
import React, { useState, useEffect, useCallback } from 'react';
import { User, Trip, Driver } from '../../types';
import { db } from '../../utils/storage';
import { timeUtils } from '../../utils/timeUtils';
import HomeTab from './tabs/HomeTab';
import TripsTab from './tabs/TripsTab';
import DocsTab from './tabs/DocsTab';
import ProfileTab from './tabs/ProfileTab';

interface DriverPortalProps {
  user: User;
  onLogout: () => void;
}

const DriverPortal: React.FC<DriverPortalProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'inicio' | 'viagens' | 'docs' | 'perfil'>('inicio');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTime, setSessionTime] = useState('00:00:00');

  const loadData = useCallback(async () => {
    try {
      const [allTrips, allDrivers] = await Promise.all([
        db.getTrips(),
        db.getDrivers()
      ]);

      console.log("Debug Portal - user.driverId:", user.driverId);
      
      // Filtro robusto: Verifica o ID do motorista no snapshot da viagem
      const myTrips = allTrips
        .filter(t => {
           const tripDriverId = t.driver?.id;
           return tripDriverId && user.driverId && String(tripDriverId) === String(user.driverId);
        })
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      
      console.log("Debug Portal - Viagens filtradas:", myTrips.length);
      setTrips(myTrips);

      const myData = allDrivers.find(d => String(d.id) === String(user.driverId));
      if (myData) setDriver(myData);
    } catch (e) {
      console.error("Erro ao carregar portal:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user.driverId]);

  useEffect(() => {
    loadData();
    const syncInterval = setInterval(loadData, 30000);
    const clockInterval = setInterval(() => {
      setSessionTime(timeUtils.calculateDuration(user.lastLogin));
    }, 1000);
    
    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, [loadData, user.lastLogin]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617] text-white">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Sincronizando Frota ALS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans select-none pb-28">
      {/* HEADER MOBILE */}
      <header className="p-6 pt-12 flex justify-between items-center shrink-0 bg-slate-950/50 border-b border-white/5">
        <div>
           <div className="flex items-center gap-2 mb-1.5">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sessionTime}</p>
           </div>
           <h1 className="text-xl font-black uppercase tracking-tight leading-none text-white">Olá, {user.displayName.split(' ')[0]}</h1>
           <div className="flex items-center gap-3 mt-2">
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-blue-500 uppercase tracking-tighter">Cavalo</span>
                <span className="text-[10px] font-mono font-black text-white">{driver?.plateHorse || '---'}</span>
              </div>
              <div className="w-[1px] h-4 bg-white/10"></div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Carreta</span>
                <span className="text-[10px] font-mono font-black text-white">{driver?.plateTrailer || '---'}</span>
              </div>
           </div>
        </div>
        <div className="w-14 h-14 rounded-[1.3rem] bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-white/5">
          {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <span className="font-black text-blue-400 italic">ALS</span>}
        </div>
      </header>

      {/* CONTEÚDO DINÂMICO */}
      <main className="flex-1 px-5 pt-8 overflow-y-auto custom-scrollbar">
        {activeTab === 'inicio' && <HomeTab user={user} trips={trips} onRefresh={loadData} />}
        {activeTab === 'viagens' && <TripsTab trips={trips} />}
        {activeTab === 'docs' && <DocsTab trips={trips} />}
        {activeTab === 'perfil' && <ProfileTab user={user} driver={driver} onLogout={onLogout} />}
      </main>

      {/* NAVEGAÇÃO INFERIOR */}
      <nav className="fixed bottom-0 left-0 w-full h-24 bg-slate-950/90 backdrop-blur-3xl border-t border-white/10 flex items-center justify-around px-6 z-50 pb-4">
        {[
          { id: 'inicio', label: 'Início', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { id: 'viagens', label: 'Viagens', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
          { id: 'docs', label: 'Docs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { id: 'perfil', label: 'Perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === tab.id ? 'text-blue-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d={tab.icon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DriverPortal;
