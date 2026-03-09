
import { User } from '../types';
import { db } from './storage';

const SESSION_KEY = 'als_session_active';

export const sessionManager = {
  /**
   * Define a sessão do usuário
   */
  set: (user: User | null) => {
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  },

  /**
   * Recupera a sessão atual
   */
  get: (): User | null => {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  },

  /**
   * Valida se a sessão ainda é condizente com o banco de dados.
   * Se o Role (privilégio) mudou, retorna falso para forçar logout.
   */
  validateIntegrity: async (currentUser: User): Promise<boolean> => {
    // Admin Master (hardcoded) não precisa de validação de DB
    if (currentUser.username === 'operacional_ssz') return true;

    try {
      const users = await db.getUsers();
      const dbUser = users.find(u => u.id === currentUser.id);
      
      if (!dbUser) return false; // Usuário foi deletado
      
      // Se a permissão no banco é diferente da permissão da sessão, desloga
      if (dbUser.role !== currentUser.role) {
        console.warn("Permissão alterada. Forçando logout...");
        return false;
      }

      // Se o usuário foi inativado, desloga
      if (dbUser.status === 'Inativo') return false;

      return true;
    } catch (e) {
      return true; // Em caso de erro de rede, mantém a sessão por enquanto
    }
  }
};
