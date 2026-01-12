
export const r2Service = {
  /**
   * Envia um arquivo para o Cloudflare R2 através da nossa API segura.
   * Suporta File object ou Base64 string.
   */
  upload: async (fileOrBase64: File | string, fileName: string, folder: string = 'docs'): Promise<string> => {
    try {
      const formData = new FormData();
      
      if (typeof fileOrBase64 === 'string') {
        const response = await fetch(fileOrBase64);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', fileOrBase64);
      }
      
      // O backend cuidará de salvar na raiz correta.
      // Removemos qualquer prefixo 'als-transportes/' para evitar duplicidade.
      let cleanFolder = folder.replace(/^\/+|\/+$/g, '').trim();
      if (cleanFolder.toLowerCase().startsWith('als-transportes/')) {
        cleanFolder = cleanFolder.substring(16);
      }

      const finalPath = cleanFolder ? `${cleanFolder}/${fileName}` : fileName;
      
      formData.append('path', finalPath.replace(/\/+/g, '/'));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Falha no upload para R2');
      }

      const data = await res.json();
      return data.url;
    } catch (e) {
      console.error("[r2Service] Erro:", e);
      throw e;
    }
  }
};
