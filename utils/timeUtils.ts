
/**
 * Utilitário central para cálculo de duração de sessão
 */
export const timeUtils = {
  /**
   * Calcula a diferença entre o início e agora, retornando no formato HH:MM:SS
   */
  calculateDuration: (startTimeIso?: string): string => {
    if (!startTimeIso) return '00:00:00';
    
    try {
      const start = new Date(startTimeIso).getTime();
      const now = Date.now();
      const diff = now - start;
      
      // Garante que não retorne tempo negativo caso o relógio local esteja atrasado
      const totalSeconds = Math.floor(Math.max(0, diff) / 1000);
      
      const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const s = (totalSeconds % 60).toString().padStart(2, '0');
      
      return `${h}:${m}:${s}`;
    } catch (e) {
      return '00:00:00';
    }
  }
};
