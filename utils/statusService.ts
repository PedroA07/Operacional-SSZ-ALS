
import { Trip, TripStatus } from '../types';

export interface StatusOption {
  label: string;
  value: TripStatus;
  color: string;
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

  VW_STATUSES: [
    { label: 'Pendente', value: 'Pendente', color: 'bg-slate-500' },
    { label: 'Retirou o Cheio', value: 'Retirada do cheio', color: 'bg-blue-600' },
    { label: 'Chegou no Cragea', value: 'Chegou no Cragea', color: 'bg-indigo-600' },
    { label: 'Aguardando Carregar', value: 'Aguardando carregar', color: 'bg-amber-500' },
    { label: 'Saiu do Cragea', value: 'Saiu do Cragea', color: 'bg-blue-800' },
    { label: 'Chegou na Volkswagen', value: 'Chegou na Volkswagen', color: 'bg-cyan-600' },
    { label: 'Saiu da Volkswagen', value: 'Saiu da Volkswagen', color: 'bg-slate-700' },
    { label: 'Container sobre Rodas', value: 'Container sobre rodas', color: 'bg-emerald-500' },
    { label: 'Baixa Cragea (Concluir)', value: 'Viagem concluída', color: 'bg-emerald-800' },
    { label: 'Viagem Cancelada', value: 'Viagem cancelada', color: 'bg-red-600' },
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
