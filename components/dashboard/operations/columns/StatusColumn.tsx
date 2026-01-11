
import React from 'react';
import { Trip, TripStatus } from '../../../../types';

export const StatusColumn = (
  t: Trip, 
  openStatusEditor: (t: Trip, s: TripStatus) => void,
  onOpenHistoryManager: (t: Trip) => void
) => {
  const getStatusStyle = (status: TripStatus, isLatest: boolean) => {
    if (status === 'Viagem concluída') return isLatest ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600';
    if (status === 'Viagem cancelada') return isLatest ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600';
    return isLatest ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border-slate-100';
  };

  return (
    <div className="flex flex-col space-y-1 min-w-[130px]">
       <div className="flex items-center justify-between">
          <p className="text-[9.5px] font-black text-blue-700 tracking-tighter">OS: {t.os?.substring(0, 10)}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); openStatusEditor(t, t.status); }}
            className="w-4 h-4 bg-blue-600 text-white rounded-md flex items-center justify-center hover:bg-emerald-600 transition-all shadow-sm active:scale-90"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
          </button>
       </div>
       
       <div className="flex flex-col gap-0.5 max-h-14 overflow-y-auto custom-scrollbar pr-0.5">
          {(t.statusHistory || []).map((step, idx) => (
            <div 
              key={idx} 
              onClick={(e) => {
                e.stopPropagation();
                openStatusEditor(t, step.status);
              }}
              className={`px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase border cursor-pointer flex justify-between items-center ${getStatusStyle(step.status, idx === 0)}`}
            >
              <span className="truncate pr-1">{step.status}</span>
              <span className="opacity-60 text-[5.5px] font-mono whitespace-nowrap">{new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          ))}
       </div>

       <button 
         onClick={(e) => { e.stopPropagation(); onOpenHistoryManager(t); }}
         className="text-[6px] font-black text-slate-300 uppercase hover:text-blue-500 text-left flex items-center gap-1 mt-0.5"
       >
         <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
         LOGS
       </button>
    </div>
  );
};
