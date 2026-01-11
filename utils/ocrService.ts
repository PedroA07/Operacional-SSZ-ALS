
// @ts-ignore
import { createWorker } from 'tesseract.js';

export const ocrService = {
  /**
   * Extrai texto localmente utilizando o motor Tesseract.js
   */
  extractAllText: async (imageSource: string, onProgress?: (p: number) => void): Promise<string> => {
    let worker: any = null;
    try {
      // Inicialização explícita para evitar erros de worker no navegador
      worker = await createWorker('por', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(m.progress);
          }
        },
        workerPath: 'https://esm.sh/tesseract.js@v5.1.1/dist/worker.min.js',
        corePath: 'https://esm.sh/tesseract.js-core@v5.1.0/tesseract-core.wasm.js',
      });

      const { data: { text } } = await worker.recognize(imageSource);
      await worker.terminate();

      return text || '';
    } catch (error) {
      console.error("Falha técnica no OCR:", error);
      if (worker) await worker.terminate();
      throw new Error("Não foi possível inicializar o motor de captura no seu navegador.");
    }
  }
};
