
import { Trip } from '../types';

export interface StatGroup {
  total: number;
  completed: number;
  delayed: number;
  canceled: number;
  opTypes: Record<string, number>;
}

// Added EntitySummary interface
export interface EntitySummary extends StatGroup {
  id: string;
  name: string;
  subLabel: string;
  subEntities: Record<string, {
    name: string;
    total: number;
    completed: number;
    delayed: number;
    canceled: number;
    opTypes: Set<string>;
  }>;
}

// Added TerminalSummary interface
export interface TerminalSummary extends StatGroup {
  name: string;
  location: string;
}

// Added DashboardStats interface
export interface DashboardStats {
  total: number;
  completed: number;
  delayed: number;
  canceled: number;
  categoryCounts: Record<string, number>;
  operationTypes: Record<string, StatGroup>;
  entities: EntitySummary[];
  terminalDistribution: Record<string, TerminalSummary>;
}

export interface CrossReferenceResult extends StatGroup {
  id: string;
  name: string;
  subLabel: string;
  relatedEntities: (StatGroup & { id: string; name: string; subLabel: string })[];
}

export const statsCalculator = {
  isDelayed: (trip: Trip): boolean => {
    if (trip.status === 'Viagem cancelada' || trip.status === 'Viagem concluída') return false;
    const scheduled = new Date(trip.dateTime).getTime();
    const now = new Date().getTime();
    return now > (scheduled + 900000); // 15 min tolerância
  },

  getPeriodDates: (period: string) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case 'YESTERDAY':
        start.setDate(now.getDate() - 1);
        end.setDate(now.getDate() - 1);
        break;
      case 'TODAY':
        break;
      case 'TOMORROW':
        start.setDate(now.getDate() + 1);
        end.setDate(now.getDate() + 1);
        break;
      case 'WEEK':
        start.setDate(now.getDate() - now.getDay() + 1);
        end.setDate(start.getDate() + 6);
        break;
      case 'MONTH':
        start.setDate(1);
        end.setMonth(now.getMonth() + 1, 0);
        break;
      case 'YEAR':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  },

  calculateCrossReference: (trips: Trip[], type: 'client' | 'driver'): CrossReferenceResult[] => {
    const map = new Map<string, any>();

    const getBaseStat = () => ({ total: 0, completed: 0, delayed: 0, canceled: 0, opTypes: {} });

    trips.forEach(t => {
      const mainId = type === 'client' ? t.customer.id : t.driver.id;
      const mainName = type === 'client' ? t.customer.name : t.driver.name;
      const mainSub = type === 'client' ? t.customer.city : t.driver.plateHorse;

      const subId = type === 'client' ? t.driver.id : t.customer.id;
      const subName = type === 'client' ? t.driver.name : t.customer.name;
      const subSub = type === 'client' ? t.driver.plateHorse : t.customer.city;

      if (!map.has(mainId)) {
        map.set(mainId, { id: mainId, name: mainName, subLabel: mainSub, ...getBaseStat(), relatedMap: new Map() });
      }

      const main = map.get(mainId);
      const update = (obj: any) => {
        obj.total++;
        if (t.status === 'Viagem concluída') obj.completed++;
        if (t.status === 'Viagem cancelada') obj.canceled++;
        if (statsCalculator.isDelayed(t)) obj.delayed++;
        const op = (t.type || 'OUTROS').toUpperCase();
        obj.opTypes[op] = (obj.opTypes[op] || 0) + 1;
      };

      update(main);

      if (!main.relatedMap.has(subId)) {
        main.relatedMap.set(subId, { id: subId, name: subName, subLabel: subSub, ...getBaseStat() });
      }
      update(main.relatedMap.get(subId));
    });

    return Array.from(map.values()).map(m => ({
      ...m,
      relatedEntities: Array.from(m.relatedMap.values())
    })).sort((a, b) => b.total - a.total);
  },

  // Added missing calculateFullDashboardStats implementation
  calculateFullDashboardStats: (trips: Trip[], mainType: 'client' | 'driver'): DashboardStats => {
    const result: DashboardStats = {
      total: trips.length,
      completed: 0,
      delayed: 0,
      canceled: 0,
      categoryCounts: {},
      operationTypes: {},
      entities: [],
      terminalDistribution: {}
    };

    const entityMap = new Map<string, EntitySummary>();

    trips.forEach(t => {
      // Global totals
      if (t.status === 'Viagem concluída') result.completed++;
      if (t.status === 'Viagem cancelada') result.canceled++;
      if (statsCalculator.isDelayed(t)) result.delayed++;

      // Category aggregation
      const cat = t.category || 'GERAL';
      result.categoryCounts[cat] = (result.categoryCounts[cat] || 0) + 1;

      // Modality aggregation
      const mod = (t.type || 'OUTROS').toUpperCase();
      if (!result.operationTypes[mod]) {
        result.operationTypes[mod] = { total: 0, completed: 0, delayed: 0, canceled: 0, opTypes: {} };
      }
      const mStat = result.operationTypes[mod];
      mStat.total++;
      if (t.status === 'Viagem concluída') mStat.completed++;
      if (t.status === 'Viagem cancelada') mStat.canceled++;
      if (statsCalculator.isDelayed(t)) mStat.delayed++;

      // Entity (Client/Driver) aggregation
      const eId = mainType === 'client' ? t.customer.id : t.driver.id;
      const eName = mainType === 'client' ? t.customer.name : t.driver.name;
      const eSub = mainType === 'client' ? t.customer.city : t.driver.plateHorse;
      
      const sName = mainType === 'client' ? t.driver.name : t.customer.name;

      if (!entityMap.has(eId)) {
        entityMap.set(eId, {
          id: eId, name: eName, subLabel: eSub,
          total: 0, completed: 0, delayed: 0, canceled: 0, opTypes: {},
          subEntities: {}
        });
      }
      const entity = entityMap.get(eId)!;
      entity.total++;
      if (t.status === 'Viagem concluída') entity.completed++;
      if (t.status === 'Viagem cancelada') entity.canceled++;
      if (statsCalculator.isDelayed(t)) entity.delayed++;
      entity.opTypes[mod] = (entity.opTypes[mod] || 0) + 1;

      // Sub-entity (relationship) aggregation
      if (!entity.subEntities[sName]) {
        entity.subEntities[sName] = { 
          name: sName, total: 0, completed: 0, delayed: 0, canceled: 0, opTypes: new Set<string>()
        };
      }
      const sub = entity.subEntities[sName];
      sub.total++;
      if (t.status === 'Viagem concluída') sub.completed++;
      if (t.status === 'Viagem cancelada') sub.canceled++;
      if (statsCalculator.isDelayed(t)) sub.delayed++;
      sub.opTypes.add(mod);

      // Terminal distribution
      const termName = t.scheduling?.location || t.destination?.name || 'A DEFINIR';
      const termLoc = t.destination?.city || 'DESCONHECIDO';
      if (!result.terminalDistribution[termName]) {
        result.terminalDistribution[termName] = { 
          name: termName, location: termLoc, total: 0, completed: 0, delayed: 0, canceled: 0, opTypes: {} 
        };
      }
      const term = result.terminalDistribution[termName];
      term.total++;
      if (t.status === 'Viagem concluída') term.completed++;
      if (t.status === 'Viagem cancelada') term.canceled++;
      if (statsCalculator.isDelayed(t)) term.delayed++;
    });

    result.entities = Array.from(entityMap.values()).sort((a, b) => b.total - a.total);

    return result;
  }
};
