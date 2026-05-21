
import React from 'react';
import { Trip } from '../../../../types';
import { maskCNPJ } from '../../../../utils/masks';

const TERMINAL_NO_SCHEDULE = new Set(['Cancelado', 'Frete Morto', 'Reutilização', 'Viagem cancelada']);

const TERMINAL_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  'Cancelado':       { bg: 'bg-red-100',     text: 'text-red-700',     icon: 'M6 18L18 6M6 6l12 12' },
  'Viagem cancelada':{ bg: 'bg-red-100',     text: 'text-red-700',     icon: 'M6 18L18 6M6 6l12 12' },
  'Frete Morto':     { bg: 'bg-amber-100',   text: 'text-amber-800',   icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  'Reutilização':    { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
};

export const DestinationColumn = (t: Trip, onEditScheduling: (t: Trip) => void) => {
  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '--/--';
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  /* Latest status from history or direct field */
  const latestStatus = t.statusHistory?.length
    ? [...t.statusHistory].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.status
    : (t.status || '');
  const isTerminal = TERMINAL_NO_SCHEDULE.has(latestStatus || '');
  const termStyle  = isTerminal ? (TERMINAL_STYLES[latestStatus!] || TERMINAL_STYLES['Cancelado']) : null;

  return (
    <div className="flex flex-col space-y-2 whitespace-normal min-w-[240px]">
       {/* Card de Terminal */}
       {isTerminal ? (
         /* Terminal status replaces destination card */
         <div className={`${termStyle!.bg} border border-current/10 p-3 rounded-2xl flex items-center gap-2.5`}>
           <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 bg-white/60`}>
             <svg className={`w-4 h-4 ${termStyle!.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={termStyle!.icon}/>
             </svg>
           </div>
           <div className="min-w-0">
             <p className={`text-[11px] font-black uppercase leading-tight ${termStyle!.text}`}>{latestStatus}</p>
             {t.destination?.name && (
               <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 truncate">{t.destination.name}</p>
             )}
           </div>
         </div>
       ) : (
         <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner space-y-2">
            <div className="flex items-start gap-2">
               <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
               </div>
               <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">
                    {t.destination?.name || 'A DEFINIR'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                    {t.destination?.legalName || 'Razão Social não informada'}
                  </p>
               </div>
            </div>
            <div className="flex flex-col gap-0.5 pl-7">
               <p className="text-[9px] font-black text-slate-500 uppercase leading-none">
                 CNPJ: <span className="font-mono text-slate-700">{t.destination?.cnpj ? maskCNPJ(t.destination.cnpj) : '---'}</span>
               </p>
               <p className="text-[9px] font-bold text-slate-400 uppercase">
                 Local: <span className="text-slate-600">{t.destination?.city} - {t.destination?.state || '--'}</span>
               </p>
            </div>
         </div>
       )}

       {/* Agendamento — oculto para status terminais sem agendamento */}
       {!isTerminal && (
         t.scheduling ? (
           <div className="group relative">
             <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-md flex items-center justify-between">
                <div className="flex flex-col">
                   <span className="text-[7px] font-black uppercase opacity-70 tracking-widest">Agendamento Confirmado</span>
                   <p className="text-[10px] font-black flex items-center gap-1.5 mt-0.5">
                     <span className="bg-white/20 px-1.5 py-0.5 rounded">{formatDate(t.scheduling.dateTime)}</span>
                     <span className="text-white text-[11px]">{formatTime(t.scheduling.dateTime)}</span>
                   </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onEditScheduling(t); }}
                  className="w-7 h-7 bg-white/20 hover:bg-white/40 rounded-lg flex items-center justify-center transition-all"
                  title="Editar Agendamento"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732"/>
                  </svg>
                </button>
             </div>
             {t.scheduling.obs && (
               <div className="mt-1 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg">
                 <p className="text-[7px] font-black text-amber-600 uppercase leading-none">Notas: <span className="font-bold text-amber-800">{t.scheduling.obs.slice(0, 35)}{t.scheduling.obs.length > 35 ? '...' : ''}</span></p>
               </div>
             )}
           </div>
         ) : (
           <button
             onClick={(e) => { e.stopPropagation(); onEditScheduling(t); }}
             className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black text-blue-500 uppercase hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
           >
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
             Agendar Terminal
           </button>
         )
       )}
    </div>
  );
};
