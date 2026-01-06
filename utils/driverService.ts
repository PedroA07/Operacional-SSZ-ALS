
import { supabase } from './storage';
import { tripRepository } from './tripRepository';
import { driverRepository } from './driverRepository';
import { Trip, Driver } from '../types';

export const driverService = {
  /**
   * Busca todas as viagens vinculadas ao ID do motorista
   */
  async getMyTrips(driverId: string): Promise<Trip[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('date_time', { ascending: false });

      if (error) throw error;

      // Filtramos as viagens onde o ID do motorista no objeto JSONB corresponde ao ID do usuário logado
      return (data || [])
        .map(d => tripRepository.mapFromDb(d))
        .filter(t => String(t.driver?.id) === String(driverId));
    } catch (e) {
      console.error("Erro ao buscar viagens do motorista:", e);
      return [];
    }
  },

  /**
   * Busca os dados cadastrais do motorista logado
   */
  async getMyProfile(driverId: string): Promise<Driver | null> {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      return driverRepository.mapFromDb(data);
    } catch (e) {
      console.error("Erro ao buscar perfil do motorista:", e);
      return null;
    }
  },

  /**
   * Atualiza o status de uma viagem em tempo real
   */
  async updateTripStatus(trip: Trip, nextStatus: any, actingUser: any): Promise<boolean> {
    if (!supabase) return false;
    
    const now = new Date().toISOString();
    const updatedTrip: Trip = {
      ...trip,
      status: nextStatus,
      statusTime: now,
      statusHistory: [
        { status: nextStatus, dateTime: now },
        ...(trip.statusHistory || [])
      ]
    };

    try {
      await tripRepository.save(supabase, updatedTrip);
      // Opcional: Adicionar notificação para a central
      return true;
    } catch (e) {
      console.error("Erro ao atualizar status da viagem:", e);
      return false;
    }
  }
};
