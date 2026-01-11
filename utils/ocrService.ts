
// @ts-ignore
import { createWorker } from 'tesseract.js';

export const ocrService = {
  /**
   * Extrai texto localmente utilizando o motor Tesseract.js
   */
  extractAllText: async (imageSource: string, onProgress?: (p: number) => void): Promise<string> => {
    try {
      const worker = await createWorker('por', 1, {
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
      console.error("Erro na extração de texto:", error);
      throw new Error("Falha ao processar imagem localmente.");
    }
  }
};
