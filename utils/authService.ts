
import { db } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';
import { passwordRule } from './passwordRule';

export const authService = {
  /**
   * Realiza o login consultando preferencialmente o banco de dados.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; forceChange?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const now = new Date().toISOString();
    
    try {
      // 1. Puxa os dados diretamente do banco de dados (via cache inteligente que tenta rede primeiro)
      const users = await db.getUsers();
      let foundUser = users.find(u => u.username.toLowerCase() === inputUser);

      if (foundUser) {
        if (foundUser.password !== password) {
          return { success: false, error: 'Chave de segurança inválida.' };
        }

        if (foundUser.status === 'Inativo') {
          return { success: false, error: 'Este acesso foi bloqueado pela administração.' };
        }

        const updatedLoginUser: User = {
          ...foundUser,
          lastLogin: now
        };
        
        await db.saveUser(updatedLoginUser); 
        const forceChange = passwordRule.shouldForceChange(updatedLoginUser);

        return { success: true, user: updatedLoginUser, forceChange };
      }

      // 2. Fallback para Administrador Master fixo caso não esteja no DB (emergência)
      if (inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
        const adminUser: User = {
          id: 'admin-master',
          username: ADMIN_CREDENTIALS.username,
          displayName: 'Operacional Master',
          role: 'admin',
          lastLogin: now,
          isFirstLogin: false,
          position: 'Diretoria Executiva'
        };
        
        await db.saveUser(adminUser);
        return { success: true, user: adminUser, forceChange: false };
      }

      return { success: false, error: 'Usuário não localizado no sistema.' };
    } catch (err) {
      console.error("Erro de login:", err);
      return { success: false, error: 'Erro de comunicação com o servidor ALS.' };
    }
  },

  async updateFirstPassword(user: User, newPassword: string): Promise<User> {
    const now = new Date().toISOString();
    const updatedUser: User = {
      ...user,
      password: newPassword,
      isFirstLogin: false,
      lastLogin: now
    };
    
    await db.saveUser(updatedUser);
    return updatedUser;
  }
};
