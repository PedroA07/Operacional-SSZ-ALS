
import { supabase } from './storage';
import { r2Service } from './r2Service';

export const fileStorage = {
  /**
   * Retorna a URL pública. 
   * Se já for uma URL (http) vinda do seu script de conversão, retorna ela direto.
   */
  getPublicUrl: (path: string | undefined, bucket: 'drivers' | 'trips' = 'trips'): string => {
    if (!path) return '';
    
    // Se o caminho já for uma URL completa (R2 ou Base64), não faz nada
    if (path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    
    // Fallback apenas para arquivos antigos que ainda estão no Supabase Storage
    if (!supabase) return '';
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Faz o upload para o R2 e já retorna a URL final para salvar no banco
   */
  uploadFile: async (
    file: File | string, 
    folder: 'docs' | 'photos' | 'profiles', 
    fileName: string,
    bucket: 'drivers' | 'trips' = 'trips'
  ): Promise<string> => {
    try {
      // Envia para o R2 (usando sua API Route /api/upload)
      const r2Url = await r2Service.upload(file, fileName, folder);
      return r2Url; // Retorna a URL https://pub-...
    } catch (error) {
      console.error("Erro no R2, tentando Supabase como fallback:", error);
      
      // Fallback de segurança para o Supabase Storage
      if (!supabase) throw new Error("Cloud Storage Indisponível.");
      
      const cleanFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const path = `${folder}/${Date.now()}_${cleanFileName}`;
      
      let body: any;
      if (typeof file === 'string' && file.startsWith('data:')) {
        const parts = file.split(',');
        const binaryString = window.atob(parts[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        body = bytes;
      } else {
        body = file;
      }

      const { data, error: storageError } = await supabase.storage
        .from(bucket)
        .upload(path, body, { upsert: true });

      if (storageError) throw storageError;
      return data.path; 
    }
  }
};
