
import React from 'react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ isOpen, onClose, url, title }) => {
  if (!isOpen) return null;

  const isImage = url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png)$/i);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
      {/* Header do Visualizador */}
      <header className="h-20 bg-slate-900 border-b border-white/10 flex items-center justify-between px-8 shrink-0 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Visualizador ALS</p>
            <h3 className="text-sm font-bold text-white uppercase mt-1 truncate max-w-md">{title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const link = document.createElement('a');
              link.href = url;
              link.download = title.replace(/\s+/g, '_');
              link.click();
            }}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 border border-white/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download
          </button>
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all shadow-lg active:scale-90"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </header>

      {/* Área de Conteúdo */}
      <div className="flex-1 overflow-hidden p-6 md:p-12 flex items-center justify-center bg-slate-900/50">
        <div className="w-full h-full max-w-6xl bg-white rounded-[2rem] shadow-2xl overflow-hidden relative">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 overflow-auto p-4">
              <img src={url} className="max-w-full max-h-full object-contain shadow-lg" alt={title} />
            </div>
          ) : (
            <iframe 
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1`} 
              className="w-full h-full border-none"
              title={title}
            />
          )}
        </div>
      </div>
      
      {/* Footer / Info */}
      <footer className="h-10 bg-slate-950 flex items-center justify-center shrink-0">
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">ALS LOGÍSTICA - Módulo de Documentação Digital</p>
      </footer>
    </div>
  );
};

export default DocumentViewerModal;
