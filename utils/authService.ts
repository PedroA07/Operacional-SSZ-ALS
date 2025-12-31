
import { db } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';
import { passwordRule } from './passwordRule';

export const authService = {
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; forceChange?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const now = new Date().toISOString();
    
    // Login do Administrador Master operacional_ssz
    if (inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
      const adminUser: User = {
        id: 'admin-master',
        username: ADMIN_CREDENTIALS.username,
        displayName: 'Operacional Master',
        role: 'admin',
        lastLogin: now,
        isFirstLogin: false,
        position: 'Diretoria'
      };
      
      await db.saveUser(adminUser);

      return {
        success: true,
        user: adminUser,
        forceChange: false
      };
    }

    try {
      const users = await db.getUsers();
      let foundUser = users.find(u => u.username.toLowerCase() === inputUser);

      if (!foundUser) {
        return { success: false, error: 'Usuário não localizado.' };
      }

      if (foundUser.password !== password) {
        return { success: false, error: 'Senha incorreta.' };
      }

      // IMPORTANTE: Atualiza o lastLogin
      foundUser.lastLogin = now;
      await db.saveUser(foundUser); 

      // Aplica a nova regra centralizada
      const forceChange = passwordRule.shouldForceChange(foundUser);

      return { success: true, user: foundUser, forceChange };
    } catch (err) {
      return { success: false, error: 'Erro de conexão com a base de dados.' };
    }
  },

  async updateFirstPassword(user: User, newPassword: string): Promise<User> {
    const updatedUser: User = {
      ...user,
      password: newPassword,
      // MARCAÇÃO CRÍTICA: Define como FALSE após a alteração bem sucedida
      isFirstLogin: false,
      lastLogin: new Date().toISOString()
    };
    
    await db.saveUser(updatedUser);
    return updatedUser;
  }
};
