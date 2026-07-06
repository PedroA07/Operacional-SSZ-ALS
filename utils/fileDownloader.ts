
// Download de arquivos do R2 com nome customizado.
// Usa o proxy /api/download-file (mesma origem) para não depender de CORS
// no domínio público do bucket; cai para fetch direto e window.open.

export const r2KeyFromUrl = (url: string): string | null => {
  const match = url.match(/\/als-transportes\/(.+)$/);
  return match ? `als-transportes/${match[1]}` : null;
};

export const fetchFileBlob = async (url: string): Promise<Blob> => {
  const key = r2KeyFromUrl(url);
  if (key) {
    try {
      const res = await fetch(`/api/download-file?key=${encodeURIComponent(key)}`);
      if (res.ok) return await res.blob();
    } catch (e) {
      console.warn('[fileDownloader] Proxy falhou, tentando fetch direto:', e);
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
};

export const downloadFile = async (url: string, fileName: string) => {
  try {
    const blob = await fetchFileBlob(url);
    downloadBlob(blob, fileName);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
};
