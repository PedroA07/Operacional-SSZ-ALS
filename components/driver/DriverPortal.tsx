
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Trip, Driver } from '../../types';
import { timeUtils } from '../../utils/timeUtils';
import { db } from '../../utils/storage';
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
  
  const gpsWatchRef = useRef<number | null>(null);

  const loadPortalData = useCallback(async () => {
    try {
      const [allDrivers, allTrips] = await Promise.all([
        db.getDrivers(),
        db.getTrips()
      ]);

      const currentDriver = allDrivers.find(d => String(d.id) === String(user.driverId));
      const myTrips = allTrips.filter(t => String(t.driver?.id) === String(user.driverId))
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

      setDriver(currentDriver || null);
      setTrips(myTrips);
    } catch (e) {
      console.error("Erro na sincronização ALS:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user.driverId]);

  useEffect(() => {
    loadPortalData();
    const syncInterval = setInterval(loadPortalData, 15000);
    const clockInterval = setInterval(() => {
      setSessionTime(timeUtils.calculateDuration(user.lastLogin));
    }, 1000);
    
    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, [loadPortalData, user.lastLogin]);

  // MOTOR DE GEOLOCALIZAÇÃO REAL-TIME (FUNCIONANDO EM SEGUNDO PLANO)
  useEffect(() => {
    if (!user.driverId) return;

    const startGpsTracking = () => {
      if (!navigator.geolocation) return;

      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }

      gpsWatchRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            await db.updateDriverLocation(user.driverId!, latitude, longitude);
          } catch (e) {}
        },
        (error) => {
          console.warn("GPS ALS Silencioso: Erro de sinal.");
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 0 
        }
      );
    };

    startGpsTracking();

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, [user.driverId]);

  if (isLoading) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-[#020617]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Carregando Painel...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#020617] text-white flex flex-col font-sans select-none overflow-hidden relative">
      <header className="p-6 pt-12 flex justify-between items-center bg-slate-950/60 border-b border-white/5 shrink-0 backdrop-blur-md z-40">
        <div>
           <div className="flex items-center gap-2 mb-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{sessionTime}</p>
           </div>
           <h1 className="text-xl font-black uppercase tracking-tight text-white leading-none truncate max-w-[200px]">
             {driver?.name?.split(' ')[0] || user.displayName.split(' ')[0]}
           </h1>
           <div className="flex items-center gap-2 mt-2">
              <span className="text-[8px] font-black text-blue-500 uppercase">Placa: <span className="font-mono text-white">{driver?.plateHorse || '---'}</span></span>
              <span className="text-[8px] font-black text-slate-700">|</span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">SISTEMA ATIVO</span>
           </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-white/5">
          {driver?.photo ? <img src={driver.photo} className="w-full h-full object-cover" /> : <div className="text-xs font-black text-blue-400 italic">ALS</div>}
        </div>
      </header>

      <main className="flex-1 px-5 pt-6 overflow-y-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'inicio' && <HomeTab user={user} trips={trips} onRefresh={loadPortalData} />}
        {activeTab === 'viagens' && <TripsTab trips={trips} />}
        {activeTab === 'docs' && <DocsTab trips={trips} />}
        {activeTab === 'perfil' && <ProfileTab user={user} driver={driver} onLogout={onLogout} />}
      </main>

      <nav className="shrink-0 h-22 pb-6 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-6 z-50">
        {[
          { id: 'inicio', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { id: 'viagens', label: 'Minhas Viagens', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { id: 'docs', label: 'Contratos', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { id: 'perfil', label: 'Minha Ficha', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1.5 transition-all py-2 px-4 rounded-2xl ${activeTab === tab.id ? 'text-blue-500 scale-110' : 'text-slate-600'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={tab.icon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DriverPortal;
