import { Trip, Driver, Customer, Port, TripScheduling, User, TripStatus } from '../types';
import { db } from './storage';

export const tripSyncService = {
  findExistingTrip: async (os: string): Promise<Trip | null> => {
    const trips = await db.getTrips();
    return trips.find(t => t.os.toUpperCase() === os.toUpperCase()) || null;
  },

  hasChanges: (existing: Trip, currentForm: any, driverId: string, customerId: string): boolean => {
    const diffs = [
      existing.driver?.id !== driverId,
      existing.customer?.id !== customerId,
      (existing.container || '').toUpperCase() !== (currentForm.container || '').toUpperCase(),
      (existing.dateTime || '').slice(0,16) !== (currentForm.dateTime || '').slice(0,16),
      (existing.scheduling?.dateTime || '').slice(0,16) !== (currentForm.schedulingDate || '').slice(0,16),
      existing.category !== currentForm.category
    ];
    return diffs.some(d => d === true);
  },

  mapOCtoTrip: (formData: any, driver: Driver, customer: Customer, category: string, destination?: Port): Partial<Trip> => {
    const now = new Date().toISOString();
    
    const tripStartTime = formData.dateTime ? new Date(formData.dateTime).toISOString() : now;
    const terminalTime = formData.schedulingDate ? new Date(formData.schedulingDate).toISOString() : null;
    
    const scheduling: TripScheduling | undefined = (destination || terminalTime) ? {
       dateTime: terminalTime || tripStartTime,
       location: destination?.name || formData.manualLocal || '',
       locationId: destination?.id || '',
       obs: formData.obs || ''
    } : undefined;

    return {
      os: formData.os,
      booking: formData.booking,
      ship: formData.ship,
      dateTime: tripStartTime,
      isLate: false,
      type: (formData.type || 'EXPORTAÇÃO').toUpperCase() as any,
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
        legalName: destination.legalName,
        cnpj: destination.cnpj,
        city: destination.city,
        state: destination.state
      } : undefined,
      driver: {
        id: driver.id,
        name: driver.name,
        plateHorse: driver.plateHorse,
        plateTrailer: driver.plateTrailer,
        status: 'Pronto',
        cpf: driver.cpf,
        phone: driver.phone
      },
      status: 'Pendente',
      // REGRA: Status Pendente reflete o horário de criação da OC
      statusHistory: [{ status: 'Pendente' as TripStatus, dateTime: now, createdAt: now }],
      advancePayment: { status: 'BLOQUEADO' },
      balancePayment: { status: 'AGUARDANDO_DOCS' },
      ocFormData: {
        ...formData,
        dateTime: tripStartTime,
        schedulingDate: terminalTime,
        category: category
      },
      scheduling: scheduling
    };
  },

  sync: async (tripData: Partial<Trip>, existingId?: string, actingUser?: User) => {
    const finalTrip = {
      ...tripData,
      id: existingId || `trip-sync-${Date.now()}`
    } as Trip;
    return await db.saveTrip(finalTrip, actingUser);
  }
};