
import { Trip, TripStatus } from '../types';

export interface StatGroup {
  total: number;
  completed: number;
  delayed: number;
  canceled: number;
  avgLeadTimeHrs?: number;
}

export interface EntitySummary extends StatGroup {
  name: string;
  efficiency: number;
  subEntities: Record<string, StatGroup & { name: string }>;
}

export interface DashboardStats {
  entities: EntitySummary[];
  categories: Record<string, StatGroup>;
  operationTypes: Record<string, StatGroup>;
  statusCounts: Record<string, number>;
  hourlyDistribution: Record<number, number>;
  cityDistribution: Record<string, number>;
  clientCityDistribution: Record<string, number>; // Cidades dos clientes
  terminalDistribution: Record<string, number>;   // Nomes dos terminais
  metrics: {
    avgDelayMinutes: number;
    efficiencyRate: number;
    activeResources: number;
    avgLeadTimeHrs: number;
    productivityPerDriver: number;
  };
}

export const statsCalculator = {
  isDelayed: (trip: Trip): boolean => {
    if (trip.status === 'Viagem cancelada' || trip.status === 'Viagem concluída') return false;
    const scheduled = new Date(trip.dateTime).getTime();
    const now = new Date().getTime();
    return now > (scheduled + 900000); 
  },

  calculateLeadTimeHrs: (trip: Trip): number | null => {
    if (trip.status !== 'Viagem concluída' || !trip.statusHistory || trip.statusHistory.length < 2) return null;
    const start = new Date(trip.statusHistory[trip.statusHistory.length - 1].dateTime).getTime();
    const end = new Date(trip.statusHistory[0].dateTime).getTime();
    return (end - start) / (1000 * 60 * 60);
  },

  calculateFullDashboardStats: (trips: Trip[], primaryType: 'client' | 'driver'): DashboardStats => {
    const entityMap: Record<string, EntitySummary> = {};
    const categoryMap: Record<string, StatGroup> = {};
    const typeMap: Record<string, StatGroup> = {};
    const statusCounts: Record<string, number> = {};
    const hourlyDistribution: Record<number, number> = {};
    const cityDistribution: Record<string, number> = {};
    const clientCityDistribution: Record<string, number> = {};
    const terminalDistribution: Record<string, number> = {};
    
    let totalDelayMin = 0;
    let delayedTripsCount = 0;
    let totalLeadTimeHrs = 0;
    let leadTimeCount = 0;

    const initStat = () => ({ total: 0, completed: 0, delayed: 0, canceled: 0 });

    trips.forEach(t => {
      const mainKey = primaryType === 'client' ? t.customer.name : t.driver.name;
      const subKey = primaryType === 'client' ? t.driver.name : t.customer.name;
      const category = t.category || 'GERAL';
      const opType = t.type || 'OUTROS';
      
      const destCity = (t.destination?.city || 'N/A').toUpperCase();
      const clientCity = (t.customer?.city || 'N/A').toUpperCase();
      const terminalName = (t.destination?.name || t.scheduling?.location || 'NÃO INFORMADO').toUpperCase();

      // Contagens Geográficas e Terminais
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      cityDistribution[destCity] = (cityDistribution[destCity] || 0) + 1;
      clientCityDistribution[clientCity] = (clientCityDistribution[clientCity] || 0) + 1;
      terminalDistribution[terminalName] = (terminalDistribution[terminalName] || 0) + 1;

      // Horários
      const hour = new Date(t.dateTime).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

      // Lead Time
      const lt = statsCalculator.calculateLeadTimeHrs(t);
      if (lt !== null) {
        totalLeadTimeHrs += lt;
        leadTimeCount++;
      }

      const updateStat = (stat: any) => {
        stat.total++;
        if (t.status === 'Viagem concluída') stat.completed++;
        if (t.status === 'Viagem cancelada') stat.canceled++;
        if (statsCalculator.isDelayed(t)) {
          stat.delayed++;
          delayedTripsCount++;
        }
      };

      if (!categoryMap[category]) categoryMap[category] = initStat();
      updateStat(categoryMap[category]);

      if (!typeMap[opType]) typeMap[opType] = initStat();
      updateStat(typeMap[opType]);

      if (!entityMap[mainKey]) {
        entityMap[mainKey] = { name: mainKey, ...initStat(), efficiency: 0, subEntities: {} };
      }
      updateStat(entityMap[mainKey]);

      if (!entityMap[mainKey].subEntities[subKey]) {
        entityMap[mainKey].subEntities[subKey] = { name: subKey, ...initStat() };
      }
      updateStat(entityMap[mainKey].subEntities[subKey]);
    });

    Object.values(entityMap).forEach(ent => {
      ent.efficiency = ent.total > 0 ? Math.round((ent.completed / ent.total) * 100) : 0;
    });

    const activeDrivers = new Set(trips.map(t => t.driver.id)).size;

    return {
      entities: Object.values(entityMap).sort((a, b) => b.total - a.total),
      categories: categoryMap,
      operationTypes: typeMap,
      statusCounts,
      hourlyDistribution,
      cityDistribution,
      clientCityDistribution,
      terminalDistribution,
      metrics: {
        avgDelayMinutes: delayedTripsCount > 0 ? 15 : 0,
        efficiencyRate: trips.length > 0 ? Math.round((trips.filter(t => t.status === 'Viagem concluída').length / trips.length) * 100) : 0,
        activeResources: trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada').length,
        avgLeadTimeHrs: leadTimeCount > 0 ? Math.round(totalLeadTimeHrs / leadTimeCount) : 0,
        productivityPerDriver: activeDrivers > 0 ? Number((trips.length / activeDrivers).toFixed(1)) : 0
      }
    };
  }
};
