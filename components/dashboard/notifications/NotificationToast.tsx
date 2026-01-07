
import React, { useState, useEffect } from 'react';
import { Notification, User } from '../../../types';
import { audioUtils } from '../../../utils/audioUtils';

const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  useEffect(() => {
    const handleNewNotif = (e: any) => {
      const notif = e.detail as Notification;
      
      // Tenta buscar preferências do usuário na sessão atual
      let prefs = { 
        newTrip: true, 
        statusUpdate: true, 
        paymentLiberated: true, 
        systemChanges: true, 
        newRegistrations: true 
      };

      try {
        const sessionUserStr = sessionStorage.getItem('als_active_session');
        if (sessionUserStr) {
          const user = JSON.parse(sessionUserStr) as User;
          if (user.notificationPrefs) prefs = user.notificationPrefs;
        }
      } catch (err) {
        console.warn("Erro ao ler preferências para toast:", err);
      }

      // Lógica de filtro do popup
      let shouldShow = false;
      if (notif.type === 'TRIP_CREATED' && prefs.newTrip) shouldShow = true;
      else if (['STATUS_UPDATED', 'OC_GENERATED', 'LIBERACAO_GENERATED', 'MINUTA_GENERATED'].includes(notif.type) && prefs.statusUpdate) shouldShow = true;
      else if (['DRIVER_CREATED', 'CUSTOMER_CREATED', 'PORT_CREATED', 'PRESTACKING_CREATED', 'CATEGORY_CREATED'].includes(notif.type) && prefs.newRegistrations) shouldShow = true;
      else if (notif.type === 'PAYMENT_LIBERATED' && prefs.paymentLiberated) shouldShow = true;
      else if (['DELETED', 'SYSTEM'].includes(notif.type) && prefs.systemChanges) shouldShow = true;

      if (shouldShow) {
        setActiveToast(notif);
        audioUtils.playNotification();
        
        // Timer para sumir
        const timer = setTimeout(() => {
          setActiveToast(null);
        }, 8000);
        
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('als_new_notification_event', handleNewNotif);
    return () => window.removeEventListener('als_new_notification_event', handleNewNotif);
  }, []);

  if (!activeToast) return null;

  return (
    <div className="fixed top-20 right-6 z-[2000] w-85 animate-in slide-in-from-right-full duration-500">
       <div className="bg-slate-950/95 backdrop-blur-xl text-white p-5 rounded-[2.2rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
          
          <div className="flex justify-between items-center mb-1">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Alerta do Sistema</p>
             </div>
             <button onClick={() => setActiveToast(null)} className="text-white/20 hover:text-white transition-colors p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </button>
          </div>

          <div className="flex items-start gap-4">
             <div className="shrink-0 w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
             </div>
             <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-black uppercase leading-tight truncate">{activeToast.title}</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-snug mt-1">{activeToast.description}</p>
             </div>
          </div>

          {(activeToast.summary?.os || activeToast.summary?.motorista) && (
            <div className="mt-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
               <div>
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">Referência:</span>
                  <p className="text-[10px] font-mono font-bold text-white uppercase">{activeToast.summary?.os ? `OS ${activeToast.summary.os}` : activeToast.summary?.motorista}</p>
               </div>
               {activeToast.summary?.placa && (
                 <span className="bg-slate-800 px-2 py-0.5 rounded text-[8px] font-mono text-slate-300 border border-white/5">{activeToast.summary.placa}</span>
               )}
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
             <span className="text-[7px] font-black text-slate-500 uppercase">Por: {activeToast.authorName}</span>
             <span className="text-[7px] font-mono text-slate-600">{new Date(activeToast.timestamp).toLocaleTimeString('pt-BR')}</span>
          </div>
       </div>
    </div>
  );
};

export default NotificationToast;
