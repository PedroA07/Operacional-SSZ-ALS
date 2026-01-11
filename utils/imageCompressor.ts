
/**
 * ALS Image Compressor Utility
 * Reduz dimensões e qualidade de imagens para otimizar armazenamento no R2
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export const imageCompressor = {
  /**
   * Comprime uma imagem (File ou Base64) e retorna uma string Base64 otimizada
   */
  compress: async (source: File | string, options: CompressionOptions = {}): Promise<string> => {
    const {
      maxWidth = 1600, // Resolução ideal para documentos/OCR
      maxHeight = 1600,
      quality = 0.8,   // 80% mantém excelente legibilidade de textos
      mimeType = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcula redimensionamento mantendo proporção
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Falha ao criar contexto de canvas"));
          return;
        }

        // Desenha a imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta como base64 comprimido
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        resolve(compressedBase64);
      };

      img.onerror = (err) => reject(err);

      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(source);
      }
    });
  }
};
