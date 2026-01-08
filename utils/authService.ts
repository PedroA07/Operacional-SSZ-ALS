
import { db, supabase } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';
import { passwordRule } from './passwordRule';

export const authService = {
  /**
   * Realiza o login consultando o banco de dados em tempo real.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; forceChange?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const now = new Date().toISOString();
    
    try {
      // 1. Tenta buscar o usuário DIRETAMENTE no Supabase para garantir dados reais
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('username', inputUser)
            .single();

          if (!error && data) {
            // Validação de Senha (comparação direta simples nesta versão)
            if (data.password !== password) {
              return { success: false, error: 'Chave de segurança incorreta para este usuário.' };
            }

            if (data.status === 'Inativo') {
              return { success: false, error: 'Este acesso foi desativado pela administração ALS.' };
            }

            // Mapeamento do objeto retornado pelo DB para o tipo User do App
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

            await db.saveUser(dbUser); // Salva no cache local
            const forceChange = passwordRule.shouldForceChange(dbUser);
            return { success: true, user: dbUser, forceChange };
          }
        } catch (dbErr) {
          console.error("Erro na consulta direta Supabase:", dbErr);
        }
      }

      // 2. Se falhar a rede ou não encontrar no DB, tenta o cache local (Offline)
      const cachedUsers = await db.getUsers();
      const cachedUser = cachedUsers.find(u => u.username.toLowerCase() === inputUser);

      if (cachedUser) {
        if (cachedUser.password === password) {
          const updatedUser = { ...cachedUser, lastLogin: now };
          await db.saveUser(updatedUser);
          return { success: true, user: updatedUser, forceChange: passwordRule.shouldForceChange(updatedUser) };
        }
        return { success: false, error: 'Chave de segurança incorreta (Modo Offline).' };
      }

      // 3. Fallback mestre: Administrador fixo de sistema (operacional_ssz)
      // Usado caso o banco de dados esteja vazio ou inacessível.
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
        
        await db.saveUser(masterAdmin);
        return { success: true, user: masterAdmin, forceChange: false };
      }

      return { success: false, error: 'Usuário não localizado na base de dados ALS.' };
    } catch (err) {
      console.error("Erro crítico no processo de autenticação:", err);
      return { success: false, error: 'Erro de comunicação interna do sistema.' };
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
