
import React, { useState, useEffect, useRef } from 'react';
import { User, Notification, NotificationPreference } from '../../../types';
import { db } from '../../../utils/storage';

interface NotificationCenterProps {
  user: User;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const prefs = user.notificationPrefs || { 
    newTrip: true, 
    statusUpdate: true, 
    paymentLiberated: true, 
    systemChanges: true,
    newRegistrations: true 
  };

  const loadNotifications = async () => {
    const data = await db.getNotifications();
    setNotifications(data);
    
    // Calcula não lidas baseado no que temos localmente
    const lastCheckStr = localStorage.getItem(`als_notif_last_check_${user.id}`);
    const lastCheck = lastCheckStr ? new Date(lastCheckStr).getTime() : 0;
    const count = data.filter(n => new Date(n.timestamp).getTime() > lastCheck).length;
    setUnreadCount(count);
  };

  useEffect(() => {
    loadNotifications();
    
    const handleNewNotif = (e: any) => {
      const notif = e.detail as Notification;
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      
      // Se o menu estiver fechado, incrementa contagem
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };

    window.addEventListener('als_new_notification_event', handleNewNotif);
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('als_new_notification_event', handleNewNotif);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, user.id]);

  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      // Ao abrir, zera a contagem e salva o timestamp local
      setUnreadCount(0);
      localStorage.setItem(`als_notif_last_check_${user.id}`, new Date().toISOString());
    }
  };

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className={`relative p-3 rounded-xl transition-all duration-300 border ${isOpen ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-white hover:text-blue-600 hover:border-blue-400'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border border-white text-[8px] text-white font-black items-center justify-center">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-[400px] bg-white rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-300 z-[200]">
           <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Atividades Operacionais</h4>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Registros em Tempo Real</p>
              </div>
           </div>
           
           <div className="max-h-[480px] overflow-y-auto custom-scrollbar p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-slate-300 font-bold uppercase italic text-[10px]">Sem registros recentes</div>
              ) : notifications.map(n => (
                <div key={n.id} className="p-5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-[1.8rem] transition-all group">
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${n.type.includes('GENERATED') ? 'bg-blue-500' : n.type === 'STATUS_UPDATED' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                          {n.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-mono font-bold text-slate-400 leading-none">{new Date(n.timestamp).toLocaleDateString('pt-BR')}</p>
                        <p className="text-[8px] font-mono font-black text-blue-500 mt-1">{new Date(n.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                   </div>

                   <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight">{n.title}</h5>
                   <p className="text-[10px] text-slate-500 font-medium mt-1 leading-snug">{n.description}</p>

                   {n.summary && (
                     <div className="mt-4 p-3 bg-white rounded-2xl border border-slate-100 grid grid-cols-2 gap-3">
                        {Object.entries(n.summary).map(([key, val]) => (
                          <div key={key}>
                            <p className="text-[7px] font-black text-slate-300 uppercase leading-none">{key}</p>
                            <p className="text-[9px] font-black text-slate-700 mt-1 uppercase truncate">{val}</p>
                          </div>
                        ))}
                     </div>
                   )}

                   <div className="mt-4 flex items-center justify-between opacity-60 border-t border-slate-100 pt-3">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Executado por: <span className="text-slate-800">{n.authorName}</span></p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
