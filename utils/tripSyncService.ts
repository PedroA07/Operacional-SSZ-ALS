
import { Trip, Driver, Customer } from '../types';
import { db } from './storage';

export const tripSyncService = {
  /**
   * Verifica se já existe uma viagem com esta OS
   */
  findExistingTrip: async (os: string): Promise<Trip | null> => {
    const trips = await db.getTrips();
    return trips.find(t => t.os.toUpperCase() === os.toUpperCase()) || null;
  },

  /**
   * Converte os dados da Ordem de Coleta para o formato de Viagem Operacional
   */
  mapOCtoTrip: (formData: any, driver: Driver, customer: Customer, category: string): Partial<Trip> => {
    return {
      os: formData.os,
      booking: formData.booking,
      ship: formData.ship,
      dateTime: formData.horarioAgendado || new Date().toISOString(),
      isLate: false,
      type: 'EXPORTAÇÃO',
      category: category,
      container: formData.container,
      tara: formData.tara,
      seal: formData.seal,
      customer: {
        id: customer.id,
        name: customer.name,
        city: customer.city,
        state: customer.state
      },
      driver: {
        id: driver.id,
        name: driver.name,
        plateHorse: driver.plateHorse,
        plateTrailer: driver.plateTrailer,
        status: 'Pronto',
        cpf: driver.cpf
      },
      status: 'Pendente',
      advancePayment: { status: 'BLOQUEADO' },
      balancePayment: { status: 'AGUARDANDO_DOCS' },
      documents: [],
      ocFormData: formData // Salva o estado do formulário para reedição futura
    };
  },

  /**
   * Salva ou Atualiza a viagem no banco
   */
  sync: async (tripData: Partial<Trip>, existingId?: string) => {
    const finalTrip = {
      ...tripData,
      id: existingId || `trip-sync-${Date.now()}`
    } as Trip;
    
    await db.saveTrip(finalTrip);
    return finalTrip;
  }
};
