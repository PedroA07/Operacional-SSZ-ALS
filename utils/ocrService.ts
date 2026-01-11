
// @ts-ignore
import Tesseract from 'tesseract.js';

export const ocrService = {
  /**
   * Extrai texto localmente utilizando o motor Tesseract.js de forma simplificada
   */
  extractAllText: async (imageSource: string, onProgress?: (p: number) => void): Promise<string> => {
    try {
      const result = await Tesseract.recognize(
        imageSource,
        'por',
        {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && onProgress) {
              onProgress(m.progress);
            }
          }
        }
      );

      return result.data.text || '';
    } catch (error) {
      console.error("Falha técnica no processamento de imagem:", error);
      throw new Error("Não foi possível processar esta imagem. Verifique sua conexão ou tente outra foto.");
    }
  }
};
