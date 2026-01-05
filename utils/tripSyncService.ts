
import { Trip, Driver, Customer, Port, TripStatus } from '../types';
import { db } from './storage';

export const tripSyncService = {
  findExistingTrip: async (os: string): Promise<Trip | null> => {
    const trips = await db.getTrips();
    return trips.find(t => t.os.toUpperCase() === os.toUpperCase()) || null;
  },

  /**
   * Verifica se existem diferenças reais entre a Trip do banco e os dados do formulário
   */
  hasChanges: (existing: Trip, currentForm: any, driverId: string, customerId: string): boolean => {
    // Compara campos críticos
    const diffs = [
      existing.driver.id !== driverId,
      existing.customer.id !== customerId,
      (existing.container || '').toUpperCase() !== (currentForm.container || '').toUpperCase(),
      (existing.booking || '').toUpperCase() !== (currentForm.booking || '').toUpperCase(),
      (existing.ship || '').toUpperCase() !== (currentForm.ship || '').toUpperCase(),
      (existing.containerType || '').toUpperCase() !== (currentForm.tipo || '').toUpperCase(),
      (existing.seal || '').toUpperCase() !== (currentForm.seal || '').toUpperCase()
    ];
    return diffs.some(d => d === true);
  },

  mapOCtoTrip: (formData: any, driver: Driver, customer: Customer, category: string, destination?: Port): Partial<Trip> => {
    const now = new Date().toISOString();
    
    return {
      os: formData.os,
      booking: formData.booking,
      ship: formData.ship,
      dateTime: formData.horarioAgendado || now,
      isLate: false,
      type: (formData.tipoOperacao || 'EXPORTAÇÃO').toUpperCase() as any,
      containerType: formData.tipo || '40HC',
      category: category,
      container: formData.container,
      tara: formData.tara,
      seal: formData.seal,
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

  sync: async (tripData: Partial<Trip>, existingId?: string) => {
    const finalTrip = {
      ...tripData,
      id: existingId || `trip-sync-${Date.now()}`
    } as Trip;
    
    await db.saveTrip(finalTrip);
    return finalTrip;
  }
};
