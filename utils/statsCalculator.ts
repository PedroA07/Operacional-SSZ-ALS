
import { Trip, TripStatus } from '../types';

export interface EntitySummary {
  name: string;
  total: number;
  completed: number;
  delayed: number;
  canceled: number;
  subEntities: Record<string, EntitySummary>;
}

export const statsCalculator = {
  isDelayed: (trip: Trip): boolean => {
    if (trip.status === 'Viagem cancelada') return false;
    const scheduled = new Date(trip.dateTime).getTime();
    const arrival = trip.statusHistory?.find(h => h.status === 'Chegou no cliente');
    if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
    // Se ainda não chegou e já passou 10 min do horário
    return new Date().getTime() > (scheduled + 600000) && trip.status !== 'Viagem concluída';
  },

  calculateStats: (trips: Trip[], type: 'client' | 'driver'): EntitySummary[] => {
    const map: Record<string, EntitySummary> = {};

    trips.forEach(t => {
      const mainKey = type === 'client' ? t.customer.name : t.driver.name;
      const subKey = type === 'client' ? t.driver.name : t.customer.name;

      if (!map[mainKey]) {
        map[mainKey] = { name: mainKey, total: 0, completed: 0, delayed: 0, canceled: 0, subEntities: {} };
      }

      const entry = map[mainKey];
      entry.total++;
      if (t.status === 'Viagem concluída') entry.completed++;
      if (t.status === 'Viagem cancelada') entry.canceled++;
      if (statsCalculator.isDelayed(t)) entry.delayed++;

      if (!entry.subEntities[subKey]) {
        entry.subEntities[subKey] = { name: subKey, total: 0, completed: 0, delayed: 0, canceled: 0, subEntities: {} };
      }

      const subEntry = entry.subEntities[subKey];
      subEntry.total++;
      if (t.status === 'Viagem concluída') subEntry.completed++;
      if (t.status === 'Viagem cancelada') subEntry.canceled++;
      if (statsCalculator.isDelayed(t)) subEntry.delayed++;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }
};
