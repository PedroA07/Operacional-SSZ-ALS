
import React, { useState, useEffect } from 'react';
import { Notification } from '../../../types';

const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  useEffect(() => {
    const handleNewNotif = (e: any) => {
      const notif = e.detail as Notification;
      setActiveToast(notif);
      
      // Auto-close após 6 segundos
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('als_new_notification_event', handleNewNotif);
    return () => window.removeEventListener('als_new_notification_event', handleNewNotif);
  }, []);

  if (!activeToast) return null;

  const getTypeStyle = (type: string) => {
    if (type.includes('GENERATED')) return 'bg-blue-600';
    if (type === 'DELETED') return 'bg-red-600';
    if (type === 'STATUS_UPDATED') return 'bg-emerald-600';
    return 'bg-slate-800';
  };

  return (
    <div className="fixed top-6 right-6 z-[2000] w-80 animate-in slide-in-from-right-full duration-500">
       <div className="bg-slate-950/90 backdrop-blur-xl text-white p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 flex gap-4 relative overflow-hidden group">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${getTypeStyle(activeToast.type)}`}></div>
          
          <div className="flex-1 min-w-0">
             <div className="flex justify-between items-center mb-1">
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">
                  Notificação em Tempo Real
                </p>
                <button onClick={() => setActiveToast(null)} className="text-white/20 hover:text-white transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
             </div>
             
             <h4 className="text-[11px] font-black uppercase leading-tight truncate">{activeToast.title}</h4>
             <p className="text-[10px] text-slate-300 font-medium mt-1 leading-snug">
               {activeToast.description}
             </p>

             {activeToast.summary && (
               <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                  {activeToast.summary.os && (
                    <div>
                      <p className="text-[7px] text-slate-500 font-bold uppercase">Ordem de Serviço</p>
                      <p className="text-[9px] font-black text-blue-400">{activeToast.summary.os}</p>
                    </div>
                  )}
                  {activeToast.summary.placa && (
                    <div>
                      <p className="text-[7px] text-slate-500 font-bold uppercase">Veículo</p>
                      <p className="text-[9px] font-black text-white font-mono">{activeToast.summary.placa}</p>
                    </div>
                  )}
               </div>
             )}

             <div className="mt-4 flex justify-between items-center opacity-40">
                <span className="text-[8px] font-bold uppercase">Por: {activeToast.authorName}</span>
                <span className="text-[8px] font-mono">{new Date(activeToast.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
             </div>
          </div>
       </div>
    </div>
  );
};

export default NotificationToast;
