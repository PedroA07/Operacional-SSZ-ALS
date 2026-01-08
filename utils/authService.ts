
import { db, supabase } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';
import { passwordRule } from './passwordRule';
import { offlineManager } from './offlineManager';

export const authService = {
  /**
   * Realiza o login consultando o banco de dados em tempo real.
   * Ignora caches locais para garantir validação de senha atualizada.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; forceChange?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const now = new Date().toISOString();
    
    try {
      // 1. Tenta buscar o usuário DIRETAMENTE no Supabase (Sem usar db.getUsers que pode estar cacheado)
      if (supabase) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', inputUser)
          .single();

        if (!error && data) {
          // Validação de Senha Direta
          if (data.password !== password) {
            return { success: false, error: 'Chave de segurança incorreta para este operador.' };
          }

          if (data.status === 'Inativo') {
            return { success: false, error: 'Este acesso foi desativado pela administração.' };
          }

          const dbUser: User = {
            id: data.id,
            username: data.username,
            password: data.password,
            displayName: data.displayname || data.display_name || data.username,
            role: data.role,
            lastLogin: now,
            photo: data.photo,
            position: data.position,
            staffId: data.staffid || data.staff_id,
            driverId: data.driverid || data.driver_id,
            status: data.status,
            isFirstLogin: data.isfirstlogin === true || data.is_first_login === true,
            notificationPrefs: data.notification_prefs,
            presence_status: 'online'
          };

          // SUCESSO: Limpa o cache para forçar download de dados novos no Dashboard
          offlineManager.clearAllCache();
          
          // Atualiza o registro no DB e Cache Local
          await db.saveUser(dbUser);
          
          const forceChange = passwordRule.shouldForceChange(dbUser);
          return { success: true, user: dbUser, forceChange };
        }
      }

      // 2. Fallback Mestre: Caso o banco falhe ou o usuário seja o admin master fixo
      if (inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
        const masterAdmin: User = {
          id: 'admin-master',
          username: ADMIN_CREDENTIALS.username,
          displayName: 'Operacional Master',
          role: 'admin',
          lastLogin: now,
          isFirstLogin: false,
          position: 'Administração ALS SSZ'
        };
        
        offlineManager.clearAllCache();
        await db.saveUser(masterAdmin);
        return { success: true, user: masterAdmin, forceChange: false };
      }

      return { success: false, error: 'Usuário não localizado no banco de dados central.' };
    } catch (err) {
      console.error("Erro crítico de autenticação:", err);
      return { success: false, error: 'Falha de comunicação com o servidor ALS.' };
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
