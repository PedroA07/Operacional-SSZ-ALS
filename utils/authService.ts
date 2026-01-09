
import { db, supabase } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
  /**
   * Realiza o login. 
   * PRIORIDADE 1: Acesso Mestre (Local/Hardcoded) - Funciona mesmo sem internet.
   * PRIORIDADE 2: Consulta ao Banco de Dados (Supabase).
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();
    
    // 1. Verificação de Acesso Mestre (Segurança Crítica)
    if (inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && inputPass === ADMIN_CREDENTIALS.password) {
      const masterAdmin: User = {
        id: 'admin-master',
        username: ADMIN_CREDENTIALS.username,
        displayName: 'Administrador ALS',
        role: 'admin',
        lastLogin: new Date().toISOString(),
        status: 'Ativo',
        position: 'Diretoria de Operações',
        isFirstLogin: false
      };

      // Tenta apenas registrar o login se o banco estiver vivo, mas não bloqueia o acesso
      if (supabase) {
        db.saveUser(masterAdmin).catch(() => console.warn("Aviso: Falha ao sincronizar log de admin master."));
      }
      
      return { success: true, user: masterAdmin };
    }

    // 2. Verificação de Conexão Supabase
    if (!supabase) {
      return { success: false, error: 'Servidor de Autenticação não configurado.' };
    }

    try {
      // Busca com timeout para evitar que o 522 trave a interface
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .ilike('username', inputUser)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 8000)
      );

      const { data, error }: any = await Promise.race([fetchPromise, timeoutPromise]);

      if (error || !data) {
        return { success: false, error: 'Usuário não localizado no sistema.' };
      }

      // Validação de senha
      if (data.password !== inputPass) {
        return { success: false, error: 'Chave de segurança inválida.' };
      }

      if (data.status === 'Inativo') {
        return { success: false, error: 'Acesso temporariamente suspenso.' };
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
      supabase.from('users').update({ last_login: user.lastLogin }).eq('id', user.id).then();

      return { success: true, user };
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.message === 'TIMEOUT') {
        return { success: false, error: 'O servidor demorou a responder. Tente novamente em instantes.' };
      }
      return { success: false, error: 'Erro de comunicação com os servidores ALS.' };
    }
  }
};
