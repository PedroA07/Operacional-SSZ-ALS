
// @ts-ignore
import { createWorker } from 'tesseract.js';

export const ocrService = {
  /**
   * Extrai texto localmente utilizando o motor Tesseract.js
   */
  extractAllText: async (imageSource: string, onProgress?: (p: number) => void): Promise<string> => {
    let worker: any = null;
    try {
      // Inicialização robusta usando o CDN oficial para os recursos de processamento
      worker = await createWorker('por', 1, {
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
      console.error("Falha técnica no processamento de imagem:", error);
      if (worker) {
        try { await worker.terminate(); } catch (e) {}
      }
      throw new Error("Não foi possível processar esta imagem no seu navegador.");
    }
  }
};
