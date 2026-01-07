
// @ts-expect-error
import Tesseract from 'tesseract.js';

export const ocrService = {
  /**
   * Extrai texto localmente usando Tesseract.js (Sem uso de APIs de IA externas)
   * @param imageSource URL da imagem ou base64
   * @param onProgress Callback opcional para monitorar o progresso (0 a 1)
   */
  extractAllText: async (imageSource: string, onProgress?: (p: number) => void): Promise<string> => {
    try {
      const result = await Tesseract.recognize(
        imageSource,
        'por+eng', // Português e Inglês para termos técnicos de transporte
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
      console.error("Erro no OCR Local:", error);
      throw new Error("Falha ao ler o documento localmente.");
    }
  }
};