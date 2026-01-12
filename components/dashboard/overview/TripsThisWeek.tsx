
import React, { useMemo } from 'react';
import { Trip } from '../../../types';
import TripsStatsCard from './TripsStatsCard';

interface TripsThisWeekProps {
  trips: Trip[];
}

const TripsThisWeek: React.FC<TripsThisWeekProps> = ({ trips }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTrips = trips.filter(t => {
      const d = new Date(t.dateTime);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const active = weekTrips.filter(t => t.status !== 'Viagem cancelada');
    const canceled = weekTrips.filter(t => t.status === 'Viagem cancelada').length;
    const completed = weekTrips.filter(t => t.status === 'Viagem concluída').length;
    
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
      title="Volume da Semana"
      count={stats.total}
      typeCounts={stats.typeCounts}
      delays={stats.delays}
      canceled={stats.canceled}
      completed={stats.completed}
      variantColor="indigo"
    />
  );
};

export default TripsThisWeek;
