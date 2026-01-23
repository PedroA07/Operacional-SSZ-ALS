
import { Trip, TripStatus } from '../types';

export interface StatGroup {
  total: number;
  completed: number;
  delayed: number;
  canceled: number;
  opTypes: Set<string>;
}

export interface EntitySummary extends StatGroup {
  name: string;
  document: string;
  subLabel: string;
  efficiency: number;
  subEntities: Record<string, StatGroup & { name: string }>;
}

// Added to fix missing member error in KpiVisualizer
export interface TerminalSummary {
  total: number;
  location: string;
}

export interface DashboardStats {
  entities: EntitySummary[];
  categories: Record<string, StatGroup>;
  // Added to fix missing member error in KpiVisualizer
  categoryCounts: Record<string, number>;
  // Added to fix missing member error in KpiVisualizer
  terminalDistribution: Record<string, TerminalSummary>;
  operationTypes: Record<string, StatGroup>;
  metrics: {
    efficiencyRate: number;
    activeResources: number;
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
    const typeMap: Record<string, StatGroup> = {};
    // Track terminal distribution for analytics
    const terminalMap: Record<string, TerminalSummary> = {};
    
    const initStat = () => ({ 
      total: 0, 
      completed: 0, 
      delayed: 0, 
      canceled: 0, 
      opTypes: new Set<string>() 
    });

    trips.forEach(t => {
      const mainKey = primaryType === 'client' ? t.customer.name : t.driver.name;
      const subKey = primaryType === 'client' ? t.driver.name : t.customer.name;
      
      const doc = primaryType === 'client' ? (t.customer.cnpj || '---') : (t.driver.cpf || '---');
      const subLabel = primaryType === 'client' ? t.customer.city : t.driver.plateHorse;
      
      const catName = (t.category || 'GERAL').toUpperCase();
      const opType = (t.type || 'OUTROS').toUpperCase();

      const updateStat = (stat: any, trip: Trip) => {
        stat.total++;
        if (trip.status === 'Viagem concluída') stat.completed++;
        if (trip.status === 'Viagem cancelada') stat.canceled++;
        if (statsCalculator.isDelayed(trip)) stat.delayed++;
        stat.opTypes.add((trip.type || 'OUTROS').toUpperCase());
      };

      // Inicializa entidade principal
      if (!entityMap[mainKey]) {
        entityMap[mainKey] = { 
          name: mainKey, 
          document: doc, 
          subLabel: subLabel, 
          ...initStat(), 
          efficiency: 0, 
          subEntities: {} 
        };
      }
      updateStat(entityMap[mainKey], t);

      // Inicializa e atualiza sub-entidade (o cruzamento)
      if (!entityMap[mainKey].subEntities[subKey]) {
        entityMap[mainKey].subEntities[subKey] = { name: subKey, ...initStat() };
      }
      updateStat(entityMap[mainKey].subEntities[subKey], t);

      // Agrupamentos globais
      if (!categoryMap[catName]) categoryMap[catName] = initStat();
      updateStat(categoryMap[catName], t);

      if (!typeMap[opType]) typeMap[opType] = initStat();
      updateStat(typeMap[opType], t);

      // Added: Track Terminal Distribution
      const termName = (t.scheduling?.location || t.destination?.name || 'A DEFINIR').toUpperCase();
      if (!terminalMap[termName]) {
        terminalMap[termName] = { total: 0, location: t.destination?.city || '---' };
      }
      terminalMap[termName].total++;
    });

    // Added: Populate categoryCounts for components expecting simple Record<string, number>
    const categoryCounts: Record<string, number> = {};
    Object.entries(categoryMap).forEach(([k, v]) => {
      categoryCounts[k] = v.total;
    });

    return {
      entities: Object.values(entityMap).sort((a, b) => b.total - a.total),
      categories: categoryMap,
      categoryCounts,
      terminalDistribution: terminalMap,
      operationTypes: typeMap,
      metrics: {
        efficiencyRate: trips.length > 0 ? Math.round((trips.filter(t => t.status === 'Viagem concluída').length / trips.length) * 100) : 0,
        activeResources: new Set(trips.map(t => t.driver.id)).size
      }
    };
  }
};
