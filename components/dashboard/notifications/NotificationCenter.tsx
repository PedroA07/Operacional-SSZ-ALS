
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Notification, NotificationOrigin } from '../../../types';
import { db } from '../../../utils/storage';

interface NotificationCenterProps {
  user: User;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationOrigin>('OPERACIONAL');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.getNotifications();
      setNotifications(data);
      
      const lastCheckStr = localStorage.getItem(`als_notif_last_check_${user.id}`);
      const lastCheck = lastCheckStr ? new Date(lastCheckStr).getTime() : 0;
      const count = data.filter(n => new Date(n.timestamp).getTime() > lastCheck).length;
      setUnreadCount(count);
    } catch (e) {
      console.error("Erro ao carregar notificações:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadNotifications();
    const handleNewNotif = () => loadNotifications();
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
  }, [loadNotifications]);

  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      setUnreadCount(0);
      localStorage.setItem(`als_notif_last_check_${user.id}`, new Date().toISOString());
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'OPERACIONAL') {
      // Filtro Operacional: Viagens, OCs, Docs, Cadastros, Edições
      return n.origin === 'OPERACIONAL' && [
        'TRIP_CREATED', 'TRIP_UPDATED', 'OC_GENERATED', 'OC_EDITED', 
        'LIBERACAO_GENERATED', 'MINUTA_GENERATED', 'DOC_ATTACHED', 
        'CONTRACT_UPLOADED', 'DRIVER_CREATED', 'DRIVER_UPDATED', 
        'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'PORT_CREATED', 
        'PORT_UPDATED', 'PRESTACKING_CREATED', 'PRESTACKING_UPDATED',
        'CATEGORY_CREATED', 'DELETED', 'SYSTEM'
      ].includes(n.type);
    } else {
      // Filtro Motorista: Perfil, Status, Fotos
      return n.origin === 'MOTORISTA' && [
        'DRIVER_PROFILE_UPDATED', 'STATUS_UPDATED', 'DRIVER_DOC_UPLOADED'
      ].includes(n.type);
    }
  });

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
        <div className="absolute top-full right-0 mt-4 w-[420px] bg-white rounded-[2.5rem] shadow-[0_25px_100px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-300 z-[200]">
           <div className="p-6 bg-slate-50 border-b border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Atividades do Sistema</h4>
                  <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Monitoramento por Portal</p>
                </div>
                {isLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
              </div>

              <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1">
                 <button 
                   onClick={() => setActiveTab('OPERACIONAL')}
                   className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'OPERACIONAL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   Portal Operacional
                 </button>
                 <button 
                   onClick={() => setActiveTab('MOTORISTA')}
                   className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'MOTORISTA' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   Portal Motorista
                 </button>
              </div>
           </div>
           
           <div className="max-h-[480px] overflow-y-auto custom-scrollbar p-4 space-y-3 bg-white">
              {filteredNotifications.length === 0 ? (
                <div className="py-24 text-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                   </div>
                   <p className="text-[10px] text-slate-300 font-bold uppercase italic">Sem novas atualizações para este portal</p>
                </div>
              ) : filteredNotifications.map(n => (
                <div key={n.id} className="p-5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-[1.8rem] transition-all group relative overflow-hidden">
                   <div className={`absolute top-0 left-0 w-1 h-full ${activeTab === 'OPERACIONAL' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                   
                   <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${
                        activeTab === 'MOTORISTA' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {n.type.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[8px] font-mono font-black text-slate-400">{new Date(n.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>

                   <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{n.title}</h5>
                   <p className="text-[10px] text-slate-500 font-medium mt-1 leading-snug">{n.description}</p>

                   {n.summary && (Object.keys(n.summary).length > 0) && (
                     <div className="mt-4 p-3 bg-white rounded-2xl border border-slate-100 grid grid-cols-2 gap-3 shadow-inner">
                        {n.summary.os && (
                          <div>
                            <p className="text-[7px] font-black text-slate-300 uppercase leading-none">OS</p>
                            <p className="text-[10px] font-black text-blue-600 mt-1 uppercase truncate">{n.summary.os}</p>
                          </div>
                        )}
                        {n.summary.motorista && (
                          <div>
                            <p className="text-[7px] font-black text-slate-300 uppercase leading-none">Motorista</p>
                            <p className="text-[9px] font-black text-slate-700 mt-1 uppercase truncate">{n.summary.motorista}</p>
                          </div>
                        )}
                        {n.summary.docType && (
                          <div className="col-span-2">
                             <p className="text-[7px] font-black text-slate-300 uppercase leading-none">Tipo Doc</p>
                             <p className="text-[9px] font-black text-slate-700 mt-1 uppercase">{n.summary.docType}</p>
                          </div>
                        )}
                     </div>
                   )}

                   <div className="mt-4 flex items-center justify-between opacity-60 border-t border-slate-100 pt-3">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Autor: <span className="text-slate-800 font-bold">{n.authorName}</span></p>
                      <p className="text-[8px] font-mono text-slate-300">{new Date(n.timestamp).toLocaleDateString('pt-BR')}</p>
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
