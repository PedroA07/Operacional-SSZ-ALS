
export const stayNamingRules = {
  /**
   * Gera o nome padrão da pasta de estadia: CATEGORIA {ANO} [MES] DD a DD
   */
  generateFolderName: (category: string, startDate: string, endDate: string): string => {
    const months = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    
    // Ajuste de timezone para data local (evitar recuo de um dia)
    const dayStart = String(dStart.getDate() + 1).padStart(2, '0');
    const dayEnd = String(dEnd.getDate() + 1).padStart(2, '0');
    const monthIndex = dStart.getMonth(); // Baseado no início do período
    const year = dStart.getFullYear();

    const cat = category.trim().toUpperCase() || 'GERAL';
    const monthName = months[monthIndex];
    
    return `${cat} {${year}} [${monthName}] ${dayStart} a ${dayEnd}`;
  }
};
