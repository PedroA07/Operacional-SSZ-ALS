
import React, { useState, useEffect, useRef } from 'react';
import { User, Staff } from '../../types';
import { db } from '../../utils/storage';

interface OnlineStatusProps {
  staffList: Staff[];
}

const OnlineStatus: React.FC<OnlineStatusProps> = ({ staffList }) => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState(0);

  const fetchStatus = async () => {
    const users = await db.getUsers();
    const now = new Date().getTime();
    
    // FILTRAGEM RIGOROSA: 
    // Como o Dashboard só envia o heartbeat se a aba estiver VISÍVEL, 
    // reduzimos a janela de "Online" para 45 segundos para refletir apenas quem está com a guia ativa.
    const online = users.filter(u => {
      if (!u.lastSeen) return false;
      const last = new Date(u.lastSeen).getTime();
      return (now - last) < (45 * 1000); // 45 segundos de tolerância
    });
    setActiveUsers(online);
  };

  useEffect(() => {
    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 15000); // Atualiza lista a cada 15s
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-800/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between hover:bg-slate-800 transition-all">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${activeUsers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
          </div>
          <span className="text-[9px] font-black text-slate-100 uppercase tracking-widest">{activeUsers.length} Online</span>
        </div>
        <svg className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
      </button>

      {isOpen && (activeUsers.length > 0) && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 z-[100]">
          <div className="p-3 bg-slate-800/50 border-b border-white/5">
             <h4 className="text-[8px] font-black text-blue-400 uppercase tracking-widest text-center">Aba Ativa Agora</h4>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {activeUsers.map(u => {
              const staff = staffList.find(s => s.id === u.staffId);
              return (
                <div key={u.id} className="p-3 flex items-center gap-3 hover:bg-white/5 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 overflow-hidden flex items-center justify-center border border-white/10">
                    {staff?.photo ? <img src={staff.photo} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-slate-500">{(u.displayName || 'A').substring(0,1)}</span>}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[9px] font-black text-slate-200 uppercase truncate">{u.displayName || 'Usuário'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       <p className="text-[7px] font-bold text-blue-400 uppercase">{getSessionTime(u.lastLogin)}</p>
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
