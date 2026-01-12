
// Added User to imports to resolve line 87 type error
import { Trip, Driver, Customer, Port, TripScheduling, User } from '../types';
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
    const diffs = [
      existing.driver?.id !== driverId,
      existing.customer?.id !== customerId,
      (existing.container || '').toUpperCase() !== (currentForm.container || '').toUpperCase(),
      (existing.booking || '').toUpperCase() !== (currentForm.booking || '').toUpperCase(),
      (existing.ship || '').toUpperCase() !== (currentForm.ship || '').toUpperCase(),
      (existing.containerType || '').toUpperCase() !== (currentForm.tipo || '').toUpperCase(),
      (existing.seal || '').toUpperCase() !== (currentForm.seal || '').toUpperCase(),
      (existing.destination?.id || '') !== (currentForm.destinatarioId || ''),
      (existing.ocFormData?.autColeta || '') !== (currentForm.autColeta || ''),
      (existing.ocFormData?.embarcador || '') !== (currentForm.embarcador || ''),
      (existing.dateTime || '').slice(0,16) !== (currentForm.horarioAgendado || '').slice(0,16)
    ];
    return diffs.some(d => d === true);
  },

  mapOCtoTrip: (formData: any, driver: Driver, customer: Customer, category: string, destination?: Port): Partial<Trip> => {
    const now = new Date().toISOString();
    const scheduledTime = formData.horarioAgendado ? new Date(formData.horarioAgendado).toISOString() : now;
    
    // Se temos um destino (terminado pela Minuta ou Form), criamos o objeto de agendamento automático
    const scheduling: TripScheduling | undefined = destination ? {
       dateTime: scheduledTime,
       location: destination.name,
       locationId: destination.id
    } : undefined;

    return {
      os: formData.os,
      booking: formData.booking,
      ship: formData.ship,
      dateTime: scheduledTime,
      isLate: false,
      type: (formData.tipoOperacao || 'EXPORTAÇÃO').toUpperCase() as any,
      containerType: formData.tipo || '40HC',
      category: category || 'Geral',
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
      statusHistory: [{ status: 'Pendente', dateTime: now, createdAt: now }],
      advancePayment: { status: 'BLOQUEADO' },
      balancePayment: { status: 'AGUARDANDO_DOCS' },
      documents: [],
      ocFormData: formData,
      scheduling: scheduling
    };
  },

  sync: async (tripData: Partial<Trip>, existingId?: string, actingUser?: User) => {
    const finalTrip = {
      ...tripData,
      id: existingId || `trip-sync-${Date.now()}`
    } as Trip;
    
    const success = await db.saveTrip(finalTrip, actingUser);
    if (!success) throw new Error("Erro ao salvar viagem no repositório");
    return finalTrip;
  }
};
