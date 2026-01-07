
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const ocrService = {
  /**
   * Extrai todo o texto contido em uma imagem usando o modelo Gemini.
   */
  extractAllText: async (base64Image: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Remove o prefixo data:image/... se existir
      const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { 
              inlineData: { 
                mimeType: 'image/jpeg', 
                data: base64Data 
              } 
            },
            { 
              text: "Leia esta imagem e extraia TODO o texto contido nela de forma organizada. Mantenha a estrutura de parágrafos se possível. Retorne apenas o texto encontrado, sem comentários adicionais." 
            }
          ]
        }
      });

      return response.text || '';
    } catch (error) {
      console.error("Erro no OCR Gemini:", error);
      throw new Error("Não foi possível extrair o texto da imagem.");
    }
  }
};
