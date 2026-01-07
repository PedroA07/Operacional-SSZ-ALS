
import { APP_CONFIG } from '../constants';

/**
 * SERVIÇO DE ARQUIVOS R2 - PRODUÇÃO ALS
 * URL do Worker detectada: https://square-cell-541cals-uploader.pedro-andrade-pereira.workers.dev
 */
export const fileStorage = {
  WORKER_URL: 'https://square-cell-541cals-uploader.pedro-andrade-pereira.workers.dev',

  /**
   * getPublicUrl Inteligente:
   * Se o caminho for uma URL completa (Supabase antigo), ele mantém.
   * Se for apenas um path (R2 novo), ele usa o Worker/CDN.
   */
  getPublicUrl: (path: string | undefined): string => {
    if (!path) return '';
    
    // Se já for uma URL completa do Supabase ou Base64, não mexe
    if (path.startsWith('http') || path.startsWith('data:')) {
      return path;
    }
    
    // Se for um path do R2 (ex: photos/123.jpg), gera a URL via Worker ou CDN
    // Priorizamos o CDN configurado no Cloudflare para evitar custos
    return `${APP_CONFIG.r2PublicUrl}/${path}`;
  },

  /**
   * Realiza o upload e retorna o path relativo
   */
  uploadFile: async (file: File | string, folder: 'docs' | 'photos' | 'profiles', fileName: string): Promise<string> => {
    const cleanFileName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const path = `${folder}/${Date.now()}_${cleanFileName}`;
    const uploadUrl = `${fileStorage.WORKER_URL}?file=${path}`;

    try {
      let body: any;
      let contentType = 'application/octet-stream';

      if (typeof file === 'string' && file.startsWith('data:')) {
        const res = await fetch(file);
        body = await res.blob();
        contentType = body.type;
      } else if (file instanceof File) {
        body = file;
        contentType = file.type;
      } else {
        body = file;
      }

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: body,
        headers: { 'Content-Type': contentType }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`R2 Server Error: ${errorText}`);
      }

      return path; // Salva apenas o "endereço" curto no Supabase
    } catch (error) {
      console.error("Erro Crítico R2:", error);
      throw error;
    }
  },

  /**
   * Utilitário para migrar um arquivo do Supabase para o R2
   * Pode ser chamado em um loop para limpar o storage antigo
   */
  migrateFile: async (oldUrl: string, folder: any, fileName: string): Promise<string> => {
    try {
      const response = await fetch(oldUrl);
      const blob = await response.blob();
      return await fileStorage.uploadFile(blob as any, folder, fileName);
    } catch (e) {
      console.error("Falha na migração do arquivo:", oldUrl);
      return oldUrl; // Retorna a antiga se falhar para não quebrar o banco
    }
  }
};
