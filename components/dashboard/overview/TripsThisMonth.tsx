
import React, { useMemo } from 'react';
import { Trip } from '../../../types';
import TripsStatsCard from './TripsStatsCard';

interface TripsThisMonthProps {
  trips: Trip[];
}

const TripsThisMonth: React.FC<TripsThisMonthProps> = ({ trips }) => {
  const stats = useMemo(() => {
    const now = new Date();
    // Normalização por string de mês/ano para evitar erros de fuso horário à meia-noite
    const currentMonthYear = now.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
    
    const monthTrips = trips.filter(t => {
      if (!t.dateTime) return false;
      const tripMonthYear = new Date(t.dateTime).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
      return tripMonthYear === currentMonthYear;
    });

    // Unicidade por OS é vital para o Consolidado não explodir em re-agendamentos
    // Explicitly typed the Map input and variable to avoid 'unknown' inference
    const uniqueActive: Trip[] = Array.from(new Map(
      monthTrips
        .filter(t => t.status !== 'Viagem cancelada')
        .map(t => [t.os, t] as [string, Trip])
    ).values());

    const canceled = monthTrips.filter(t => t.status === 'Viagem cancelada').length;
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
