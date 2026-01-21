
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';

interface DriverStatusCardsProps {
  trips: Trip[];
  drivers: Driver[];
}

const DriverStatusCards: React.FC<DriverStatusCardsProps> = ({ trips, drivers }) => {
  const [isOpsOpen, setIsOpsOpen] = useState(false);
  const [isAvailableOpen, setIsAvailableOpen] = useState(false);
  
  const [searchOps, setSearchOps] = useState('');
  const [searchAvail, setSearchAvail] = useState('');

  const baseData = useMemo(() => {
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const inTripIds = new Set(activeTrips.map(t => t.driver.id));
    
    const driversInTrip = drivers.filter(d => inTripIds.has(d.id));
    const driversAvailable = drivers.filter(d => d.status === 'Ativo' && !inTripIds.has(d.id));

    return { driversInTrip, driversAvailable, activeTrips };
  }, [trips, drivers]);

  const filteredOps = useMemo(() => {
    return baseData.driversInTrip.filter(d => 
      d.name.toLowerCase().includes(searchOps.toLowerCase()) ||
      d.plateHorse.toLowerCase().includes(searchOps.toLowerCase()) ||
      d.plateTrailer.toLowerCase().includes(searchOps.toLowerCase())
    );
  }, [baseData.driversInTrip, searchOps]);

  const filteredAvail = useMemo(() => {
    return baseData.driversAvailable.filter(d => 
      d.name.toLowerCase().includes(searchAvail.toLowerCase()) ||
      d.plateHorse.toLowerCase().includes(searchAvail.toLowerCase()) ||
      d.plateTrailer.toLowerCase().includes(searchAvail.toLowerCase())
    );
  }, [baseData.driversAvailable, searchAvail]);

  // Fix: Explicitly typed sub-component as React.FC to allow 'key' prop during list rendering and resolve TS assignability errors (lines 133 and 185)
  const DriverItem: React.FC<{ driver: Driver, trip?: Trip, statusColor: string }> = ({ driver, trip, statusColor }) => (
    <div className="p-5 bg-white/5 rounded-[1.8rem] border border-white/5 flex flex-col gap-4 group hover:bg-white/[0.08] transition-all">
       <div className="flex justify-between items-start gap-4">
          <div className="min-w-0 flex-1">
             <p className="text-[11px] font-black uppercase text-slate-100 leading-snug whitespace-normal break-words">
                {driver.name}
             </p>
             <p className={`text-[8px] font-bold uppercase mt-1.5 tracking-widest ${statusColor}`}>
                {trip?.status || 'Pronto para Escala'}
             </p>
             {trip?.os && (
               <p className="text-[8px] font-black text-slate-500 mt-1 uppercase">OS: <span className="text-blue-400">{trip.os}</span></p>
             )}
          </div>
          <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${statusColor.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}></div>
       </div>

       <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
          <div className="space-y-1">
             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Cavalo</span>
             <div className="bg-black/40 border border-white/5 px-2 py-1.5 rounded-lg text-center">
                <span className="text-[10px] font-mono font-black text-slate-200">{driver.plateHorse}</span>
             </div>
          </div>
          <div className="space-y-1">
             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest ml-1">Carreta</span>
             <div className="bg-white/5 border border-white/5 px-2 py-1.5 rounded-lg text-center">
                <span className="text-[10px] font-mono font-black text-slate-400">{driver.plateTrailer}</span>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
      </div>
      
      <div className="flex items-center gap-3 mb-10">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400">Monitor de Frota ALS</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-12 relative z-10">
        
        {/* SEÇÃO: EM OPERAÇÃO */}
        <div className="space-y-5">
          <button 
            onClick={() => setIsOpsOpen(!isOpsOpen)}
            className="w-full text-left group"
          >
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ativos em Operação</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <p className="text-6xl font-black">{baseData.driversInTrip.length}</p>
                  <div className={`p-2 rounded-xl transition-all duration-500 ${isOpsOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-blue-500'}`}>
                    <svg className={`w-5 h-5 transition-transform duration-500 ${isOpsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 9l-7 7-7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                style={{ width: `${(baseData.driversInTrip.length / (drivers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </button>

          {isOpsOpen && (
            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
               {/* Campo de Busca Operação */}
               <div className="relative">
                  <input 
                    type="text"
                    placeholder="BUSCAR EM OPERAÇÃO..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-10 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all"
                    value={searchOps}
                    onChange={e => setSearchOps(e.target.value)}
                  />
                  <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               </div>

               <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                 {filteredOps.length > 0 ? filteredOps.map(d => (
                   <DriverItem key={d.id} driver={d} trip={baseData.activeTrips.find(t => t.driver.id === d.id)} statusColor="text-blue-400" />
                 )) : (
                   <p className="text-[10px] font-black text-slate-600 uppercase text-center py-8 italic border border-white/5 rounded-3xl">Nenhum motorista localizado</p>
                 )}
               </div>
            </div>
          )}
        </div>

        {/* SEÇÃO: DISPONÍVEIS */}
        <div className="space-y-5">
          <button 
            onClick={() => setIsAvailableOpen(!isAvailableOpen)}
            className="w-full text-left group"
          >
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Disponíveis p/ Escala</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <p className="text-6xl font-black text-emerald-400">{baseData.driversAvailable.length}</p>
                  <div className={`p-2 rounded-xl transition-all duration-500 ${isAvailableOpen ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-emerald-500'}`}>
                    <svg className={`w-5 h-5 transition-transform duration-500 ${isAvailableOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 9l-7 7-7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                style={{ width: `${(baseData.driversAvailable.length / (drivers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </button>

          {isAvailableOpen && (
            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
               {/* Campo de Busca Disponíveis */}
               <div className="relative">
                  <input 
                    type="text"
                    placeholder="BUSCAR DISPONÍVEIS..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-10 py-3 text-[10px] font-black uppercase outline-none focus:border-emerald-500 focus:bg-white/[0.08] transition-all"
                    value={searchAvail}
                    onChange={e => setSearchAvail(e.target.value)}
                  />
                  <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               </div>

               <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                 {filteredAvail.length > 0 ? filteredAvail.map(d => (
                   <DriverItem key={d.id} driver={d} statusColor="text-emerald-400" />
                 )) : (
                   <p className="text-[10px] font-black text-slate-600 uppercase text-center py-8 italic border border-white/5 rounded-3xl">Nenhum motorista disponível</p>
                 )}
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DriverStatusCards;
