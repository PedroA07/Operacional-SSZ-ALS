
import React, { useState, useEffect, useMemo } from 'react';
import { Notification, Trip } from '../../types';
import { db } from '../../utils/storage';

interface DriverNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  driverTrips: Trip[];
}

const DriverNotificationCenter: React.FC<DriverNotificationCenterProps> = ({ isOpen, onClose, driverTrips }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'tudo' | 'viagens' | 'documentos'>('tudo');
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('als_driver_muted') === 'true');
  const [clearedIds, setClearedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('als_cleared_notifs');
    return saved ? JSON.parse(saved) : [];
  });

  const loadNotifications = async () => {
    const data = await db.getNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    if (isOpen) loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('als_driver_muted', String(next));
  };

  const clearAll = () => {
    const allIds = notifications.map(n => n.id);
    const newCleared = [...new Set([...clearedIds, ...allIds])];
    setClearedIds(newCleared);
    localStorage.setItem('als_cleared_notifs', JSON.stringify(newCleared));
  };

  // Filtra apenas notificações relevantes para este motorista (baseado nas OSs dele)
  const myTripOSs = useMemo(() => new Set(driverTrips.map(t => t.os.toUpperCase())), [driverTrips]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // 1. Não está limpa?
      if (clearedIds.includes(n.id)) return false;
      
      // 2. É de uma OS que pertence a ele?
      const osRef = n.summary?.os?.toUpperCase() || '';
      const isMine = myTripOSs.has(osRef);
      if (!isMine) return false;

      // 3. Filtro de categoria
      if (filter === 'viagens') return ['TRIP_CREATED', 'STATUS_UPDATED', 'TRIP_UPDATED'].includes(n.type);
      if (filter === 'documentos') return ['OC_GENERATED', 'LIBERACAO_GENERATED', 'MINUTA_GENERATED', 'DOC_ATTACHED'].includes(n.type);
      
      return true;
    });
  }, [notifications, clearedIds, myTripOSs, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-[#020617] flex flex-col animate-in slide-in-from-right duration-300">
      <header className="p-6 pt-12 bg-slate-950 border-b border-white/5 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-black uppercase text-white">Notificações</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Alertas de Operadores</p>
          </div>
        </div>
        <button onClick={onClose} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white active:bg-slate-800">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
        </button>
      </header>

      <div className="p-4 bg-slate-900/50 border-b border-white/5 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
         {[
           { id: 'tudo', label: 'Tudo' },
           { id: 'viagens', label: 'Viagens' },
           { id: 'documentos', label: 'Documentos' }
         ].map(btn => (
           <button 
             key={btn.id}
             onClick={() => setFilter(btn.id as any)}
             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${filter === btn.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-slate-500 border border-white/5'}`}
           >
             {btn.label}
           </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {filteredNotifications.length === 0 ? (
          <div className="py-20 text-center space-y-4 opacity-30">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" strokeWidth="2"/></svg>
            </div>
            <p className="text-[10px] font-black uppercase text-white tracking-widest">Nenhuma atividade recente</p>
          </div>
        ) : filteredNotifications.map(n => (
          <div key={n.id} className="p-5 bg-slate-900 border border-white/5 rounded-[1.8rem] space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-start">
               <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${n.type.includes('GENERATED') ? 'bg-emerald-600/20 text-emerald-400' : 'bg-blue-600/20 text-blue-400'}`}>
                 {n.type.replace(/_/g, ' ')}
               </span>
               <p className="text-[8px] font-mono text-slate-600">
                 {new Date(n.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
               </p>
            </div>
            <h4 className="text-[12px] font-black text-white uppercase leading-tight">{n.title}</h4>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{n.description}</p>
            
            <div className="pt-3 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="text-[9px] font-black text-blue-400 uppercase">OS {n.summary?.os || '---'}</span>
              </div>
              <p className="text-[8px] font-bold text-slate-600 uppercase">Por: {n.authorName}</p>
            </div>
          </div>
        ))}
      </div>

      <footer className="p-6 bg-slate-950 border-t border-white/10 flex gap-4 pb-10 shrink-0">
        <button 
          onClick={toggleMute}
          className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all ${isMuted ? 'bg-amber-600/10 text-amber-500 border border-amber-500/20' : 'bg-white/5 text-slate-400'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMuted ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            )}
          </svg>
          <span className="text-[10px] font-black uppercase">{isMuted ? 'Silenciado' : 'Com Som'}</span>
        </button>
        <button 
          onClick={clearAll}
          className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:text-white transition-colors"
        >
          Limpar Tudo
        </button>
      </footer>
    </div>
  );
};

export default DriverNotificationCenter;
