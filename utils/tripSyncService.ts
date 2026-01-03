
import { Trip, Driver, Customer, Port, TripStatus } from '../types';
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
  mapOCtoTrip: (formData: any, driver: Driver, customer: Customer, category: string, destination?: Port): Partial<Trip> => {
    const now = new Date().toISOString();
    
    return {
      os: formData.os,
      booking: formData.booking,
      ship: formData.ship,
      dateTime: formData.horarioAgendado || now,
      isLate: false,
      type: (formData.tipoOperacao || 'EXPORTAÇÃO').toUpperCase() as any,
      category: category,
      container: formData.container,
      tara: formData.tara,
      seal: formData.seal,
      // REMOVIDO: cva: formData.autColeta (Soli. do usuário: cva é manual, autColeta é só no PDF)
      customer: {
        id: customer.id,
        name: customer.name,
        legalName: customer.legalName,
        cnpj: customer.cnpj,
        city: customer.city,
        state: customer.state
      },
      destination: destination ? {
        id: destination.id,
        name: destination.name,
        city: destination.city,
        state: destination.state
      } : undefined,
      driver: {
        id: driver.id,
        name: driver.name,
        plateHorse: driver.plateHorse,
        plateTrailer: driver.plateTrailer,
        status: 'Pronto',
        cpf: driver.cpf
      },
      status: 'Pendente',
      statusHistory: [{ status: 'Pendente', dateTime: now }],
      advancePayment: { status: 'BLOQUEADO' },
      balancePayment: { status: 'AGUARDANDO_DOCS' },
      documents: [],
      ocFormData: formData 
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
