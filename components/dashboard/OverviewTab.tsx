
import React from 'react';
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
      
      {/* GRID DE KPIs SUPERIOR - 4 BLOCOS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TripsToday trips={trips} />
        <TripsTomorrow trips={trips} />
        <TripsThisWeek trips={trips} />
        <TripsThisMonth trips={trips} />
      </div>

      {/* MONITOR DE ATRAZOS CRÍTICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-1">
            <DelayedTrips trips={trips} />
         </div>
         <div className="lg:col-span-2">
            <DriverStatusCards trips={trips} drivers={drivers} />
         </div>
      </div>
    </div>
  );
};

export default OverviewTab;
