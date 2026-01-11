
/**
 * ALS Image Compressor Utility v1.1
 * Otimizado para processamento de imagens externas (CORS)
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export const imageCompressor = {
  /**
   * Comprime uma imagem (File ou Base64/URL) e retorna uma string Base64 otimizada
   */
  compress: async (source: File | string, options: CompressionOptions = {}): Promise<string> => {
    const {
      maxWidth = 1600,
      maxHeight = 1600,
      quality = 0.8,
      mimeType = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // CRÍTICO: Permite que o Canvas manipule imagens do Cloudflare R2 sem erros de segurança (Tainted Canvas)
      if (typeof source === 'string' && source.startsWith('http')) {
        img.crossOrigin = "anonymous";
      }

      // Timeout de segurança: Se a imagem não carregar em 15s, rejeita para não travar o loop de lote
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error("Timeout ao carregar imagem para compressão"));
      }, 15000);

      img.onload = () => {
        clearTimeout(timeout);
        let width = img.width;
        let height = img.height;

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

        try {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL(mimeType, quality);
          resolve(compressedBase64);
        } catch (e) {
          reject(new Error("Erro de CORS: O servidor de imagens (Cloudflare) não autorizou a leitura dos pixels."));
        }
      };

      img.onerror = (err) => {
        clearTimeout(timeout);
        reject(new Error("Erro ao carregar recurso de imagem"));
      };

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
