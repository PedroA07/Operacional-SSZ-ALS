
import React, { useMemo } from 'react';
import { Trip, Driver } from '../../../types';

interface DriverStatusCardsProps {
  trips: Trip[];
  drivers: Driver[];
}

const DriverStatusCards: React.FC<DriverStatusCardsProps> = ({ trips, drivers }) => {
  const stats = useMemo(() => {
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const driversInTripIds = new Set(activeTrips.map(t => t.driver.id));

    return {
      driversInTrip: driversInTripIds.size,
      driversScheduled: trips.filter(t => t.status === 'Pendente').length,
      driversAvailable: drivers.filter(d => d.status === 'Ativo' && !driversInTripIds.has(d.id)).length
    };
  }, [trips, drivers]);

  return (
    <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
      </div>
      <h3 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400 mb-8">Status Operacional da Frota</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 relative z-10">
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Em Operação / Carregando</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-6xl font-black">{stats.driversInTrip}</p>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000" 
              style={{ width: `${(stats.driversInTrip / (drivers.length || 1)) * 100}%` }}
            ></div>
          </div>
          <p className="text-[8px] font-bold text-slate-400 uppercase italic">Atividade em tempo real</p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Disponíveis na Base</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-6xl font-black text-emerald-400">{stats.driversAvailable}</p>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-1000" 
              style={{ width: `${(stats.driversAvailable / (drivers.length || 1)) * 100}%` }}
            ></div>
          </div>
          <p className="text-[8px] font-bold text-slate-400 uppercase italic">Prontos para escala</p>
        </div>
      </div>
    </div>
  );
};

export default DriverStatusCards;
