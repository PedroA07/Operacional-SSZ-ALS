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

  /**
   * Remove fisicamente o arquivo do Cloudflare R2 antes de limpar a referência no Supabase
   */
  deleteFile: async (urlOrPath: string): Promise<boolean> => {
    try {
      if (!urlOrPath) return false;
      
      const cleanPath = urlOrPath.includes('/als-transportes/') 
        ? `als-transportes/${urlOrPath.split('/als-transportes/')[1]}`
        : urlOrPath;

      const res = await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: cleanPath })
      });

      return res.ok;
    } catch (e) {
      console.error("Erro na requisição de deleção R2:", e);
      return false;
    }
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
        const fileName = destinationPath.split('/').pop() || 'upload.jpg';
        formData.append('file', fileToUpload, fileName);
      } else if (file instanceof File) {
        fileToUpload = file;
        formData.append('file', file);
      } else {
        throw new Error("Formato de arquivo inválido.");
      }
      
      const cleanPath = destinationPath.toLowerCase().startsWith('als-transportes/') 
        ? destinationPath 
        : `als-transportes/${destinationPath.replace(/^\/+/, '')}`;

      formData.append('path', cleanPath);

      const res = await fetch('/api/upload', { 
        method: 'POST', 
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro HTTP ${res.status}`);
      }
      
      const data = await res.json();
      return data.url; 
    } catch (e: any) {
      console.error("[Storage Error]:", e);
      throw e;
    }
  },

  uploadStaffPhoto: (file: File | string, staffName: string) => {
    const normalizedName = fileStorage.normalizeFolderName(staffName);
    return fileStorage.upload(file, `colaboradores/${normalizedName}/foto_perfil/perfil.jpg`);
  },

  // MOTORISTAS: Agora usando o Nome para organizar pastas
  uploadDriverProfile: (file: File | string, driverName: string) => {
    const normalizedName = fileStorage.normalizeFolderName(driverName);
    return fileStorage.upload(file, `drivers/${normalizedName}/foto_perfil/perfil.jpg`);
  },

  uploadDriverCNH: (file: File | string, driverName: string) => {
    const normalizedName = fileStorage.normalizeFolderName(driverName);
    return fileStorage.upload(file, `drivers/${normalizedName}/cnh/cnh.pdf`);
  },

  uploadTripDoc: (file: File | string, os: string, docType: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    const extension = (typeof file === 'string' && file.startsWith('data:image')) ? 'jpg' : 'pdf';
    return fileStorage.upload(file, `trips/${cleanOS}/documentos/${docType}.${extension}`);
  },

  uploadTripPhoto: (file: File | string, os: string, photoId: string) => {
    const cleanOS = os.replace(/[^a-z0-9]/gi, '_');
    return fileStorage.upload(file, `trips/${cleanOS}/fotos_campo/${photoId}.jpg`);
  }
};