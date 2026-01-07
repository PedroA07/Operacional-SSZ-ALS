
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Notification, NotificationPreference } from '../../../types';
import { db } from '../../../utils/storage';

interface NotificationCenterProps {
  user: User;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [prefs, setPrefs] = useState<NotificationPreference>(user.notificationPrefs || { 
    newTrip: true, 
    statusUpdate: true, 
    paymentLiberated: true, 
    systemChanges: true,
    newRegistrations: true 
  });

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.getNotifications();
      
      const filtered = data.filter(n => {
        if (n.type === 'TRIP_CREATED') return prefs.newTrip;
        if (['STATUS_UPDATED', 'OC_GENERATED', 'LIBERACAO_GENERATED', 'MINUTA_GENERATED', 'DRIVER_DOC_UPLOADED'].includes(n.type)) {
          return prefs.statusUpdate;
        }
        if (n.type === 'PAYMENT_LIBERATED') return prefs.paymentLiberated;
        const isRegistration = ['DRIVER_CREATED', 'CUSTOMER_CREATED', 'PORT_CREATED', 'PRESTACKING_CREATED', 'CATEGORY_CREATED'].includes(n.type);
        if (isRegistration) return prefs.newRegistrations;
        if (['SYSTEM', 'DELETED'].includes(n.type)) return prefs.systemChanges;
        return true;
      });

      setNotifications(filtered);
      
      const lastCheckStr = localStorage.getItem(`als_notif_last_check_${user.id}`);
      const lastCheck = lastCheckStr ? new Date(lastCheckStr).getTime() : 0;
      const count = filtered.filter(n => new Date(n.timestamp).getTime() > lastCheck).length;
      setUnreadCount(count);
    } catch (e) {
      console.error("Falha ao carregar lista de notificações:", e);
    } finally {
      setIsLoading(false);
    }
  }, [prefs, user.id]);

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
      loadNotifications(); 
    }
  };

  const handleUpdatePrefs = async (newPrefs: NotificationPreference) => {
    setPrefs(newPrefs);
    const updatedUser = { ...user, notificationPrefs: newPrefs };
    await db.saveUser(updatedUser);
    loadNotifications();
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
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Feed de Notificações</h4>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Histórico em tempo real</p>
              </div>
              <div className="flex items-center gap-2">
                {isLoading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                <button onClick={() => setShowPrefs(true)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </button>
              </div>
           </div>
           
           <div className="max-h-[480px] overflow-y-auto custom-scrollbar p-3 space-y-2">
              {notifications.length === 0 && !isLoading ? (
                <div className="py-20 text-center text-slate-300 font-bold uppercase italic text-[10px]">Nenhuma notificação encontrada</div>
              ) : notifications.map(n => (
                <div key={n.id} className="p-5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-[1.8rem] transition-all group">
                   <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${
                        n.type === 'TRIP_CREATED' ? 'bg-blue-100 text-blue-600' :
                        n.type === 'STATUS_UPDATED' || n.type.includes('GENERATED') ? 'bg-emerald-100 text-emerald-600' :
                        n.type === 'PAYMENT_LIBERATED' ? 'bg-amber-100 text-amber-600' :
                        n.type === 'DELETED' ? 'bg-red-100 text-red-600' :
                        'bg-slate-200 text-slate-500'
                      }`}>
                        {n.type.replace(/_/g, ' ')}
                      </span>
                      <div className="text-right">
                        <p className="text-[8px] font-mono font-black text-blue-500 leading-none">{new Date(n.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                   </div>

                   <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{n.title}</h5>
                   <p className="text-[10px] text-slate-500 font-medium mt-1 leading-snug">{n.description}</p>

                   {n.summary && Object.keys(n.summary).length > 0 && (
                     <div className="mt-4 p-3 bg-white rounded-2xl border border-slate-100 grid grid-cols-2 gap-3 shadow-inner">
                        {Object.entries(n.summary).map(([key, val]) => val && (
                          <div key={key}>
                            <p className="text-[7px] font-black text-slate-300 uppercase leading-none">{key}</p>
                            <p className="text-[9px] font-black text-slate-700 mt-1 uppercase truncate">{val}</p>
                          </div>
                        ))}
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

      {showPrefs && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <div>
                   <h3 className="text-sm font-black uppercase tracking-widest">Configurações de Alertas</h3>
                   <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Escolha o que monitorar</p>
                </div>
                <button onClick={() => setShowPrefs(false)} className="p-2 hover:bg-white/10 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
             </div>
             
             <div className="p-8 space-y-4">
                {[
                  { key: 'newTrip', label: 'Novas Programações', desc: 'Sinalizar quando uma nova OS for inserida.' },
                  { key: 'statusUpdate', label: 'Eventos & Documentos', desc: 'Status de viagem e geração de OC/Minutas.' },
                  { key: 'paymentLiberated', label: 'Financeiro', desc: 'Liberações de 70% e 30%.' },
                  { key: 'newRegistrations', label: 'Gestão Cadastral', desc: 'Novos motoristas, clientes e unidades.' },
                  { key: 'systemChanges', label: 'Segurança & Exclusão', desc: 'Monitorar remoção de dados do sistema.' }
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group hover:bg-white hover:border-blue-200 transition-all">
                    <div className="flex-1 pr-4">
                       <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{item.label}</p>
                       <p className="text-[8px] font-bold text-slate-400 mt-1.5 uppercase leading-tight">{item.desc}</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={(prefs as any)[item.key]} 
                        onChange={(e) => handleUpdatePrefs({ ...prefs, [item.key]: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                ))}
             </div>
             <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setShowPrefs(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all">Salvar e Fechar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
