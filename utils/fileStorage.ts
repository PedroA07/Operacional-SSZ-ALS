
export const fileStorage = {
  /**
   * Converte uma string Base64 em um objeto Blob de forma síncrona.
   * Mais robusto que fetch(dataUrl) em dispositivos móveis.
   */
  dataURLtoBlob: (dataurl: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid Data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  },

  getPublicUrl: (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    // Fallback seguro se as variáveis de ambiente não estiverem no cliente
    const domain = (import.meta as any).env?.VITE_R2_PUBLIC_DOMAIN || '';
    return domain ? `${domain}/${path}` : path;
  },

  upload: async (file: File | string, destinationPath: string): Promise<string> => {
    try {
      const formData = new FormData();
      
      if (typeof file === 'string' && file.startsWith('data:')) {
        const blob = fileStorage.dataURLtoBlob(file);
        const fileName = destinationPath.split('/').pop() || 'upload.jpg';
        formData.append('file', blob, fileName);
      } else if (file instanceof File) {
        formData.append('file', file);
      } else {
        throw new Error("Formato de arquivo inválido para upload.");
      }
      
      formData.append('path', destinationPath);

      // Timeout de 30 segundos para uploads em conexões lentas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch('/api/upload', { 
        method: 'POST', 
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        let errorMessage = 'Erro desconhecido no servidor';
        try {
          const errData = await res.json();
          errorMessage = errData.error || errorMessage;
        } catch (e) {
          errorMessage = `Erro HTTP ${res.status}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      return data.url; 
    } catch (e: any) {
      console.error("[Storage Error]:", e);
      if (e.name === 'AbortError') throw new Error("O envio demorou muito. Verifique sua conexão 4G/5G.");
      throw e;
    }
  },

  uploadStaffPhoto: (file: File | string, staffId: string) => 
    fileStorage.upload(file, `colaboradores/${staffId}/foto_perfil/perfil.jpg`),

  uploadDriverProfile: (file: File | string, driverId: string) => 
    fileStorage.upload(file, `drivers/${driverId}/foto_perfil/perfil.jpg`),

  uploadDriverCNH: (file: File | string, driverId: string) => 
    fileStorage.upload(file, `drivers/${driverId}/cnh/cnh.pdf`),

  uploadTripDoc: (file: File | string, os: string, docType: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    const type = docType.toLowerCase().replace('_pdf', '');
    return fileStorage.upload(file, `trips/${cleanOS}/documentos/${type}.pdf`);
  },

  uploadTripPhoto: (file: File | string, os: string, photoId: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    return fileStorage.upload(file, `trips/${cleanOS}/fotos_campo/${photoId}.jpg`);
  }
};
