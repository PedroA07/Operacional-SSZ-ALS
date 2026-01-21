
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';

interface DriverStatusCardsProps {
  trips: Trip[];
  drivers: Driver[];
}

const DriverStatusCards: React.FC<DriverStatusCardsProps> = ({ trips, drivers }) => {
  const [isOpsOpen, setIsOpsOpen] = useState(true); // Iniciado aberto para facilitar visualização
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

  const DriverItem: React.FC<{ driver: Driver, trip?: Trip, statusColor: string }> = ({ driver, trip, statusColor }) => (
    <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 flex flex-col gap-6 group hover:bg-white/[0.08] transition-all">
       <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
             <p className="text-lg font-black uppercase text-white leading-tight whitespace-normal break-words">
                {driver.name}
             </p>
             <div className="flex items-center gap-2 mt-2">
                <div className={`w-2.5 h-2.5 rounded-full ${statusColor.replace('text-', 'bg-')} shadow-[0_0_10px_currentColor]`}></div>
                <p className={`text-xs font-black uppercase tracking-widest ${statusColor}`}>
                   {trip?.status || 'Disponível p/ Escala'}
                </p>
             </div>
             {trip?.os && (
               <p className="text-xs font-black text-slate-500 mt-2 uppercase tracking-wider">OS: <span className="text-blue-400 font-mono text-sm">{trip.os}</span></p>
             )}
          </div>
       </div>

       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="space-y-1.5">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Cavalo</span>
             <div className="bg-black/40 border border-white/10 px-3 py-2.5 rounded-xl text-center shadow-inner">
                <span className="text-base font-mono font-black text-blue-400 tracking-wider">{driver.plateHorse}</span>
             </div>
          </div>
          <div className="space-y-1.5">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Carreta</span>
             <div className="bg-white/5 border border-white/10 px-3 py-2.5 rounded-xl text-center shadow-inner">
                <span className="text-base font-mono font-black text-slate-200 tracking-wider">{driver.plateTrailer}</span>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
      </div>
      
      <div className="flex items-center gap-4 mb-12">
        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
        <h3 className="text-xs font-black uppercase tracking-[0.5em] text-blue-400">Frota Operacional ALS</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-14 relative z-10">
        
        {/* SEÇÃO: EM OPERAÇÃO */}
        <div className="space-y-6">
          <button 
            onClick={() => setIsOpsOpen(!isOpsOpen)}
            className="w-full text-left group"
          >
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Motoristas em Viagem</p>
                <div className="flex items-baseline gap-4 mt-2">
                  <p className="text-7xl font-black tracking-tighter">{baseData.driversInTrip.length}</p>
                  <div className={`p-3 rounded-2xl transition-all duration-500 ${isOpsOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-blue-500'}`}>
                    <svg className={`w-6 h-6 transition-transform duration-500 ${isOpsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 9l-7 7-7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                style={{ width: `${(baseData.driversInTrip.length / (drivers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </button>

          {isOpsOpen && (
            <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
               <div className="relative">
                  <input 
                    type="text"
                    placeholder="PESQUISAR POR NOME OU PLACA..."
                    className="w-full bg-white/5 border-2 border-white/10 rounded-[1.5rem] px-12 py-4 text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all placeholder:text-slate-600"
                    value={searchOps}
                    onChange={e => setSearchOps(e.target.value)}
                  />
                  <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               </div>

               <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                 {filteredOps.length > 0 ? filteredOps.map(d => (
                   <DriverItem key={d.id} driver={d} trip={baseData.activeTrips.find(t => t.driver.id === d.id)} statusColor="text-blue-400" />
                 )) : (
                   <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                      <p className="text-xs font-black text-slate-600 uppercase italic">Nenhum motorista em operação</p>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>

        {/* SEÇÃO: DISPONÍVEIS */}
        <div className="space-y-6">
          <button 
            onClick={() => setIsAvailableOpen(!isAvailableOpen)}
            className="w-full text-left group"
          >
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Disponíveis p/ Escala</p>
                <div className="flex items-baseline gap-4 mt-2">
                  <p className="text-7xl font-black text-emerald-400 tracking-tighter">{baseData.driversAvailable.length}</p>
                  <div className={`p-3 rounded-2xl transition-all duration-500 ${isAvailableOpen ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-emerald-500'}`}>
                    <svg className={`w-6 h-6 transition-transform duration-500 ${isAvailableOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 9l-7 7-7-7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                style={{ width: `${(baseData.driversAvailable.length / (drivers.length || 1)) * 100}%` }}
              ></div>
            </div>
          </button>

          {isAvailableOpen && (
            <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
               <div className="relative">
                  <input 
                    type="text"
                    placeholder="PESQUISAR DISPONÍVEIS..."
                    className="w-full bg-white/5 border-2 border-white/10 rounded-[1.5rem] px-12 py-4 text-xs font-black uppercase outline-none focus:border-emerald-500 focus:bg-white/[0.08] transition-all placeholder:text-slate-600"
                    value={searchAvail}
                    onChange={e => setSearchAvail(e.target.value)}
                  />
                  <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               </div>

               <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                 {filteredAvail.length > 0 ? filteredAvail.map(d => (
                   <DriverItem key={d.id} driver={d} statusColor="text-emerald-400" />
                 )) : (
                   <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                      <p className="text-xs font-black text-slate-600 uppercase italic">Nenhum motorista livre no momento</p>
                   </div>
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
