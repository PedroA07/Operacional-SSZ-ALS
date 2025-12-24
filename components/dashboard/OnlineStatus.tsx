
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
    // Busca direta do banco para refletir o status real de todos os terminais
    const u = await db.getUsers();
    setUsers(u);
  }, []);

  useEffect(() => {
    fetchStatus();
    // Heartbeat de interface: atualiza lista a cada 10 segundos para maior precisão
    const syncInterval = setInterval(fetchStatus, 10000);
    // Timer de precisão visual: atualiza cronômetros a cada segundo
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
    if (!user.lastSeen) return 'OFFLINE';
    
    const lastSeenDate = new Date(user.lastSeen);
    const diffSeconds = (currentTime - lastSeenDate.getTime()) / 1000;
    
    // Se o sinal de vida sumiu há mais de 3 minutos (heartbeat parado)
    if (diffSeconds > 180) return 'OFFLINE';
    
    // Se está com a aba visível e enviou heartbeat recentemente (< 45s)
    if (user.isOnlineVisible && diffSeconds < 45) return 'ONLINE';
    
    // Logado mas aba em segundo plano ou sem atividade recente
    return 'AUSENTE';
  };

  const calculateSessionTime = (lastLogin?: string) => {
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
  const onlineCount = activeUsers.filter(u => getStatus(u) === 'ONLINE').length;

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
            <div className={`w-3 h-3 rounded-full ${onlineCount > 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-slate-600'}`}></div>
          </div>
          <div className="flex flex-col items-start text-left">
            <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isOpen ? 'text-blue-400' : 'text-slate-100'}`}>
              {onlineCount} Online
            </span>
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Presença em Tempo Real</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-4 w-full bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] shadow-[0_-20px_80px_rgba(0,0,0,0.7)] overflow-hidden animate-in slide-in-from-bottom-6 zoom-in-95 duration-500 z-[200]">
          <div className="p-6 bg-[#0f172a] border-b border-white/5 flex justify-between items-center">
             <div className="flex flex-col">
               <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Painel Conectados</h4>
               <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">Atualização Automática</p>
             </div>
             <span className="text-[8px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-xl uppercase shadow-lg shadow-blue-600/20 animate-pulse">Monitorando</span>
          </div>

          <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#0a0f1e]">
            {staffList.map(s => {
              const u = users.find(user => user.staffId === s.id || (s.role === 'admin' && user.username === 'operacional_ssz'));
              const status = u ? getStatus(u) : 'OFFLINE';
              
              const statusConfigs = {
                ONLINE: { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Online / Ativo', shadow: 'shadow-emerald-500/40' },
                AUSENTE: { color: 'bg-amber-500', text: 'text-amber-400', label: 'Ausente / Inativo', shadow: 'shadow-amber-500/40' },
                OFFLINE: { color: 'bg-slate-700', text: 'text-slate-500', label: 'Desconectado', shadow: 'shadow-transparent' }
              };

              const config = statusConfigs[status];
              const sessionTime = u ? calculateSessionTime(u.lastLogin) : '00:00:00';

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
                           <svg className="w-2.5 h-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3"/></svg>
                           <span className="text-[8px] font-mono font-black text-blue-400">{sessionTime}</span>
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
