
import { supabase, db } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
  /**
   * Realiza o login consultando a tabela 'users' no Supabase.
   * Busca pelo campo 'username' e valida a coluna 'password'.
   */
  async login(username: string, password: string, retry = true): Promise<{ success: boolean; user?: User; error?: string; isDatabaseDown?: boolean }> {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();
    
    if (!inputUser || !inputPass) {
      return { success: false, error: 'Preencha usuário e senha.' };
    }

    // Fallback de Emergência: Caso o banco esteja offline ou para configuração inicial
    const isMaster = inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && inputPass === ADMIN_CREDENTIALS.password;

    if (!supabase) {
      if (isMaster) {
        return { success: true, user: this.getMasterUser() };
      }
      return { success: false, error: 'Configuração de banco ausente.', isDatabaseDown: true };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); 

      // Busca na tabela 'users' onde a coluna 'username' é igual ao input
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', inputUser)
        .maybeSingle();

      clearTimeout(timeoutId);

      if (error) throw error;

      // Se não encontrar no banco, verifica se é o acesso mestre
      if (!data) {
        if (isMaster) return { success: true, user: this.getMasterUser() };
        return { success: false, error: 'Usuário não localizado.' };
      }

      // Validação da coluna 'password' no banco
      if (data.password !== inputPass) {
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
        lastLogin: new Date().toISOString(),
        photo: data.photo,
        position: data.position,
        driverId: data.driver_id || data.driverid,
        staffId: data.staff_id || data.staffid,
        status: data.status,
        isFirstLogin: data.is_first_login ?? data.isfirstlogin
      };

      // Atualiza timestamp em background
      supabase.from('users').update({ last_login: user.lastLogin, presence_status: 'online' }).eq('id', user.id).then();

      return { success: true, user };

    } catch (err: any) {
      console.error("Auth Exception:", err);

      // Tenta novamente uma vez se for erro de timeout (acordando o banco)
      if (retry && (err.name === 'AbortError' || err.message?.includes('fetch'))) {
        await new Promise(r => setTimeout(r, 1500));
        return this.login(username, password, false);
      }

      // Se der erro de conexão mas for o master, permite entrar para manutenção
      if (isMaster) return { success: true, user: this.getMasterUser() };

      return { 
        success: false, 
        error: 'Servidor ALS não respondeu. Tente novamente em instantes.',
        isDatabaseDown: true 
      };
    }
  },

  /**
   * Retorna o objeto de usuário master estático
   */
  getMasterUser(): User {
    return {
      id: 'admin-master',
      username: ADMIN_CREDENTIALS.username,
      displayName: 'Operacional Master',
      role: 'admin',
      lastLogin: new Date().toISOString(),
      status: 'Ativo',
      position: 'Administração SSZ',
      isFirstLogin: false
    };
  }
};
