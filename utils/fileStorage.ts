
export const fileStorage = {
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

  getPublicUrl: (url: string | undefined): string => {
    if (!url) return '';
    if (!url.startsWith('http')) return url;
    
    const domain = (import.meta as any).env?.VITE_R2_PUBLIC_DOMAIN || '';
    if (!domain) return url;

    const cleanDomain = domain.replace(/\/$/, "").replace(/^https?:\/\//, "");
    
    if (url.includes(cleanDomain) && !url.includes('/als-transportes/')) {
      const parts = url.split(cleanDomain);
      return `${parts[0]}${cleanDomain}/als-transportes${parts[1]}`;
    }
    
    return url;
  },

  normalizeFolderName: (name: string): string => {
    return name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .trim();
  },

  upload: async (file: File | string, destinationPath: string): Promise<string> => {
    try {
      const formData = new FormData();
      let fileToUpload: Blob;

      if (typeof file === 'string' && file.startsWith('data:')) {
        fileToUpload = fileStorage.dataURLtoBlob(file);
        const extension = fileToUpload.type === 'application/pdf' ? 'pdf' : 'jpg';
        const fileName = `${Date.now()}.${extension}`;
        formData.append('file', fileToUpload, fileName);
      } else if (file instanceof File) {
        fileToUpload = file;
        formData.append('file', file);
      } else {
        throw new Error("Formato de arquivo inválido para upload.");
      }
      
      const finalPath = destinationPath.startsWith('als-transportes/') 
        ? destinationPath 
        : `als-transportes/${destinationPath.replace(/^\/+/, '')}`;
        
      formData.append('path', finalPath);

      const res = await fetch('/api/upload', { 
        method: 'POST', 
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro R2 HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (!data.url) throw new Error("A API de upload não retornou uma URL válida.");
      
      return data.url; 
    } catch (e: any) {
      console.error("[Storage Upload Error]:", e);
      throw e;
    }
  },

  uploadStaffPhoto: (file: File | string, staffName: string) => {
    const normalizedName = fileStorage.normalizeFolderName(staffName);
    return fileStorage.upload(file, `colaboradores/${normalizedName}/foto_perfil/perfil.jpg`);
  },

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
