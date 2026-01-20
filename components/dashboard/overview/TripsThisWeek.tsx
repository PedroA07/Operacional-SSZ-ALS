
import React, { useMemo } from 'react';
import { Trip } from '../../../types';
import TripsStatsCard from './TripsStatsCard';

interface TripsThisWeekProps {
  trips: Trip[];
}

const TripsThisWeek: React.FC<TripsThisWeekProps> = ({ trips }) => {
  const stats = useMemo(() => {
    const now = new Date();
    // Ajuste para Segunda-feira ser o dia 0 da contagem ALS
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTrips = trips.filter(t => {
      if (!t.dateTime) return false;
      const tripTime = new Date(t.dateTime).getTime();
      return tripTime >= startOfWeek.getTime() && tripTime <= endOfWeek.getTime();
    });

    // Unicidade e Filtro de Ativas
    // Explicitly typed the Map input and variable to avoid 'unknown' inference
    const uniqueActive: Trip[] = Array.from(new Map(
      weekTrips
        .filter(t => t.status !== 'Viagem cancelada')
        .map(t => [t.os, t] as [string, Trip])
    ).values());

    const canceled = weekTrips.filter(t => t.status === 'Viagem cancelada').length;
    const completed = uniqueActive.filter(t => t.status?.toLowerCase().includes('concluída')).length;
    
    const typeCounts: { [key: string]: number } = {};
    uniqueActive.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const delays = uniqueActive.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      const scheduled = new Date(t.dateTime).getTime();
      if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      return new Date().getTime() > (scheduled + 600000);
    }).length;

    return { total: uniqueActive.length, typeCounts, canceled, delays, completed };
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
