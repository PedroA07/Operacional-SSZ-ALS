
import React, { useMemo, useState } from 'react';
import { Trip, User, TripStatus } from '../../../types';
import { driverService } from '../../../utils/driverService';

interface HomeTabProps {
  user: User;
  trips: Trip[];
  onRefresh: () => Promise<void>;
}

const HomeTab: React.FC<HomeTabProps> = ({ user, trips, onRefresh }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Viagem Ativa: Primeira que não está concluída ou cancelada
  const activeTrip = useMemo(() => {
    return trips.find(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
  }, [trips]);

  const handleUpdateStatus = async (trip: Trip, nextStatus: TripStatus) => {
    if (isUpdating) return;
    if (!confirm(`Confirmar avanço para: ${nextStatus.toUpperCase()}?`)) return;

    setIsUpdating(true);
    const success = await driverService.updateTripStatus(trip, nextStatus, user);
    if (success) {
      await onRefresh();
    } else {
      alert("Erro na rede. Tente novamente.");
    }
    setIsUpdating(false);
  };

  const getNextStatus = (current: TripStatus): TripStatus | null => {
    const flow: TripStatus[] = [
      'Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 
      'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 
      'Devolução do cheio', 'Viagem concluída'
    ];
    const idx = flow.indexOf(current);
    return (idx !== -1 && idx < flow.length - 1) ? flow[idx + 1] : null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* SEÇÃO DA VIAGEM EM DESTAQUE */}
      <section className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Programação Atual</h2>
          {activeTrip && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 rounded-full border border-blue-500/20">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
              <span className="text-[7px] font-black text-blue-400 uppercase">Em Curso</span>
            </div>
          )}
        </div>

        {activeTrip ? (
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-black tracking-tighter text-blue-500 leading-none">OS {activeTrip.os}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-2.5 leading-tight">{activeTrip.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-black text-white">{activeTrip.container || 'A DEFINIR'}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">{activeTrip.containerType || '---'}</p>
                </div>
              </div>

              {/* BLOCO DE AGENDAMENTO */}
              <div className="bg-emerald-500/5 rounded-3xl p-5 border border-emerald-500/10 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Agendamento Terminal</p>
                  <span className="text-[8px] font-mono text-emerald-400/50">FOLLOW-UP</span>
                </div>
                {activeTrip.scheduling ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-black text-white uppercase">{activeTrip.scheduling.location}</p>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-bold text-slate-300">{new Date(activeTrip.scheduling.dateTime).toLocaleDateString('pt-BR')}</span>
                       <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                       <span className="text-[11px] font-black text-emerald-400">{new Date(activeTrip.scheduling.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-slate-600 uppercase italic">Aguardando definição de horário...</p>
                )}
              </div>

              {/* STATUS ATUAL */}
              <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-1">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Situação Operacional</p>
                <p className="text-lg font-black uppercase text-blue-400">{activeTrip.status}</p>
              </div>

              {/* BOTÃO DE AÇÃO DINÂMICO */}
              {getNextStatus(activeTrip.status) && (
                <button 
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(activeTrip, getNextStatus(activeTrip.status)!)}
                  className="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.1em] shadow-[0_20px_40px_rgba(37,99,235,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Avançar para: {getNextStatus(activeTrip.status)}</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-24 bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-12">
             <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 text-slate-600 shadow-inner">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2.5"/></svg>
             </div>
             <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-relaxed">Nenhuma programação ativa disponível.</p>
             <p className="text-[9px] font-bold text-slate-700 uppercase mt-2">Aguarde novas instruções do operacional.</p>
          </div>
        )}
      </section>

      {/* ESTATÍSTICAS RÁPIDAS */}
      <section className="grid grid-cols-2 gap-4">
         <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-widest">Total Viagens</p>
            <p className="text-3xl font-black text-white font-mono">{trips.length}</p>
         </div>
         <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
            <p className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-widest">Concluídas</p>
            <p className="text-3xl font-black text-emerald-500 font-mono">{trips.filter(t => t.status === 'Viagem concluída').length}</p>
         </div>
      </section>

      <p className="text-[8px] text-slate-800 font-bold uppercase tracking-[0.5em] text-center mt-6">
        SISTEMA DE GESTÃO MOTORISTA V4.0
      </p>
    </div>
  );
};

export default HomeTab;
