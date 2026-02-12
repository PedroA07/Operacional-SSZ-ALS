/**
 * Motor de Fórmulas Dinâmicas para Excel (Padrão Internacional)
 * As referências de colunas seguem o layout:
 * A: Status | B: Nº Lacre | C: Container | D: Booking | E: Data | F: Motorista
 */
export const excelSealFormulas = {
  /**
   * Status Automático: Se C, D, E ou F estiverem preenchidos, status = UTILIZADO
   */
  getRowStatusFormula: (row: number) => {
    return `IF(OR(C${row}<>"", D${row}<>"", E${row}<>"", F${row}<>""), "UTILIZADO", "DISPONÍVEL")`;
  },

  /**
   * Contador de Utilizados no Topo
   */
  getSummaryUsedFormula: (totalRows: number) => {
    const startRow = 6; // Onde os dados começam
    const endRow = startRow + totalRows - 1;
    return `COUNTIF(A${startRow}:A${endRow}, "UTILIZADO")`;
  },

  /**
   * Contador de Disponíveis no Topo
   */
  getSummaryAvailableFormula: (totalRows: number) => {
    const startRow = 6;
    const endRow = startRow + totalRows - 1;
    return `COUNTIF(A${startRow}:A${endRow}, "DISPONÍVEL")`;
  }
};
