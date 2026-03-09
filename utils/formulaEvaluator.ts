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

      // Substituição de outras colunas customizadas (por label)
      if (session.customColumns) {
        session.customColumns.forEach(col => {
          if (col.type === 'number' || col.type === 'currency') {
            const val = record.customValues?.[col.id] || 0;
            // Escapa caracteres especiais do label para o regex
            const escapedLabel = col.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`{${escapedLabel}}`, 'g');
            processedFormula = processedFormula.replace(regex, val.toString());
          }
        });
      }

      // Avaliação segura (apenas matemática básica e funções Math permitidas)
      // Permitimos: números, operadores, parênteses, pontos, espaços e funções Math específicas
      const safePattern = /^[0-9+\-*/().\s,]+$|Math\.(round|ceil|floor|abs|max|min)\([0-9+\-*/().\s,Math.roundMath.ceilMath.floorMath.absMath.maxMath.min]+\)/;
      
      // Uma abordagem mais simples para o regex de segurança:
      const sanitized = processedFormula
        .replace(/Math\.(round|ceil|floor|abs|max|min)/g, '')
        .replace(/[0-9+\-*/().\s,]/g, '');

      if (sanitized.length > 0) {
        console.warn("Fórmula contém caracteres ou funções não permitidas:", processedFormula);
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
