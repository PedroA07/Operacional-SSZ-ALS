
import React from 'react';
import { Trip, TripStatus } from '../../../../types';

export const StatusColumn = (
  t: Trip, 
  openStatusEditor: (t: Trip, s: TripStatus) => void,
  onOpenHistoryManager: (t: Trip) => void
) => {
  const getStatusStyle = (status: TripStatus, isLatest: boolean) => {
    if (status === 'Viagem concluída') return isLatest ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'bg-emerald-50 text-emerald-600';
    if (status === 'Viagem cancelada') return isLatest ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600';
    return isLatest ? 'bg-blue-600 text-white shadow-xl scale-105 border-blue-400' : 'bg-white text-slate-400 border-slate-100';
  };

  // Ordena o histórico: o mais recente (maior dateTime) fica no índice 0
  const sortedHistory = [...(t.statusHistory || [])].sort((a, b) => 
    new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  );

  return (
    <div className="flex flex-col space-y-2.5 min-w-[180px]">
       <div className={`flex items-center justify-between gap-3 p-2 rounded-xl border ${t.isPriority ? 'bg-amber-50 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-slate-100 border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <p className={`text-[12px] font-black tracking-tight leading-none uppercase ${t.isPriority ? 'text-amber-600' : 'text-blue-700'}`}>OS: {t.os}</p>
            {t.isPriority && (
              <svg className="w-3.5 h-3.5 text-amber-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); openStatusEditor(t, t.status); }}
            className="w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-all shadow-md active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
          </button>
       </div>
       
       <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
          {sortedHistory.map((step, idx) => (
            <div 
              key={idx} 
              onClick={(e) => {
                e.stopPropagation();
                openStatusEditor(t, step.status);
              }}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border-2 cursor-pointer flex justify-between items-center transition-all ${getStatusStyle(step.status, idx === 0)}`}
            >
              <span className="truncate pr-2">{step.status}</span>
              <span className={`opacity-80 text-[9px] font-mono whitespace-nowrap ${idx === 0 ? 'text-white' : 'text-slate-400'}`}>
                {new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
              </span>
            </div>
          ))}
       </div>

       <button 
         onClick={(e) => { e.stopPropagation(); onOpenHistoryManager(t); }}
         className="text-[9px] font-black text-slate-400 uppercase hover:text-blue-600 text-left flex items-center gap-2 mt-1 px-1 transition-colors"
       >
         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
         HISTÓRICO COMPLETO
       </button>
    </div>
  );
};
