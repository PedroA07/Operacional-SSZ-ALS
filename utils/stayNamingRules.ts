
export const stayNamingRules = {
  /**
   * Gera o nome padrão da pasta de estadia: CATEGORIA (DD/MM A DD/MM)
   */
  generateFolderName: (category: string, startDate: string, endDate: string): string => {
    const format = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = String(d.getDate() + 1).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    };

    const cat = category.trim().toUpperCase() || 'GERAL';
    const period = `${format(startDate)} A ${format(endDate)}`;
    
    return `${cat} (${period})`;
  }
};
