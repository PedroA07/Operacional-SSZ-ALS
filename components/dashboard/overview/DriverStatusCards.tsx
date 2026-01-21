
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';

interface DriverStatusCardsProps {
  trips: Trip[];
  drivers: Driver[];
}

const DriverStatusCards: React.FC<DriverStatusCardsProps> = ({ trips, drivers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const baseData = useMemo(() => {
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const inTripIds = new Set(activeTrips.map(t => t.driver.id));
    
    // Motoristas em operação (com viagem ativa)
    const driversInTrip = drivers.filter(d => inTripIds.has(d.id));
    
    // Motoristas disponíveis (ativos no cadastro mas sem viagem agora)
    const driversAvailable = drivers.filter(d => d.status === 'Ativo' && !inTripIds.has(d.id));

    return { driversInTrip, driversAvailable, activeTrips };
  }, [trips, drivers]);

  const filteredInTrip = useMemo(() => {
    if (!searchQuery) return baseData.driversInTrip;
    const q = searchQuery.toLowerCase();
    return baseData.driversInTrip.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.plateHorse.toLowerCase().includes(q) || 
      d.plateTrailer.toLowerCase().includes(q)
    );
  }, [baseData.driversInTrip, searchQuery]);

  const filteredAvailable = useMemo(() => {
    if (!searchQuery) return baseData.driversAvailable;
    const q = searchQuery.toLowerCase();
    return baseData.driversAvailable.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.plateHorse.toLowerCase().includes(q) || 
      d.plateTrailer.toLowerCase().includes(q)
    );
  }, [baseData.driversAvailable, searchQuery]);

  const DriverGridItem: React.FC<{ driver: Driver, trip?: Trip, isAvailable: boolean }> = ({ driver, trip, isAvailable }) => (
    <div className={`p-6 rounded-[2rem] border transition-all flex flex-col justify-between h-full bg-white shadow-sm hover:shadow-md ${isAvailable ? 'border-emerald-100 hover:border-emerald-300' : 'border-blue-100 hover:border-blue-300'}`}>
       <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <h4 className="text-sm font-black text-slate-800 uppercase leading-tight whitespace-normal break-words flex-1">
              {driver.name}
            </h4>
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${isAvailable ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse'}`}></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cavalo</span>
                <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-center shadow-lg">
                   <span className="text-[11px] font-mono font-black tracking-wider">{driver.plateHorse}</span>
                </div>
             </div>
             <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carreta</span>
                <div className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-2 rounded-xl text-center">
                   <span className="text-[11px] font-mono font-black tracking-wider">{driver.plateTrailer}</span>
                </div>
             </div>
          </div>
       </div>

       <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Situação</span>
             <span className={`text-[11px] font-black uppercase mt-1 ${isAvailable ? 'text-emerald-600' : 'text-blue-600'}`}>
               {isAvailable ? 'Disponível' : trip?.status}
             </span>
          </div>
          {!isAvailable && trip && (
            <div className="px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
               <span className="text-[10px] font-black text-blue-700 font-mono">{trip.os}</span>
            </div>
          )}
       </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* BARRA DE PESQUISA INTERNA */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1 w-full relative group">
           <input 
             type="text" 
             placeholder="PESQUISAR MOTORISTA, PLACA CAVALO OU CARRETA..."
             className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[11px] font-black uppercase outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
           <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div className="flex items-center gap-4 shrink-0">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Operacional</span>
              <span className="text-xl font-black text-slate-800 leading-none">{drivers.length} ATIVOS</span>
           </div>
           <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
         {/* EM OPERAÇÃO */}
         <section className="space-y-5">
            <div className="flex items-center gap-4 px-4">
               <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
               <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.3em]">Em Operação ({filteredInTrip.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
               {filteredInTrip.map(d => (
                 <DriverGridItem key={d.id} driver={d} trip={baseData.activeTrips.find(t => t.driver.id === d.id)} isAvailable={false} />
               ))}
               {filteredInTrip.length === 0 && (
                 <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                   <p className="text-[11px] font-black text-slate-300 uppercase">Nenhum motorista localizado na operação</p>
                 </div>
               )}
            </div>
         </section>

         {/* DISPONÍVEIS */}
         <section className="space-y-5">
            <div className="flex items-center gap-4 px-4">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
               <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.3em]">Disponíveis p/ Escala ({filteredAvailable.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
               {filteredAvailable.map(d => (
                 <DriverGridItem key={d.id} driver={d} isAvailable={true} />
               ))}
               {filteredAvailable.length === 0 && (
                 <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                   <p className="text-[11px] font-black text-slate-300 uppercase">Nenhum motorista disponível no momento</p>
                 </div>
               )}
            </div>
         </section>
      </div>
    </div>
  );
};

export default DriverStatusCards;
