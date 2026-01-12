
import React, { useMemo } from 'react';
import { Trip, Driver } from '../../types';
import TripsToday from './overview/TripsToday';
import TripsTomorrow from './overview/TripsTomorrow';
import TripsThisWeek from './overview/TripsThisWeek';
import TripsThisMonth from './overview/TripsThisMonth';
import DelayedTrips from './overview/DelayedTrips';
import DriverStatusCards from './overview/DriverStatusCards';

interface OverviewTabProps {
  trips: Trip[];
  drivers: Driver[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ trips, drivers }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* KPI GRID - LINHA SUPERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TripsToday trips={trips} />
        <TripsTomorrow trips={trips} />
        <TripsThisMonth trips={trips} />
        <DelayedTrips trips={trips} />
      </div>

      {/* AGENDA SEMANAL FIXA (SEM DROPDOWN) */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
           <h3 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-900">Agenda Semanal Detalhada</h3>
        </div>
        <TripsThisWeek trips={trips} />
      </div>

      {/* Grid de Status de Frota */}
      <div className="grid grid-cols-1">
        <DriverStatusCards trips={trips} drivers={drivers} />
      </div>
    </div>
  );
};

export default OverviewTab;
