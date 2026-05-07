
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Notification, NotificationOrigin } from '../../../types';
import { db } from '../../../utils/storage';
import NotificationSettings from './NotificationSettings';
import NotificationDetailModal from './NotificationDetailModal';

const typeLabels: Record<string, string> = {
  TRIP_CREATED: 'Nova Viagem',
  TRIP_UPDATED: 'Viagem Atualizada',
  STATUS_UPDATED: 'Status Atualizado',
  PAYMENT_LIBERATED: 'Pagamento Liberado',
  OC_GENERATED: 'OC Emitida',
  OC_EDITED: 'OC Editada',
  LIBERACAO_GENERATED: 'Liberação Emitida',
  MINUTA_GENERATED: 'Minuta Emitida',
  RETIRADA_CHEIO_GENERATED: 'Retirada de Cheio',
  DOC_ATTACHED: 'Documento Anexado',
  CONTRACT_UPLOADED: 'Contrato Enviado',
  DRIVER_DOC_UPLOADED: 'Doc. Motorista Enviado',
  DRIVER_PROFILE_UPDATED: 'Perfil Atualizado',
  DRIVER_CREATED: 'Motorista Cadastrado',
  DRIVER_UPDATED: 'Motorista Atualizado',
  CUSTOMER_CREATED: 'Cliente Cadastrado',
  CUSTOMER_UPDATED: 'Cliente Atualizado',
  PORT_CREATED: 'Porto/Terminal Cadastrado',
  PORT_UPDATED: 'Porto/Terminal Atualizado',
  PRESTACKING_CREATED: 'Pré-Stacking Cadastrado',
  PRESTACKING_UPDATED: 'Pré-Stacking Atualizado',
  CATEGORY_CREATED: 'Categoria Cadastrada',
  EMAIL_TEMPLATE_CREATED: 'Template de E-mail Criado',
  EMAIL_TEMPLATE_UPDATED: 'Template de E-mail Atualizado',
  SYSTEM: 'Sistema',
  DELETED: 'Registro Removido',
};

interface NotificationCenterProps {
  user: User;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'settings'>('list');
  
  // Lembrar preferência de aba durante a sessão
  const [activeTab, setActiveTab] = useState<NotificationOrigin>(() => {
    return (sessionStorage.getItem('als_notif_filter') as NotificationOrigin) || 'OPERACIONAL';
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent && notifications.length === 0) setIsLoading(true);
    try {
      const data = await db.getNotifications();
      if (data && Array.isArray(data)) {
        setNotifications(data);
        const lastCheckStr = localStorage.getItem(`als_notif_last_check_${user.id}`);
        const lastCheck = lastCheckStr ? new Date(lastCheckStr).getTime() : 0;
        const count = data.filter(n => new Date(n.timestamp).getTime() > lastCheck).length;
        setUnreadCount(count);
      }
    } catch (e) {
      console.warn("Notification Center Sync Lag:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, notifications.length]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => loadNotifications(true), 15000);
    const handleForcedRefresh = () => loadNotifications(true);
    window.addEventListener('als_new_notification_event', handleForcedRefresh);
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setView('list');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('als_new_notification_event', handleForcedRefresh);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [loadNotifications]);

  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      setUnreadCount(0);
      localStorage.setItem(`als_notif_last_check_${user.id}`, new Date().toISOString());
    } else {
      setView('list');
    }
  };

  const handleTabChange = (tab: NotificationOrigin) => {
    setActiveTab(tab);
    sessionStorage.setItem('als_notif_filter', tab);
  };

  const handleNotifClick = (n: Notification) => {
    setSelectedNotification(n);
    setIsDetailOpen(true);
    setIsOpen(false); 
  };

  const lastCheck = useMemo(() => {
    const s = localStorage.getItem(`als_notif_last_check_${user.id}`);
    return s ? new Date(s).getTime() : 0;
  }, [user.id]);

  const unreadPerTab = useMemo(() => {
    const operacional = notifications.filter(n => n.origin === 'OPERACIONAL' && new Date(n.timestamp).getTime() > lastCheck).length;
    const motorista  = notifications.filter(n => n.origin === 'MOTORISTA'  && new Date(n.timestamp).getTime() > lastCheck).length;
    return { OPERACIONAL: operacional, MOTORISTA: motorista };
  }, [notifications, lastCheck]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => n.origin === activeTab);
  }, [notifications, activeTab]);

  // Agrupa notificações por dia
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; items: typeof filteredNotifications }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    const map = new Map<string, typeof filteredNotifications>();
    filteredNotifications.forEach(n => {
      const d = new Date(n.timestamp); d.setHours(0, 0, 0, 0);
      let label: string;
      if (d.getTime() === today.getTime()) label = 'Hoje';
      else if (d.getTime() === yesterday.getTime()) label = 'Ontem';
      else label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(n);
    });
    map.forEach((items, label) => groups.push({ label, items }));
    return groups;
  }, [filteredNotifications]);

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className={`relative p-3 rounded-xl transition-all border ${isOpen ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-white hover:text-blue-600'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 border border-white rounded-full text-[8px] text-white font-black flex items-center justify-center animate-bounce shadow-md">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-[380px] bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-300 z-[300]">
           <div className="p-6 bg-slate-50 border-b border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{view === 'list' ? 'Centro de Atividades' : 'Preferências'}</h4>
                  <p className="text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">ALS TRANSPORTES LOGISTICS</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => loadNotifications(true)}
                    className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-lg border border-slate-200 transition-all active:rotate-180 duration-500"
                    title="Atualizar agora"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  </button>
                  <button 
                    onClick={() => setView(view === 'list' ? 'settings' : 'list')}
                    className={`p-2 rounded-lg transition-all ${view === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 hover:text-blue-600 border border-slate-200'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                  </button>
                </div>
              </div>

              {view === 'list' && (
                <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1">
                  {(['OPERACIONAL', 'MOTORISTA'] as const).map(tab => {
                    const isActive = activeTab === tab;
                    const count = unreadPerTab[tab];
                    const color = tab === 'OPERACIONAL' ? 'bg-blue-600' : 'bg-emerald-600';
                    return (
                      <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all relative ${isActive ? `${color} text-white shadow-md` : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {tab === 'OPERACIONAL' ? 'Operacional' : 'Motorista'}
                        {count > 0 && !isActive && (
                          <span className={`absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[7px] font-black text-white flex items-center justify-center ${tab === 'OPERACIONAL' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
           </div>
           
           <div className="max-h-[460px] overflow-y-auto custom-scrollbar p-4 bg-white min-h-[150px]">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</p>
                </div>
              ) : view === 'settings' ? (
                <NotificationSettings user={user} onUpdate={() => {}} />
              ) : groupedNotifications.length === 0 ? (
                <div className="py-20 text-center text-slate-300 text-[9px] font-black uppercase italic">Sem atividades registradas</div>
              ) : (
                <div className="space-y-1">
                  {groupedNotifications.map(({ label, items }) => (
                    <div key={label}>
                      {/* Separador de dia */}
                      <div className="flex items-center gap-2 py-3 sticky top-0 bg-white z-10">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${label === 'Hoje' ? 'bg-blue-50 text-blue-600 border-blue-100' : label === 'Ontem' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {label}
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>

                      <div className="space-y-2 mb-2">
                        {items.map(n => {
                          const isUnread = new Date(n.timestamp).getTime() > lastCheck;
                          const accentColor = n.origin === 'MOTORISTA' ? 'bg-emerald-500' : 'bg-blue-500';
                          return (
                            <button
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              className={`w-full text-left p-4 border rounded-2xl transition-all group relative overflow-hidden active:scale-[0.98] ${isUnread ? 'bg-blue-50/60 border-blue-100 hover:bg-blue-50' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/80'}`}
                            >
                              <div className={`absolute top-0 left-0 w-1 h-full ${accentColor}`} />
                              {isUnread && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />}
                              <div className="flex justify-between items-start mb-1.5 pl-1">
                                <span className={`px-2 py-0.5 rounded text-[6.5px] font-black uppercase ${n.origin === 'MOTORISTA' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {typeLabels[n.type] || n.type.replace(/_/g, ' ')}
                                </span>
                                <p className="text-[8px] font-mono font-black text-slate-400 leading-none">
                                  {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <h5 className="text-[10px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors pl-1">{n.title}</h5>
                              <p className="text-[9px] text-slate-500 font-medium mt-1 leading-snug line-clamp-1 pl-1">{n.description}</p>
                              <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center justify-between pl-1">
                                <span className="text-[7.5px] font-black text-slate-400 uppercase">Por: <span className="text-slate-600">{n.authorName}</span></span>
                                {n.summary?.os && <span className="text-[8px] font-black text-blue-500">OS {n.summary.os}</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      )}

      {selectedNotification && (
        <NotificationDetailModal 
          isOpen={isDetailOpen} 
          onClose={() => { setIsDetailOpen(false); setSelectedNotification(null); }} 
          notification={selectedNotification} 
        />
      )}
    </div>
  );
};

export default NotificationCenter;
