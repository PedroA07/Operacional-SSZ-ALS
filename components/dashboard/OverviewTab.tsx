
import React from 'react';
import { Trip, Driver } from '../../types';
import TripsToday from './overview/TripsToday';
import TripsTomorrow from './overview/TripsTomorrow';
import TripsThisWeek from './overview/TripsThisWeek';
import DriverStatusCards from './overview/DriverStatusCards';

interface OverviewTabProps {
  trips: Trip[];
  drivers: Driver[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ trips, drivers }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Grid de Viagens Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TripsToday trips={trips} />
        <TripsTomorrow trips={trips} />
        <TripsThisWeek trips={trips} />
      </div>

      {/* Grid de Status de Frota e Outras Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <DriverStatusCards trips={trips} drivers={drivers} />
      </div>

      {/* Informativo de Rodapé (Opcional) */}
      <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Painel de Controle Inteligente</p>
              <p className="text-[8px] text-blue-800 opacity-60 font-bold uppercase mt-0.5 tracking-tighter">As estatísticas acima são sincronizadas automaticamente com o banco de dados SSZ.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
