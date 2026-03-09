
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Staff } from '../../types';
import { db } from '../../utils/storage';
import { timeUtils } from '../../utils/timeUtils';

interface OnlineStatusProps {
  staffList: Staff[];
  currentUser: User;
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ staffList, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const fetchStatus = useCallback(async () => {
    try {
      const u = await db.getUsers();
      setUsers(u);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchStatus();
    const syncInterval = setInterval(fetchStatus, 30000);
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

  const getStatusInfo = (user: User, isSelf: boolean) => {
    if (isSelf) return { key: 'online', color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Ativo' };
    
    if (!user.lastSeen) return { key: 'offline', color: 'bg-slate-700', text: 'text-slate-500', label: 'Desconectado' };
    
    const lastSeenDate = new Date(user.lastSeen);
    const diffSeconds = (currentTime - lastSeenDate.getTime()) / 1000;

    if (diffSeconds > 300) return { key: 'offline', color: 'bg-slate-700', text: 'text-slate-500', label: 'Desconectado' };

    switch (user.presence_status) {
      case 'online': return { key: 'online', color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Ativo' };
      case 'away': return { key: 'away', color: 'bg-amber-500', text: 'text-amber-400', label: 'Ausente' };
      default: return { key: 'offline', color: 'bg-slate-700', text: 'text-slate-500', label: 'Desconectado' };
    }
  };

  const staffWithStatus = useMemo(() => {
    return staffList.map(s => {
      const isSelf = (s.username === currentUser.username || s.id === currentUser.staffId);
      const u = users.find(user => (user.staffId === s.id) || (s.username === 'operacional_ssz' && user.id === 'admin-master'));
      const info = u ? getStatusInfo(u, isSelf) : getStatusInfo({} as User, isSelf);
      
      // Timer do próprio usuário usa o session_start da aba
      const loginTimestamp = isSelf 
        ? (sessionStorage.getItem('als_session_start') || currentUser.lastLogin) 
        : u?.lastLogin;

      const displayTime = (loginTimestamp && info.key !== 'offline') ? timeUtils.calculateDuration(loginTimestamp) : '00:00:00';

      return { ...s, info, displayTime };
    });
  }, [staffList, users, currentTime, currentUser]);

  const stats = useMemo(() => {
    const counts = { online: 0, away: 0, offline: 0 };
    staffWithStatus.forEach(s => {
      if (s.info.key === 'online') counts.online++;
      else if (s.info.key === 'away') counts.away++;
      else counts.offline++;
    });
    return counts;
  }, [staffWithStatus]);

  const totalActive = stats.online;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full rounded-2xl p-4 flex items-center justify-between transition-all duration-500 border ${isOpen ? 'bg-[#0f172a] border-blue-500 shadow-xl' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${totalActive > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
          <div className="flex flex-col items-start text-left">
            <span className="text-[11px] font-black uppercase text-slate-100">{totalActive} Equipe Ativa</span>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Monitoramento SSZ</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-4 w-full bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-500 z-[200]">
          <div className="p-6 bg-[#0f172a] border-b border-white/5">
             <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-500/5 p-3 rounded-2xl text-center"><p className="text-[7px] font-black text-emerald-500 uppercase mb-1">Ativo</p><p className="text-xl font-black text-emerald-400 leading-none">{stats.online}</p></div>
                <div className="bg-amber-500/5 p-3 rounded-2xl text-center"><p className="text-[7px] font-black text-amber-500 uppercase mb-1">Aus</p><p className="text-xl font-black text-amber-400 leading-none">{stats.away}</p></div>
                <div className="bg-slate-500/5 p-3 rounded-2xl text-center"><p className="text-[7px] font-black text-slate-500 uppercase mb-1">Descon</p><p className="text-xl font-black text-slate-400 leading-none">{stats.offline}</p></div>
             </div>
          </div>
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-4 space-y-2.5">
            {staffWithStatus.map(s => (
              <div key={s.id} className={`p-3.5 flex items-center gap-4 rounded-[1.6rem] border ${s.info.key === 'offline' ? 'opacity-30 border-transparent grayscale' : 'bg-white/5 border-white/5'}`}>
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden">
                    {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <span className="text-xs font-black text-slate-600">{s.name[0]}</span>}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a0f1e] ${s.info.color}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-100 uppercase truncate leading-none">{s.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className={`text-[7px] font-black uppercase ${s.info.text}`}>{s.info.label}</p>
                    {s.info.key !== 'offline' && <span className="text-[8px] font-mono font-black text-blue-400">{s.displayTime}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineStatus;
