
import React, { useMemo, useState } from 'react';
import { Trip, User, TripStatus } from '../../../types';
import { db } from '../../../utils/storage';

interface HomeTabProps {
  user: User;
  trips: Trip[];
  onRefresh: () => Promise<void>;
}

const HomeTab: React.FC<HomeTabProps> = ({ user, trips, onRefresh }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const currentTrip = useMemo(() => {
    return trips.find(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
  }, [trips]);

  const handleUpdateStatus = async (trip: Trip, nextStatus: TripStatus) => {
    if (isUpdating) return;
    if (!confirm(`Avançar para: ${nextStatus.toUpperCase()}?`)) return;

    setIsUpdating(true);
    try {
      const now = new Date().toISOString();
      const updatedTrip = {
        ...trip,
        status: nextStatus,
        statusTime: now,
        statusHistory: [
          { status: nextStatus, dateTime: now },
          ...(trip.statusHistory || [])
        ]
      };
      await db.saveTrip(updatedTrip, user);
      await onRefresh();
    } catch (e) {
      alert("Erro ao atualizar status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getNextStatus = (current: TripStatus): TripStatus | null => {
    const flow: TripStatus[] = [
      'Pendente', 'Retirada de vazio', 'Em viagem', 'Chegou no cliente', 
      'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 
      'Devolução do cheio', 'Viagem concluída'
    ];
    const idx = flow.indexOf(current);
    return (idx !== -1 && idx < flow.length - 1) ? flow[idx + 1] : null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="space-y-4">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Viagem em Andamento</h2>
          {currentTrip && <span className="text-[7px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase animate-pulse">Monitorando</span>}
        </div>

        {currentTrip ? (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-4xl font-black tracking-tighter text-blue-500 leading-none">OS {currentTrip.os}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{currentTrip.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-black text-white">{currentTrip.container || '---'}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">{currentTrip.containerType}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-1">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Local de Entrega</p>
                <p className="text-sm font-black uppercase text-white leading-tight">{currentTrip.destination?.name || 'A DEFINIR'}</p>
              </div>

              <div className="bg-blue-600/10 rounded-3xl p-5 border border-blue-500/20 space-y-1">
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Status da Operação</p>
                <p className="text-lg font-black uppercase text-white">{currentTrip.status}</p>
              </div>

              {getNextStatus(currentTrip.status) && (
                <button 
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(currentTrip, getNextStatus(currentTrip.status)!)}
                  className="w-full py-6 bg-blue-600 text-white rounded-[1.8rem] text-xs font-black uppercase tracking-widest shadow-[0_15px_30px_rgba(37,99,235,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Avançar: {getNextStatus(currentTrip.status)}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-20 bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-10">
             <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2"/></svg>
             </div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic leading-relaxed">Nenhuma viagem ativa.<br/>Aguarde nova programação.</p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4">
         <div className="bg-slate-900/50 p-6 rounded-[2.2rem] border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Total de Viagens</p>
            <p className="text-3xl font-black text-white">{trips.length}</p>
         </div>
         <div className="bg-slate-900/50 p-6 rounded-[2.2rem] border border-white/5">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Histórico</p>
            <p className="text-3xl font-black text-blue-500">{trips.filter(t => t.status === 'Viagem concluída').length}</p>
         </div>
      </section>
    </div>
  );
};

export default HomeTab;
