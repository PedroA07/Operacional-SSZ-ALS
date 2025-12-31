
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Staff } from '../../types';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  const fetchStatus = useCallback(async () => {
    const u = await db.getUsers();
    setUsers(u);
  }, []);

  useEffect(() => {
    fetchStatus();
    const syncInterval = setInterval(fetchStatus, 15000);
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

  const getStatus = (user: User): 'ONLINE' | 'AUSENTE' | 'OFFLINE' => {
    if (currentUser && user.id === currentUser.id) return 'ONLINE';
    
    if (!user.lastSeen) return 'OFFLINE';
    const lastSeenDate = new Date(user.lastSeen);
    const diffSeconds = (currentTime - lastSeenDate.getTime()) / 1000;
    
    if (diffSeconds > 180) return 'OFFLINE';
    if (diffSeconds < 60) return 'ONLINE';
    return 'AUSENTE';
  };

  const onlineCount = users.filter(u => getStatus(u) === 'ONLINE').length;

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
            <div className={`w-3.5 h-3.5 rounded-full ${onlineCount > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`}></div>
          </div>
          <div className="flex flex-col items-start text-left">
            <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isOpen ? 'text-blue-400' : 'text-slate-100'}`}>
              {onlineCount} Online agora
            </span>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Status em Tempo Real</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-4 w-full bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.7)] overflow-hidden animate-in slide-in-from-bottom-6 zoom-in-95 duration-500 z-[200]">
          <div className="p-6 bg-[#0f172a] border-b border-white/5 flex justify-between items-center">
             <div className="flex flex-col">
               <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Monitor de Sessões</h4>
               <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">Dados Sincronizados</p>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                <span className="text-[8px] font-black bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-xl uppercase border border-blue-500/20">Monitorando</span>
             </div>
          </div>

          <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#0a0f1e]">
            {staffList.map(s => {
              const u = users.find(user => 
                (user.staffId === s.id) || 
                (s.role === 'admin' && user.username.toLowerCase() === s.username.toLowerCase()) ||
                (s.username === 'operacional_ssz' && user.id === 'admin-master')
              );
              
              const status = u ? getStatus(u) : 'OFFLINE';
              const statusConfigs = {
                ONLINE: { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Online / Ativo', shadow: 'shadow-emerald-500/40' },
                AUSENTE: { color: 'bg-amber-500', text: 'text-amber-400', label: 'Ausente / Inativo', shadow: 'shadow-amber-500/40' },
                OFFLINE: { color: 'bg-slate-700', text: 'text-slate-500', label: 'Desconectado', shadow: 'shadow-transparent' }
              };

              const config = statusConfigs[status];
              // USA O UTILITÁRIO PRÓPRIO:
              const displayTime = u ? timeUtils.calculateDuration(u.lastLogin) : '00:00:00';

              return (
                <div key={s.id} className={`p-4 flex items-center gap-4 rounded-[1.8rem] transition-all duration-500 border ${status === 'OFFLINE' ? 'opacity-30 border-transparent grayscale' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}>
                  <div className="relative shrink-0">
                    <div className={`w-12 h-12 rounded-2xl bg-slate-800 overflow-hidden flex items-center justify-center border transition-all ${status === 'OFFLINE' ? 'border-white/5' : 'border-white/20'}`}>
                      {s.photo ? <img src={s.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-sm font-black text-slate-600">{s.name.charAt(0)}</span>}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-[#0a0f1e] shadow-lg ${config.color} ${config.shadow} ${status === 'ONLINE' ? 'animate-pulse' : ''}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-100 uppercase truncate tracking-tight">{s.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-[8px] font-black uppercase tracking-tighter ${config.text}`}>{config.label}</p>
                      {status !== 'OFFLINE' && (
                        <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/10">
                           <svg className="w-2.5 h-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3.5"/></svg>
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
