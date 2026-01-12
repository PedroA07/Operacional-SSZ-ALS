
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';

interface DriverStatusCardsProps {
  trips: Trip[];
  drivers: Driver[];
}

const DriverStatusCards: React.FC<DriverStatusCardsProps> = ({ trips, drivers }) => {
  const [isOpsOpen, setIsOpsOpen] = useState(false);
  const [isAvailableOpen, setIsAvailableOpen] = useState(false);

  const data = useMemo(() => {
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const inTripIds = new Set(activeTrips.map(t => t.driver.id));
    
    const driversInTrip = drivers.filter(d => inTripIds.has(d.id));
    const driversAvailable = drivers.filter(d => d.status === 'Ativo' && !inTripIds.has(d.id));

    return { driversInTrip, driversAvailable, activeTrips };
  }, [trips, drivers]);

  return (
    <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
      </div>
      
      <div className="flex items-center gap-3 mb-10">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400">Motoristas</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        
        {/* BLOCO EM OPERAÇÃO */}
        <div className="space-y-4">
          <button 
            onClick={() => setIsOpsOpen(!isOpsOpen)}
            className={`w-full text-left group transition-all duration-300 ${isOpsOpen ? 'scale-[1.02]' : ''}`}
          >
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Em Operação / Carregando</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <p className="text-6xl font-black">{data.driversInTrip.length}</p>
                  <svg className={`w-5 h-5 text-blue-500 transition-transform duration-500 ${isOpsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000" 
                style={{ width: `${(data.driversInTrip.length / (drivers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </button>

          {isOpsOpen && (
            <div className="bg-white/5 rounded-3xl border border-white/5 p-4 space-y-2 animate-in slide-in-from-top-4 duration-500 max-h-60 overflow-y-auto custom-scrollbar">
              {data.driversInTrip.length > 0 ? data.driversInTrip.map(d => {
                const trip = data.activeTrips.find(t => t.driver.id === d.id);
                return (
                  <div key={d.id} className="p-3 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-slate-200 truncate">{d.name}</p>
                      <p className="text-[7px] font-bold text-blue-400 uppercase mt-0.5 tracking-widest">{trip?.status || 'Em trânsito'}</p>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-slate-500 bg-black/40 px-2 py-1 rounded-lg border border-white/5 ml-4 shrink-0">{d.plateHorse}</span>
                  </div>
                );
              }) : (
                <p className="text-[9px] font-black text-slate-600 uppercase text-center py-4 italic">Nenhum motorista em curso</p>
              )}
            </div>
          )}
        </div>

        {/* BLOCO DISPONÍVEIS */}
        <div className="space-y-4">
          <button 
            onClick={() => setIsAvailableOpen(!isAvailableOpen)}
            className={`w-full text-left group transition-all duration-300 ${isAvailableOpen ? 'scale-[1.02]' : ''}`}
          >
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Disponíveis na Base</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <p className="text-6xl font-black text-emerald-400">{data.driversAvailable.length}</p>
                  <svg className={`w-5 h-5 text-emerald-500 transition-transform duration-500 ${isAvailableOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000" 
                style={{ width: `${(data.driversAvailable.length / (drivers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </button>

          {isAvailableOpen && (
            <div className="bg-emerald-500/5 rounded-3xl border border-emerald-500/10 p-4 space-y-2 animate-in slide-in-from-top-4 duration-500 max-h-60 overflow-y-auto custom-scrollbar">
              {data.driversAvailable.length > 0 ? data.driversAvailable.map(d => (
                <div key={d.id} className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-emerald-50 truncate">{d.name}</p>
                    <p className="text-[7px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5 italic">Pronto para Escala</p>
                  </div>
                  <span className="text-[8px] font-mono font-bold text-emerald-400/60 bg-black/40 px-2 py-1 rounded-lg border border-emerald-500/10 ml-4 shrink-0">{d.plateHorse}</span>
                </div>
              )) : (
                <p className="text-[9px] font-black text-slate-600 uppercase text-center py-4 italic">Frota 100% ocupada</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DriverStatusCards;
