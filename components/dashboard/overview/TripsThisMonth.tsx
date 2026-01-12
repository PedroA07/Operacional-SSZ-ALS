
import React, { useMemo } from 'react';
import { Trip } from '../../../types';
import TripsStatsCard from './TripsStatsCard';

interface TripsThisMonthProps {
  trips: Trip[];
}

const TripsThisMonth: React.FC<TripsThisMonthProps> = ({ trips }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    const monthTrips = trips.filter(t => {
      const d = new Date(t.dateTime);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const active = monthTrips.filter(t => t.status !== 'Viagem cancelada');
    const canceled = monthTrips.filter(t => t.status === 'Viagem cancelada').length;
    const completed = monthTrips.filter(t => t.status === 'Viagem concluída').length;

    const typeCounts: { [key: string]: number } = {};
    active.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });

    const delays = active.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      return arrival && new Date(arrival.dateTime).getTime() > new Date(t.dateTime).getTime();
    }).length;

    return { total: active.length, typeCounts, canceled, delays, completed };
  }, [trips]);

  return (
    <TripsStatsCard 
      title="Consolidado Mês"
      count={stats.total}
      typeCounts={stats.typeCounts}
      delays={stats.delays}
      canceled={stats.canceled}
      completed={stats.completed}
      variantColor="slate"
    />
  );
};

export default TripsThisMonth;
