import { Trip } from '../types';
import { db } from '../utils/storage';

export const advanceService = {
  /**
   * Vincula a checkbox de adiantamento ao status de adiantamento da viagem.
   * Se marcado, define o status como 'LIBERAR'. Se desmarcado, define como 'BLOQUEADO'.
   */
  toggleAdvance: async (trip: Trip, isChecked: boolean): Promise<boolean> => {
    const updatedTrip: Trip = {
      ...trip,
      hasAdvance: isChecked,
      advancePayment: {
        ...trip.advancePayment,
        status: isChecked ? 'LIBERAR' : 'BLOQUEADO',
        liberatedAt: isChecked ? new Date().toISOString() : undefined
      }
    };

    return await db.saveTrip(updatedTrip);
  }
};
