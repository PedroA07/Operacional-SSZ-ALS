
import { supabase } from './storage';
import { r2Service } from './r2Service';

/**
 * SERVIÇO DE ARQUIVOS ALS - UNIFICADO
 * Agora utiliza Cloudflare R2 por padrão para performance e economia.
 */
export const fileStorage = {
  /**
   * Retorna a URL pública de um arquivo.
   * Detecta automaticamente se é um link R2, Supabase ou Base64.
   */
  getPublicUrl: (path: string | undefined, bucket: 'drivers' | 'trips' = 'trips'): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    
    // Fallback para Supabase se não for uma URL completa
    if (!supabase) return '';
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Realiza o upload de um arquivo priorizando o Cloudflare R2.
   */
  uploadFile: async (
    file: File | string, 
    folder: 'docs' | 'photos' | 'profiles', 
    fileName: string,
    bucket: 'drivers' | 'trips' = 'trips'
  ): Promise<string> => {
    try {
      // 1. TENTA CLOUDFLARE R2 (Caminho principal agora)
      const r2Url = await r2Service.upload(file, fileName, folder);
      return r2Url;
    } catch (r2Error) {
      console.warn("Falha no R2, tentando fallback Supabase Storage...", r2Error);
      
      // 2. FALLBACK PARA SUPABASE STORAGE (Garante que a operação não pare)
      if (!supabase) throw new Error("Supabase não configurado localmente.");
      
      const cleanFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const path = `${folder}/${Date.now()}_${cleanFileName}`;
      
      let body: any;
      let contentType = 'image/jpeg';

      if (typeof file === 'string' && file.startsWith('data:')) {
        const parts = file.split(',');
        const binaryString = window.atob(parts[1]);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        body = bytes;
        const match = file.match(/data:([^;]+);/);
        if (match) contentType = match[1];
      } else {
        body = file;
        if (file instanceof File) contentType = file.type;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, body, { contentType, upsert: true });

      if (error) throw error;
      return data.path; 
    }
  }
};
