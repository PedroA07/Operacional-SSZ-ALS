
import { supabase, db } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
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
      // Tenta primeiro no banco para logs e persistência
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', inputUser)
        .maybeSingle();

      if (isMaster) {
        const master = this.getMasterUser(nowISO);
        // Se o master existe no banco, atualiza presença, se não, entra como virtual
        if (data) await supabase.from('users').update({ last_login: nowISO, presence_status: 'online' }).eq('username', inputUser);
        return { success: true, user: master };
      }

      if (error) throw error;
      if (!data) return { success: false, error: 'Usuário não cadastrado.' };
      if (data.password !== inputPass) return { success: false, error: 'Senha incorreta.' };
      if (data.status === 'Inativo') return { success: false, error: 'Acesso desativado.' };

      const user: User = {
        id: data.id,
        username: data.username,
        displayName: data.display_name || data.username,
        role: data.role,
        lastLogin: nowISO,
        photo: data.photo,
        position: data.position,
        driverId: data.driver_id,
        staffId: data.staff_id,
        status: data.status,
        isFirstLogin: data.is_first_login
      };

      await supabase.from('users').update({ last_login: nowISO, presence_status: 'online' }).eq('id', user.id);
      return { success: true, user };

    } catch (err: any) {
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
      position: 'Gestão Geral SSZ',
      isFirstLogin: false
    };
  }
};
