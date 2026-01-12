
/**
 * ALS Image Compressor Utility v1.6
 * Otimizado para economia extrema de armazenamento (R2) e rede móvel.
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export const imageCompressor = {
  /**
   * Comprime uma imagem para JPEG leve e retorna Base64
   */
  compress: async (source: File | string, options: CompressionOptions = {}): Promise<string> => {
    const {
      maxWidth = 800, // Reduzido drasticamente para 800px (Suficiente para leitura de documentos)
      maxHeight = 800,
      quality = 0.4, // Qualidade 0.4 gera arquivos extremamente leves (~60kb)
      mimeType = 'image/jpeg'
    } = options;

    const imageUrl = typeof source === 'string' 
      ? (source.startsWith('http') ? `${source}${source.includes('?') ? '&' : '?'}cb=${Date.now()}` : source)
      : URL.createObjectURL(source);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensionamento Proporcional
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
          if (typeof source !== 'string') URL.revokeObjectURL(imageUrl);
          reject(new Error("Erro ao criar contexto de processamento de imagem."));
          return;
        }

        try {
          // Aplica fundo branco para JPEGs (evita transparência preta)
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          
          ctx.drawImage(img, 0, 0, width, height);
          
          const result = canvas.toDataURL(mimeType, quality);
          
          if (typeof source !== 'string') URL.revokeObjectURL(imageUrl);
          resolve(result);
        } catch (e) {
          if (typeof source !== 'string') URL.revokeObjectURL(imageUrl);
          reject(new Error("Falha no processamento de pixels (CORS)."));
        }
      };

      img.onerror = () => {
        if (typeof source !== 'string') URL.revokeObjectURL(imageUrl);
        reject(new Error("Não foi possível carregar a imagem para compressão."));
      };

      img.src = imageUrl;
    });
  }
};
