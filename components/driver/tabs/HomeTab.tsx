
import React, { useMemo, useState } from 'react';
import { Trip, User, TripStatus } from '../../../types';
import { driverService } from '../../../utils/driverService';

interface HomeTabProps {
  user: User;
  trips: Trip[];
  onRefresh: () => Promise<void>;
}

const ALL_STATUSES: TripStatus[] = [
  'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 
  'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 
  'Chegou no destino', 'Devolução do cheio', 'Viagem concluída'
];

const HomeTab: React.FC<HomeTabProps> = ({ user, trips, onRefresh }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Viagem Ativa: Primeira que não está concluída ou cancelada
  const activeTrip = useMemo(() => {
    return trips.find(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
  }, [trips]);

  const handleUpdateStatus = async (trip: Trip, nextStatus: TripStatus) => {
    if (isUpdating) return;
    if (trip.status === nextStatus) return;
    if (!confirm(`CONFIRMAR ETAPA: ${nextStatus.toUpperCase()}?`)) return;

    setIsUpdating(true);
    const success = await driverService.updateTripStatus(trip, nextStatus, user);
    if (success) {
      await onRefresh();
    } else {
      alert("Erro ao conectar. Verifique seu sinal.");
    }
    setIsUpdating(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      
      {/* SEÇÃO DA VIAGEM EM DESTAQUE */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Programação Ativa</h2>
          {activeTrip && (
            <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[7px] font-black uppercase shadow-[0_0_8px_rgba(59,130,246,0.5)]">Em Andamento</span>
          )}
        </div>

        {activeTrip ? (
          <div className="bg-slate-900/80 border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-7 space-y-6">
              <div className="flex justify-between items-start border-b border-white/5 pb-6">
                <div>
                  <p className="text-4xl font-black tracking-tighter text-blue-500 leading-none">OS {activeTrip.os}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-2.5 leading-tight">{activeTrip.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-black text-white">{activeTrip.container || 'A DEFINIR'}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Ref: {activeTrip.booking || '---'}</p>
                </div>
              </div>

              {/* BLOCO DE AGENDAMENTO */}
              <div className="bg-emerald-500/5 rounded-3xl p-5 border border-emerald-500/10 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Agendamento Terminal</p>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                </div>
                {activeTrip.scheduling ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-black text-white uppercase truncate">{activeTrip.scheduling.location}</p>
                    <div className="flex items-center gap-3">
                       <span className="text-[11px] font-bold text-slate-300">{new Date(activeTrip.scheduling.dateTime).toLocaleDateString('pt-BR')}</span>
                       <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                       <span className="text-[13px] font-black text-emerald-400">{new Date(activeTrip.scheduling.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-slate-600 uppercase italic">Aguardando definição do operacional...</p>
                )}
              </div>

              {/* SELEÇÃO DE ETAPA ATUAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Atualize sua posição agora:</p>
                </div>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {ALL_STATUSES.map((status) => {
                    const isCurrent = activeTrip.status === status;
                    return (
                      <button 
                        key={status}
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(activeTrip, status)}
                        className={`w-full py-4.5 px-6 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between border ${
                          isCurrent 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg ring-4 ring-blue-600/20' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 active:scale-95'
                        }`}
                      >
                        <span>{status}</span>
                        {isCurrent && (
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] opacity-70">ATUAL</span>
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                          </div>
                        )}
                        {!isCurrent && isUpdating && (
                          <div className="w-3 h-3 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-24 bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-8">
             <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600 shadow-inner">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2.5"/></svg>
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Nenhuma programação vinculada ao seu cadastro no momento.</p>
          </div>
        )}
      </section>

      {/* RODAPÉ TÉCNICO */}
      <div className="pt-4 pb-8">
        <p className="text-[8px] text-slate-800 font-bold uppercase tracking-[0.5em] text-center">
          ALS TRANSPORTES OPERACIONAL V4.0
        </p>
      </div>
    </div>
  );
};

export default HomeTab;
