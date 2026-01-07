
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
        position: 'Diretoria Executiva'
      };
      
      // Persiste no banco local para manter a sessão em caso de instabilidade de rede
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
        return { success: false, error: 'Usuário não localizado no sistema.' };
      }

      if (foundUser.password !== password) {
        return { success: false, error: 'Senha de acesso inválida.' };
      }

      const updatedLoginUser: User = {
        ...foundUser,
        lastLogin: now
      };
      
      await db.saveUser(updatedLoginUser); 

      const forceChange = passwordRule.shouldForceChange(updatedLoginUser);

      return { success: true, user: updatedLoginUser, forceChange };
    } catch (err) {
      return { success: false, error: 'Erro de conexão com o servidor Supabase.' };
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
