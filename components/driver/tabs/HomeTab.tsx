
import React, { useMemo, useState, useCallback } from 'react';
import { Trip, User, TripStatus } from '../../../types';
import { driverService } from '../../../utils/driverService';
import ScannerModal from '../ScannerModal';

interface HomeTabProps {
  user: User;
  trips: Trip[];
  onRefresh: () => Promise<void>;
}

const DEFAULT_STATUSES: TripStatus[] = [
  'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 
  'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 
  'Chegou no destino', 'Devolução do cheio', 'Viagem concluída'
];

const VW_CRAGEA_STATUSES: { label: string; value: TripStatus }[] = [
  { label: 'Retirou o Cheio', value: 'Retirada do cheio' },
  { label: 'Chegou no Cragea', value: 'Chegou no Cragea' },
  { label: 'Aguardando Carregar', value: 'Aguardando carregar' },
  { label: 'Saiu do Cragea', value: 'Saiu do Cragea' },
  { label: 'Chegou na Volkswagen', value: 'Chegou na Volkswagen' },
  { label: 'Saiu da Volkswagen', value: 'Saiu da Volkswagen' },
  { label: 'Container sobre Rodas', value: 'Container sobre rodas' },
  { label: 'Baixa Cragea', value: 'Viagem concluída' },
];

const HomeTab: React.FC<HomeTabProps> = ({ user, trips, onRefresh }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const activeTrip = useMemo(() => {
    return [...trips]
      .filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada')
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];
  }, [trips]);

  const isVWCrageaTrip = useMemo(() => {
    if (!activeTrip) return false;
    const isVW = activeTrip.customer?.name?.toUpperCase().includes('VOLKSWAGEN');
    const isCragea = activeTrip.destination?.name?.toUpperCase().includes('CRAGEA') || 
                     activeTrip.scheduling?.location?.toUpperCase().includes('CRAGEA');
    return isVW && isCragea;
  }, [activeTrip]);

  const handleUpdateStatus = async (trip: Trip, nextStatus: TripStatus, label?: string) => {
    if (isUpdating) return;
    if (trip.status === nextStatus) return;
    
    const confirmLabel = label || nextStatus.toUpperCase();
    if (!confirm(`CONFIRMAR ESTA POSIÇÃO: ${confirmLabel}?`)) return;

    setIsUpdating(true);
    const success = await driverService.updateTripStatus(trip, nextStatus, user);
    if (success) {
      setShowPicker(false);
      await onRefresh();
    } else {
      alert("Erro ao conectar. Verifique seu sinal de internet.");
    }
    setIsUpdating(false);
  };

  const handleOpenScanner = useCallback(() => setIsScannerOpen(true), []);
  const handleCloseScanner = useCallback(() => setIsScannerOpen(false), []);
  const handleScannerSuccess = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  const handleReloadPage = () => {
    window.location.reload();
  };

  const getStatusColor = (status: TripStatus) => {
    if (status === 'Viagem concluída') return 'text-emerald-400';
    if (status === 'Viagem cancelada') return 'text-amber-400';
    return 'text-blue-400';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24">
      
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Minha Programação</h2>
            {activeTrip && (
              <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[7px] font-black uppercase shadow-[0_0_8px_rgba(59,130,246,0.5)]">Próxima na Fila</span>
            )}
          </div>
          
          <button 
            onClick={handleReloadPage}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all group"
          >
            <svg className="w-3.5 h-3.5 group-active:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Atualizar</span>
          </button>
        </div>

        {activeTrip ? (
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-7 space-y-6">
              <div className="flex justify-between items-start border-b border-white/5 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-black tracking-tighter text-blue-500 leading-none">OS {activeTrip.os}</p>
                    {isVWCrageaTrip && (
                      <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded text-[6px] font-black uppercase">Operação VW</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-tight">{activeTrip.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-white leading-none">
                    {new Date(activeTrip.dateTime).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-[9px] text-blue-400 font-bold uppercase mt-1">
                    {new Date(activeTrip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-inner flex flex-col items-center justify-center relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-2 opacity-5">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                 </div>
                 <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">Equipamento Vinculado</span>
                 <p className="text-2xl font-mono font-black text-white tracking-widest break-all text-center">
                    {activeTrip.container || 'A DEFINIR'}
                 </p>
                 <div className="flex gap-4 mt-3">
                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">TARA: {activeTrip.tara || '---'}</span>
                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">TIPO: {activeTrip.containerType || '---'}</span>
                 </div>
              </div>

              <button 
                onClick={handleOpenScanner}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center gap-4 border border-white/10 shadow-xl active:scale-95 transition-all group"
              >
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Anexar Documentos</p>
                  <p className="text-[8px] font-bold text-blue-200 uppercase mt-1">Notas Fiscais / Canhotos</p>
                </div>
              </button>

              {activeTrip.scheduling && activeTrip.scheduling.location && (
                <div className="bg-emerald-500/10 rounded-3xl p-5 border border-emerald-500/20 space-y-2 animate-in zoom-in-95">
                  <div className="flex justify-between items-center">
                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Agendamento Local</p>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-xs font-black text-white uppercase truncate">{activeTrip.scheduling.location}</p>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Posição em Tempo Real</p>
                    <p className={`text-base font-black uppercase mt-1 truncate ${getStatusColor(activeTrip.status)}`}>
                      {isVWCrageaTrip && activeTrip.status === 'Viagem concluída' ? 'BAIXA CRAGEA' : activeTrip.status}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowPicker(!showPicker)}
                    className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all border shrink-0 ${showPicker ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-white/10 text-slate-300'}`}
                  >
                    {showPicker ? 'Fechar' : 'Alterar'}
                  </button>
                </div>
                
                {showPicker && (
                  <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-4 duration-300">
                    {isVWCrageaTrip ? (
                      VW_CRAGEA_STATUSES.map((st) => {
                        const isCurrent = activeTrip.status === st.value;
                        return (
                          <button 
                            key={st.value}
                            disabled={isUpdating || isCurrent}
                            onClick={() => handleUpdateStatus(activeTrip, st.value, st.label)}
                            className={`py-4 px-2 rounded-2xl text-[9px] font-black uppercase tracking-tighter transition-all border flex items-center justify-center text-center leading-tight ${
                              isCurrent 
                              ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 opacity-50' 
                              : 'bg-white/5 border-white/10 text-slate-400 active:scale-95 active:bg-blue-600 active:text-white'
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })
                    ) : (
                      DEFAULT_STATUSES.map((status) => {
                        const isCurrent = activeTrip.status === status;
                        return (
                          <button 
                            key={status}
                            disabled={isUpdating || isCurrent}
                            onClick={() => handleUpdateStatus(activeTrip, status)}
                            className={`py-4 px-2 rounded-2xl text-[9px] font-black uppercase tracking-tighter transition-all border flex items-center justify-center text-center leading-tight ${
                              isCurrent 
                              ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 opacity-50' 
                              : 'bg-white/5 border-white/10 text-slate-400 active:scale-95 active:bg-blue-600 active:text-white'
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-24 bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-8">
             <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2.5"/></svg>
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Sem programações pendentes.</p>
          </div>
        )}
      </section>

      <div className="pt-4 pb-8">
        <p className="text-[8px] text-slate-800 font-bold uppercase tracking-[0.5em] text-center">
          ALS TRANSPORTES OPERACIONAL V4.1
        </p>
      </div>

      {isScannerOpen && activeTrip && (
        <ScannerModal 
          isOpen={isScannerOpen}
          onClose={handleCloseScanner}
          onSuccess={handleScannerSuccess}
          trip={activeTrip}
          user={user}
        />
      )}
    </div>
  );
};

export default HomeTab;
