
import React, { useState, useEffect, useRef } from 'react';
import { User, Staff } from '../../types';
import { db } from '../../utils/storage';

interface UserProfileProps {
  user: User;
  sessionStartTime: number;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, sessionStartTime }) => {
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
      const now = new Date().getTime();
      const diff = now - sessionStartTime;
      
      const safeDiff = diff > 0 ? diff : 0;
      
      const h = Math.floor(safeDiff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((safeDiff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((safeDiff % 60000) / 1000).toString().padStart(2, '0');
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
  }, [sessionStartTime, user.staffId]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-4 pl-6 border-l border-slate-200 group transition-all"
      >
        <div className="text-right flex flex-col items-end">
          <p className="text-[11px] font-black text-slate-800 uppercase leading-none group-hover:text-blue-600 transition-colors">
            {user.displayName || user.username}
          </p>
          <p className="text-[8px] font-bold text-slate-400 uppercase mt-1.5 tracking-tighter">
            {user.position || user.role}
          </p>
        </div>
        <div className="relative">
          <div className={`w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center font-black text-blue-400 text-sm shadow-lg overflow-hidden border-2 transition-all ${isOpen ? 'ring-4 ring-blue-500/20 border-blue-500 scale-105' : 'border-white group-hover:border-blue-200'}`}>
            {user.photo ? (
              <img src={user.photo} className="w-full h-full object-cover" alt="" />
            ) : (
              <span>{(user.displayName || user.username).charAt(0).toUpperCase()}</span>
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
                   {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-400 font-black text-xl">{(user.displayName || user.username)[0]}</div>}
                </div>
                <div>
                   <h4 className="font-black text-slate-800 uppercase text-xs leading-none">{user.displayName || user.username}</h4>
                   <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-[7px] font-black uppercase rounded-full">{user.role}</span>
                </div>
             </div>
          </div>
          
          <div className="p-6 space-y-5">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Duração da Sessão</p>
                <p className="text-2xl font-black text-slate-800 font-mono tracking-tighter">{sessionTime}</p>
             </div>
             
             {staffData && (
                <div className="space-y-3 px-2 pt-2">
                   <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Cargo / Função</span>
                      <span className="text-[9px] font-bold text-slate-700 uppercase">{staffData.position}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Data Admissão</span>
                      <span className="text-[9px] font-bold text-slate-700">{new Date(staffData.registrationDate).toLocaleDateString('pt-BR')}</span>
                   </div>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
