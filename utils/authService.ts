
import { db, supabase } from './storage';
import { User } from '../types';
import { ADMIN_CREDENTIALS } from '../constants';

export const authService = {
  /**
   * Realiza o login consultando obrigatoriamente o Supabase.
   */
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const inputUser = username.trim().toLowerCase();
    
    try {
      if (!supabase) {
        return { success: false, error: 'Erro de Configuração: Chaves do Supabase não encontradas no ambiente.' };
      }

      // 1. Busca o usuário no Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', inputUser)
        .single();

      // 2. Se não encontrar no banco, mas for o login mestre, tenta criar/entrar
      if (error || !data) {
        if (inputUser === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
          const masterAdmin: User = {
            id: 'admin-master',
            username: ADMIN_CREDENTIALS.username,
            password: ADMIN_CREDENTIALS.password,
            displayName: 'Operacional Master',
            role: 'admin',
            lastLogin: new Date().toISOString(),
            status: 'Ativo',
            position: 'Administração ALS SSZ'
          };
          // Tenta salvar no banco para futuras sessões
          await db.saveUser(masterAdmin);
          return { success: true, user: masterAdmin };
        }
        return { success: false, error: 'Usuário não localizado no servidor ALS.' };
      }

      // 3. Valida senha
      if (data.password !== password) {
        return { success: false, error: 'Chave de segurança incorreta.' };
      }

      if (data.status === 'Inativo') {
        return { success: false, error: 'Este acesso foi desativado pela ALS.' };
      }

      const user: User = {
        id: data.id,
        username: data.username,
        displayName: data.displayname || data.username,
        role: data.role,
        lastLogin: new Date().toISOString(),
        photo: data.photo,
        position: data.position,
        driverId: data.driverid,
        staffId: data.staffid,
        status: data.status,
        isFirstLogin: data.isfirstlogin
      };

      // Atualiza o timestamp de login no banco
      await supabase.from('users').update({ lastlogin: user.lastLogin }).eq('id', user.id);

      return { success: true, user };
    } catch (err) {
      console.error("Erro crítico login:", err);
      return { success: false, error: 'Servidor ALS temporariamente indisponível.' };
    }
  }
};
