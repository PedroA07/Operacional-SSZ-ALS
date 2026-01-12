
export const fileStorage = {
  /**
   * Converte uma string Base64 em um objeto Blob de forma robusta.
   */
  dataURLtoBlob: (dataurl: string) => {
    try {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error("Erro ao converter base64 para blob", e);
      throw new Error("Falha ao processar dados da imagem.");
    }
  },

  getPublicUrl: (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Se for apenas o path, tenta buscar o domínio das variáveis de ambiente
    const domain = (import.meta as any).env?.VITE_R2_PUBLIC_DOMAIN || '';
    const prefix = domain.startsWith('http') ? '' : 'https://';
    return domain ? `${prefix}${domain}/${path}` : path;
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
        throw new Error("Formato inválido.");
      }
      
      formData.append('path', destinationPath);

      const res = await fetch('/api/upload', { 
        method: 'POST', 
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (!data.url) throw new Error("URL não retornada pelo servidor.");
      
      return data.url; 
    } catch (e: any) {
      console.error("[Storage Error]:", e);
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
