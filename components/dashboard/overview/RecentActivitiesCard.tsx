
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Notification, NotificationOrigin, User } from '../../../types';
import { db } from '../../../utils/storage';

interface RecentActivitiesCardProps {
  user: User;
}

const RecentActivitiesCard: React.FC<RecentActivitiesCardProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationOrigin>('OPERACIONAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const data = await db.getNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.error("Erro atividades:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    
    const handleNewNotif = () => loadData(true);
    window.addEventListener('als_new_notification_event', handleNewNotif);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('als_new_notification_event', handleNewNotif);
    };
  }, [loadData]);

  const filtered = useMemo(() => {
    return notifications
      .filter(n => n.origin === activeTab)
      .slice(0, 15); // Mostra as 15 mais recentes
  }, [notifications, activeTab]);

  const getIcon = (type: string) => {
    if (type.includes('GENERATED')) return '📄';
    if (type.includes('STATUS')) return '🕒';
    if (type.includes('PAYMENT')) return '💰';
    if (type.includes('SYSTEM')) return '⚙️';
    return '🔔';
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] animate-in fade-in duration-700">
      <div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-col gap-6 shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Centro de Atividades</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Fluxo em Tempo Real ALS</p>
          </div>
          <button 
            onClick={() => loadData()}
            disabled={isRefreshing}
            className={`p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 transition-all ${isRefreshing ? 'animate-spin' : 'active:scale-90'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1">
          <button 
            onClick={() => setActiveTab('OPERACIONAL')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'OPERACIONAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Operacional
          </button>
          <button 
            onClick={() => setActiveTab('MOTORISTA')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'MOTORISTA' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Motorista
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 bg-[#fcfdfe]">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[9px] font-black uppercase tracking-widest">Sincronizando Histórico...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-[10px] font-black uppercase">Nenhuma atividade recente</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div 
              key={n.id} 
              className="p-5 bg-white border border-slate-100 rounded-[1.8rem] shadow-sm hover:shadow-md hover:border-blue-200 transition-all group animate-in slide-in-from-right-4 duration-300"
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${activeTab === 'MOTORISTA' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  {n.type.replace(/_/g, ' ')}
                </span>
                <span className="text-[8px] font-mono font-black text-slate-300">
                  {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg ${activeTab === 'MOTORISTA' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                   {getIcon(n.type)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">
                    {n.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed line-clamp-2">
                    {n.description}
                  </p>
                </div>
              </div>
              
              {n.summary?.os && (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                      <span className="text-[9px] font-black text-blue-700 uppercase">OS {n.summary.os}</span>
                   </div>
                   <span className="text-[8px] font-bold text-slate-300 uppercase">Por: {n.authorName}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-100 text-center shrink-0">
        <p className="text-[7px] font-black text-slate-300 uppercase tracking-[0.4em]">ALS SSZ VIRTUAL TERMINAL SYSTEM</p>
      </div>
    </div>
  );
};

export default RecentActivitiesCard;
