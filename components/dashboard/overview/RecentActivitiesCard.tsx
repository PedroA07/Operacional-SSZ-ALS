
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
      .slice(0, 15);
  }, [notifications, activeTab]);

  const getIcon = (type: string) => {
    if (type.includes('GENERATED')) return '📄';
    if (type.includes('STATUS')) return '🕒';
    if (type.includes('PAYMENT')) return '💰';
    if (type.includes('SYSTEM')) return '⚙️';
    return '🔔';
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px] animate-in fade-in duration-700">
      <div className="p-10 bg-slate-50 border-b border-slate-100 flex flex-col gap-8 shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-[0.2em]">Centro de Atividades</h3>
            <p className="text-xs text-slate-400 font-bold uppercase mt-2 tracking-[0.3em]">Monitoramento em Tempo Real ALS</p>
          </div>
          <button 
            onClick={() => loadData()}
            disabled={isRefreshing}
            className={`p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 shadow-sm transition-all ${isRefreshing ? 'animate-spin' : 'active:scale-90'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>

        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1.5">
          <button 
            onClick={() => setActiveTab('OPERACIONAL')}
            className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'OPERACIONAL' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-600'}`}
          >
            Fluxo Operacional
          </button>
          <button 
            onClick={() => setActiveTab('MOTORISTA')}
            className={`flex-1 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'MOTORISTA' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-600'}`}
          >
            Ações Motorista
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-5 bg-[#fcfdfe]">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-30">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black uppercase tracking-[0.3em]">Sincronizando Histórico...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-24">
            <svg className="w-20 h-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-sm font-black uppercase tracking-widest">Nenhuma atividade recente registrada</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div 
              key={n.id} 
              className="p-7 bg-white border border-slate-100 rounded-[2.2rem] shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group animate-in slide-in-from-right-6 duration-400"
            >
              <div className="flex justify-between items-start mb-5">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${activeTab === 'MOTORISTA' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  {n.type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-mono font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                  {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex gap-6">
                <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl shadow-inner ${activeTab === 'MOTORISTA' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                   {getIcon(n.type)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">
                    {n.title}
                  </h4>
                  <p className="text-[14px] text-slate-500 font-medium mt-2 leading-relaxed">
                    {n.description}
                  </p>
                </div>
              </div>
              
              {n.summary?.os && (
                <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_blue]"></div>
                      <span className="text-xs font-black text-blue-700 uppercase tracking-widest">OS {n.summary.os}</span>
                   </div>
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-2.5 py-1 rounded-lg">OPERADOR: {n.authorName}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="p-6 bg-slate-50 border-t border-slate-100 text-center shrink-0">
        <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em]">ALS SSZ VIRTUAL TERMINAL SYSTEM • HD INTERFACE</p>
      </div>
    </div>
  );
};

export default RecentActivitiesCard;
