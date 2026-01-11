
import { ocrService } from './ocrService';

export interface NFData {
  key: string;
  number: string;
  series: string;
}

export const textExtractionService = {
  /**
   * Extrai todo o texto contido na imagem sem filtros
   */
  extractGeneralText: async (imageUrl: string, onProgress?: (p: number) => void): Promise<string> => {
    return await ocrService.extractAllText(imageUrl, onProgress);
  },

  /**
   * Extrai e valida IDs de Container (4 letras + 7 números)
   */
  extractContainer: async (imageUrl: string, onProgress?: (p: number) => void): Promise<string | null> => {
    const rawText = await ocrService.extractAllText(imageUrl, onProgress);
    const cleanText = rawText.replace(/\s/g, '').toUpperCase();
    
    // Regex para padrão ISO 6346 (BIC Code): 4 letras + 7 dígitos
    const pattern = /[A-Z]{4}\d{7}/;
    const match = cleanText.match(pattern);
    
    return match ? match[0] : null;
  },

  /**
   * Extrai a chave da NF-e e processa seus metadados
   */
  extractNF: async (imageUrl: string, onProgress?: (p: number) => void): Promise<NFData | null> => {
    const rawText = await ocrService.extractAllText(imageUrl, onProgress);
    const digitsOnly = rawText.replace(/\D/g, '');
    
    // Procura por uma sequência de 44 dígitos (Chave de Acesso NF-e)
    const pattern = /\d{44}/;
    const match = digitsOnly.match(pattern);
    
    if (match) {
      const key = match[0];
      return {
        key: key,
        // Posições na chave (1-based): Série 23-25, Número 26-34
        series: key.substring(22, 25).replace(/^0+/, '') || '0',
        number: key.substring(25, 34).replace(/^0+/, '')
      };
    }
    
    return null;
  }
};
