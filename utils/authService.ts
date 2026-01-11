
import { supabase, db } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
  /**
   * Realiza o login consultando a tabela 'users' no Supabase.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; isDatabaseDown?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();
    
    if (!inputUser || !inputPass) {
      return { success: false, error: 'Preencha usuário e senha.' };
    }

    const nowISO = new Date().toISOString();

    const isMaster = inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && inputPass === ADMIN_CREDENTIALS.password;

    if (!supabase) {
      if (isMaster) return { success: true, user: this.getMasterUser(nowISO) };
      return { success: false, error: 'Configuração de banco ausente.', isDatabaseDown: true };
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', inputUser)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        if (isMaster) return { success: true, user: this.getMasterUser(nowISO) };
        return { success: false, error: 'Usuário não cadastrado.' };
      }

      if (data.password !== inputPass) {
        if (isMaster) return { success: true, user: this.getMasterUser(nowISO) };
        return { success: false, error: 'Senha incorreta.' };
      }

      if (data.status === 'Inativo') {
        return { success: false, error: 'Este acesso está desativado.' };
      }

      const user: User = {
        id: data.id,
        username: data.username,
        displayName: data.display_name || data.displayname || data.username,
        role: data.role,
        lastLogin: nowISO, // Reset do timer local
        photo: data.photo,
        position: data.position,
        driverId: data.driver_id || data.driverid,
        staffId: data.staff_id || data.staffid,
        status: data.status,
        isFirstLogin: data.is_first_login ?? data.isfirstlogin,
        lastSeen: nowISO // Reset do timer de presença lateral (OnlineStatus)
      };

      // Atualização atômica no servidor para zerar o OnlineStatus widget
      await supabase.from('users').update({ 
        last_login: nowISO, 
        last_seen: nowISO, 
        presence_status: 'online' 
      }).eq('id', user.id);

      return { success: true, user };

    } catch (err: any) {
      console.error("Auth Exception:", err);
      if (isMaster) return { success: true, user: this.getMasterUser(nowISO) };
      return { success: false, error: 'Servidor ALS offline.', isDatabaseDown: true };
    }
  },

  getMasterUser(timestamp: string): User {
    return {
      id: 'admin-master',
      username: ADMIN_CREDENTIALS.username,
      displayName: 'Operacional Master',
      role: 'admin',
      lastLogin: timestamp,
      lastSeen: timestamp,
      status: 'Ativo',
      position: 'Administração SSZ',
      isFirstLogin: false
    };
  }
};
