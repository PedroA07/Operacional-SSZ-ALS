
/**
 * ALS Image Compressor Utility v1.5
 * Otimizado para economia de armazenamento e performance mobile.
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
      maxWidth = 1200, // Reduzido de 1600 para 1200
      maxHeight = 1200,
      quality = 0.6, // Reduzido de 0.8 para 0.6
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
          reject(new Error("CANVAS_CONTEXT_FAIL"));
          return;
        }

        try {
          ctx.drawImage(img, 0, 0, width, height);
          const result = canvas.toDataURL(mimeType, quality);
          if (typeof source !== 'string') URL.revokeObjectURL(imageUrl);
          resolve(result);
        } catch (e) {
          if (typeof source !== 'string') URL.revokeObjectURL(imageUrl);
          reject(new Error("CORS_PIXEL_ERROR"));
        }
      };

      img.onerror = () => {
        if (typeof source !== 'string') URL.revokeObjectURL(imageUrl);
        reject(new Error("IMAGE_LOAD_ERROR"));
      };

      img.src = imageUrl;
    });
  }
};
