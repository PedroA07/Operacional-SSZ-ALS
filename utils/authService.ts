
import { db, supabase } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';
import { passwordRule } from './passwordRule';
import { offlineManager } from './offlineManager';

export const authService = {
  /**
   * Realiza o login consultando o banco de dados em tempo real.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; forceChange?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const now = new Date().toISOString();
    
    try {
      // 1. Tenta buscar o usuário DIRETAMENTE no Supabase
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('username', inputUser)
            .single();

          if (!error && data) {
            if (data.password !== password) {
              return { success: false, error: 'Chave de segurança incorreta.' };
            }

            if (data.status === 'Inativo') {
              return { success: false, error: 'Este acesso foi desativado.' };
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
              notificationPrefs: data.notification_prefs
            };

            // LIMPEZA DE CACHE: Força o sistema a baixar tudo novo após login
            offlineManager.clearAllCache();
            
            await db.saveUser(dbUser);
            const forceChange = passwordRule.shouldForceChange(dbUser);
            return { success: true, user: dbUser, forceChange };
          }
        } catch (dbErr) {
          console.error("Erro Supabase Auth:", dbErr);
        }
      }

      // 2. Fallback para cache local se rede falhar
      const cachedUsers = await db.getUsers();
      const cachedUser = cachedUsers.find(u => u.username.toLowerCase() === inputUser);

      if (cachedUser) {
        if (cachedUser.password === password) {
          return { success: true, user: cachedUser, forceChange: passwordRule.shouldForceChange(cachedUser) };
        }
        return { success: false, error: 'Chave incorreta (Modo Offline).' };
      }

      // 3. Fallback mestre (Admin de emergência)
      if (inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
        const masterAdmin: User = {
          id: 'admin-master',
          username: ADMIN_CREDENTIALS.username,
          displayName: 'Operacional Master',
          role: 'admin',
          lastLogin: now,
          isFirstLogin: false,
          position: 'Administração SSZ'
        };
        
        offlineManager.clearAllCache();
        await db.saveUser(masterAdmin);
        return { success: true, user: masterAdmin, forceChange: false };
      }

      return { success: false, error: 'Usuário não localizado.' };
    } catch (err) {
      return { success: false, error: 'Erro de comunicação interna.' };
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
