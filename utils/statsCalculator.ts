
import { Trip, TripStatus } from '../types';

export interface StatGroup {
  total: number;
  completed: number;
  delayed: number;
  canceled: number;
}

export interface EntitySummary extends StatGroup {
  name: string;
  subEntities: Record<string, StatGroup & { name: string }>;
}

export interface DashboardStats {
  entities: EntitySummary[];
  categories: Record<string, StatGroup>;
  operationTypes: Record<string, StatGroup>;
  statusCounts: Record<string, number>;
  hourlyDistribution: Record<number, number>;
  cityDistribution: Record<string, number>;
  metrics: {
    avgDelayMinutes: number;
    efficiencyRate: number;
    activeResources: number;
  };
}

export const statsCalculator = {
  isDelayed: (trip: Trip): boolean => {
    if (trip.status === 'Viagem cancelada') return false;
    const scheduled = new Date(trip.dateTime).getTime();
    const arrival = trip.statusHistory?.find(h => h.status === 'Chegou no cliente');
    if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
    return new Date().getTime() > (scheduled + 600000) && trip.status !== 'Viagem concluída';
  },

  calculateFullDashboardStats: (trips: Trip[], primaryType: 'client' | 'driver'): DashboardStats => {
    const entityMap: Record<string, EntitySummary> = {};
    const categoryMap: Record<string, StatGroup> = {};
    const typeMap: Record<string, StatGroup> = {};
    const statusCounts: Record<string, number> = {};
    const hourlyDistribution: Record<number, number> = {};
    const cityDistribution: Record<string, number> = {};
    
    let totalDelayMin = 0;
    let delayedTripsCount = 0;

    const initStat = () => ({ total: 0, completed: 0, delayed: 0, canceled: 0 });

    trips.forEach(t => {
      const mainKey = primaryType === 'client' ? t.customer.name : t.driver.name;
      const subKey = primaryType === 'client' ? t.driver.name : t.customer.name;
      const category = t.category || 'GERAL';
      const opType = t.type || 'OUTROS';
      const city = t.customer.city?.toUpperCase() || 'N/A';

      // Status
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;

      // Cidades
      cityDistribution[city] = (cityDistribution[city] || 0) + 1;

      // Horários
      const hour = new Date(t.dateTime).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

      const updateStat = (stat: StatGroup) => {
        stat.total++;
        if (t.status === 'Viagem concluída') stat.completed++;
        if (t.status === 'Viagem cancelada') stat.canceled++;
        if (statsCalculator.isDelayed(t)) {
          stat.delayed++;
          const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
          if (arrival) {
             const diff = Math.round((new Date(arrival.dateTime).getTime() - new Date(t.dateTime).getTime()) / 60000);
             if (diff > 0) {
               totalDelayMin += diff;
               delayedTripsCount++;
             }
          }
        }
      };

      if (!categoryMap[category]) categoryMap[category] = initStat();
      updateStat(categoryMap[category]);

      if (!typeMap[opType]) typeMap[opType] = initStat();
      updateStat(typeMap[opType]);

      if (!entityMap[mainKey]) {
        entityMap[mainKey] = { name: mainKey, ...initStat(), subEntities: {} };
      }
      updateStat(entityMap[mainKey]);

      if (!entityMap[mainKey].subEntities[subKey]) {
        entityMap[mainKey].subEntities[subKey] = { name: subKey, ...initStat() };
      }
      updateStat(entityMap[mainKey].subEntities[subKey]);
    });

    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada').length;

    return {
      entities: Object.values(entityMap).sort((a, b) => b.total - a.total),
      categories: categoryMap,
      operationTypes: typeMap,
      statusCounts,
      hourlyDistribution,
      cityDistribution,
      metrics: {
        avgDelayMinutes: delayedTripsCount > 0 ? Math.round(totalDelayMin / delayedTripsCount) : 0,
        efficiencyRate: trips.length > 0 ? Math.round((trips.filter(t => t.status === 'Viagem concluída').length / trips.length) * 100) : 0,
        activeResources: activeTrips
      }
    };
  }
};
