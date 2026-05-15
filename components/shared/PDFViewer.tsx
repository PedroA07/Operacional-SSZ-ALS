
import React, { useEffect, useState, useCallback } from 'react';

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

const PDFViewer: React.FC<Props> = ({ url, title, onClose }) => {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const render = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPages([]);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      }

      const pdf = await pdfjsLib.getDocument({
        url,
        // Evita problema de CORS: usa withCredentials=false (padrão R2 público)
        withCredentials: false,
      }).promise;

      const rendered: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        // Scale 2 = boa qualidade em retina sem ser pesado
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        rendered.push(canvas.toDataURL('image/jpeg', 0.88));
      }

      setPages(rendered);
    } catch {
      setError('Não foi possível carregar o PDF.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { render(); }, [render]);

  // Fecha ao pressionar Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in fade-in duration-200">

      {/* Header */}
      <div className="h-16 bg-slate-900 flex items-center justify-between px-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">Contrato de Frete</p>
            <p className="text-[10px] font-bold text-white truncate mt-0.5">{title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Download / abrir em nova aba */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            title="Abrir em nova aba"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            <span className="hidden sm:inline">Baixar</span>
          </a>

          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/10 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto bg-slate-200">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
            <svg className="w-10 h-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando contrato…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-8">
            <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-600 text-center">{error}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg"
            >
              Abrir em nova aba
            </a>
          </div>
        )}

        {!loading && !error && pages.length > 0 && (
          <div className="flex flex-col items-center gap-2 p-3 max-w-3xl mx-auto">
            {/* Indicador de página (visível só em mobile com muitas páginas) */}
            {pages.length > 1 && (
              <div className="sticky top-2 z-10 bg-slate-900/80 backdrop-blur-sm text-white rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-widest self-center shadow-lg">
                {pages.length} páginas
              </div>
            )}
            {pages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Página ${i + 1}`}
                className="w-full shadow-xl rounded-sm bg-white"
                onLoad={() => { if (i === 0) setCurrentPage(1); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer com nº de página em mobile */}
      {pages.length > 1 && !loading && (
        <div className="h-10 bg-slate-900 flex items-center justify-center border-t border-white/5 shrink-0">
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
            {pages.length} página{pages.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
