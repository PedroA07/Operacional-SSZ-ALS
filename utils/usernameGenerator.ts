
/**
 * Utilitário para geração de sugestões de nomes de usuário
 */
export const usernameGenerator = {
  /**
   * Gera uma lista de sugestões baseadas no nome completo
   * Ex: "Carlos Eduardo Silva" -> ["carlos.eduardo", "carlos.silva"]
   */
  generateSuggestions: (fullName: string): string[] => {
    if (!fullName || fullName.trim().split(' ').length < 2) return [];

    const parts = fullName.trim().toLowerCase().split(/\s+/);
    const firstName = parts[0];
    const surnames = parts.slice(1);

    // Filtra preposições comuns em nomes brasileiros
    const ignoreList = ['de', 'da', 'do', 'dos', 'das', 'e'];
    const validSurnames = surnames.filter(s => !ignoreList.includes(s));

    return validSurnames.map(surname => `${firstName}.${surname}`);
  }
};
