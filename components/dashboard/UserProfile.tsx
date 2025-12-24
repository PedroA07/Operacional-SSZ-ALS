
import React, { useState, useEffect, useRef } from 'react';
import { User, Staff } from '../../types';
import { db } from '../../utils/storage';

interface UserProfileProps {
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [staffData, setStaffData] = useState<Staff | null>(null);
  const [sessionTime, setSessionTime] = useState('00:00:00');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStaffInfo = async () => {
      if (user.staffId) {
        const staffList = await db.getStaff();
        const found = staffList.find(s => s.id === user.staffId);
        if (found) setStaffData(found);
      }
    };
    loadStaffInfo();

    const updateTimer = () => {
      if (!user.lastLogin) return;
      const startTime = new Date(user.lastLogin).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - startTime);
      
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setSessionTime(`${h}:${m}:${s}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user.lastLogin, user.staffId]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--/--/----';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '--/--/----';
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '--:--';
    try {
      return new Date(dateStr).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 pl-4 border-l border-slate-200 group transition-all"
      >
        <div className="text-right hidden sm:block">
          <p className="text-[9px] font-black text-slate-800 uppercase leading-none group-hover:text-blue-600 transition-colors">{user.displayName}</p>
          <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{user.position || user.role}</p>
        </div>
        <div className="relative">
          <div className={`w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center font-black text-blue-400 text-sm shadow-lg overflow-hidden border-2 transition-all ${isOpen ? 'ring-4 ring-blue-500/20 border-blue-500 scale-105' : 'border-white group-hover:border-blue-200'}`}>
            {user.photo ? (
              <img src={user.photo} className="w-full h-full object-cover" alt="" />
            ) : (
              <span>{user.displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-300 z-[110]">
          <div className="p-8 bg-slate-50 border-b border-slate-100">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 overflow-hidden border-2 border-white shadow-md">
                   {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-400 font-black text-xl">{user.displayName[0]}</div>}
                </div>
                <div>
                   <h4 className="font-black text-slate-800 uppercase text-xs leading-none">{user.displayName}</h4>
                   <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-[7px] font-black uppercase rounded">{user.role === 'admin' ? 'Acesso Administrativo' : 'Acesso Operacional'}</span>
                </div>
             </div>
          </div>

          <div className="p-8 space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cargo Atual</p>
                   <p className="text-[10px] font-black text-slate-700 uppercase">{user.position || 'Não Definido'}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Desde</p>
                   <p className="text-[10px] font-black text-slate-700">{formatDate(staffData?.registrationDate)}</p>
                </div>
             </div>

             <div className="space-y-3 pt-4 border-t border-slate-50">
                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Dados de Contato</p>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2.5"/></svg></div>
                   <p className="text-[9px] font-bold text-slate-600 lowercase">{staffData?.emailCorp || 'e-mail não cadastrado'}</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeWidth="2.5"/></svg></div>
                   <p className="text-[9px] font-bold text-slate-600">{staffData?.phoneCorp || 'Telefone não cadastrado'}</p>
                </div>
             </div>

             <div className="bg-slate-900 rounded-3xl p-5 text-center relative overflow-hidden shadow-xl">
                <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 pointer-events-none"></div>
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Tempo de Sessão Ativa</p>
                <p className="text-2xl font-black text-white font-mono tracking-widest">{sessionTime}</p>
                <p className="text-[7px] font-bold text-slate-500 uppercase mt-2 italic">Acesso iniciado em {formatTime(user.lastLogin)}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
