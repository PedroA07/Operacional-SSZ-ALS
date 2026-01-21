
import React, { useMemo } from 'react';
import { Trip } from '../../../types';
import TripsStatsCard from './TripsStatsCard';

interface TripsThisMonthProps {
  trips: Trip[];
}

const TripsThisMonth: React.FC<TripsThisMonthProps> = ({ trips }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonth}`;
    
    const monthTrips = trips.filter(t => {
      if (!t.dateTime) return false;
      // Compara os primeiros 7 caracteres (YYYY-MM)
      return t.dateTime.substring(0, 7) === monthPrefix;
    });

    const activeTrips = monthTrips.filter(t => t.status !== 'Viagem cancelada');
    const canceled = monthTrips.filter(t => t.status === 'Viagem cancelada').length;
    const completed = activeTrips.filter(t => t.status === 'Viagem concluída').length;

    const typeCounts: { [key: string]: number } = {};
    activeTrips.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const delays = activeTrips.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      const scheduled = new Date(t.dateTime).getTime();
      if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      
      // Viagem pendente cujo horário já passou
      return new Date().getTime() > (scheduled + 600000) && t.status !== 'Viagem concluída';
    }).length;

    return { total: activeTrips.length, typeCounts, canceled, delays, completed };
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
