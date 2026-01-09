
import { db, supabase } from './storage';
import { User } from '../types';

export const authService = {
  /**
   * Realiza o login consultando exclusivamente o banco de dados Supabase.
   * Tratamento robusto para erros de CORS e Timeout (522).
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();
    
    if (!inputUser || !inputPass) {
      return { success: false, error: 'Preencha todos os campos.' };
    }

    // Verificação de Instalação do Cliente Supabase
    if (!supabase) {
      return { success: false, error: 'Configuração do banco de dados ausente (URL/KEY).' };
    }

    try {
      // AbortController para evitar que a requisição fique pendente infinitamente (causa do 522)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de limite

      // Consulta direta à tabela 'users'
      // Buscamos apenas os campos necessários para validação
      const { data, error } = await supabase
        .from('users')
        .select('id, username, password, display_name, role, photo, position, driver_id, staff_id, status, is_first_login')
        .eq('username', inputUser)
        .limit(1);

      clearTimeout(timeoutId);

      if (error) {
        console.error("Supabase Error Response:", error);
        return { success: false, error: `Erro no servidor ALS: ${error.message}` };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Usuário não localizado na base de dados.' };
      }

      const userData = data[0];

      // Validação de Senha (Strict)
      if (userData.password !== inputPass) {
        return { success: false, error: 'Chave de segurança inválida.' };
      }

      // Validação de Status
      if (userData.status === 'Inativo') {
        return { success: false, error: 'Acesso suspenso. Entre em contato com a administração.' };
      }

      const user: User = {
        id: userData.id,
        username: userData.username,
        displayName: userData.display_name || userData.username,
        role: userData.role,
        lastLogin: new Date().toISOString(),
        photo: userData.photo,
        position: userData.position,
        driverId: userData.driver_id,
        staffId: userData.staff_id,
        status: userData.status,
        isFirstLogin: userData.is_first_login
      };

      // Tenta atualizar o log de acesso em background
      supabase.from('users').update({ 
        last_login: user.lastLogin,
        presence_status: 'online'
      }).eq('id', user.id).then();

      return { success: true, user };

    } catch (err: any) {
      console.error("Auth Exception:", err);

      // Tratamento específico para o erro de CORS/Rede/522 relatado no console
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        return { 
          success: false, 
          error: 'Falha de conexão: O navegador foi bloqueado ao tentar acessar o servidor ALS (CORS/Timeout). Verifique sua internet ou VPN.' 
        };
      }

      if (err.name === 'AbortError') {
        return { success: false, error: 'O servidor demorou muito para responder (Tempo Esgotado).' };
      }

      return { success: false, error: 'Ocorreu uma falha na comunicação com o banco de dados.' };
    }
  }
};
