
import React, { useState, useRef, useEffect } from 'react';
import { useMouseZoom } from '../../hooks/useMouseZoom';
import { useMousePan } from '../../hooks/useMousePan';

interface ImageViewerProps {
  url: string;
  alt?: string;
  className?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ url, alt = "Documento", className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryWithoutCORS, setRetryWithoutCORS] = useState(false);
  
  // Detecção de tipo de arquivo
  const isPDF = url.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf');
  
  const { scale, setScale, resetZoom, zoomIn, zoomOut } = useMouseZoom({ containerRef });
  const { 
    position, 
    setPosition, 
    isDragging, 
    onMouseDown, 
    onMouseMove, 
    onMouseUp, 
    resetPosition 
  } = useMousePan(scale);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setRetryWithoutCORS(false);
    resetZoom();
    resetPosition();
    setRotation(0);
  }, [url]);

  // Sincroniza eventos de mouse/touch globais para o Pan funcionar fora do elemento
  useEffect(() => {
    if (isDragging && !isPDF) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove as any);
      window.addEventListener('touchend', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove as any);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp, isPDF]);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    resetZoom();
    resetPosition();
    setRotation(0);
  };

  const handleImageError = () => {
    if (!retryWithoutCORS) {
      setRetryWithoutCORS(true);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  // Se for PDF, renderiza o iframe nativo do navegador
  if (isPDF) {
    return (
      <div className={`relative w-full h-full bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 ${className}`}>
        <iframe 
          src={`${url}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`} 
          className="w-full h-full border-none"
          title={alt}
          onLoad={() => setIsLoading(false)}
        />
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[8px] font-black text-blue-500 uppercase mt-4 tracking-widest">Carregando PDF...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full flex flex-col bg-slate-950 rounded-[2.5rem] overflow-hidden group select-none shadow-inner border border-white/5 ${className}`}
      style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default') }}
    >
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 touch-none"
        onMouseDown={!isPDF ? onMouseDown : undefined}
        onTouchStart={!isPDF ? onMouseDown : undefined}
      >
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 z-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[8px] font-black text-blue-400 uppercase mt-4 tracking-widest">Sincronizando Imagem...</p>
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <p className="text-white font-black uppercase text-[10px]">Falha de Carregamento</p>
            <button onClick={() => window.open(url, '_blank')} className="px-5 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase">Abrir em nova aba</button>
          </div>
        ) : (
          <div 
            className="flex items-center justify-center"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            <img 
              src={url} 
              alt={alt} 
              className="max-w-full max-h-full object-contain pointer-events-none" 
              crossOrigin={retryWithoutCORS ? undefined : "anonymous"}
              onLoad={() => setIsLoading(false)}
              onError={handleImageError}
              onDoubleClick={handleReset} 
              draggable={false} 
            />
          </div>
        )}
      </div>

      {!hasError && !isLoading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 z-20">
          <button onClick={zoomOut} className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M20 12H4"/></svg></button>
          <div className="w-12 text-center text-[10px] font-black text-blue-400 font-mono">{Math.round(scale * 100)}%</div>
          <button onClick={zoomIn} className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg></button>
          <div className="w-[1.5px] h-5 bg-white/10 mx-1"></div>
          <button onClick={handleRotate} className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button onClick={handleReset} className="p-2.5 text-white hover:bg-red-500 rounded-xl transition-colors" title="Resetar Visualização"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
