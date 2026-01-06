
import React from 'react';
import { Trip } from '../../../types';

interface TripsTabProps {
  trips: Trip[];
}

const TripsTab: React.FC<TripsTabProps> = ({ trips }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex justify-between items-center px-1">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Minhas Programações</h2>
          <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Atualizado</p>
       </div>
       
       <div className="space-y-4">
          {trips.length > 0 ? trips.map((t, idx) => {
            const isFinished = t.status === 'Viagem concluída';
            const isRecent = idx === 0 && !isFinished;
            
            return (
              <div key={t.id} className={`p-6 rounded-[2.2rem] border transition-all ${isFinished ? 'bg-slate-900/20 border-white/5 opacity-60' : isRecent ? 'bg-blue-600/10 border-blue-500/50 ring-2 ring-blue-500/10' : 'bg-slate-900 border-white/10 shadow-lg'}`}>
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <div className="flex items-center gap-2">
                       <p className="text-lg font-black text-white uppercase">OS {t.os}</p>
                       {isRecent && <span className="px-1.5 py-0.5 bg-blue-600 text-[6px] font-black text-white uppercase rounded">Recente</span>}
                     </div>
                     <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{t.customer.name}</p>
                   </div>
                   <span className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase ${isFinished ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                     {t.status}
                   </span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-4">
                   <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-600 uppercase">Programada</span>
                      <span className="text-[10px] font-bold text-slate-300">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
                   </div>
                   <div className="flex flex-col text-right">
                      <span className="text-[7px] font-black text-slate-600 uppercase">Equipamento</span>
                      <span className="text-[10px] font-mono font-bold text-blue-400">{t.container || '---'}</span>
                   </div>
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center text-slate-600 font-black uppercase text-[10px] italic">Você não possui viagens registradas.</div>
          )}
       </div>
    </div>
  );
};

export default TripsTab;
