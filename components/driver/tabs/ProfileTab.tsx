
import React from 'react';
import { User, Driver } from '../../../types';

interface ProfileTabProps {
  user: User;
  driver: Driver | null;
  onLogout: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, driver, onLogout }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="text-center space-y-4 pt-4">
         <div className="relative inline-block">
            <div className="w-28 h-28 rounded-[2.2rem] bg-slate-900 border border-white/10 mx-auto overflow-hidden shadow-2xl">
               {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-400 font-black text-4xl">{(user.displayName || user.username)[0]}</div>}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-[#020617] flex items-center justify-center">
               <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
         </div>
         <div>
            <h3 className="text-2xl font-black uppercase tracking-tight">{user.displayName}</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{user.role === 'motoboy' ? 'Motoboy Parceiro' : 'Motorista ALS'}</p>
         </div>
      </div>

      <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-xl">
         <div className="flex justify-between border-b border-white/5 pb-5">
            <span className="text-[10px] font-black text-slate-500 uppercase">CPF</span>
            <span className="text-[11px] font-bold text-white">{driver?.cpf || '---'}</span>
         </div>
         <div className="flex justify-between border-b border-white/5 pb-5">
            <span className="text-[10px] font-black text-slate-500 uppercase">Cavalo</span>
            <span className="text-[11px] font-black text-blue-500 font-mono uppercase">{driver?.plateHorse || '---'}</span>
         </div>
         <div className="flex justify-between border-b border-white/5 pb-5">
            <span className="text-[10px] font-black text-slate-500 uppercase">Carreta</span>
            <span className="text-[11px] font-black text-blue-400 font-mono uppercase">{driver?.plateTrailer || '---'}</span>
         </div>
         <div className="flex justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase">Status Portal</span>
            <span className="text-[11px] font-black text-emerald-500 uppercase">Ativo / Conectado</span>
         </div>
      </div>

      <div className="space-y-3 px-2">
         <p className="text-[8px] font-black text-slate-600 uppercase text-center mb-6 leading-relaxed">
           Problemas com seu acesso ou dados?<br/>Entre em contato com o suporte operacional da ALS.
         </p>
         <button onClick={onLogout} className="w-full py-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-red-500 active:text-white transition-all shadow-lg">Encerrar Sessão no Dispositivo</button>
      </div>
    </div>
  );
};

export default ProfileTab;
