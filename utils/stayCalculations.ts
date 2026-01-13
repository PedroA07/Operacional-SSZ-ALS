
import { Trip, StatusHistoryEntry } from '../types';

export const stayCalculations = {
  /**
   * Verifica se a chegada ocorreu antes ou no horário previsto
   */
  isArrivedOnTime: (scheduledStr: string, history: StatusHistoryEntry[]): { onTime: boolean; diffMinutes: number } => {
    const arrival = history.find(h => h.status === 'Chegou no cliente');
    if (!scheduledStr || !arrival) return { onTime: false, diffMinutes: 0 };

    const scheduled = new Date(scheduledStr).getTime();
    const actual = new Date(arrival.dateTime).getTime();
    const diff = Math.round((actual - scheduled) / 60000);

    return {
      onTime: actual <= scheduled,
      diffMinutes: diff
    };
  },

  /**
   * Calcula a duração total da estadia (Saída - Chegada)
   * E verifica se a saída foi 8h após a previsão
   */
  getStayDetails: (scheduledStr: string, history: StatusHistoryEntry[]) => {
    const arrival = history.find(h => h.status === 'Chegou no cliente');
    const departure = history.find(h => h.status === 'Saiu do cliente');

    if (!arrival || !departure) return { hours: 0, isExceeded: false, text: '---' };

    const start = new Date(arrival.dateTime).getTime();
    const end = new Date(departure.dateTime).getTime();
    const sched = new Date(scheduledStr).getTime();

    const diffMs = end - start;
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);

    // Regra: Saída > Previsão + 8 horas
    const limit8h = sched + (8 * 3600000);
    const isExceeded = end > limit8h;

    return {
      hours: hours + (minutes / 60),
      isExceeded,
      text: `${hours}h ${minutes}m`
    };
  }
};
