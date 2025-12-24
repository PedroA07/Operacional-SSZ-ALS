
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
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fetchStatus = async () => {
    const u = await db.getUsers();
    setUsers(u);
  };

  useEffect(() => {
    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 10000); 
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
  }, []);

  const getStatus = (user: User) => {
    if (!user.lastSeen) return 'OFFLINE';
    const last = new Date(user.lastSeen).getTime();
    const diff = (currentTime - last) / 1000;
    if (diff > 60) return 'OFFLINE';
    return user.isOnlineVisible ? 'ATIVO' : 'AUSENTE';
  };

  const getSessionTime = (lastLogin: string) => {
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
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-full border rounded-2xl p-3 flex items-center justify-between transition-all duration-300 ${
          isOpen ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`}></div>
          </div>
          <div className="flex flex-col items-start">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isOpen ? 'text-blue-400' : 'text-slate-100'}`}>
              {activeCount} Operador{activeCount !== 1 ? 'es' : ''}
            </span>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">Em tempo real</span>
          </div>
        </div>
        <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 w-72 bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 z-[100]">
          <div className="p-4 bg-slate-800/50 border-b border-white/5 flex justify-between items-center">
             <h4 className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em]">Monitoramento ALS</h4>
             <span className="text-[7px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase">Live</span>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {staffList.map(s => {
              const u = users.find(user => user.staffId === s.id);
              const status = u ? getStatus(u) : 'OFFLINE';
              const statusColor = status === 'ATIVO' ? 'bg-emerald-500' : status === 'AUSENTE' ? 'bg-amber-500' : 'bg-slate-600';
              const isMe = u?.username === localStorage.getItem('als_last_user');
              
              return (
                <div key={s.id} className={`p-3 flex items-center gap-3 rounded-2xl transition-all ${status !== 'OFFLINE' ? 'bg-white/5' : 'opacity-40 grayscale hover:grayscale-0 hover:opacity-100 hover:bg-white/5'}`}>
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center border border-white/10 shadow-inner">
                      {s.photo ? <img src={s.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black text-slate-600">{s.name.substring(0,1)}</span>}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${statusColor}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <p className="text-[9px] font-black text-slate-200 uppercase truncate">{s.name}</p>
                       {isMe && <span className="text-[6px] font-black text-blue-400 border border-blue-400/30 px-1 rounded-sm">EU</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-[7px] font-black uppercase ${status === 'ATIVO' ? 'text-emerald-400' : status === 'AUSENTE' ? 'text-amber-400' : 'text-slate-500'}`}>{status}</p>
                      {status !== 'OFFLINE' && u && (
                        <div className="flex items-center gap-1.5 ml-auto">
                           <svg className="w-2.5 h-2.5 text-blue-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3"/></svg>
                           <span className="text-[7px] font-mono font-bold text-blue-400/80">{getSessionTime(u.lastLogin)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {staffList.length === 0 && (
              <div className="p-10 text-center text-slate-600">
                <p className="text-[9px] font-black uppercase">Nenhum colaborador registrado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineStatus;
