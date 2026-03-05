
import { User } from '../types';

/**
 * Lógica centralizada para determinar se o fluxo de troca de senha obrigatória deve ser exibido.
 * Ajustada para ser extremamente rigorosa e evitar loops infinitos.
 */
export const authSecurity = {
  /**
   * Verifica se o usuário deve mudar a senha.
   * REGRA: Só força se isFirstLogin for EXPLICITAMENTE true.
   * Se for null, undefined ou false, libera o acesso.
   */
  mustChangePassword: (user: User): boolean => {
    // Retorna true APENAS se o valor for booleano true.
    return user.isFirstLogin === true;
  }
};
