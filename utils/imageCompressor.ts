
/**
 * ALS Image Compressor Utility v1.3
 * Otimizado para contornar problemas de cache e CORS no Cloudflare R2
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

      if (typeof source === 'string' && source.startsWith('http')) {
        try {
          // Adicionamos um parâmetro aleatório (?cors=...) para evitar que o navegador 
          // use uma versão em cache da imagem que não possui os cabeçalhos de CORS.
          const separator = source.includes('?') ? '&' : '?';
          const corsUrl = `${source}${separator}cors_bust=${Date.now()}`;
          
          const response = await fetch(corsUrl, { 
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-store'
          });
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          imageObjectUrl = URL.createObjectURL(blob);
        } catch (fetchErr) {
          console.error("Erro ao baixar imagem para compressão:", fetchErr);
          throw new Error("CORS_BLOCK: O servidor de imagens recusou o acesso. Configure a política de CORS no R2.");
        }
      } else if (typeof source === 'string') {
        imageObjectUrl = source; // Base64
      } else {
        imageObjectUrl = URL.createObjectURL(source); // File
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error("TIMEOUT: Servidor lento."));
        }, 20000);

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
            reject(new Error("CANVAS_FAIL"));
            return;
          }

          try {
            ctx.drawImage(img, 0, 0, width, height);
            const result = canvas.toDataURL(mimeType, quality);
            cleanup();
            resolve(result);
          } catch (e) {
            cleanup();
            reject(new Error("CORS_SECURITY_RESTRICTION: O navegador proibiu a leitura dos pixels."));
          }
        };

        img.onerror = () => {
          cleanup();
          reject(new Error("IMG_LOAD_FAIL"));
        };

        img.src = imageObjectUrl;
      });
    } catch (err: any) {
      throw err;
    }
  }
};
