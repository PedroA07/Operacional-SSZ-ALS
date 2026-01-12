
import React from 'react';
import { Trip, Driver } from '../../../../types';
import { maskCPF, maskPhone } from '../../../../utils/masks';

export const DriverColumn = (t: Trip, onLocateDriver: (id: string) => void, allDrivers: Driver[] = []) => {
  // Busca o motorista atualizado na lista global para garantir que o telefone apareça
  const currentDriver = allDrivers.find(d => d.id === t.driver?.id);
  const displayPhone = t.driver?.phone || currentDriver?.phone;

  return (
    <div className="flex flex-col space-y-3 whitespace-normal min-w-[220px]">
       <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase text-[11px] leading-tight">
            {t.driver?.name}
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
             <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">
               CPF: <span className="text-slate-600 font-mono">{t.driver?.cpf ? maskCPF(t.driver.cpf) : '---'}</span>
             </span>
             <span className="text-[9px] font-black text-blue-500 uppercase whitespace-nowrap">
               TEL: <span className="font-mono">{displayPhone ? maskPhone(displayPhone) : '---'}</span>
             </span>
          </div>
       </div>
       
       <div className="flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between">
             <span className="text-[8px] font-black text-slate-400 uppercase">Placa do Cavalo:</span>
             <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shadow-sm">
               {t.driver?.plateHorse}
             </span>
          </div>
          <div className="flex items-center justify-between">
             <span className="text-[8px] font-black text-slate-400 uppercase">Placa da Carreta:</span>
             <span className="bg-white text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border border-slate-200">
               {t.driver?.plateTrailer}
             </span>
          </div>
       </div>

       <button 
         onClick={(e) => { e.stopPropagation(); onLocateDriver(t.driver.id); }}
         className="w-fit flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm group text-[9px] font-black uppercase"
       >
         <svg className="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
         </svg>
         Localizar (GPS)
       </button>
    </div>
  );
};
