
import { User } from '../types';

/**
 * Lógica centralizada para determinar se o fluxo de troca de senha obrigatória deve ser exibido.
 * Ajustada para ignorar campos duplicados do banco e focar no estado final mapeado.
 */
export const authSecurity = {
  /**
   * Verifica se o usuário deve mudar a senha.
   * REGRA: Só força se isFirstLogin for EXPLICITAMENTE true.
   */
  mustChangePassword: (user: User): boolean => {
    // Admin Master hardcoded (operacional_ssz) nunca troca de senha por este fluxo.
    if (user.id === 'admin-master' || user.username === 'operacional_ssz') return false;

    // Se o banco retornar nulo ou false (através do mapper consolidado),
    // o usuário já passou pelo processo ou não precisa dele.
    return user.isFirstLogin === true;
  }
};
