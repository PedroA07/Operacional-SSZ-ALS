
import { Trip, TripStatus } from '../types';

export interface StatusOption {
  label: string;
  value: TripStatus;
  color: string;
}

export const statusService = {
  STANDARD_STATUSES: [
    { label: 'Pendente', value: 'Pendente' },
    { label: 'Retirada de Vazio', value: 'Retirada de vazio' },
    { label: 'Retirada do Cheio', value: 'Retirada do cheio' },
    { label: 'Em Viagem', value: 'Em viagem' },
    { label: 'Chegou no Cliente', value: 'Chegou no cliente' },
    { label: 'Pegou NF', value: 'Pegou NF' },
    { label: 'Saiu do Cliente', value: 'Saiu do cliente' },
    { label: 'Chegou no Destino', value: 'Chegou no destino' },
    { label: 'Devolução do Cheio', value: 'Devolução do cheio' },
    { label: 'Viagem Concluída', value: 'Viagem concluída' },
    { label: 'Viagem Cancelada', value: 'Viagem cancelada' },
  ] as StatusOption[],

  VW_STATUSES: [
    { label: 'Pendente', value: 'Pendente' },
    { label: 'Retirou o Cheio', value: 'Retirada do cheio' },
    { label: 'Chegou no Cragea', value: 'Chegou no Cragea' },
    { label: 'Aguardando Carregar', value: 'Aguardando carregar' },
    { label: 'Saiu do Cragea', value: 'Saiu do Cragea' },
    { label: 'Chegou na Volkswagen', value: 'Chegou na Volkswagen' },
    { label: 'Saiu da Volkswagen', value: 'Saiu da Volkswagen' },
    { label: 'Container sobre Rodas', value: 'Container sobre rodas' },
    { label: 'Baixa Cragea (Concluir)', value: 'Viagem concluída' },
    { label: 'Viagem Cancelada', value: 'Viagem cancelada' },
  ] as StatusOption[],

  isVWOperation: (trip: Trip): boolean => {
    const name = (trip.customer?.name || '').toUpperCase();
    const legal = (trip.customer?.legalName || '').toUpperCase();
    const dest = (trip.scheduling?.location || '').toUpperCase();
    const destOrig = (trip.destination?.name || '').toUpperCase();
    
    return name.includes('VOLKSWAGEN') || 
           legal.includes('VOLKSWAGEN') || 
           dest.includes('CRAGEA') || 
           destOrig.includes('CRAGEA');
  },

  getOptions: (trip: Trip): StatusOption[] => {
    return statusService.isVWOperation(trip) 
      ? statusService.VW_STATUSES 
      : statusService.STANDARD_STATUSES;
  }
};
