
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
      .slice(0, 10); // Menos itens para a versão compacta
  }, [notifications, activeTab]);

  const getIcon = (type: string) => {
    if (type.includes('GENERATED')) return '📄';
    if (type.includes('STATUS')) return '🕒';
    if (type.includes('PAYMENT')) return '💰';
    if (type.includes('SYSTEM')) return '⚙️';
    return '🔔';
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[480px] animate-in fade-in duration-700">
      <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col gap-4 shrink-0">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Atividades</h3>
          <button 
            onClick={() => loadData()}
            disabled={isRefreshing}
            className={`p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 transition-all ${isRefreshing ? 'animate-spin' : 'active:scale-90'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1">
          <button 
            onClick={() => setActiveTab('OPERACIONAL')}
            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'OPERACIONAL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-600'}`}
          >
            Operacional
          </button>
          <button 
            onClick={() => setActiveTab('MOTORISTA')}
            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'MOTORISTA' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-600'}`}
          >
            Motorista
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#fcfdfe]">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[9px] font-black uppercase tracking-widest">Sincronizando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-[10px] font-black uppercase">Sem atividades</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div 
              key={n.id} 
              className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all group animate-in slide-in-from-right-2 duration-300"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${activeTab === 'MOTORISTA' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  {n.type.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] font-mono font-black text-slate-400">
                  {new Date(n.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-sm ${activeTab === 'MOTORISTA' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                   {getIcon(n.type)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight truncate">
                    {n.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug line-clamp-2">
                    {n.description}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">ALS SYSTEM V7</p>
      </div>
    </div>
  );
};

export default RecentActivitiesCard;
