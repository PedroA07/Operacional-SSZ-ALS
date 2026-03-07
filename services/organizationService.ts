import { Trip, Port, PreStacking, TripStatus } from '../types';
import { db } from '../utils/storage';

export const organizationService = {
  /**
   * Busca todas as operações a partir de 06/03/2026.
   */
  fetchOperations: async (): Promise<Trip[]> => {
    const allTrips = await db.getTrips();
    // Normaliza a data de início para 06/03/2026 (YYYY-MM-DD)
    const startDateStr = '2026-03-06';
    
    return allTrips.filter(trip => {
      if (!trip.dateTime) return false;
      
      // Tenta extrair a data no formato YYYY-MM-DD
      const tripDateStr = trip.dateTime.includes('T') 
        ? trip.dateTime.split('T')[0] 
        : trip.dateTime;
        
      // Se a data estiver no formato DD/MM/YYYY, converte para YYYY-MM-DD para comparação
      let normalizedTripDate = tripDateStr;
      if (tripDateStr.includes('/')) {
        const parts = tripDateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          normalizedTripDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      const isAfterStartDate = normalizedTripDate >= startDateStr;
      const isNotFinished = trip.status !== 'Viagem concluída' && 
                           trip.status !== 'Viagem cancelada' && 
                           trip.status !== 'Agendamento realizado';
                           
      return isAfterStartDate && isNotFinished;
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
