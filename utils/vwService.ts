
import { VWSchedule, VWStatus, VWStatusUpdate } from '../types';

export const createNewVWSchedule = (): Partial<VWSchedule> => ({
  dateTime: '',
  os: '',
  container: '',
  cva: '',
  driverName: '',
  cpf: '',
  plateHorse: '',
  plateTrailer: '',
  origin: 'Cragea - SJC',
  destination: 'VW - Taubaté',
  status: 'Pendente',
  statusHistory: []
});

export const prepareVWStatusUpdate = (currentSchedule: VWSchedule, newStatus: VWStatus, time: string): VWSchedule => {
  const update: VWStatusUpdate = {
    status: newStatus,
    dateTime: time
  };
  
  return {
    ...currentSchedule,
    status: newStatus,
    statusHistory: [...(currentSchedule.statusHistory || []), update]
  };
};

export const formatVWDateTime = (dateStr: string) => {
  if (!dateStr) return { date: '--/--/----', time: '--:--' };
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('pt-BR'),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
};
