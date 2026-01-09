
import React from 'react';
import { Trip } from '../../types';

interface SchedulingInfoProps {
  trip: Trip;
}

const SchedulingInfo: React.FC<SchedulingInfoProps> = ({ trip }) => {
  const sch = trip.scheduling;

  if (!sch) return null;

  const schDate = new Date(sch.dateTime);

  return (
    <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-top-2">
      <div className="px-6 py-4 bg-emerald-600/20 border-b border-emerald-500/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
           <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Agendamento de Terminal</span>
        </div>
        <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-lg text-[7px] font-black uppercase">Confirmado</span>
      </div>
      
      <div className="p-6 grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">Data / Hora</p>
          <p className="text-sm font-black text-white uppercase">
            {schDate.toLocaleDateString('pt-BR')} <span className="text-emerald-400 ml-1">{schDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">Localidade</p>
          <p className="text-[11px] font-black text-emerald-400 uppercase truncate">
            {sch.location}
          </p>
        </div>
        {sch.obs && (
          <div className="col-span-2 pt-3 border-t border-white/5">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Notas / Senha</p>
            <p className="text-[10px] font-bold text-slate-300 uppercase leading-relaxed italic bg-black/20 p-3 rounded-xl border border-white/5">
              {sch.obs}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulingInfo;
