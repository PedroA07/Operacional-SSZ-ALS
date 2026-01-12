
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
    <div className="flex flex-col space-y-1.5 min-w-[150px]">
       <div className="flex items-center justify-between gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <p className="text-[10px] font-black text-blue-700 tracking-tight leading-none uppercase">OS: {t.os}</p>
          <button 
            onClick={(e) => { e.stopPropagation(); openStatusEditor(t, t.status); }}
            className="w-5 h-5 bg-blue-600 text-white rounded-md flex items-center justify-center hover:bg-emerald-600 transition-all shadow-sm active:scale-90"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
          </button>
       </div>
       
       <div className="flex flex-col gap-1 max-h-20 overflow-y-auto custom-scrollbar pr-0.5">
          {(t.statusHistory || []).map((step, idx) => (
            <div 
              key={idx} 
              onClick={(e) => {
                e.stopPropagation();
                openStatusEditor(t, step.status);
              }}
              className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase border cursor-pointer flex justify-between items-center transition-colors ${getStatusStyle(step.status, idx === 0)}`}
            >
              <span className="truncate pr-2">{step.status}</span>
              <span className="opacity-70 text-[6px] font-mono whitespace-nowrap">{new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          ))}
       </div>

       <button 
         onClick={(e) => { e.stopPropagation(); onOpenHistoryManager(t); }}
         className="text-[7px] font-black text-slate-300 uppercase hover:text-blue-500 text-left flex items-center gap-1.5 mt-0.5 px-1"
       >
         <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
         HISTÓRICO COMPLETO
       </button>
    </div>
  );
};
