
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
    const cleanCPF = driver.cpf?.replace(/\D/g, '').toLowerCase() || '';
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
    if (!driverId) throw new Error("ID do motorista é obrigatório para sincronismo.");

    const defaults = driverAuthService.generateDefaults(driverData);
    const username = defaults.username.toLowerCase();
    const password = (customPassword || defaults.password).trim();

    // CRÍTICO: Garantimos que o driverId da tabela 'drivers' seja gravado aqui no 'users'
    const users = await db.getUsers();
    const existingUser = users.find(u => u.username.toLowerCase() === username);

    const userPayload: User = {
      ...(existingUser || {}),
      id: existingUser?.id || `u-${driverId}`,
      username: username,
      password: password,
      displayName: driverData.name || 'Motorista',
      role: driverData.driverType === 'Motoboy' ? 'motoboy' : 'driver',
      driverId: driverId,
      lastLogin: existingUser?.lastLogin || new Date().toISOString(),
      position: driverData.driverType || 'Motorista',
      status: driverData.status || 'Ativo',
      photo: driverData.photo || existingUser?.photo,
      isFirstLogin: existingUser ? (existingUser.isFirstLogin === true) : false 
    };

    await db.saveUser(userPayload);
    return { username, password };
  },

  /**
   * Altera apenas a senha de um motorista específico
   */
  updatePassword: async (driverId: string, newPassword: string) => {
    const users = await db.getUsers();
    const user = users.find(u => String(u.driverId) === String(driverId));
    if (user) {
      user.password = newPassword.trim();
      await db.saveUser(user);
      return true;
    }
    return false;
  }
};
