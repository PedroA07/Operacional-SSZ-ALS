
import { Trip, TripStatus, CustomStatus } from '../types';

export interface StatusOption {
  label: string;
  value: TripStatus;
  color: string;
  isFinal?: boolean;
}

export const statusService = {
  STANDARD_STATUSES: [
    { label: 'Pendente', value: 'Pendente', color: 'bg-slate-500' },
    { label: 'Retirada de Vazio', value: 'Retirada de vazio', color: 'bg-blue-400' },
    { label: 'Retirada do Cheio', value: 'Retirada do cheio', color: 'bg-blue-600' },
    { label: 'Em Viagem', value: 'Em viagem', color: 'bg-indigo-600' },
    { label: 'Chegou no Cliente', value: 'Chegou no cliente', color: 'bg-amber-500' },
    { label: 'Pegou NF', value: 'Pegou NF', color: 'bg-amber-600' },
    { label: 'Saiu do Cliente', value: 'Saiu do cliente', color: 'bg-slate-700' },
    { label: 'Chegou no Destino', value: 'Chegou no destino', color: 'bg-blue-800' },
    { label: 'Devolução do Cheio', value: 'Devolução do cheio', color: 'bg-slate-600' },
    { label: 'Viagem Concluída', value: 'Viagem concluída', color: 'bg-emerald-600' },
    { label: 'Viagem Cancelada', value: 'Viagem cancelada', color: 'bg-red-600' },
  ] as StatusOption[],

  getOptions: (trip: Trip): StatusOption[] => {
    return statusService.STANDARD_STATUSES;
  },

  getCustomOptions: (trip: Trip, allStatuses: CustomStatus[]): StatusOption[] => {
    if (!trip || !allStatuses || allStatuses.length === 0) {
      return statusService.getOptions(trip);
    }

    const tripCustomer = trip.customer?.id;
    const tripModality = trip.type?.toUpperCase();
    const tripDest = trip.destination?.id || trip.scheduledLocationId;

    let bestScore = -1;
    let bestStatuses: CustomStatus[] = [];

    // Agrupar status por regra (Cliente + Modalidade + Destino)
    const groupedByRule = new Map<string, CustomStatus[]>();
    allStatuses.forEach(s => {
      const key = `${s.customerId || 'ANY'}-${s.modality || 'ANY'}-${s.destinationId || 'ANY'}`;
      if (!groupedByRule.has(key)) groupedByRule.set(key, []);
      groupedByRule.get(key)!.push(s);
    });

    for (const [key, statuses] of groupedByRule.entries()) {
      const sample = statuses[0];
      let score = 0;
      let isValid = true;

      // Se a regra exige um cliente, ele deve bater exato
      if (sample.customerId) {
        if (sample.customerId === tripCustomer) score += 100;
        else isValid = false;
      }
      
      // Se a regra exige um destino, ele deve bater exato
      if (sample.destinationId) {
        if (sample.destinationId === tripDest) score += 10;
        else isValid = false;
      }
      
      // Se a regra exige uma modalidade, ela deve bater exato
      if (sample.modality) {
        if (sample.modality === tripModality) score += 1;
        else isValid = false;
      }

      if (isValid) {
        if (score > bestScore) {
          bestScore = score;
          bestStatuses = statuses;
        }
      }
    }

    if (bestStatuses.length > 0) {
      const sorted = [...bestStatuses].sort((a, b) => a.orderIndex - b.orderIndex);
      return sorted.map((s, index) => ({ 
        label: s.name, 
        value: s.name as TripStatus, 
        color: s.color || 'bg-blue-500', 
        isFinal: s.isFinal || index === sorted.length - 1 
      }));
    }

    return statusService.getOptions(trip);
  },

  isTripCompleted: (status: string, trip: Trip | null, customStatuses: CustomStatus[]): boolean => {
    if (status === 'Viagem concluída') return true;
    if (!trip) return false;
    
    // Check if the status is the final one in the custom flow
    const options = statusService.getCustomOptions(trip, customStatuses);
    const selectedOption = options.find(o => o.value === status);
    if (selectedOption && selectedOption.isFinal) {
      return true;
    }
    
    return false;
  }
};
