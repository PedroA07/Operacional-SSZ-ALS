
import React, { useState, useEffect, useCallback } from 'react';
import { Notification, User, NotificationType, NotificationOrigin } from '../../../types';
import { audioUtils } from '../../../utils/audioUtils';
import { supabase } from '../../../utils/storage';

const NotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  const processNotification = useCallback((payload: any) => {
    const data = payload.new;
    if (!data) return;

    // Converte o formato do banco para o tipo Notification do App
    const notif: Notification = {
      id: String(data.id),
      title: data.title || data.type?.replace(/_/g, ' ') || 'Alerta do Sistema',
      description: data.message || '',
      type: (data.type as NotificationType) || 'SYSTEM',
      origin: (data.origin as NotificationOrigin) || 'OPERACIONAL',
      authorName: data.user_name || 'Sistema',
      authorId: data.user_id || 'system',
      timestamp: data.timestamp || new Date().toISOString(),
      summary: { ...data.summary, os: data.os_ref }
    };

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
        
        // REGRA: Não mostrar notificação para o próprio autor (opcional, ALS costuma preferir feedback visual)
        // if (user.id === notif.authorId) return;
      }
    } catch (err) {}

    // Lógica de filtragem baseada em preferências individuais
    let shouldShow = false;
    const type = notif.type;

    if (type === 'TRIP_CREATED' && prefs.newTrip) shouldShow = true;
    else if (['STATUS_UPDATED', 'OC_GENERATED', 'LIBERACAO_GENERATED', 'MINUTA_GENERATED', 'DRIVER_DOC_UPLOADED', 'TRIP_UPDATED'].includes(type) && prefs.statusUpdate) shouldShow = true;
    else if (['DRIVER_CREATED', 'CUSTOMER_CREATED', 'PORT_CREATED', 'PRESTACKING_CREATED', 'CATEGORY_CREATED'].includes(type) && prefs.newRegistrations) shouldShow = true;
    else if (type === 'PAYMENT_LIBERATED' && prefs.paymentLiberated) shouldShow = true;
    else if (['DELETED', 'SYSTEM'].includes(type) && prefs.systemChanges) shouldShow = true;

    if (shouldShow) {
      setActiveToast(notif);
      
      // SONS DIFERENCIADOS PARA TODOS
      if (notif.origin === 'MOTORISTA' || ['DRIVER_DOC_UPLOADED', 'STATUS_UPDATED'].includes(type)) {
        audioUtils.playDriverUpdate();
      } else {
        audioUtils.playNotification();
      }
      
      // Dispara evento global para atualizar contadores no NotificationCenter
      window.dispatchEvent(new CustomEvent('als_new_notification_event'));

      // Auto-hide após 10 segundos
      setTimeout(() => {
        setActiveToast(prev => prev?.id === notif.id ? null : prev);
      }, 10000);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      console.warn("Supabase Realtime: Cliente não inicializado.");
      return;
    }

    // INSCRIÇÃO REALTIME: Escuta a tabela 'notifications' para QUALQUER usuário
    // IMPORTANTE: A tabela 'notifications' deve estar na Publication 'supabase_realtime' no painel
    const channel = supabase
      .channel('public-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', 
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          processNotification(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug("ALS Realtime: Conectado ao servidor de notificações.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processNotification]);

  if (!activeToast) return null;

  const isDriverAlert = activeToast.origin === 'MOTORISTA';

  return (
    <div className="fixed top-20 right-6 z-[2000] w-85 animate-in slide-in-from-right-full duration-500">
       <div 
         onClick={() => setActiveToast(null)}
         className={`bg-slate-950/95 backdrop-blur-xl text-white p-5 rounded-[2.2rem] shadow-[0_30px_70px_rgba(0,0,0,0.5)] border cursor-pointer ${isDriverAlert ? 'border-emerald-500/30' : 'border-white/10'} flex flex-col gap-2 relative overflow-hidden group active:scale-95 transition-all`}
       >
          <div className={`absolute top-0 left-0 w-1.5 h-full ${isDriverAlert ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]'}`}></div>
          
          <div className="flex justify-between items-center mb-1">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isDriverAlert ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                <p className={`text-[8px] font-black uppercase tracking-widest ${isDriverAlert ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {isDriverAlert ? 'Alerta Realtime: Motorista' : 'Alerta Realtime: Sistema'}
                </p>
             </div>
             <div className="text-white/20 group-hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
             </div>
          </div>

          <div className="flex items-start gap-4">
             <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isDriverAlert ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-600/20 text-blue-500'}`}>
                {isDriverAlert ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                )}
             </div>
             <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-black uppercase leading-tight truncate">{activeToast.title}</h4>
                <p className="text-[10px] text-slate-400 font-medium leading-snug mt-1">{activeToast.description}</p>
             </div>
          </div>

          {(activeToast.summary?.os || activeToast.summary?.motorista) && (
            <div className="mt-3 px-3 py-2 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
               <div>
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">OS Referenciada:</span>
                  <p className="text-[10px] font-mono font-bold text-white uppercase">{activeToast.summary?.os ? `Nº ${activeToast.summary.os}` : activeToast.summary?.motorista}</p>
               </div>
               {activeToast.summary?.placa && (
                 <span className="bg-slate-800 px-2 py-0.5 rounded text-[8px] font-mono text-slate-300 border border-white/5">{activeToast.summary.placa}</span>
               )}
            </div>
          )}
       </div>
    </div>
  );
};

export default NotificationToast;
