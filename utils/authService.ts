
import { db } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
  /**
   * Valida as credenciais do usuário e verifica se é o primeiro acesso.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; forceChange?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    
    // Buscar todos os usuários
    const users = await db.getUsers();
    
    // Tentar encontrar o usuário no banco
    let foundUser = users.find(u => u.username.toLowerCase() === inputUser);

    // Se não encontrar no banco e for o admin master, podemos criar ou validar via constante
    // Mas para seguir a regra de "senha padrão no primeiro acesso", o admin deve estar no banco
    if (!foundUser && inputUser === ADMIN_CREDENTIALS.username) {
      // Caso especial: se o admin master não existir no DB, ele nasce com a regra de primeiro acesso
      const adminUser: User = {
        id: 'admin-master',
        username: ADMIN_CREDENTIALS.username,
        password: '12345678', // Senha padrão inicial
        displayName: 'Administrador Master',
        role: 'admin',
        lastLogin: new Date().toISOString(),
        isFirstLogin: true,
        position: 'Operacional'
      };
      await db.saveUser(adminUser);
      foundUser = adminUser;
    }

    if (!foundUser) {
      return { success: false, error: 'Usuário não localizado.' };
    }

    // Verificar senha
    if (foundUser.password !== password) {
      return { success: false, error: 'Senha incorreta.' };
    }

    // Verificar se é primeiro acesso
    if (foundUser.isFirstLogin) {
      return { success: true, user: foundUser, forceChange: true };
    }

    return { success: true, user: foundUser, forceChange: false };
  },

  /**
   * Atualiza a senha e desativa a flag de primeiro acesso
   */
  async updateFirstPassword(user: User, newPassword: string): Promise<User> {
    const updatedUser: User = {
      ...user,
      password: newPassword,
      isFirstLogin: false,
      lastLogin: new Date().toISOString()
    };
    
    await db.saveUser(updatedUser);
    return updatedUser;
  }
};
