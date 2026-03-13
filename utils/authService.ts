
import { supabase, db } from './storage';
import { User } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; isDatabaseDown?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();
    
    if (!inputUser || !inputPass) {
      return { success: false, error: 'Preencha usuário e senha.' };
    }

    const nowISO = new Date().toISOString();

    if (!supabase) {
      return { success: false, error: 'Configuração de banco ausente.', isDatabaseDown: true };
    }

    try {
      // Tenta no banco
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', inputUser)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { success: false, error: 'Usuário não cadastrado.' };
      if (data.password !== inputPass) return { success: false, error: 'Senha incorreta.' };
      if (data.status === 'Inativo') return { success: false, error: 'Acesso desativado.' };

      const user: User = {
        id: data.id,
        username: data.username,
        displayName: data.display_name || data.displayname || data.username,
        role: data.role,
        lastLogin: nowISO,
        photo: data.photo,
        position: data.position,
        driverId: data.driver_id || data.driverid,
        staffId: data.staff_id || data.staffid,
        status: data.status,
        isFirstLogin: data.isfirstlogin
      };

      await supabase.from('users').update({ lastlogin: nowISO, presence_status: 'online' }).eq('id', user.id);
      return { success: true, user };

    } catch (err: any) {
      return { success: false, error: 'Servidor ALS offline.', isDatabaseDown: true };
    }
  }
};
