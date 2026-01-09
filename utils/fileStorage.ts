
import { supabase } from './storage';

/**
 * SERVIÇO DE ARQUIVOS SUPABASE - PADRÃO ALS
 * Gerencia o upload e recuperação de documentos e fotos diretamente nos Buckets do Supabase.
 */
export const fileStorage = {
  /**
   * Retorna a URL pública de um arquivo armazenado no Supabase.
   */
  getPublicUrl: (path: string | undefined, bucket: 'drivers' | 'trips' = 'trips'): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    
    if (!supabase) return '';
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Converte Base64 para Uint8Array de forma estável para ambientes Mobile
   */
  base64ToUint8Array: (base64: string) => {
    const parts = base64.split(',');
    const base64Content = parts.length > 1 ? parts[1] : parts[0];
    const binaryString = window.atob(base64Content);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  },

  /**
   * Realiza o upload de um arquivo para o Supabase Storage.
   */
  uploadFile: async (
    file: File | string, 
    folder: 'docs' | 'photos' | 'profiles', 
    fileName: string,
    bucket: 'drivers' | 'trips' = 'trips'
  ): Promise<string> => {
    if (!supabase) throw new Error("Supabase não configurado localmente.");

    const cleanFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const path = `${folder}/${Date.now()}_${cleanFileName}`;

    try {
      let body: any;
      let contentType = 'image/jpeg'; // Default para capturas de câmera mobile

      if (typeof file === 'string' && file.startsWith('data:')) {
        body = fileStorage.base64ToUint8Array(file);
        const match = file.match(/data:([^;]+);/);
        if (match) contentType = match[1];
      } else {
        body = file;
        if (file instanceof File) contentType = file.type;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, body, {
          contentType,
          upsert: true
        });

      if (error) throw error;
      return data.path; 
    } catch (error) {
      console.error("Erro no Upload Supabase Storage:", error);
      throw error; 
    }
  }
};
