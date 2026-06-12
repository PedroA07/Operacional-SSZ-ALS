import { supabase } from './storage';
import { getEnv } from './env';

// Número do build injetado pelo GitHub Actions via VITE_APP_VERSION.
// Em desenvolvimento fica como 0 (nunca mostra aviso de atualização).
export const CURRENT_BUILD = parseInt(getEnv('VITE_APP_VERSION') || '0', 10);

export const APK_DOWNLOAD_URL =
  'https://github.com/pedroa07/operacional-ssz-als/releases/latest/download/ALS-Operacional.apk';

export interface VersionStatus {
  latestBuild: number;
  hasUpdate: boolean;
}

/** Consulta o Supabase para saber se há uma versão mais nova disponível. */
export async function checkForUpdate(): Promise<VersionStatus> {
  if (CURRENT_BUILD === 0 || !supabase) return { latestBuild: 0, hasUpdate: false };

  try {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'mobile_app_version')
      .single();

    const latestBuild = parseInt((data as any)?.value || '0', 10);
    return { latestBuild, hasUpdate: latestBuild > CURRENT_BUILD };
  } catch {
    return { latestBuild: 0, hasUpdate: false };
  }
}
