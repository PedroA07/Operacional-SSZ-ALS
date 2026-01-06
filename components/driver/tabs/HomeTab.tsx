
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
  const [showPicker, setShowPicker] = useState(false);

  // Viagem Ativa: Primeira que não está concluída ou cancelada
  const activeTrip = useMemo(() => {
    return trips.find(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
  }, [trips]);

  const handleUpdateStatus = async (trip: Trip, nextStatus: TripStatus) => {
    if (isUpdating) return;
    if (!confirm(`CONFIRMAR ATUALIZAÇÃO PARA: ${nextStatus.toUpperCase()}?`)) return;

    setIsUpdating(true);
    const success = await driverService.updateTripStatus(trip, nextStatus, user);
    if (success) {
      setShowPicker(false);
      await onRefresh();
    } else {
      alert("Erro ao conectar. Verifique seu sinal.");
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

  const nextStatus = activeTrip ? getNextStatus(activeTrip.status) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-10">
      
      {/* SEÇÃO DA VIAGEM EM DESTAQUE */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Programação Atual</h2>
          {activeTrip && (
            <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[7px] font-black uppercase animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]">Em Curso</span>
          )}
        </div>

        {activeTrip ? (
          <div className="bg-slate-900/80 border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-8 space-y-6">
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

              {/* STATUS ATUAL */}
              <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Etapa Atual</p>
                  <button onClick={() => setShowPicker(!showPicker)} className="text-[8px] font-black text-blue-400 uppercase tracking-widest border border-blue-500/30 px-3 py-1 rounded-full hover:bg-blue-500 hover:text-white transition-all">Alterar Livremente</button>
                </div>
                <p className="text-xl font-black uppercase text-blue-400 mt-1">{activeTrip.status}</p>
              </div>

              {/* PICKER DE STATUS LIVRE */}
              {showPicker && (
                <div className="grid grid-cols-1 gap-2 pt-2 animate-in zoom-in-95 duration-300">
                  <p className="text-[8px] font-black text-slate-500 uppercase text-center mb-2">Selecione a etapa correta:</p>
                  {ALL_STATUSES.filter(s => s !== activeTrip.status).map(status => (
                    <button 
                      key={status}
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(activeTrip, status)}
                      className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase text-slate-300 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}

              {/* BOTÃO DE AÇÃO PRÓXIMA ETAPA (PADRÃO) */}
              {!showPicker && nextStatus && (
                <button 
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(activeTrip, nextStatus)}
                  className="w-full py-6 bg-blue-600 text-white rounded-[1.8rem] text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Próxima: {nextStatus}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3"/></svg>
                    </>
                  )}
                </button>
              )}
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
