
import { Trip, TripStatus } from '../types';

export const predictionService = {
  getNextStatusPrediction: (currentTrip: Trip, allTrips: Trip[]): { label: string; time: string } | null => {
    const currentStatus = currentTrip.status;

    if (currentStatus === 'Container sobre rodas') {
      const nextTrip = allTrips
        .filter(t => 
          t.driver.id === currentTrip.driver.id && 
          t.id !== currentTrip.id &&
          new Date(t.dateTime).getTime() > new Date(currentTrip.dateTime).getTime() &&
          t.status !== 'Viagem cancelada'
        )
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

      if (!nextTrip) return null;

      const date = new Date(nextTrip.dateTime);
      return {
        label: `Próxima Viagem (${nextTrip.os})`,
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    }

    const map: Partial<Record<TripStatus, string>> = {
      'Retirada do cheio': 'Chegada no Cragea',
      'Chegou no Cragea': 'Aguardando carregar',
      'Aguardando carregar': 'Saída do Cragea',
      'Saiu do Cragea': 'Chegada na Volkswagen',
      'Chegou na Volkswagen': 'Saída da Volkswagen',
      'Saiu da Volkswagen': 'Baixa Cragea (Conclusão)'
    };

    const nextLabel = map[currentStatus];
    if (!nextLabel) return null;

    const baseTime = currentTrip.statusTime || currentTrip.dateTime;
    const date = new Date(baseTime);
    const predictionDate = new Date(date.getTime() + 40 * 60000); // 40 min padrão

    return {
      label: nextLabel,
      time: predictionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  }
};
