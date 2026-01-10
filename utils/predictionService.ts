
import { Trip, TripStatus } from '../types';

export const predictionService = {
  /**
   * Mapeia o status atual para o próximo evento lógico.
   * Se for "Container sobre rodas", busca a próxima OS agendada para o motorista.
   */
  getNextStatusPrediction: (currentTrip: Trip, allTrips: Trip[]): { label: string; time: string } | null => {
    const currentStatus = currentTrip.status;

    // Caso Especial: Container sobre rodas (Busca próxima viagem do motorista)
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
        time: `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      };
    }

    // Lógica Padrão: +45 minutos para outros status
    const map: Partial<Record<TripStatus, string>> = {
      'Retirada de vazio': 'Retirada do cheio',
      'Retirada do cheio': 'Chegada no cliente',
      'Chegou no cliente': 'Saída do cliente',
      'Pegou NF': 'Saída do cliente',
      'Saiu do cliente': 'Chegada no Cragea',
      'Chegou no Cragea': 'Início do Carregamento',
      'Aguardando carregar': 'Saída do Cragea',
      'Saiu do Cragea': 'Chegada na Volkswagen',
      'Chegou na Volkswagen': 'Saída da Volkswagen',
      'Saiu da Volkswagen': 'Chegada no Destino/Terminal',
      'Em viagem': 'Chegada no Destino'
    };

    const nextLabel = map[currentStatus];
    if (!nextLabel) return null;

    const baseTime = currentTrip.statusTime || currentTrip.dateTime;
    const date = new Date(baseTime);
    const predictionDate = new Date(date.getTime() + 45 * 60000);

    return {
      label: `Previsão de ${nextLabel}`,
      time: predictionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  }
};
