
import { User } from '../types';

/**
 * Lógica centralizada para determinar se o fluxo de troca de senha obrigatória deve ser exibido.
 * Ajustada para ignorar campos nulos e duplicados do banco, focando no valor booleano real.
 */
export const authSecurity = {
  /**
   * Verifica se o usuário deve mudar a senha.
   * REGRA: Só força se isFirstLogin for EXPLICITAMENTE true.
   */
  mustChangePassword: (user: User): boolean => {
    // Admin Master hardcoded (operacional_ssz) nunca troca de senha por este fluxo.
    if (user.id === 'admin-master' || user.username === 'operacional_ssz') return false;

    // Conforme a imagem do seu banco, existem colunas isFirstLogin e isfirstlogin.
    // O mapper do storage já consolida isso. Aqui checamos o resultado final.
    return user.isFirstLogin === true;
  }
};
