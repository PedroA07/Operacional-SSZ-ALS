
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
    
    const driversInTrip = drivers.filter(d => inTripIds.has(d.id));
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
    <div className={`p-5 rounded-[2rem] border-2 transition-all flex flex-col justify-between bg-white shadow-sm hover:shadow-md ${isAvailable ? 'border-emerald-100 hover:border-emerald-300' : 'border-blue-100 hover:border-blue-300'}`}>
       <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <h4 className="text-[13px] font-black text-slate-800 uppercase leading-tight whitespace-normal break-words flex-1">
              {driver.name}
            </h4>
            <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${isAvailable ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse'}`}></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <div className="bg-slate-900 text-white px-2 py-1.5 rounded-xl text-center">
                <span className="text-[11px] font-mono font-black">{driver.plateHorse}</span>
             </div>
             <div className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1.5 rounded-xl text-center">
                <span className="text-[11px] font-mono font-black">{driver.plateTrailer}</span>
             </div>
          </div>
       </div>

       <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col gap-1">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Status Atual</span>
          <span className={`text-[12px] font-black uppercase truncate ${isAvailable ? 'text-emerald-600' : 'text-blue-600'}`}>
            {isAvailable ? 'Disponível' : trip?.status}
          </span>
          {!isAvailable && trip && (
            <span className="text-[10px] font-black text-blue-400 font-mono mt-0.5">OS: {trip.os}</span>
          )}
       </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* BARRA DE PESQUISA GLOBAL DO MONITOR */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
        <div className="flex-1 relative group">
           <input 
             type="text" 
             placeholder="BUSCAR MOTORISTA OU PLACA NO MONITOR..."
             className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
           <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* COLUNA: EM OPERAÇÃO */}
         <section className="bg-blue-50/30 p-6 rounded-[3rem] border border-blue-100 space-y-6">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
                  <h3 className="text-xs font-black uppercase text-blue-600 tracking-[0.2em]">Em Operação</h3>
               </div>
               <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{filteredInTrip.length}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
               {filteredInTrip.map(d => (
                 <DriverGridItem key={d.id} driver={d} trip={baseData.activeTrips.find(t => t.driver.id === d.id)} isAvailable={false} />
               ))}
               {filteredInTrip.length === 0 && (
                 <div className="py-20 text-center border-2 border-dashed border-blue-100 rounded-[2.5rem] bg-white/50">
                   <p className="text-[10px] font-black text-blue-300 uppercase">Nenhum em operação</p>
                 </div>
               )}
            </div>
         </section>

         {/* COLUNA: DISPONÍVEIS */}
         <section className="bg-emerald-50/30 p-6 rounded-[3rem] border border-emerald-100 space-y-6">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h3 className="text-xs font-black uppercase text-emerald-600 tracking-[0.2em]">Disponíveis</h3>
               </div>
               <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{filteredAvailable.length}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
               {filteredAvailable.map(d => (
                 <DriverGridItem key={d.id} driver={d} isAvailable={true} />
               ))}
               {filteredAvailable.length === 0 && (
                 <div className="py-20 text-center border-2 border-dashed border-emerald-100 rounded-[2.5rem] bg-white/50">
                   <p className="text-[10px] font-black text-emerald-300 uppercase">Fim de fila</p>
                 </div>
               )}
            </div>
         </section>
      </div>
    </div>
  );
};

export default DriverStatusCards;
