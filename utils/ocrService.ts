
// @ts-ignore
import Tesseract from 'tesseract.js';

export const ocrService = {
  /**
   * Extrai texto localmente utilizando o motor Tesseract.js de forma resiliente
   */
  extractAllText: async (imageSource: string, onProgress?: (p: number) => void): Promise<string> => {
    try {
      const { data: { text } } = await Tesseract.recognize(
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

      return text || '';
    } catch (error) {
      console.error("Falha OCR:", error);
      throw new Error("O motor de captura falhou. Verifique se a imagem é nítida e tente novamente.");
    }
  }
};
