
import { db } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
  /**
   * Valida as credenciais do usuário e verifica se é o primeiro acesso.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; forceChange?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    
    // 1. Tentar Admin Master Hardcoded Primeiro (operacional_ssz)
    if (inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
      return {
        success: true,
        user: {
          id: 'admin-master',
          username: ADMIN_CREDENTIALS.username,
          displayName: 'Operacional Master',
          role: 'admin',
          lastLogin: new Date().toISOString(),
          isFirstLogin: false,
          position: 'Diretoria'
        },
        forceChange: false
      };
    }

    try {
      // 2. Buscar todos os usuários do Banco
      const users = await db.getUsers();
      
      // Busca ignorando case
      let foundUser = users.find(u => u.username.toLowerCase() === inputUser);

      if (!foundUser) {
        return { success: false, error: 'Usuário não localizado no sistema.' };
      }

      // 3. Verificar senha
      if (foundUser.password !== password) {
        return { success: false, error: 'Senha incorreta.' };
      }

      // 4. Se a senha for a padrão '12345678' OU a flag isFirstLogin for explicitamente true
      // Garantimos que se isFirstLogin for falso ou indefinido, ele não força a troca se a senha for diferente da padrão.
      const isUsingDefaultPassword = foundUser.password === '12345678';
      const isForcedByFlag = foundUser.isFirstLogin === true;

      if (isUsingDefaultPassword || isForcedByFlag) {
        return { success: true, user: foundUser, forceChange: true };
      }

      return { success: true, user: foundUser, forceChange: false };
    } catch (err) {
      console.error("Auth error:", err);
      return { success: false, error: 'Erro de conexão com a base de dados.' };
    }
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
