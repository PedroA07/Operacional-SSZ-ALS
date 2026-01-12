
import React, { useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsThisMonthProps {
  trips: Trip[];
}

const TripsThisMonth: React.FC<TripsThisMonthProps> = ({ trips }) => {
  const count = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    return trips.filter(t => {
      const d = new Date(t.dateTime);
      return d.getMonth() === month && d.getFullYear() === year && t.status !== 'Viagem cancelada';
    }).length;
  }, [trips]);

  return (
    <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total no Mês</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-5xl font-black text-slate-800 tracking-tighter">{count}</p>
          <span className="text-[10px] font-bold text-slate-300 uppercase">Progr.</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
         <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="3"/></svg>
         </div>
         <p className="text-[8px] font-black text-slate-400 uppercase leading-tight">Consolidado de todas as categorias</p>
      </div>
    </div>
  );
};

export default TripsThisMonth;
