
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Notification, User, NotificationType, NotificationOrigin } from '../../../types';
import { audioUtils } from '../../../utils/audioUtils';
import { supabase } from '../../../utils/storage';

const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const channelRef = useRef<any>(null);

  const processNotification = useCallback((payload: any) => {
    const data = payload.new;
    if (!data) return;

    console.debug("Realtime ALS Event Received:", data.type);

    // Mapeamento compatível com o banco real (sem coluna title)
    const notif: Notification = {
      id: String(data.id),
      title: data.type ? data.type.replace(/_/g, ' ').toUpperCase() : 'ALERTA DO SISTEMA',
      description: data.message || '',
      type: (data.type as NotificationType) || 'SYSTEM',
      origin: (data.origin as NotificationOrigin) || 'OPERACIONAL',
      authorName: data.user_name || 'Sistema',
      authorId: data.user_id || 'system',
      timestamp: data.timestamp || new Date().toISOString(),
      summary: { ...(data.summary || {}), os: data.os_ref }
    };

    setActiveToast(notif);
    
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
    
    // Gatilho global para atualizar o sininho e listas
    window.dispatchEvent(new CustomEvent('als_new_notification_event', { detail: notif }));

    setTimeout(() => {
      setActiveToast(prev => prev?.id === notif.id ? null : prev);
    }, 10000);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    
    // Configura o canal Realtime
    const channel = supabase
      .channel('als-realtime-notifs')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' }, 
        processNotification
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('ALS Realtime Cloud: Subscribed');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime subscription failed, retrying...');
        }
      });

    channelRef.current = channel;

    return () => { 
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current); 
      }
    };
  }, [processNotification]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] w-85 animate-in slide-in-from-right-full duration-500">
       <div 
         onClick={() => setActiveToast(null)}
         className="bg-slate-950/95 backdrop-blur-xl text-white p-6 rounded-[2.5rem] shadow-[0_50px_120px_rgba(0,0,0,0.7)] border border-white/10 flex flex-col gap-3 relative overflow-hidden group active:scale-95 transition-all cursor-pointer"
       >
          <div className={`absolute top-0 left-0 w-2 h-full ${activeToast.origin === 'MOTORISTA' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${activeToast.origin === 'MOTORISTA' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                {activeToast.origin} • {new Date(activeToast.timestamp).toLocaleDateString('pt-BR')} • EM TEMPO REAL
              </p>
            </div>
            <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </div>
          <div className="flex flex-col">
             <h4 className="text-[13px] font-black uppercase leading-tight text-white mb-1">{activeToast.title}</h4>
             <p className="text-[11px] text-slate-400 font-medium leading-snug line-clamp-3">{activeToast.description}</p>
          </div>
          {activeToast.summary?.os && (
            <div className="mt-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
               <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">OS Ref:</span>
               <p className="text-[11px] font-mono font-black text-white uppercase">{activeToast.summary.os}</p>
            </div>
          )}
       </div>
    </div>
  );
};

export default NotificationToast;
