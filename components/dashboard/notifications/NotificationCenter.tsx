
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Notification, NotificationOrigin } from '../../../types';
import { db } from '../../../utils/storage';
import NotificationSettings from './NotificationSettings';
import NotificationDetailModal from './NotificationDetailModal';

interface NotificationCenterProps {
  user: User;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'settings'>('list');
  const [activeTab, setActiveTab] = useState<NotificationOrigin>('OPERACIONAL');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent && notifications.length === 0) setIsLoading(true);
    
    try {
      const data = await db.getNotifications();
      
      if (data && Array.isArray(data) && data.length > 0) {
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
    
    const handleForcedRefresh = () => {
      loadNotifications(true);
    };
    
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

  const handleNotifClick = (n: Notification) => {
    setSelectedNotification(n);
    setIsDetailOpen(true);
    setIsOpen(false); 
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => n.origin === activeTab);
  }, [notifications, activeTab]);

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
                   <button onClick={() => setActiveTab('OPERACIONAL')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'OPERACIONAL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Operacional</button>
                   <button onClick={() => setActiveTab('MOTORISTA')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'MOTORISTA' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Motorista</button>
                </div>
              )}
           </div>
           
           <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-4 space-y-3 bg-white min-h-[150px]">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                   <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</p>
                </div>
              ) : view === 'settings' ? (
                <NotificationSettings user={user} onUpdate={() => {}} />
              ) : filteredNotifications.length === 0 ? (
                <div className="py-20 text-center text-slate-300 text-[9px] font-black uppercase italic">Sem atividades registradas</div>
              ) : filteredNotifications.map(n => (
                <button 
                  key={n.id} 
                  onClick={() => handleNotifClick(n)}
                  className="w-full text-left p-4 bg-slate-50 border border-slate-100 rounded-3xl transition-all hover:bg-slate-100/80 group relative overflow-hidden active:scale-[0.98]"
                >
                   <div className={`absolute top-0 left-0 w-1.5 h-full ${n.origin === 'MOTORISTA' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                   <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[6.5px] font-black uppercase ${n.origin === 'MOTORISTA' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{n.type.replace(/_/g, ' ')}</span>
                      <p className="text-[8px] font-mono font-black text-slate-400 leading-none">{new Date(n.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                   <h5 className="text-[10px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{n.title}</h5>
                   <p className="text-[9px] text-slate-500 font-medium mt-1 leading-snug line-clamp-1">{n.description}</p>
                </button>
              ))}
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
