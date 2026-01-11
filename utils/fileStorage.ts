export const fileStorage = {
  /**
   * Retorna a URL pública completa para exibição no frontend.
   */
  getPublicUrl: (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${process.env.R2_PUBLIC_DOMAIN}/${path}`;
  },

  /**
   * Função base de upload que comunica com a API route.
   */
  upload: async (file: File | string, destinationPath: string): Promise<string> => {
    try {
      const formData = new FormData();
      if (typeof file === 'string') {
        const response = await fetch(file);
        const blob = await response.blob();
        const fileName = destinationPath.split('/').pop() || 'upload.jpg';
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', file);
      }
      formData.append('path', destinationPath);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro no servidor de upload R2');
      }
      
      const data = await res.json();
      return data.url; 
    } catch (e) {
      console.error("[Storage Error]:", e);
      throw e;
    }
  },

  // --- MÉTODOS DE ORGANIZAÇÃO DE PASTAS ---
  
  /** Pastas: colaboradores/[id]/foto_perfil/perfil.jpg */
  uploadStaffPhoto: (file: File | string, staffId: string) => 
    fileStorage.upload(file, `colaboradores/${staffId}/foto_perfil/perfil.jpg`),

  /** Pastas: drivers/[id]/foto_perfil/perfil.jpg */
  uploadDriverProfile: (file: File | string, driverId: string) => 
    fileStorage.upload(file, `drivers/${driverId}/foto_perfil/perfil.jpg`),

  /** Pastas: drivers/[id]/cnh/cnh.pdf */
  uploadDriverCNH: (file: File | string, driverId: string) => 
    fileStorage.upload(file, `drivers/${driverId}/cnh/cnh.pdf`),

  /** Pastas: trips/[OS]/documentos/[tipo].pdf */
  uploadTripDoc: (file: File | string, os: string, docType: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    const type = docType.toLowerCase().replace('_pdf', '');
    return fileStorage.upload(file, `trips/${cleanOS}/documentos/${type}.pdf`);
  },

  /** Pastas: trips/[OS]/fotos_campo/[id].jpg */
  uploadTripPhoto: (file: File | string, os: string, photoId: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    return fileStorage.upload(file, `trips/${cleanOS}/fotos_campo/${photoId}.jpg`);
  }
};