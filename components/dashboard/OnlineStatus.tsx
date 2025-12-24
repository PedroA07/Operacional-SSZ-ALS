
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Staff } from '../../types';
import { db } from '../../utils/storage';

interface OnlineStatusProps {
  staffList: Staff[];
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ staffList }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fetchStatus = useCallback(async () => {
    const u = await db.getUsers();
    setUsers(u);
  }, []);

  useEffect(() => {
    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 15000); // Polling a cada 15s
    const clockInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    
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
  }, [fetchStatus]);

  const getStatus = (user: User): 'ONLINE' | 'AUSENTE' | 'OFFLINE' => {
    if (!user.lastSeen) return 'OFFLINE';
    const last = new Date(user.lastSeen).getTime();
    const diff = (currentTime - last) / 1000;
    
    if (diff > 90) return 'OFFLINE'; // Mais de 1min e meio sem heartbeat = offline
    
    return user.isOnlineVisible ? 'ONLINE' : 'AUSENTE';
  };

  const getSessionTime = (lastLogin?: string) => {
    if (!lastLogin) return '00:00:00';
    try {
      const start = new Date(lastLogin).getTime();
      const diff = currentTime - start;
      if (isNaN(diff) || diff <= 0) return '00:00:00';
      const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch { return '00:00:00'; }
  };

  const activeUsers = users.filter(u => getStatus(u) !== 'OFFLINE');
  const activeCount = activeUsers.length;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-full rounded-2xl p-4 flex items-center justify-between transition-all duration-500 border ${
          isOpen 
          ? 'bg-[#0f172a] border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
          : 'bg-slate-800/40 border-white/5 hover:bg-slate-800 hover:border-white/10'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${activeCount > 0 ? 'bg-blue-500 animate-pulse' : 'bg-slate-600'}`}></div>
          </div>
          <div className="flex flex-col items-start">
            <span className={`text-[11px] font-black uppercase tracking-[0.1em] ${isOpen ? 'text-blue-400' : 'text-slate-100'}`}>
              {activeCount} Operadores
            </span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Em tempo real</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 w-full bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.6)] overflow-hidden animate-in slide-in-from-bottom-6 zoom-in-95 duration-500 z-[100]">
          <div className="p-6 bg-[#0f172a] border-b border-white/5 flex justify-between items-center">
             <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Monitoramento ALS</h4>
             <span className="text-[8px] font-black bg-blue-600 text-white px-2.5 py-1 rounded-lg uppercase shadow-lg shadow-blue-600/20">Live</span>
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#0a0f1e]">
            {staffList.map(s => {
              const u = users.find(user => user.staffId === s.id);
              const status = u ? getStatus(u) : 'OFFLINE';
              
              const statusConfig = {
                ONLINE: { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Online' },
                AUSENTE: { color: 'bg-amber-500', text: 'text-amber-400', label: 'Ausente' },
                OFFLINE: { color: 'bg-slate-600', text: 'text-slate-500', label: 'Offline' }
              };

              const config = statusConfig[status];
              const isInactive = status === 'OFFLINE';

              return (
                <div key={s.id} className={`p-4 flex items-center gap-4 rounded-[1.8rem] transition-all duration-300 ${isInactive ? 'opacity-30 grayscale hover:opacity-100 hover:grayscale-0' : 'bg-white/5 hover:bg-white/10'}`}>
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-2xl bg-slate-800 overflow-hidden flex items-center justify-center border transition-all ${isInactive ? 'border-white/5' : 'border-white/10 shadow-lg'}`}>
                      {s.photo ? <img src={s.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-black text-slate-600">{s.name.charAt(0)}</span>}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-[#0a0f1e] ${config.color} ${status === 'ONLINE' ? 'animate-pulse' : ''}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-100 uppercase truncate tracking-tight">{s.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-[8px] font-black uppercase ${config.text}`}>{config.label}</p>
                      {!isInactive && u && (
                        <span className="text-[7px] font-mono font-bold text-blue-400/60 bg-blue-400/5 px-2 py-0.5 rounded-md">{getSessionTime(u.lastLogin)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {staffList.length === 0 && (
              <div className="p-16 text-center text-slate-700">
                <p className="text-[10px] font-black uppercase italic tracking-widest">Nenhum registro</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineStatus;
