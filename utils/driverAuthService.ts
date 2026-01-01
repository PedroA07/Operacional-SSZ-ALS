
import { db } from './storage';
import { Driver, User } from '../types';

/**
 * Serviço dedicado ao gerenciamento de autenticação e credenciais de motoristas
 */
export const driverAuthService = {
  /**
   * Gera as credenciais padrão baseadas no CPF e Primeiro Nome
   */
  generateDefaults: (driver: Partial<Driver>) => {
    const cleanCPF = driver.cpf?.replace(/\D/g, '') || '';
    const firstName = driver.name?.trim().split(' ')[0].toLowerCase() || 'als';
    return {
      username: cleanCPF,
      password: `${firstName}${cleanCPF.slice(-4)}`
    };
  },

  /**
   * Sincroniza o usuário do motorista no banco de dados 'users'
   */
  syncUserRecord: async (driverId: string, driverData: Partial<Driver>, customPassword?: string) => {
    const defaults = driverAuthService.generateDefaults(driverData);
    const username = defaults.username;
    const password = customPassword || defaults.password;

    const userPayload: User = {
      id: `u-${driverId}`,
      username: username,
      password: password,
      displayName: driverData.name || 'Motorista',
      role: driverData.driverType === 'Motoboy' ? 'motoboy' : 'driver',
      driverId: driverId,
      lastLogin: new Date().toISOString(),
      position: driverData.driverType || 'Motorista',
      status: driverData.status || 'Ativo',
      photo: driverData.photo,
      isFirstLogin: false // Motoristas não precisam trocar no primeiro login por padrão do fluxo solicitado
    };

    await db.saveUser(userPayload);
    return { username, password };
  },

  /**
   * Altera apenas a senha de um motorista específico
   */
  updatePassword: async (driverId: string, newPassword: string) => {
    const users = await db.getUsers();
    const user = users.find(u => u.driverId === driverId);
    if (user) {
      user.password = newPassword;
      await db.saveUser(user);
      return true;
    }
    return false;
  }
};
