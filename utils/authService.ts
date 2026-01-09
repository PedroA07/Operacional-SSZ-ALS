
import { db, supabase } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
  /**
   * Realiza o login. Prioriza o acesso mestre local e depois consulta o Supabase.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();
    
    try {
      // 1. Verificação de Acesso Mestre Local (Fallback de Segurança)
      if (inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && inputPass === ADMIN_CREDENTIALS.password) {
        const masterAdmin: User = {
          id: 'admin-master',
          username: ADMIN_CREDENTIALS.username,
          password: ADMIN_CREDENTIALS.password,
          displayName: 'Operacional Master',
          role: 'admin',
          lastLogin: new Date().toISOString(),
          status: 'Ativo',
          position: 'Administração ALS SSZ',
          isFirstLogin: false
        };

        // Tenta persistir no banco se o Supabase estiver disponível
        if (supabase) {
          try {
            await db.saveUser(masterAdmin);
          } catch (e) {
            console.warn("Operando localmente: Falha na sincronização do admin mestre.");
          }
        }
        
        return { success: true, user: masterAdmin };
      }

      // 2. Verificação de Conexão Supabase para demais usuários
      if (!supabase) {
        return { success: false, error: 'Servidor ALS Offline. Use as credenciais mestres.' };
      }

      // 3. Busca o usuário no Supabase usando ILIKE para evitar problemas de Case Sensitivity
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', inputUser)
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: 'Usuário não localizado no servidor ALS.' };
      }

      // 4. Valida senha (tratando possíveis espaços)
      const storedPassword = (data.password || '').trim();
      if (storedPassword !== inputPass) {
        return { success: false, error: 'Chave de segurança incorreta.' };
      }

      if (data.status === 'Inativo') {
        return { success: false, error: 'Este acesso foi desativado pela ALS.' };
      }

      const user: User = {
        id: data.id,
        username: data.username,
        displayName: data.displayname || data.display_name || data.username,
        role: data.role,
        lastLogin: new Date().toISOString(),
        photo: data.photo,
        position: data.position,
        driverId: data.driverid || data.driver_id,
        staffId: data.staffid || data.staff_id,
        status: data.status,
        isFirstLogin: data.isfirstlogin || data.is_first_login
      };

      // Atualiza o timestamp de login no banco em background
      supabase.from('users').update({ last_login: user.lastLogin }).eq('id', user.id).then();

      return { success: true, user };
    } catch (err) {
      console.error("Erro crítico login:", err);
      return { success: false, error: 'Falha na comunicação com o servidor central.' };
    }
  }
};
