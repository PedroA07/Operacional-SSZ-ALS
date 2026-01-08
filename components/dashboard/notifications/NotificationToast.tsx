
import React, { useState, useEffect, useCallback } from 'react';
import { Notification, User, NotificationType, NotificationOrigin } from '../../../types';
import { audioUtils } from '../../../utils/audioUtils';
import { supabase } from '../../../utils/storage';

const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  const processNotification = useCallback((payload: any) => {
    const data = payload.new;
    if (!data) return;

    const notif: Notification = {
      id: String(data.id),
      title: data.title || 'Alerta do Sistema',
      description: data.message || '',
      type: (data.type as NotificationType) || 'SYSTEM',
      origin: (data.origin as NotificationOrigin) || 'OPERACIONAL',
      authorName: data.user_name || 'Sistema',
      authorId: data.user_id || 'system',
      timestamp: data.timestamp || new Date().toISOString(),
      summary: { ...data.summary, os: data.os_ref }
    };

    setActiveToast(notif);
    
    // Regra: Motoristas não ouvem notificações para não serem interrompidos durante a direção
    const sessionStr = sessionStorage.getItem('als_active_session');
    const currentUser: User | null = sessionStr ? JSON.parse(sessionStr) : null;
    const isDriver = currentUser?.role === 'driver' || currentUser?.role === 'motoboy';

    if (!isDriver) {
      if (notif.origin === 'MOTORISTA') {
        audioUtils.playDriverUpdate();
      } else {
        audioUtils.playNotification();
      }
    }
    
    window.dispatchEvent(new CustomEvent('als_new_notification_event'));

    setTimeout(() => {
      setActiveToast(prev => prev?.id === notif.id ? null : prev);
    }, 8000);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('realtime:public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, processNotification)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [processNotification]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] w-80 animate-in slide-in-from-right-full duration-500">
       <div 
         onClick={() => setActiveToast(null)}
         className="bg-slate-950/95 backdrop-blur-xl text-white p-5 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col gap-2 relative overflow-hidden group active:scale-95 transition-all cursor-pointer"
       >
          <div className={`absolute top-0 left-0 w-1.5 h-full ${activeToast.origin === 'MOTORISTA' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
          <div className="flex justify-between items-center"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full animate-pulse ${activeToast.origin === 'MOTORISTA' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div><p className="text-[8px] font-black uppercase tracking-widest opacity-60">{activeToast.origin}</p></div><svg className="w-4 h-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></div>
          <div className="flex items-start gap-4">
             <div className="flex-1 min-w-0"><h4 className="text-[11px] font-black uppercase leading-tight truncate">{activeToast.title}</h4><p className="text-[10px] text-slate-400 font-medium leading-snug mt-1">{activeToast.description}</p></div>
          </div>
          {activeToast.summary?.os && (
            <div className="mt-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center"><span className="text-[8px] font-black text-blue-400 uppercase">Referência:</span><p className="text-[10px] font-mono font-bold text-white uppercase">OS {activeToast.summary.os}</p></div>
          )}
       </div>
    </div>
  );
};

export default NotificationToast;
