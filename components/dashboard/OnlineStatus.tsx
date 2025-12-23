
import React, { useState, useEffect, useRef } from 'react';
import { User, Staff } from '../../types';
import { db } from '../../utils/storage';

interface OnlineStatusProps {
  staffList: Staff[];
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ staffList }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState(0);

  const fetchStatus = async () => {
    const u = await db.getUsers();
    setUsers(u);
  };

  useEffect(() => {
    fetchStatus();
    // Atualiza a cada 5 segundos para maior precisão
    const statusInterval = setInterval(fetchStatus, 5000); 
    const clockInterval = setInterval(() => setTrigger(t => t + 1), 1000);
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(clockInterval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getStatus = (user: User) => {
    if (!user.lastSeen) return 'OFFLINE';
    const now = new Date().getTime();
    const last = new Date(user.lastSeen).getTime();
    const diff = (now - last) / 1000;

    // Se a última atividade foi há mais de 60 segundos, considera offline
    if (diff > 60) return 'OFFLINE';
    // Se a aba estiver oculta, aparece como ausente
    return user.isOnlineVisible ? 'ATIVO' : 'AUSENTE';
  };

  const getSessionTime = (lastLogin: string) => {
    try {
      const start = new Date(lastLogin).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      if (isNaN(diff) || diff <= 0) return '00:00:00';
      const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch { return '00:00:00'; }
  };

  const activeCount = users.filter(u => getStatus(u) === 'ATIVO').length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-800/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between hover:bg-slate-800 transition-all">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
          </div>
          <span className="text-[9px] font-black text-slate-100 uppercase tracking-widest">{activeCount} Ativo{activeCount !== 1 ? 's' : ''}</span>
        </div>
        <svg className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 z-[100]">
          <div className="p-3 bg-slate-800/50 border-b border-white/5">
             <h4 className="text-[8px] font-black text-blue-400 uppercase tracking-widest text-center">Monitoramento em Tempo Real</h4>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar">
            {staffList.map(s => {
              const u = users.find(user => user.staffId === s.id);
              const status = u ? getStatus(u) : 'OFFLINE';
              const statusColor = status === 'ATIVO' ? 'bg-emerald-500' : status === 'AUSENTE' ? 'bg-amber-500' : 'bg-slate-600';
              
              return (
                <div key={s.id} className="p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 last:border-0">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 overflow-hidden flex items-center justify-center border border-white/10">
                      {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-slate-500">{s.name.substring(0,1)}</span>}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${statusColor}`}></div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[9px] font-black text-slate-200 uppercase truncate">{s.name}</p>
                    <div className="flex items-center gap-2">
                      <p className={`text-[7px] font-black uppercase ${status === 'ATIVO' ? 'text-emerald-400' : status === 'AUSENTE' ? 'text-amber-400' : 'text-slate-500'}`}>{status}</p>
                      {status !== 'OFFLINE' && u && <span className="text-[7px] font-bold text-blue-400/60 uppercase">{getSessionTime(u.lastLogin)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineStatus;
