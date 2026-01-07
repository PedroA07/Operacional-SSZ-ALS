
import React, { useState, useEffect } from 'react';
import { Notification, User } from '../../../types';
import { audioUtils } from '../../../utils/audioUtils';

const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  useEffect(() => {
    const handleNewNotif = (e: any) => {
      const notif = e.detail as Notification;
      const sessionUserStr = sessionStorage.getItem('als_active_session');
      if (!sessionUserStr) return;
      const user = JSON.parse(sessionUserStr) as User;
      
      const prefs = user.notificationPrefs || { newTrip: true, statusUpdate: true, paymentLiberated: true, systemChanges: true, newRegistrations: true };

      let shouldShow = false;
      if (notif.type === 'TRIP_CREATED' && prefs.newTrip) shouldShow = true;
      else if (notif.type === 'STATUS_UPDATED' && prefs.statusUpdate) shouldShow = true;
      else if (notif.type.includes('GENERATED') && prefs.statusUpdate) shouldShow = true;

      if (shouldShow) {
        setActiveToast(notif);
        audioUtils.playNotification(); // REPRODUZ O EFEITO SONORO
        const timer = setTimeout(() => setActiveToast(null), 8000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('als_new_notification_event', handleNewNotif);
    return () => window.removeEventListener('als_new_notification_event', handleNewNotif);
  }, []);

  if (!activeToast) return null;

  return (
    <div className="fixed top-20 right-6 z-[2000] w-80 animate-in slide-in-from-right-full duration-500">
       <div className="bg-slate-950/95 backdrop-blur-xl text-white p-5 rounded-[2.2rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Alerta ALS</p>
             </div>
             <button onClick={() => setActiveToast(null)} className="text-white/20 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          </div>
          <h4 className="text-[11px] font-black uppercase leading-tight">{activeToast.title}</h4>
          <p className="text-[10px] text-slate-400 font-medium leading-snug">{activeToast.description}</p>
          <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
             <span className="text-[7px] font-black text-slate-500 uppercase">Por: {activeToast.authorName}</span>
             <span className="text-[7px] font-mono text-slate-600">{new Date(activeToast.timestamp).toLocaleTimeString('pt-BR')}</span>
          </div>
       </div>
    </div>
  );
};

export default NotificationToast;
