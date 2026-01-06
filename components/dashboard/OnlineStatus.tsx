
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Staff, PresenceStatus } from '../../types';
import { db } from '../../utils/storage';
import { timeUtils } from '../../utils/timeUtils';

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
    const syncInterval = setInterval(fetchStatus, 10000);
    const clockInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fetchStatus]);

  const getStatusInfo = (user: User) => {
    const status = user.presence_status || 'offline';
    
    if (user.lastSeen) {
      const lastSeenDate = new Date(user.lastSeen);
      const diffSeconds = (currentTime - lastSeenDate.getTime()) / 1000;
      if (diffSeconds > 60) return { key: 'offline', color: 'bg-slate-700', text: 'text-slate-500', label: 'Desconectado' };
    }

    switch (status) {
      case 'online': return { key: 'online', color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Online' };
      case 'away': return { key: 'away', color: 'bg-amber-500', text: 'text-amber-400', label: 'Ausente' };
      default: return { key: 'offline', color: 'bg-slate-700', text: 'text-slate-500', label: 'Desconectado' };
    }
  };

  const stats = useMemo(() => {
    const counts = { online: 0, away: 0, offline: 0 };
    staffList.forEach(s => {
      const u = users.find(user => (user.staffId === s.id) || (s.username === 'operacional_ssz' && user.id === 'admin-master'));
      const info = u ? getStatusInfo(u) : { key: 'offline' };
      if (info.key === 'online') counts.online++;
      else if (info.key === 'away') counts.away++;
      else counts.offline++;
    });
    return counts;
  }, [staffList, users, currentTime]);

  const totalActive = stats.online + stats.away;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-full rounded-2xl p-4 flex items-center justify-between transition-all duration-500 border ${
          isOpen 
          ? 'bg-[#0f172a] border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-[1.02]' 
          : 'bg-slate-800/40 border-white/5 hover:bg-slate-800 hover:border-white/10'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${totalActive > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`}></div>
          </div>
          <div className="flex flex-col items-start text-left">
            <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isOpen ? 'text-blue-400' : 'text-slate-100'}`}>
              {totalActive} Ativos agora
            </span>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Presença em tempo real</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-4 w-full bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.7)] overflow-hidden animate-in slide-in-from-bottom-6 zoom-in-95 duration-500 z-[200]">
          {/* TOPO COM RESUMO DE STATUS */}
          <div className="p-6 bg-[#0f172a] border-b border-white/5">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Monitoramento</h4>
                  <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">Equipe ALS Transportes</p>
                </div>
                <span className="text-[8px] font-black bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-xl uppercase border border-blue-500/20">LIVE</span>
             </div>
             
             <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl text-center">
                   <p className="text-[7px] font-black text-emerald-500 uppercase mb-1">Online</p>
                   <p className="text-xl font-black text-emerald-400 leading-none">{stats.online}</p>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-2xl text-center">
                   <p className="text-[7px] font-black text-amber-500 uppercase mb-1">Ausente</p>
                   <p className="text-xl font-black text-amber-400 leading-none">{stats.away}</p>
                </div>
                <div className="bg-slate-500/5 border border-slate-500/10 p-3 rounded-2xl text-center">
                   <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Off</p>
                   <p className="text-xl font-black text-slate-400 leading-none">{stats.offline}</p>
                </div>
             </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-4 space-y-2.5 bg-[#0a0f1e]">
            {staffList.map(s => {
              const u = users.find(user => (user.staffId === s.id) || (s.username === 'operacional_ssz' && user.id === 'admin-master'));
              const info = u ? getStatusInfo(u) : { key: 'offline', color: 'bg-slate-700', text: 'text-slate-500', label: 'Desconectado' };
              
              const displayTime = (u && info.key !== 'offline') ? timeUtils.calculateDuration(u.lastLogin) : '00:00:00';

              return (
                <div key={s.id} className={`p-3.5 flex items-center gap-4 rounded-[1.6rem] transition-all duration-500 border ${info.key === 'offline' ? 'opacity-30 border-transparent grayscale' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center border border-white/10">
                      {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <span className="text-xs font-black text-slate-600">{s.name.charAt(0)}</span>}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-[2.5px] border-[#0a0f1e] ${info.color}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-100 uppercase truncate leading-none">{s.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className={`text-[7px] font-black uppercase tracking-tighter ${info.text}`}>{info.label}</p>
                      {info.key !== 'offline' && (
                        <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/10">
                           <span className="text-[8px] font-mono font-black text-blue-400">{displayTime}</span>
                        </div>
                      )}
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
