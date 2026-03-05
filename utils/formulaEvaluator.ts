import { StayRecord, StaySession } from '../types';

export const formulaEvaluator = {
  evaluate: (formula: string, record: StayRecord, session: StaySession, calculateExceededHoursDecimal: Function): number => {
    try {
      // Variáveis básicas
      const H = calculateExceededHoursDecimal(record.scheduledStart, record.departureTime, session);
      const V = session.costPerHour || 0;
      const T = H * V;

      // Substituição de variáveis na fórmula
      let processedFormula = formula
        .replace(/{H}/g, H.toString())
        .replace(/{V}/g, V.toString())
        .replace(/{T}/g, T.toString());

      // Se houver referências a outras colunas customizadas (opcional, mas complexo)
      // Por enquanto focamos nas básicas solicitadas

      // Avaliação segura (apenas matemática básica permitida por regex)
      if (!/^[0-9+\-*/().\s]+$/.test(processedFormula)) {
        console.warn("Fórmula contém caracteres inválidos:", processedFormula);
        return 0;
      }

      // eslint-disable-next-line no-eval
      const result = eval(processedFormula);
      return typeof result === 'number' ? result : 0;
    } catch (e) {
      console.error("Erro ao avaliar fórmula:", e);
      return 0;
    }
  }
};
