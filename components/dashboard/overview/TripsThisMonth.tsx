
import React, { useMemo } from 'react';
import { Trip } from '../../../types';
import TripsStatsCard from './TripsStatsCard';

interface TripsThisMonthProps {
  trips: Trip[];
}

const TripsThisMonth: React.FC<TripsThisMonthProps> = ({ trips }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthTrips = trips.filter(t => {
      if (!t.dateTime) return false;
      const d = new Date(t.dateTime);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const active = monthTrips.filter(t => t.status !== 'Viagem cancelada');
    const canceled = monthTrips.filter(t => t.status === 'Viagem cancelada').length;
    const completed = monthTrips.filter(t => t.status?.toLowerCase().includes('concluída')).length;

    const typeCounts: { [key: string]: number } = {};
    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const delays = active.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      const scheduled = new Date(t.dateTime).getTime();
      if (arrival) {
        return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      }
      // Considera atraso se o horário já passou e não houve registro de chegada
      return new Date().getTime() > (scheduled + 600000);
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
