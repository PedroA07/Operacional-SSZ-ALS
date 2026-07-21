import { Trip, Driver, Customer, Port, TripScheduling, User, TripStatus } from '../types';
import { db } from './storage';

export const tripSyncService = {
  findExistingTrip: async (os: string): Promise<Trip | null> => {
    const trips = await db.getTrips();
    return trips.find(t => t.os.toUpperCase() === os.toUpperCase()) || null;
  },

  hasChanges: (existing: Trip, currentForm: any, driverId: string, customerId: string): boolean => {
    // Compara o horário agendado da OC com o dateTime da viagem salva
    const formDateTime = currentForm.horarioAgendado || currentForm.dateTime;
    const existingDateTime = existing.dateTime;

    const diffs = [
      existing.driver?.id !== driverId,
      existing.customer?.id !== customerId,
      (existing.container || '').toUpperCase() !== (currentForm.container || '').toUpperCase(),
      (existingDateTime || '').slice(0,16) !== (formDateTime || '').slice(0,16),
      (existing.scheduling?.dateTime || '').slice(0,16) !== (currentForm.schedulingDate || '').slice(0,16),
      existing.category !== currentForm.category
    ];
    return diffs.some(d => d === true);
  },

  mapOCtoTrip: (formData: any, driver: Driver, customer: Customer, category: string, destination?: Port, formType: 'OC' | 'Pre-Stacking' = 'OC'): Partial<Trip> => {
    const now = new Date().toISOString();
    
    const rawDateTime = formData.horarioAgendado || formData.dateTime;
    const tripStartTime = rawDateTime ? new Date(rawDateTime).toISOString() : now;
    
    const terminalTime = formData.schedulingDate ? new Date(formData.schedulingDate).toISOString() : null;
    
    // CORREÇÃO: Usar undefined para que a chave 'scheduling' NÃO exista no objeto final se não houver data.
    const scheduling: TripScheduling | undefined = terminalTime ? {
       dateTime: terminalTime,
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
      // IMPORTANTE: quando NÃO há agendamento novo (terminalTime nulo), estes
      // campos ficam `undefined` para que, ao reeditar uma OC já existente, o
      // `sync` NÃO sobrescreva (e apague) o agendamento atual da viagem. Caso
      // contrário a viagem sumiria do painel de Organização só por editar a OC.
      isScheduled: terminalTime ? true : undefined,
      scheduledLocationId: terminalTime ? (destination?.id || '') : undefined,
      scheduledDateTime: terminalTime || undefined,
      type: (formData.type || formData.tipoOperacao || 'EXPORTAÇÃO').toUpperCase() as any,
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
      statusHistory: [{ status: 'Pendente' as TripStatus, dateTime: now, createdAt: now }],
      advancePayment: { status: 'BLOQUEADO' },
      balancePayment: { status: 'AGUARDANDO_DOCS' },
      ocFormData: formType === 'OC' ? {
        ...formData,
        dateTime: tripStartTime,
        schedulingDate: terminalTime,
        category: category
      } : undefined,
      preStackingFormData: formType === 'Pre-Stacking' ? {
        ...formData,
        dateTime: tripStartTime,
        schedulingDate: terminalTime,
        category: category
      } : undefined,
      scheduling: scheduling,
      // OS importada anexada — mantém o PDF e os dados extraídos na viagem para
      // aparecerem ao reeditar a OC ou na emissão de CT-e (visualizador lateral)
      osPdfUrl: formData.osPdfUrl || undefined,
      osImportData: formData.osImportData || undefined,
    };
  },

  sync: async (tripData: Partial<Trip>, existingId?: string, actingUser?: User) => {
    let finalTrip: Trip;
    
    if (existingId) {
      const existing = await db.getTrips().then(trips => trips.find(t => t.id === existingId));
      if (existing) {
        // Remove undefined fields from tripData so they don't overwrite existing values
        const cleanTripData = Object.fromEntries(
          Object.entries(tripData).filter(([_, v]) => v !== undefined)
        );

        // Preserva o dateTime da viagem existente ao reemitir OC/formulário:
        // O form pode ter um horarioAgendado antigo (histórico) que sobrescreveria
        // a programação correta do sistema.
        if (existing.dateTime && cleanTripData.dateTime) {
          // Só atualiza se o operador alterou explicitamente (diferença > 5 min)
          const existingMs = new Date(existing.dateTime).getTime();
          const newMs = new Date(cleanTripData.dateTime).getTime();
          if (Math.abs(existingMs - newMs) < 5 * 60 * 1000) {
            // Sem mudança significativa — preserva o existente
            delete cleanTripData.dateTime;
          }
        }

        // Preserva scheduling existente se o formulário não trouxe um novo
        if (existing.scheduling && !cleanTripData.scheduling) {
          // cleanTripData.scheduling já é undefined e foi filtrado, ok
        }

        finalTrip = {
          ...existing,
          ...cleanTripData,
          id: existingId,
          // Preserve status and payments if they already exist
          status: existing.status || tripData.status || 'Pendente',
          statusHistory: existing.statusHistory?.length ? existing.statusHistory : (tripData.statusHistory || []),
          advancePayment: existing.advancePayment || tripData.advancePayment,
          balancePayment: existing.balancePayment || tripData.balancePayment,
          // Sempre preserva scheduling se já existia e não foi alterado
          scheduling: cleanTripData.scheduling ?? existing.scheduling
        } as Trip;
      } else {
        finalTrip = { ...tripData, id: existingId } as Trip;
      }
    } else {
      finalTrip = {
        ...tripData,
        id: `new-${Date.now()}`
      } as Trip;
    }
    
    return await db.saveTrip(finalTrip, actingUser);
  }
};