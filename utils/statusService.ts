
import { Trip, TripStatus, CustomStatus } from '../types';

export interface StatusOption {
  label: string;
  value: TripStatus;
  color: string;
  isFinal?: boolean;
  operationalOnly?: boolean;
}

// Encerramentos globais — aparecem para todo tipo de programação, nunca para o motorista
const GLOBAL_CLOSURE_STATUSES: StatusOption[] = [
  { label: 'Cancelado',   value: 'Cancelado',   color: 'bg-amber-500', isFinal: true, operationalOnly: true },
  { label: 'Frete Morto', value: 'Frete Morto', color: 'bg-red-600',   isFinal: true, operationalOnly: true },
];

export const statusService = {
  STANDARD_STATUSES: [
    { label: 'Pendente',           value: 'Pendente',           color: 'bg-slate-500' },
    { label: 'Retirada de Vazio',  value: 'Retirada de vazio',  color: 'bg-blue-400'  },
    { label: 'Retirada do Cheio',  value: 'Retirada do cheio',  color: 'bg-blue-600'  },
    { label: 'Em Viagem',          value: 'Em viagem',          color: 'bg-indigo-600' },
    { label: 'Chegou no Cliente',  value: 'Chegou no cliente',  color: 'bg-amber-500' },
    { label: 'Pegou NF',           value: 'Pegou NF',           color: 'bg-amber-600' },
    { label: 'Saiu do Cliente',    value: 'Saiu do cliente',    color: 'bg-slate-700' },
    { label: 'Chegou no Destino',  value: 'Chegou no destino',  color: 'bg-blue-800'  },
    { label: 'Devolução do Cheio', value: 'Devolução do cheio', color: 'bg-slate-600' },
    { label: 'Viagem Concluída',   value: 'Viagem concluída',   color: 'bg-emerald-600', isFinal: true },
    { label: 'Viagem Cancelada',   value: 'Viagem cancelada',   color: 'bg-red-600',     isFinal: true },
  ] as StatusOption[],

  getOptions: (trip: Trip): StatusOption[] => {
    return statusService.STANDARD_STATUSES;
  },

  /**
   * Retorna as opções de status para uma trip.
   * @param trip           A trip em questão
   * @param allStatuses    Todos os CustomStatus do banco
   * @param driverFacing   true = contexto do motorista (exclui operationalOnly)
   */
  getCustomOptions: (
    trip: Trip,
    allStatuses: CustomStatus[],
    driverFacing = false
  ): StatusOption[] => {
    let base: StatusOption[];

    if (!trip || !allStatuses || allStatuses.length === 0) {
      base = statusService.getOptions(trip);
    } else {
      const tripCustomer = trip.customer?.id;
      const tripModality = trip.type?.toUpperCase();
      const tripDest     = trip.destination?.id || trip.scheduledLocationId;

      let bestScore   = -1;
      let bestStatuses: CustomStatus[] = [];

      const groupedByRule = new Map<string, CustomStatus[]>();
      allStatuses.forEach(s => {
        const key = `${s.customerId || 'ANY'}-${s.modality || 'ANY'}-${s.destinationId || 'ANY'}`;
        if (!groupedByRule.has(key)) groupedByRule.set(key, []);
        groupedByRule.get(key)!.push(s);
      });

      for (const [, statuses] of groupedByRule.entries()) {
        const sample  = statuses[0];
        let score     = 0;
        let isValid   = true;

        if (sample.customerId) {
          if (sample.customerId === tripCustomer) score += 100;
          else isValid = false;
        }
        if (sample.destinationId) {
          if (sample.destinationId === tripDest) score += 10;
          else isValid = false;
        }
        if (sample.modality) {
          if (sample.modality === tripModality) score += 1;
          else isValid = false;
        }

        if (isValid && score > bestScore) {
          bestScore    = score;
          bestStatuses = statuses;
        }
      }

      if (bestStatuses.length > 0) {
        const sorted = [...bestStatuses].sort((a, b) => a.orderIndex - b.orderIndex);
        base = sorted.map(s => ({
          label:           s.name,
          value:           s.name as TripStatus,
          color:           s.color || 'bg-blue-500',
          isFinal:         s.isFinal         === true,
          operationalOnly: s.operationalOnly === true,
        }));
      } else {
        base = statusService.getOptions(trip);
      }
    }

    // Encerramentos globais: sempre adicionados ao final, nunca duplicados
    const existingValues = new Set(base.map(s => s.value));
    const globals = GLOBAL_CLOSURE_STATUSES.filter(g => !existingValues.has(g.value));
    const full = [...base, ...globals];

    return driverFacing ? full.filter(s => !s.operationalOnly) : full;
  },

  /** Verifica se o status atual marca a trip como concluída */
  isTripCompleted: (status: string, trip: Trip | null, customStatuses: CustomStatus[]): boolean => {
    if (status === 'Viagem concluída') return true;
    if (status === 'Cancelado' || status === 'Frete Morto') return true;
    if (!trip) return false;

    const options = statusService.getCustomOptions(trip, customStatuses);
    const selected = options.find(o => o.value === status);
    return selected?.isFinal === true;
  },
};

