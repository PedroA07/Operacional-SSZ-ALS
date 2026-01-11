
import React from 'react';
import { Trip } from '../../../../types';
import { maskCPF, maskPhone } from '../../../../utils/masks';

export const DriverColumn = (t: Trip, onLocateDriver: (id: string) => void) => (
  <div className="flex flex-col space-y-2 whitespace-normal min-w-[200px]">
     <div className="flex flex-col">
        <span className="font-black text-slate-800 uppercase text-[11px] leading-tight">
          {t.driver?.name}
        </span>
        <div className="flex flex-wrap gap-2 mt-1.5">
           <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">
             CPF: <span className="text-slate-600 font-mono">{t.driver?.cpf ? maskCPF(t.driver.cpf) : '---'}</span>
           </span>
           <span className="text-[9px] font-black text-blue-500 uppercase whitespace-nowrap">
             TEL: <span className="font-mono">{t.driver?.phone ? maskPhone(t.driver.phone) : '---'}</span>
           </span>
        </div>
     </div>
     
     <div className="flex items-center gap-2">
        <div className="flex gap-1">
           <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shadow-sm">
             {t.driver?.plateHorse}
           </span>
           <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border border-slate-200">
             {t.driver?.plateTrailer}
           </span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onLocateDriver(t.driver.id); }}
          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm group"
          title="Localizar Motorista (GPS)"
        >
          <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
     </div>
  </div>
);
