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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    if (isImage) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir - ${title}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              @media print { img { max-width: 100%; height: auto; } }
            </style>
          </head>
          <body>
            <img src="${url}" />
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      // Para PDF
      printWindow.location.href = url;
      // Tenta disparar o print após carregar
      const checkLoaded = setInterval(() => {
        if (printWindow.document.readyState === 'complete') {
          clearInterval(checkLoaded);
          setTimeout(() => printWindow.print(), 1000);
        }
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      <header className="h-20 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-2xl safe-top">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg font-black italic shrink-0">ALS</div>
          <div className="min-w-0">
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">Documento Digital</p>
            <h3 className="text-[11px] sm:text-sm font-bold text-white uppercase mt-1 truncate">{title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={handlePrint}
            className="p-2 sm:px-6 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 shadow-lg active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" /></svg>
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-700 transition-all active:scale-95 shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Fechar</span>
          </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-hidden p-2 sm:p-6 flex items-center justify-center bg-slate-900/50">
        <div className="w-full h-full max-w-6xl bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden relative flex items-center justify-center">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 overflow-auto p-2">
              <img src={url} className="max-w-full max-h-full object-contain shadow-lg" alt={title} />
            </div>
          ) : (
            <iframe 
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1`} 
              className="w-full h-full border-none" 
              title={title} 
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </div>

      <style>{`
        .safe-top { padding-top: env(safe-area-inset-top); }
      `}</style>
    </div>
  );
};

export default DocumentViewerModal;