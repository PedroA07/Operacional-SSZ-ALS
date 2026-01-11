
import { supabase, db } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
  /**
   * Realiza o login consultando a tabela 'users' no Supabase.
   * Valida também o acesso mestre definido em constantes.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string; isDatabaseDown?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();
    
    if (!inputUser || !inputPass) {
      return { success: false, error: 'Preencha usuário e senha.' };
    }

    const nowISO = new Date().toISOString();

    // 1. Verificação imediata do Administrador Mestre (Hardcoded)
    const isMaster = inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && inputPass === ADMIN_CREDENTIALS.password;

    if (!supabase) {
      if (isMaster) return { success: true, user: this.getMasterUser(nowISO) };
      return { success: false, error: 'Configuração de banco ausente.', isDatabaseDown: true };
    }

    try {
      // 2. Busca no banco de dados (users)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', inputUser)
        .maybeSingle();

      if (error) throw error;

      // Se não houver no banco, mas for o mestre, deixa entrar
      if (!data) {
        if (isMaster) return { success: true, user: this.getMasterUser(nowISO) };
        return { success: false, error: 'Usuário não cadastrado.' };
      }

      // 3. Validação de Senha do Banco
      if (data.password !== inputPass) {
        // Fallback: se a senha do banco falhar mas for a senha master para o usuário master, libera
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
        lastLogin: nowISO, // FORÇA O TIMER A ZERAR NO FRONT
        photo: data.photo,
        position: data.position,
        driverId: data.driver_id || data.driverid,
        staffId: data.staff_id || data.staffid,
        status: data.status,
        isFirstLogin: data.is_first_login ?? data.isfirstlogin
      };

      // Atualiza timestamp no banco
      supabase.from('users').update({ last_login: nowISO, presence_status: 'online' }).eq('id', user.id).then();

      return { success: true, user };

    } catch (err: any) {
      console.error("Auth Exception:", err);
      if (isMaster) return { success: true, user: this.getMasterUser(nowISO) };

      return { 
        success: false, 
        error: 'Servidor ALS offline. Tente novamente em instantes.',
        isDatabaseDown: true 
      };
    }
  },

  getMasterUser(timestamp: string): User {
    return {
      id: 'admin-master',
      username: ADMIN_CREDENTIALS.username,
      displayName: 'Operacional Master',
      role: 'admin',
      lastLogin: timestamp,
      status: 'Ativo',
      position: 'Administração SSZ',
      isFirstLogin: false
    };
  }
};
