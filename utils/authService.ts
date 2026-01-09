
import { db, supabase } from './storage';
import { User } from '../types';

export const authService = {
  /**
   * Realiza o login consultando exclusivamente o banco de dados Supabase.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();
    
    // Verificação de Conexão Supabase
    if (!supabase) {
      return { success: false, error: 'Erro de infraestrutura: Banco de dados não configurado.' };
    }

    try {
      // Busca o usuário no Supabase
      // Usamos AbortController para não deixar a UI travada em caso de erro 522/timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', inputUser)
        .maybeSingle();

      clearTimeout(timeoutId);

      if (error) {
        console.error("Database Error:", error);
        return { success: false, error: 'O servidor de banco de dados não respondeu. Tente novamente.' };
      }

      if (!data) {
        return { success: false, error: 'Usuário não cadastrado no sistema ALS.' };
      }

      // Validação de senha (Case Sensitive)
      const storedPassword = (data.password || '').trim();
      if (storedPassword !== inputPass) {
        return { success: false, error: 'Chave de segurança incorreta.' };
      }

      if (data.status === 'Inativo') {
        return { success: false, error: 'Este acesso foi desativado pela administração.' };
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

      // Atualiza timestamp de login em background
      supabase.from('users').update({ 
        last_login: user.lastLogin,
        presence_status: 'online'
      }).eq('id', user.id).then();

      return { success: true, user };
    } catch (err: any) {
      console.error("Auth Critical Failure:", err);
      if (err.name === 'AbortError') {
        return { success: false, error: 'Tempo de resposta esgotado. Verifique sua conexão.' };
      }
      return { success: false, error: 'Erro de comunicação com o servidor ALS.' };
    }
  }
};
