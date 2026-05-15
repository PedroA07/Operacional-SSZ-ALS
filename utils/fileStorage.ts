
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
        const isPdf = fileToUpload.type === 'application/pdf' || destinationPath.toLowerCase().endsWith('.pdf');
        const extension = isPdf ? 'pdf' : 'jpg';
        
        // Garante que o path final tem a extensão correta se estiver sendo enviado via base64
        const finalDestPath = destinationPath.includes('.') ? destinationPath : `${destinationPath}.${extension}`;
        
        const fileName = `${Date.now()}.${extension}`;
        formData.append('file', fileToUpload, fileName);
        formData.append('path', finalDestPath);
      } else if (file instanceof File) {
        fileToUpload = file;
        formData.append('file', file);
        formData.append('path', destinationPath);
      } else {
        throw new Error("Formato de arquivo inválido para upload.");
      }
      
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
    const timestamp = Date.now();
    return fileStorage.upload(file, `colaboradores/${normalizedName}/foto_perfil/perfil_${timestamp}.jpg`);
  },

  uploadDriverProfile: (file: File | string, driverId: string) => {
    const timestamp = Date.now();
    return fileStorage.upload(file, `drivers/${driverId}/foto_perfil/perfil_${timestamp}.jpg`);
  },

  uploadDriverCNH: (file: File | string, driverId: string) => 
    fileStorage.upload(file, `drivers/${driverId}/cnh/cnh.pdf`),

  uploadTripDoc: (file: File | string, os: string, docType: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    const type = docType.toLowerCase().replace('_pdf', '');
    return fileStorage.upload(file, `trips/${cleanOS}/documentos/${type}.pdf`);
  },

  uploadFreightContract: (file: File, os: string, index: number) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    return fileStorage.upload(file, `trips/${cleanOS}/contratos_frete/contrato_${index}_${Date.now()}.pdf`);
  },

  // Extrai a R2 key de uma URL pública e deleta do bucket
  deleteFile: async (url: string): Promise<void> => {
    // URL formato: https://{domain}/als-transportes/{key}
    const match = url.match(/\/als-transportes\/(.+)$/);
    const key = match?.[1];
    if (!key) throw new Error('URL inválida para exclusão');
    const res = await fetch('/api/delete-file', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ao excluir: HTTP ${res.status}`);
    }
  },

  uploadTripPhoto: (file: File | string, os: string, photoId: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    // Verifica se o arquivo original é um PDF para manter a extensão
    const isPdf = (file instanceof File && file.type === 'application/pdf') || 
                  (typeof file === 'string' && file.startsWith('data:application/pdf'));
    
    const ext = isPdf ? 'pdf' : 'jpg';
    return fileStorage.upload(file, `trips/${cleanOS}/fotos_campo/${photoId}.${ext}`);
  }
};
