
import { User } from '../types';

/**
 * Lógica de segurança isolada para troca de senha.
 * Define se o fluxo de 'Primeiro Acesso' deve ser ativado.
 */
export const authSecurity = {
  /**
   * Verifica se o usuário deve ser forçado a mudar a senha.
   * REGRA ATUALIZADA: Só força se isFirstLogin for EXPLICITAMENTE true.
   */
  mustChangePassword: (user: User): boolean => {
    // Admin Master hardcoded nunca troca
    if (user.id === 'admin-master' || user.username === 'operacional_ssz') return false;

    // Se o campo for false, null ou undefined, NÃO força a troca.
    // Isso evita o loop caso o banco não tenha o campo preenchido.
    return user.isFirstLogin === true;
  }
};
