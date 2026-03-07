import { Trip, Port, PreStacking, TripStatus } from '../types';
import { db } from '../utils/storage';

export const organizationService = {
  /**
   * Busca todas as operações a partir de 06/03/2026.
   */
  fetchOperations: async (): Promise<Trip[]> => {
    const allTrips = await db.getTrips();
    const startDate = new Date('2026-03-06T00:00:00');
    
    return allTrips.filter(trip => {
      const tripDate = new Date(trip.dateTime);
      // Filtra apenas viagens a partir de 06/03/2026 e que não estejam canceladas ou concluídas (opcional, mas faz sentido para organização)
      // O usuário pediu para remover do painel após "Viagens Finalizadas", então filtramos por status também.
      return tripDate >= startDate && trip.status !== 'Viagem concluída' && trip.status !== 'Viagem cancelada' && trip.status !== 'Agendamento realizado';
    });
  },

  /**
   * Busca locais de atendimento (Portos e Pre-Stackings).
   */
  fetchLocations: async (): Promise<{ id: string; name: string }[]> => {
    const [ports, preStackings] = await Promise.all([
      db.getPorts(),
      db.getPreStacking()
    ]);

    return [
      ...ports.map(p => ({ id: p.id, name: p.name })),
      ...preStackings.map(ps => ({ id: ps.id, name: ps.name }))
    ].sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Finaliza as viagens agendadas.
   */
  finalizeScheduledTrips: async (trips: Trip[]): Promise<boolean> => {
    const scheduledTrips = trips.filter(t => t.isScheduled);
    
    if (scheduledTrips.length === 0) return true;

    const updatedTrips = scheduledTrips.map(t => ({
      ...t,
      status: 'Agendamento realizado' as TripStatus,
      statusHistory: [
        ...(t.statusHistory || []),
        {
          status: 'Agendamento realizado' as TripStatus,
          dateTime: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      ]
    }));

    // Salva todas as viagens atualizadas
    const results = await Promise.all(updatedTrips.map(t => db.saveTrip(t)));
    return results.every(r => r === true);
  }
};
