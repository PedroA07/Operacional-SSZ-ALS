
export const stayNamingRules = {
  /**
   * Gera o nome padrão da pasta de estadia: CATEGORIA - MÊS ANO (DD a DD)
   */
  generateFolderName: (category: string, startDate: string, endDate: string): string => {
    const months = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const dStart = new Date(startDate + 'T12:00:00');
    const dEnd = new Date(endDate + 'T12:00:00');
    
    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
      return `${category.toUpperCase()} - DATA INVÁLIDA`;
    }

    const dayStart = String(dStart.getDate()).padStart(2, '0');
    const dayEnd = String(dEnd.getDate()).padStart(2, '0');
    const monthName = months[dStart.getMonth()];
    const year = dStart.getFullYear();
    const catName = category.trim().toUpperCase() || 'GERAL';
    
    // Formato amigável: CATEGORIA | ANO | MÊS | DIAS
    return `${catName}|${year}|${monthName}|${dayStart} A ${dayEnd}`;
  }
};
