
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
   * Calcula o tempo de estadia que excedeu as 8 horas (Saída - Chegada - 8h)
   */
  getStayDetails: (scheduledStr: string, history: StatusHistoryEntry[]) => {
    const arrival = history.find(h => h.status === 'Chegou no cliente');
    const departure = history.find(h => h.status === 'Saiu do cliente');

    if (!arrival || !departure) return { hours: 0, isExceeded: false, text: '---' };

    const start = new Date(arrival.dateTime).getTime();
    const end = new Date(departure.dateTime).getTime();

    const totalStayMs = end - start;
    const limit8hMs = 8 * 3600000;

    if (totalStayMs <= limit8hMs) {
      return {
        hours: 0,
        isExceeded: false,
        text: '---'
      };
    }

    const exceededMs = totalStayMs - limit8hMs;
    const hours = Math.floor(exceededMs / 3600000);
    const minutes = Math.floor((exceededMs % 3600000) / 60000);

    return {
      hours: hours + (minutes / 60),
      isExceeded: true,
      text: `${hours}h ${minutes}m`
    };
  }
};
