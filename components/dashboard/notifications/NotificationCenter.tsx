
import React, { useState, useEffect, useRef } from 'react';
import { User, Notification, NotificationPreference } from '../../../types';
import { db } from '../../../utils/storage';

interface NotificationCenterProps {
  user: User;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const prefs = user.notificationPrefs || { newTrip: true, statusUpdate: true, paymentLiberated: true, systemChanges: true };

  const loadNotifications = async () => {
    const data = await db.getNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);

    const handleNewNotif = (e: any) => {
      const notif = e.detail as Notification;
      
      // Filtrar baseado nas preferências do usuário
      const shouldShow = 
        (notif.type === 'TRIP_CREATED' && prefs.newTrip) ||
        (notif.type === 'STATUS_UPDATED' && prefs.statusUpdate) ||
        (notif.type === 'PAYMENT_LIBERATED' && prefs.paymentLiberated) ||
        ((notif.type === 'CATEGORY_CREATED' || notif.type === 'SYSTEM') && prefs.systemChanges);

      if (shouldShow) {
        setNotifications(prev => [notif, ...prev].slice(0, 50));
        setActiveToast(notif);
        setTimeout(() => setActiveToast(null), 6000);
      }
    };

    window.addEventListener('als_new_notification', handleNewNotif);
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      window.removeEventListener('als_new_notification', handleNewNotif);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [prefs]);

  const handleUpdatePrefs = async (newPrefs: NotificationPreference) => {
    const updatedUser = { ...user, notificationPrefs: newPrefs };
    await db.saveUser(updatedUser);
    alert("Preferências salvas com sucesso!");
    setShowPrefs(false);
    // Em um cenário real, você atualizaria o estado global do usuário aqui
    window.location.reload(); 
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BELL ICON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-3 rounded-xl transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-blue-600'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        {notifications.length > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
        )}
      </button>

      {/* DROPDOWN */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-96 bg-white rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-300 z-[100]">
           <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Notificações ALS</h4>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1">Histórico de Alterações</p>
              </div>
              <button onClick={() => setShowPrefs(true)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </button>
           </div>
           
           <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-slate-300 font-bold uppercase italic text-[10px]">Nenhuma notificação recente</div>
              ) : notifications.map(n => (
                <div key={n.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-3xl transition-all group">
                   <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded-[6px] text-[7px] font-black uppercase ${
                        n.type === 'TRIP_CREATED' ? 'bg-blue-100 text-blue-600' :
                        n.type === 'STATUS_UPDATED' ? 'bg-emerald-100 text-emerald-600' :
                        n.type === 'PAYMENT_LIBERATED' ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-200 text-slate-600'
                      }`}>{n.type.replace('_', ' ')}</span>
                      <span className="text-[8px] font-bold text-slate-400 font-mono">
                        {new Date(n.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} • {new Date(n.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                   </div>
                   <p className="text-[10px] font-black text-slate-700 leading-tight uppercase">{n.message}</p>
                   {n.osRef && <p className="text-[9px] font-black text-blue-600 mt-2">OS: {n.osRef}</p>}
                   <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 opacity-60">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black">{n.userName[0]}</div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Alterado por: <span className="text-slate-600">{n.userName}</span></p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* TOAST POPUP (TOP RIGHT) */}
      {activeToast && (
        <div className="fixed top-20 right-10 z-[1000] w-80 animate-in slide-in-from-right-8 fade-in duration-500">
           <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-white/10 flex gap-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-center mb-1">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{activeToast.type.replace('_', ' ')}</p>
                    <button onClick={() => setActiveToast(null)} className="text-white/20 hover:text-white transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
                 </div>
                 <p className="text-[10px] font-black uppercase leading-tight">{activeToast.message}</p>
                 <p className="text-[8px] text-white/40 mt-2 font-bold uppercase tracking-tighter">Acabou de acontecer • Por {activeToast.userName}</p>
              </div>
           </div>
        </div>
      )}

      {/* PREFERENCES MODAL */}
      {showPrefs && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 bg-slate-900 text-white">
                 <h3 className="text-sm font-black uppercase tracking-widest">Configurações de Alerta</h3>
                 <p className="text-[9px] font-bold opacity-60 mt-1">Filtre quais notificações deseja receber em tempo real</p>
              </div>
              
              <div className="p-8 space-y-4">
                 {[
                   { id: 'newTrip', label: 'Nova Programação Inserida', desc: 'Sempre que uma OS for cadastrada' },
                   { id: 'statusUpdate', label: 'Atualização de Status', desc: 'Mudanças de evento na linha do tempo' },
                   { id: 'paymentLiberated', label: 'Financeiro (Adiantamento / Saldo)', desc: 'Liberações realizadas pelo administrativo' },
                   { id: 'systemChanges', label: 'Mudanças de Sistema', desc: 'Novas categorias, exclusões e cadastros' }
                 ].map(item => (
                   <label key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all group">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{item.label}</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{item.desc}</p>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={(prefs as any)[item.id]} 
                        onChange={(e) => handleUpdatePrefs({ ...prefs, [item.id]: e.target.checked })} 
                      />
                   </label>
                 ))}
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-3">
                 <button onClick={() => setShowPrefs(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all">Fechar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
