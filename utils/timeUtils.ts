
/**
 * Utilitário central para cálculo de duração de sessão baseado no Banco de Dados
 */
export const timeUtils = {
  /**
   * Calcula a diferença entre o início (DB) e agora (Local), retornando no formato HH:MM:SS
   */
  calculateDuration: (startTimeIso?: string): string => {
    if (!startTimeIso) return '00:00:00';
    
    try {
      // Converte a string ISO do banco para objeto Date
      const start = new Date(startTimeIso).getTime();
      const now = Date.now();
      
      // Cálculo da diferença em milissegundos
      const diff = now - start;
      
      // Converte para segundos totais, ignorando diferenças menores que 1s
      // e garantindo que não seja negativo (ex: relógio do PC atrasado)
      const totalSeconds = Math.floor(Math.max(0, diff) / 1000);
      
      const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const s = (totalSeconds % 60).toString().padStart(2, '0');
      
      return `${h}:${m}:${s}`;
    } catch (e) {
      console.error("Erro ao calcular duração:", e);
      return '00:00:00';
    }
  }
};
