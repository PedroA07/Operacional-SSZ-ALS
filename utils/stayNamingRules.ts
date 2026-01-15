
export const stayNamingRules = {
  /**
   * Gera o nome padrão da pasta de estadia: CATEGORIA {ANO} [MES] [DD] a [DD]
   */
  generateFolderName: (category: string, startDate: string, endDate: string): string => {
    const months = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    // Usamos UTC para evitar que o fuso horário altere o dia selecionado no input
    const dStart = new Date(startDate + 'T12:00:00');
    const dEnd = new Date(endDate + 'T12:00:00');
    
    const dayStart = String(dStart.getDate()).padStart(2, '0');
    const dayEnd = String(dEnd.getDate()).padStart(2, '0');
    const monthIndex = dStart.getMonth();
    const year = dStart.getFullYear();

    const cat = category.trim().toUpperCase() || 'GERAL';
    const monthName = months[monthIndex];
    
    return `${cat} {${year}} [${monthName}] [${dayStart}] a [${dayEnd}]`;
  }
};
