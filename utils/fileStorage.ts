
export const fileStorage = {
  /**
   * Retorna a URL pública. 
   * Se começar com http (R2), retorna direto.
   */
  getPublicUrl: (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${process.env.R2_PUBLIC_DOMAIN}/${path}`;
  },

  /**
   * Upload centralizado para o R2 com definição de caminho organizada
   */
  upload: async (file: File | string, destinationPath: string): Promise<string> => {
    try {
      const formData = new FormData();
      if (typeof file === 'string') {
        const response = await fetch(file);
        const blob = await response.blob();
        formData.append('file', blob, 'upload.jpg');
      } else {
        formData.append('file', file);
      }
      formData.append('path', destinationPath);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Erro no servidor de upload R2');
      
      const data = await res.json();
      return data.url; 
    } catch (e) {
      console.error("[Storage Error]:", e);
      throw e;
    }
  },

  // FUNÇÕES AUXILIARES DE ORGANIZAÇÃO (Utilizadas pelo resto do app)
  
  uploadUserPhoto: (file: File | string, userId: string) => 
    fileStorage.upload(file, `users/photos/${userId}.jpg`),

  uploadDriverProfile: (file: File | string, driverId: string) => 
    fileStorage.upload(file, `drivers/${driverId}/profile.jpg`),

  uploadDriverCNH: (file: File | string, driverId: string) => 
    fileStorage.upload(file, `drivers/${driverId}/cnh.pdf`),

  uploadTripDoc: (file: File | string, os: string, docType: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    return fileStorage.upload(file, `trips/${cleanOS}/documentos/${docType.toLowerCase()}.pdf`);
  },

  uploadTripPhoto: (file: File | string, os: string, photoId: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    return fileStorage.upload(file, `trips/${cleanOS}/fotos_campo/${photoId}.jpg`);
  }
};
