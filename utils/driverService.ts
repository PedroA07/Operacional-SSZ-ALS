
import { supabase, db } from './storage';
import { tripRepository } from './tripRepository';
import { driverRepository } from './driverRepository';
import { Trip, Driver, User } from '../types';

export const driverService = {
  /**
   * Busca todas as viagens vinculadas ao ID do motorista
   */
  async getMyTrips(driverId: string): Promise<Trip[]> {
    try {
      const allTrips = await db.getTrips();
      // Filtramos as viagens onde o ID do motorista corresponde ao ID do usuário logado
      return allTrips.filter(t => String(t.driver?.id) === String(driverId));
    } catch (e) {
      console.error("Erro ao buscar viagens do motorista:", e);
      return [];
    }
  },

  /**
   * Busca os dados cadastrais do motorista logado (Priorizando consistência)
   */
  async getMyProfile(driverId: string): Promise<Driver | null> {
    try {
      // 1. Tenta buscar todos os motoristas (método seguro que lida com Local e Supabase)
      const allDrivers = await db.getDrivers();
      const found = allDrivers.find(d => String(d.id) === String(driverId));
      
      if (found) return found;

      // 2. Fallback: Busca direta no Supabase caso não esteja na lista local
      if (supabase) {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', driverId)
          .single();

        if (!error && data) {
          return driverRepository.mapFromDb(data);
        }
      }
      
      return null;
    } catch (e) {
      console.error("Erro ao buscar perfil do motorista:", e);
      return null;
    }
  },

  /**
   * Atualiza os dados de contato e foto do motorista
   */
  async updateProfile(driverId: string, data: Partial<Driver>): Promise<boolean> {
    try {
      const allDrivers = await db.getDrivers();
      const currentDriver = allDrivers.find(d => d.id === driverId);
      
      if (!currentDriver) return false;

      const updatedDriver = {
        ...currentDriver,
        ...data,
        name: currentDriver.name, // Mantém o nome inalterado por segurança de vínculo
      };

      // Salva usando o gerenciador central que lida com Sync
      await db.saveDriver(updatedDriver);

      // Sincroniza foto e campos básicos no registro de usuário para o cabeçalho
      const allUsers = await db.getUsers();
      const linkedUser = allUsers.find(u => u.driverId === driverId);
      if (linkedUser) {
        await db.saveUser({
          ...linkedUser,
          photo: data.photo || linkedUser.photo,
          displayName: currentDriver.name // Garante que o nome exibido esteja certo
        });
      }

      return true;
    } catch (e) {
      console.error("Erro ao atualizar perfil:", e);
      return false;
    }
  },

  /**
   * Atualiza o status de uma viagem em tempo real
   */
  async updateTripStatus(trip: Trip, nextStatus: any, actingUser: User): Promise<boolean> {
    const now = new Date().toISOString();
    const updatedTrip: Trip = {
      ...trip,
      status: nextStatus,
      statusTime: now,
      statusHistory: [
        // Fix: Added missing required property 'createdAt' to match StatusHistoryEntry interface
        { status: nextStatus, dateTime: now, createdAt: now },
        ...(trip.statusHistory || [])
      ]
    };

    try {
      await db.saveTrip(updatedTrip, actingUser);
      return true;
    } catch (e) {
      console.error("Erro ao atualizar status da viagem:", e);
      return false;
    }
  }
};
