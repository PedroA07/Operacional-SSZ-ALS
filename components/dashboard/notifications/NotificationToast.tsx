
import React, { useState, useEffect } from 'react';
import { Notification, User } from '../../../types';

const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));

    const handleNewNotif = (e: any) => {
      const notif = e.detail as Notification;
      const sessionUserStr = sessionStorage.getItem('als_active_session');
      if (!sessionUserStr) return;
      const user = JSON.parse(sessionUserStr) as User;
      const prefs = user.notificationPrefs || { newTrip: true, statusUpdate: true, paymentLiberated: true, systemChanges: true, newRegistrations: true };

      // Lógica de Filtro para exibição do Toast
      let shouldShow = false;
      if (notif.type === 'TRIP_CREATED' && prefs.newTrip) shouldShow = true;
      else if (notif.type === 'STATUS_UPDATED' && prefs.statusUpdate) shouldShow = true;
      else if (notif.type === 'PAYMENT_LIBERATED' && prefs.paymentLiberated) shouldShow = true;
      // Handle specialized generation notifications as status updates
      else if ((notif.type === 'OC_GENERATED' || notif.type === 'LIBERACAO_GENERATED' || notif.type === 'MINUTA_GENERATED') && prefs.statusUpdate) shouldShow = true;
      // Fix: Narrowing issue resolved by removing redundant TRIP_CREATED check
      else if (notif.type.includes('CREATED') && prefs.newRegistrations) shouldShow = true;
      else if ((notif.type === 'SYSTEM' || notif.type === 'DELETED') && prefs.systemChanges) shouldShow = true;

      if (shouldShow) {
        setActiveToast(notif);
        const timer = setTimeout(() => setActiveToast(null), 8000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('als_new_notification_event', handleNewNotif);
    return () => window.removeEventListener('als_new_notification_event', handleNewNotif);
  }, []);

  if (!activeToast) return null;

  const getTypeStyle = (type: string) => {
    if (type === 'TRIP_CREATED') return 'bg-blue-600';
    if (type === 'STATUS_UPDATED') return 'bg-emerald-600';
    if (type === 'PAYMENT_LIBERATED') return 'bg-amber-600';
    if (type === 'DELETED') return 'bg-red-600';
    // Style for specialized generation notifications
    if (type === 'OC_GENERATED' || type === 'LIBERACAO_GENERATED' || type === 'MINUTA_GENERATED') return 'bg-emerald-600';
    return 'bg-slate-800';
  };

  return (
    <div className="fixed top-20 right-6 z-[2000] w-85 animate-in slide-in-from-right-full duration-500">
       <div className="bg-slate-950/90 backdrop-blur-xl text-white p-5 rounded-[2.2rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/10 flex gap-4 relative overflow-hidden group">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${getTypeStyle(activeToast.type)} shadow-[0_0_15px_rgba(0,0,0,0.3)]`}></div>
          
          <div className="flex-1 min-w-0">
             <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${getTypeStyle(activeToast.type)}`}></div>
                   <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.15em]">Alerta Operacional</p>
                </div>
                <button onClick={() => setActiveToast(null)} className="p-1 text-white/20 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
             </div>
             
             <h4 className="text-[11px] font-black uppercase leading-tight tracking-tight">{activeToast.title}</h4>
             <p className="text-[10px] text-slate-300 font-medium mt-1 leading-snug italic opacity-80">
               {activeToast.description}
             </p>

             {activeToast.summary && (
               <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                  {Object.entries(activeToast.summary).slice(0, 2).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest">{key}</p>
                      <p className="text-[9px] font-black text-blue-400 uppercase truncate">{val}</p>
                    </div>
                  ))}
               </div>
             )}

             <div className="mt-4 flex justify-between items-end border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 rounded-full bg-blue-600/20 flex items-center justify-center text-[7px] font-black uppercase">{activeToast.authorName[0]}</div>
                   <span className="text-[8px] font-bold uppercase text-slate-500">Por: {activeToast.authorName}</span>
                </div>
                <span className="text-[8px] font-mono text-slate-600">{new Date(activeToast.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
             </div>
          </div>
       </div>
    </div>
  );
};

export default NotificationToast;
