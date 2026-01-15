
export const stayNamingRules = {
  /**
   * Gera o nome padrão da pasta de estadia: CATEGORIA|ANO|MES|DIA A DIA (Sem colchetes)
   */
  generateFolderName: (category: string, startDate: string, endDate: string): string => {
    const months = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    // Garante que a data seja interpretada corretamente independente do fuso horário local
    const dStart = new Date(startDate + 'T12:00:00');
    const dEnd = new Date(endDate + 'T12:00:00');
    
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
      return `${category.toUpperCase()}|ERRO|DATA|INVÁLIDA`;
    }

    const dayStart = String(dStart.getDate()).padStart(2, '0');
    const dayEnd = String(dEnd.getDate()).padStart(2, '0');
    const monthIndex = dStart.getMonth();
    const year = dStart.getFullYear();

    const catName = category.trim().toUpperCase() || 'GERAL';
    const monthName = months[monthIndex];
    
    // Formato com pipe para facilitar o split na UI: CATEGORIA|2025|MARÇO|01 A 10
    return `${catName}|${year}|${monthName}|${dayStart} A ${dayEnd}`;
  }
};
