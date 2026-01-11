
/**
 * ALS Image Compressor Utility v1.2
 * Otimizado para processamento resiliente de imagens em nuvem (Cloudflare R2)
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export const imageCompressor = {
  /**
   * Comprime uma imagem e retorna Base64
   */
  compress: async (source: File | string, options: CompressionOptions = {}): Promise<string> => {
    const {
      maxWidth = 1600,
      maxHeight = 1600,
      quality = 0.8,
      mimeType = 'image/jpeg'
    } = options;

    try {
      let imageObjectUrl: string;

      // Se for uma URL externa, tentamos baixar como Blob primeiro (mais robusto para Canvas)
      if (typeof source === 'string' && source.startsWith('http')) {
        try {
          const response = await fetch(source, { mode: 'cors' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          imageObjectUrl = URL.createObjectURL(blob);
        } catch (fetchErr) {
          console.error("Erro ao baixar imagem para compressão:", fetchErr);
          throw new Error("CORS_BLOCK: O Cloudflare bloqueou o acesso aos pixels. Verifique as configurações de CORS no Bucket R2.");
        }
      } else if (typeof source === 'string') {
        imageObjectUrl = source; // Já é base64
      } else {
        imageObjectUrl = URL.createObjectURL(source); // É um arquivo File
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("TIMEOUT: A imagem demorou demais para processar."));
        }, 15000);

        const cleanup = () => {
          clearTimeout(timeout);
          if (imageObjectUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageObjectUrl);
          }
        };

        img.onload = () => {
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
            cleanup();
            reject(new Error("CANVAS_ERROR: Falha ao criar contexto gráfico."));
            return;
          }

          try {
            ctx.drawImage(img, 0, 0, width, height);
            const result = canvas.toDataURL(mimeType, quality);
            cleanup();
            resolve(result);
          } catch (e) {
            cleanup();
            reject(new Error("SECURITY_ERROR: Não foi possível ler os pixels (CORS)."));
          }
        };

        img.onerror = () => {
          cleanup();
          reject(new Error("LOAD_ERROR: O formato da imagem é inválido ou o link quebrou."));
        };

        img.src = imageObjectUrl;
      });
    } catch (err: any) {
      throw err;
    }
  }
};
