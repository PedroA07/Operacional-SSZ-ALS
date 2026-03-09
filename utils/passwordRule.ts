
import { User } from '../types';

/**
 * REGRA DE OURO DO PRIMEIRO ACESSO:
 * Esta função determina se o sistema deve bloquear o usuário e exigir uma nova senha.
 */
export const passwordRule = {
  /**
   * Verifica se o usuário é obrigado a mudar a senha agora.
   * Retorna TRUE apenas se for o primeiro login absoluto.
   */
  shouldForceChange: (user: User): boolean => {
    // 1. Se isFirstLogin for FALSE ou UNDEFINED, consideramos que ele JÁ ALTEROU a senha.
    // Só forçamos se for estritamente TRUE.
    if (user.isFirstLogin === true) {
      return true;
    }

    return false;
  }
};
