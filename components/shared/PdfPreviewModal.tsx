import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PdfPreviewModalProps {
  /** blob: URL do PDF (ex.: pdf.output('bloburl')) */
  url: string;
  fileName: string;
  onClose: () => void;
}

/**
 * Modal que exibe o PDF gerado no visualizador nativo do navegador (iframe),
 * com botões de Imprimir e Baixar. Substitui a impressão automática.
 */
const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ url, fileName, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Revoga a blob URL ao fechar
  useEffect(() => () => { try { if (url.startsWith('blob:')) URL.revokeObjectURL(url); } catch { /* noop */ } }, [url]);

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9600] bg-slate-950/80 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      <div className="px-6 py-4 bg-slate-900 flex items-center justify-between shrink-0 shadow-lg">
        <div className="min-w-0">
          <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">Visualização do PDF</p>
          <h2 className="font-black text-white text-sm uppercase tracking-widest truncate">{fileName}</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4"/></svg>
            Imprimir
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/15 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/25 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Baixar
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
      <iframe ref={iframeRef} src={url} title={fileName} className="flex-1 w-full bg-white" />
    </div>,
    document.body
  );
};

export default PdfPreviewModal;
