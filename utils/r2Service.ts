
export const r2Service = {
  /**
   * Envia um arquivo para o Cloudflare R2 através da nossa API segura.
   * Suporta File object ou Base64 string.
   */
  upload: async (fileOrBase64: File | string, fileName: string, folder: string = 'docs'): Promise<string> => {
    try {
      const formData = new FormData();
      
      if (typeof fileOrBase64 === 'string') {
        // Converte Base64 para Blob para o upload
        const response = await fetch(fileOrBase64);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', fileOrBase64);
      }
      
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Falha no upload para R2');
      }

      const data = await res.json();
      return data.url; // Retorna a URL pública final
    } catch (e) {
      console.error("[r2Service] Erro:", e);
      throw e;
    }
  }
};
