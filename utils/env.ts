/**
 * Utilitário para acessar variáveis de ambiente de forma segura
 * Funciona tanto em Vite (browser) quanto em Node.js
 */
export const getEnv = (key: string): string => {
  // Tenta import.meta.env (Vite)
  try {
    const viteEnv = (import.meta as any).env;
    if (viteEnv && viteEnv[key]) return viteEnv[key];
  } catch (e) {
    // Ignora erro se import.meta não estiver disponível
  }

  // Tenta process.env (Node.js)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignora erro se process não estiver disponível
  }

  return '';
};
