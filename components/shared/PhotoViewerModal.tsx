
import React from 'react';
import ImageViewer from './ImageViewer';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ isOpen, onClose, url, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] bg-slate-950/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
      <header className="h-20 flex justify-between items-center px-10 border-b border-white/5 shrink-0 pt-6">
        <div>
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">Visualizador de Perfil</p>
          <h3 className="text-white font-black uppercase text-sm tracking-tight mt-1">{title}</h3>
        </div>
        <button 
          onClick={onClose} 
          className="w-12 h-12 bg-white/5 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full max-w-4xl max-h-[80vh]">
          <ImageViewer url={url} alt={title} />
        </div>
      </div>
      
      <footer className="p-8 flex justify-center border-t border-white/5">
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">ALS Transportes • SSZ Virtual Terminal</p>
      </footer>
    </div>
  );
};

export default PhotoViewerModal;
