
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
      const d = new Date(t.dateTime);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const active = monthTrips.filter(t => t.status !== 'Viagem cancelada');
    const canceled = monthTrips.filter(t => t.status === 'Viagem cancelada').length;
    const completed = monthTrips.filter(t => t.status === 'Viagem concluída').length;

    const typeCounts: { [key: string]: number } = {};
    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const delays = active.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      if (!arrival) return false;
      // Tolerância de 1 minuto
      return new Date(arrival.dateTime).getTime() > (new Date(t.dateTime).getTime() + 60000);
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
