
import React from 'react';
import { Trip } from '../../../../types';
import { maskCNPJ } from '../../../../utils/masks';

export const DestinationColumn = (t: Trip, onEditScheduling: (t: Trip) => void) => (
  <div className="flex flex-col space-y-2 whitespace-normal min-w-[240px]">
     {/* Card de Terminal */}
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

     {/* Detalhes do Agendamento */}
     {t.scheduling ? (
       <div className="group relative">
         <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-md flex items-center justify-between">
            <div className="flex flex-col">
               <span className="text-[7px] font-black uppercase opacity-70 tracking-widest">Horário Agendado</span>
               <p className="text-[11px] font-black">
                 {new Date(t.scheduling.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                 {t.scheduling.obs && <span className="ml-2 text-emerald-200">[{t.scheduling.obs.slice(0,10)}]</span>}
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
       </div>
     ) : (
       <button 
         onClick={(e) => { e.stopPropagation(); onEditScheduling(t); }}
         className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black text-blue-500 uppercase hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
       >
         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
         Agendar Terminal
       </button>
     )}
  </div>
);
