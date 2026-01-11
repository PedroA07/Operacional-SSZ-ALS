
// @ts-ignore
import * as Tesseract from 'tesseract.js';

export const ocrService = {
  /**
   * Extrai texto localmente utilizando o motor Tesseract.js v5
   */
  extractAllText: async (imageSource: string, onProgress?: (p: number) => void): Promise<string> => {
    try {
      // No Tesseract v5+, a inicialização é simplificada
      const worker = await (Tesseract as any).createWorker('por', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(m.progress);
          }
        },
      });

      const { data: { text } } = await worker.recognize(imageSource);
      await worker.terminate();

      return text || '';
    } catch (error) {
      console.error("Erro no OCR Local (Tesseract v5):", error);
      throw new Error("O navegador não conseguiu processar a imagem localmente. Verifique se o recurso está bloqueado.");
    }
  }
};
