
import React, { useState } from 'react';

interface ImageViewerProps {
  url: string;
  alt?: string;
  className?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ url, alt = "Documento", className = "" }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  return (
    <div className={`relative w-full h-full flex flex-col bg-slate-900/40 rounded-[2rem] overflow-hidden group ${className}`}>
      {/* Área da Imagem */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        <div 
          className="transition-transform duration-300 ease-out flex items-center justify-center"
          style={{ 
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
        >
          <img 
            src={url} 
            alt={alt} 
            className="max-w-full max-h-full object-contain shadow-2xl"
            onDoubleClick={handleReset}
          />
        </div>
      </div>

      {/* Barra de Controles Flutuante */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-slate-950/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all opacity-0 group-hover:opacity-100 lg:opacity-100">
        <button 
          onClick={handleZoomOut}
          className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
          title="Diminuir Zoom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"/></svg>
        </button>
        
        <div className="w-12 text-center text-[10px] font-black text-blue-400 font-mono">
          {Math.round(scale * 100)}%
        </div>

        <button 
          onClick={handleZoomIn}
          className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
          title="Aumentar Zoom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
        </button>

        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>

        <button 
          onClick={handleRotate}
          className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
          title="Girar Documento"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>

        <button 
          onClick={handleReset}
          className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
          title="Resetar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        </button>
      </div>
    </div>
  );
};

export default ImageViewer;
