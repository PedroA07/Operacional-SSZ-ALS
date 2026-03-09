
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Notification, User, NotificationType, NotificationOrigin } from '../../../types';
import { audioUtils } from '../../../utils/audioUtils';
import { supabase } from '../../../utils/storage';

const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const [progress, setProgress] = useState(100);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearToast = useCallback(() => {
    setActiveToast(null);
    setProgress(100);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  }, []);

  const processNotification = useCallback((payload: any) => {
    const data = payload.new;
    if (!data) return;

    clearToast();

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
      if (notif.origin === 'MOTORISTA') audioUtils.playDriverUpdate();
      else audioUtils.playNotification();
    }
    
    window.dispatchEvent(new CustomEvent('als_new_notification_event', { detail: notif }));

    timerRef.current = setTimeout(() => setActiveToast(null), 8000);

    let currentProgress = 100;
    progressIntervalRef.current = setInterval(() => {
      currentProgress -= 1.25;
      setProgress(currentProgress);
    }, 100);

  }, [clearToast]);

  useEffect(() => {
    if (!supabase) return;

    // Nome de canal único evita conflitos entre abas
    const channelId = `toast-${Math.random().toString(36).substr(2, 9)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, processNotification)
      .subscribe();

    return () => { 
      // LIMPEZA CRÍTICA: Desinscreve e remove o canal para não fritar a CPU da instância Small
      channel.unsubscribe();
      if (supabase) supabase.removeChannel(channel);
      
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [processNotification]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] w-85 animate-in slide-in-from-right-full duration-500">
       <div 
         onClick={clearToast}
         className="bg-slate-950/95 backdrop-blur-xl text-white p-6 rounded-[2.5rem] shadow-[0_50px_120px_rgba(0,0,0,0.7)] border border-white/10 flex flex-col gap-3 relative overflow-hidden active:scale-95 transition-all cursor-pointer"
       >
          <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full">
            <div 
              className={`h-full transition-all duration-100 ease-linear ${activeToast.origin === 'MOTORISTA' ? 'bg-emerald-500' : 'bg-blue-600'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className={`absolute top-0 left-0 w-2 h-full ${activeToast.origin === 'MOTORISTA' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
          <div className="flex justify-between items-center">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{activeToast.origin} • AGORA</p>
            <svg className="w-3 h-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </div>
          <div>
             <h4 className="text-[13px] font-black uppercase leading-tight text-white mb-1">{activeToast.title}</h4>
             <p className="text-[11px] text-slate-400 font-medium leading-snug line-clamp-2">{activeToast.description}</p>
          </div>
       </div>
    </div>
  );
};

export default NotificationToast;
