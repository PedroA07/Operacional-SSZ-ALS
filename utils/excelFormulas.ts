
/**
 * ALS Excel Formula Engine
 * Strings de fórmulas em Inglês (Auto-traduzidas pelo Excel)
 */
export const excelFormulas = {
  /**
   * Atendeu Agenda (Col J)
   * Referências: G = Programado, H = Chegada
   */
  getAtendeuAgendaFormula: (row: number) => {
    return `IF(H${row}<=G${row}, "SIM", "NAO")`;
  },

  /**
   * Horas Excedentes (Col L) com Arredondamento ALS
   * Regra: Início = MAX(Chegada, Programado).
   * Arredondamento: >= 30min sobe, < 30min desce.
   * Referências: G = Programado, H = Chegada, I = Saída, K = FreeTime
   */
  getHorasExcedentesFormula: (row: number) => {
    // 1. Calcula o tempo bruto: Saída - MAX(Chegada, Programado) - FreeTime
    // 2. Multiplica por 24 para ter horas decimais
    // 3. Usa ROUND(..., 0) para arredondar para o inteiro mais próximo (30min é o divisor natural do ROUND(x*24))
    // 4. Divide por 24 para devolver ao formato de hora do Excel
    return `IF(OR(ISBLANK(I${row}), ISBLANK(H${row})), 0, MAX(0, ROUND((I${row} - MAX(H${row}, G${row}) - K${row}) * 24, 0) / 24))`;
  },

  /**
   * Custo Total (Col N)
   * Regra: (Horas Excedentes * 24) * Valor Hora
   * Referências: L = Horas Excedentes, M = Custo por Hora
   */
  getCustoTotalFormula: (row: number) => {
    return `(L${row}*24)*M${row}`;
  }
};
