
import { User } from '../types';

/**
 * Lógica centralizada de segurança para troca de senha.
 * Isolada para evitar alterações acidentais em outros módulos.
 */
export const authSecurity = {
  /**
   * Verifica se o usuário deve ser forçado a mudar a senha.
   * Regra: Se isFirstLogin for true OU se a senha for a padrão '12345678'.
   */
  mustChangePassword: (user: User): boolean => {
    // Admin master hardcoded nunca é forçado a trocar por aqui
    if (user.id === 'admin-master') return false;

    const isDefaultPassword = user.password === '12345678';
    const isExplicitFirstLogin = user.isFirstLogin === true;

    return isExplicitFirstLogin || isDefaultPassword;
  }
};
