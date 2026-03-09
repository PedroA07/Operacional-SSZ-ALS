
import React from 'react';
import { Trip } from '../../../types';
import { maskCPF, maskCNPJ, maskPhone } from '../../../utils/masks';

interface TripFolderCardProps {
  trip: Trip;
  onClick: () => void;
}

const TripFolderCard: React.FC<TripFolderCardProps> = ({ trip, onClick }) => {
  const hasDoc = !!trip.completoDoc;

  return (
    <button 
      onClick={onClick}
      className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-300 transition-all group text-left relative overflow-hidden flex flex-col h-[480px] active:scale-[0.98]"
    >
      {/* ORELHA DA PASTA ESTÉTICA */}
      <div className="absolute top-0 left-0 w-24 h-1.5 bg-blue-600"></div>

      <div className="p-8 space-y-5 flex-1 flex flex-col">
        {/* CABEÇALHO: OS E STATUS */}
        <div className="flex justify-between items-start">
           <div className="min-w-0">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none block mb-1">Ordem de Serviço</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase truncate">{trip.os}</h3>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] font-bold text-slate-400">{new Date(trip.dateTime).toLocaleDateString('pt-BR')}</span>
                 <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                 <span className="text-[10px] font-bold text-blue-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
           </div>
           
           <div className="shrink-0">
              {hasDoc ? (
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-2 shadow-sm shadow-emerald-500/10">
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                   <span className="text-[8px] font-black uppercase">Arquivado</span>
                </div>
              ) : (
                <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl border border-red-100 flex items-center gap-2 animate-pulse">
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                   <span className="text-[8px] font-black uppercase">Pendente</span>
                </div>
              )}
           </div>
        </div>

        {/* BLOCO 1: CLIENTE */}
        <div className="space-y-1.5 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
           <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 block">Cliente Origem</span>
           <p className="text-[11px] font-black text-slate-800 uppercase leading-tight truncate">{trip.customer.legalName || trip.customer.name}</p>
           <p className="text-[9px] font-bold text-blue-500 uppercase truncate">{trip.customer.name}</p>
           <div className="flex justify-between items-end pt-1 border-t border-slate-100/50">
              <span className="text-[8px] font-mono font-bold text-slate-500">{maskCNPJ(trip.customer.cnpj || '')}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase">{trip.customer.city}</span>
           </div>
        </div>

        {/* BLOCO 2: CONTAINER (ABAIXO DO CLIENTE) */}
        <div className="space-y-1.5 p-4 bg-blue-50/20 rounded-2xl border border-blue-100/30">
           <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1 block">Dados do Equipamento</span>
           <div className="flex justify-between items-center">
              <p className="text-[15px] font-mono font-black text-blue-700 tracking-tighter">{trip.container || 'A DEFINIR'}</p>
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase shadow-sm">
                {trip.containerType || '40HC'}
              </span>
           </div>
           <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase">
              <span>Armador: {trip.ocFormData?.agencia || '---'}</span>
              <span>Tara: {trip.tara || '---'}</span>
           </div>
        </div>

        {/* BLOCO 3: MOTORISTA */}
        <div className="space-y-3 pt-1">
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center font-black italic text-blue-400 text-[10px] shadow-lg">ALS</div>
              <div className="min-w-0 flex-1">
                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Condutor</span>
                 <p className="text-[11px] font-black text-slate-700 uppercase truncate mt-0.5">{trip.driver.name}</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
                 <p className="text-[6px] font-black text-slate-400 uppercase leading-none">Cavalo</p>
                 <p className="text-[10px] font-mono font-black text-slate-700">{trip.driver.plateHorse}</p>
              </div>
              <div className="bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200">
                 <p className="text-[6px] font-black text-slate-400 uppercase leading-none">Carreta</p>
                 <p className="text-[10px] font-mono font-black text-slate-700">{trip.driver.plateTrailer}</p>
              </div>
           </div>

           <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-mono font-bold text-slate-500">{maskCPF(trip.driver.cpf || '')}</span>
              <span className="text-[9px] font-bold text-blue-600">{maskPhone(trip.driver.phone || '')}</span>
           </div>
        </div>
      </div>

      <div className="p-6 bg-slate-900 text-white flex justify-between items-center group-hover:bg-blue-600 transition-colors shrink-0">
         <div>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-widest">Status da Pasta</p>
            <p className="text-[10px] font-black uppercase tracking-tight">{trip.status}</p>
         </div>
         <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-transform group-hover:translate-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
         </div>
      </div>
    </button>
  );
};

export default TripFolderCard;
