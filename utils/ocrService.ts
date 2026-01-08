
// @ts-ignore
import Tesseract from 'tesseract.js';

export const ocrService = {
  /**
   * Extrai texto localmente utilizando o motor Tesseract.js (Engine de OCR profissional)
   */
  extractAllText: async (imageSource: string, onProgress?: (p: number) => void): Promise<string> => {
    try {
      const worker = await Tesseract.createWorker('por', 1, {
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
      console.error("Erro no OCR Local:", error);
      throw new Error("O navegador não conseguiu processar a imagem localmente.");
    }
  }
};
