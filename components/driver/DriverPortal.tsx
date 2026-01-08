
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Trip, Driver } from '../../types';
import { timeUtils } from '../../utils/timeUtils';
import { db } from '../../utils/storage';
import { audioUtils } from '../../utils/audioUtils';
import HomeTab from './tabs/HomeTab';
import TripsTab from './tabs/TripsTab';
import DocsTab from './tabs/DocsTab';
import ProfileTab from './tabs/ProfileTab';
import DownloadAppTab from './tabs/DownloadAppTab';
import NotificationToast from '../dashboard/notifications/NotificationToast';
import DriverNotificationCenter from './DriverNotificationCenter';

interface DriverPortalProps {
  user: User;
  onLogout: () => void;
}

const DriverPortal: React.FC<DriverPortalProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'inicio' | 'viagens' | 'docs' | 'perfil' | 'download'>('inicio');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTime, setSessionTime] = useState('00:00:00');
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const lastTripIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const gpsWatchRef = useRef<number | null>(null);

  const checkUnread = useCallback(async (myTrips: Trip[]) => {
    const data = await db.getNotifications();
    const myOSs = new Set(myTrips.map(t => t.os.toUpperCase()));
    const clearedStr = localStorage.getItem('als_cleared_notifs');
    const clearedIds: string[] = clearedStr ? JSON.parse(clearedStr) : [];
    
    const lastViewedStr = localStorage.getItem(`als_driver_last_viewed_${user.id}`);
    const lastViewed = lastViewedStr ? new Date(lastViewedStr).getTime() : 0;

    const count = data.filter(n => {
      const isMine = myOSs.has(n.summary?.os?.toUpperCase() || '');
      const notCleared = !clearedIds.includes(n.id);
      const notSeen = new Date(n.timestamp).getTime() > lastViewed;
      return isMine && notCleared && notSeen;
    }).length;
    
    setUnreadCount(count);
  }, [user.id]);

  const loadPortalData = useCallback(async () => {
    try {
      const [allDrivers, allTrips] = await Promise.all([
        db.getDrivers(),
        db.getTrips()
      ]);

      // Comparação robusta de IDs (trim e toString)
      const targetId = String(user.driverId || '').trim();
      const currentDriver = allDrivers.find(d => String(d.id).trim() === targetId);
      
      const myTrips = allTrips.filter(t => {
        const tripDriverId = String(t.driver?.id || '').trim();
        return tripDriverId === targetId && targetId !== '';
      }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

      const currentIds = new Set(myTrips.map(t => t.id));
      if (!isFirstLoadRef.current) {
        const newTrip = myTrips.find(t => !lastTripIdsRef.current.has(t.id) && t.status === 'Pendente');
        if (newTrip) {
          const isMuted = localStorage.getItem('als_driver_muted') === 'true';
          if (!isMuted) audioUtils.playAlert();
        }
      }
      lastTripIdsRef.current = currentIds;
      isFirstLoadRef.current = false;

      setDriver(currentDriver || null);
      setTrips(myTrips);
      checkUnread(myTrips);
    } catch (e) {
      console.error("Erro na sincronização ALS:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user.driverId, checkUnread]);

  useEffect(() => {
    loadPortalData();
    const syncInterval = setInterval(loadPortalData, 20000);
    const clockInterval = setInterval(() => {
      setSessionTime(timeUtils.calculateDuration(user.lastLogin));
    }, 1000);
    
    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, [loadPortalData, user.lastLogin]);

  useEffect(() => {
    if (!user.driverId) return;
    const startGpsTracking = () => {
      if (!navigator.geolocation) return;
      if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try { await db.updateDriverLocation(user.driverId!, latitude, longitude); } catch (e) {}
        },
        () => console.warn("GPS ALS: Erro de sinal."),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };
    startGpsTracking();
    return () => { if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current); };
  }, [user.driverId]);

  const handleOpenNotifCenter = () => {
    setIsNotifCenterOpen(true);
    localStorage.setItem(`als_driver_last_viewed_${user.id}`, new Date().toISOString());
    setUnreadCount(0);
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-[#020617]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Sincronizando Dados...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#020617] text-white flex flex-col font-sans select-none overflow-hidden relative">
      <NotificationToast />

      <header className="p-6 pt-12 flex justify-between items-center bg-slate-950/60 border-b border-white/5 shrink-0 backdrop-blur-md z-40">
        <div>
           <div className="flex items-center gap-2 mb-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{sessionTime}</p>
           </div>
           <h1 className="text-xl font-black uppercase tracking-tight text-white leading-none truncate max-w-[150px]">
             {driver?.name?.split(' ')[0] || user.displayName.split(' ')[0]}
           </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleOpenNotifCenter}
            className="relative w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 active:text-blue-500 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 border-2 border-slate-950 rounded-full text-[8px] font-black flex items-center justify-center text-white animate-bounce">{unreadCount}</span>}
          </button>
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-white/5">
            {driver?.photo ? <img src={driver.photo} className="w-full h-full object-cover" /> : <div className="text-xs font-black text-blue-400 italic">ALS</div>}
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pt-6 overflow-y-auto custom-scrollbar">
        {activeTab === 'inicio' && <HomeTab user={user} trips={trips} onRefresh={loadPortalData} />}
        {activeTab === 'viagens' && <TripsTab trips={trips} user={user} onRefresh={loadPortalData} />}
        {activeTab === 'docs' && <DocsTab trips={trips} driver={driver} />}
        {activeTab === 'perfil' && <ProfileTab user={user} driver={driver} onLogout={onLogout} />}
        {activeTab === 'download' && <DownloadAppTab />}
      </main>

      <nav className="shrink-0 h-22 pb-6 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-4 z-50">
        {[
          { id: 'inicio', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { id: 'viagens', label: 'Viagens', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { id: 'docs', label: 'Docs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          { id: 'download', label: 'App', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
          { id: 'perfil', label: 'Perfil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1.5 transition-all py-2 px-3 rounded-2xl ${activeTab === tab.id ? 'text-blue-500 scale-110' : 'text-slate-600'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={tab.icon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>

      <DriverNotificationCenter 
        isOpen={isNotifCenterOpen} 
        onClose={() => setIsNotifCenterOpen(false)} 
        driverTrips={trips}
      />
    </div>
  );
};

export default DriverPortal;
