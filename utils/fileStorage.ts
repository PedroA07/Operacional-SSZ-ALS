
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
   * Realiza o upload de um arquivo (File ou Base64) para o Supabase Storage.
   */
  uploadFile: async (
    file: File | string, 
    folder: 'docs' | 'photos' | 'profiles', 
    fileName: string,
    bucket: 'drivers' | 'trips' = 'trips'
  ): Promise<string> => {
    if (!supabase) throw new Error("Supabase não configurado.");

    const cleanFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const path = `${folder}/${Date.now()}_${cleanFileName}`;

    try {
      let body: any;
      let contentType = 'application/octet-stream';

      if (typeof file === 'string' && file.startsWith('data:')) {
        // Converte Base64 para Blob para o Supabase aceitar
        const res = await fetch(file);
        body = await res.blob();
        contentType = file.split(';')[0].split(':')[1];
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
      console.error("Erro no Upload Supabase:", error);
      throw error;
    }
  }
};
