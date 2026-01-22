
import { Trip, TripStatus } from '../types';

export interface StatGroup {
  total: number;
  completed: number;
  delayed: number;
  canceled: number;
}

export interface EntitySummary extends StatGroup {
  name: string;
  document: string; // CNPJ ou CPF
  subLabel: string;  // Localidade ou Placa
  efficiency: number;
  subEntities: Record<string, StatGroup & { name: string }>;
}

export interface TerminalSummary {
  total: number;
  location: string;
}

export interface DashboardStats {
  entities: EntitySummary[];
  categories: Record<string, StatGroup>;
  categoryCounts: Record<string, number>;
  operationTypes: Record<string, StatGroup>;
  statusCounts: Record<string, number>;
  cityDistribution: Record<string, number>;
  clientCityDistribution: Record<string, number>;
  terminalDistribution: Record<string, TerminalSummary>; // Atualizado para objeto complexo
  metrics: {
    avgDelayMinutes: number;
    efficiencyRate: number;
    activeResources: number;
    avgLeadTimeHrs: number;
    productivityPerDriver: number;
    productivityTarget: number;
  };
}

export const statsCalculator = {
  isDelayed: (trip: Trip): boolean => {
    if (trip.status === 'Viagem cancelada' || trip.status === 'Viagem concluída') return false;
    const scheduled = new Date(trip.dateTime).getTime();
    const now = new Date().getTime();
    return now > (scheduled + 900000); 
  },

  calculateFullDashboardStats: (trips: Trip[], primaryType: 'client' | 'driver'): DashboardStats => {
    const entityMap: Record<string, EntitySummary> = {};
    const categoryMap: Record<string, StatGroup> = {};
    const categoryCounts: Record<string, number> = {};
    const typeMap: Record<string, StatGroup> = {};
    const statusCounts: Record<string, number> = {};
    const cityDistribution: Record<string, number> = {};
    const clientCityDistribution: Record<string, number> = {};
    const terminalDistribution: Record<string, TerminalSummary> = {};
    
    const initStat = () => ({ total: 0, completed: 0, delayed: 0, canceled: 0 });

    trips.forEach(t => {
      const mainKey = primaryType === 'client' ? t.customer.name : t.driver.name;
      const doc = primaryType === 'client' ? (t.customer.cnpj || '---') : (t.driver.cpf || '---');
      const sub = primaryType === 'client' ? t.customer.city : t.driver.plateHorse;
      
      const catName = (t.category || 'GERAL').toUpperCase();
      const opType = (t.type || 'OUTROS').toUpperCase();
      
      const destCity = (t.destination?.city || 'N/A').toUpperCase();
      const clientCity = (t.customer?.city || 'N/A').toUpperCase();
      const terminalName = (t.destination?.name || t.scheduling?.location || 'NÃO INFORMADO').toUpperCase();
      const terminalLoc = (t.destination?.city ? `${t.destination.city}/${t.destination.state || 'SP'}` : 'LOCAL INDEFINIDO').toUpperCase();

      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
      cityDistribution[destCity] = (cityDistribution[destCity] || 0) + 1;
      clientCityDistribution[clientCity] = (clientCityDistribution[clientCity] || 0) + 1;
      
      if (!terminalDistribution[terminalName]) {
        terminalDistribution[terminalName] = { total: 0, location: terminalLoc };
      }
      terminalDistribution[terminalName].total++;

      const updateStat = (stat: any) => {
        stat.total++;
        if (t.status === 'Viagem concluída') stat.completed++;
        if (t.status === 'Viagem cancelada') stat.canceled++;
      };

      if (!categoryMap[catName]) categoryMap[catName] = initStat();
      updateStat(categoryMap[catName]);

      if (!typeMap[opType]) typeMap[opType] = initStat();
      updateStat(typeMap[opType]);

      if (!entityMap[mainKey]) {
        entityMap[mainKey] = { 
          name: mainKey, 
          document: doc, 
          subLabel: sub, 
          ...initStat(), 
          efficiency: 0, 
          subEntities: {} 
        };
      }
      updateStat(entityMap[mainKey]);
    });

    const activeDrivers = new Set(trips.map(t => t.driver.id)).size;

    return {
      entities: Object.values(entityMap).sort((a, b) => b.total - a.total),
      categories: categoryMap,
      categoryCounts,
      operationTypes: typeMap,
      statusCounts,
      cityDistribution,
      clientCityDistribution,
      terminalDistribution,
      metrics: {
        avgDelayMinutes: 15,
        efficiencyRate: trips.length > 0 ? Math.round((trips.filter(t => t.status === 'Viagem concluída').length / trips.length) * 100) : 0,
        activeResources: trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada').length,
        avgLeadTimeHrs: 4,
        productivityPerDriver: activeDrivers > 0 ? Number((trips.length / activeDrivers).toFixed(1)) : 0,
        productivityTarget: 20
      }
    };
  }
};
