
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
  
  const { scale, resetZoom, zoomIn, zoomOut } = useMouseZoom({ containerRef });
  const { 
    position, 
    isDragging, 
    onMouseDown, 
    resetPosition 
  } = useMousePan(scale);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    resetZoom();
    resetPosition();
    setRotation(0);
  }, [url]);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    resetPosition();
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full flex flex-col bg-slate-950 rounded-[2.5rem] overflow-hidden group select-none shadow-inner border border-white/5 ${className}`}
      style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default') }}
    >
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 touch-none"
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
      >
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 z-10">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {hasError ? (
          <div className="text-center p-10">
            <p className="text-white font-black uppercase text-[10px]">Falha ao carregar arquivo</p>
            <button onClick={() => window.open(url, '_blank')} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase">Abrir link direto</button>
          </div>
        ) : (
          <div 
            className="flex items-center justify-center"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
          >
            <img 
              src={url} 
              alt={alt} 
              className="max-w-full max-h-full object-contain shadow-2xl pointer-events-auto" 
              onLoad={() => setIsLoading(false)}
              onError={() => { setHasError(true); setIsLoading(false); }}
              draggable={false} 
            />
          </div>
        )}
      </div>

      {!hasError && !isLoading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all opacity-0 group-hover:opacity-100 z-50">
          <button onClick={zoomOut} className="p-2 text-white hover:bg-white/10 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M20 12H4"/></svg></button>
          <div className="w-12 text-center text-[10px] font-black text-blue-400 font-mono">{Math.round(scale * 100)}%</div>
          <button onClick={zoomIn} className="p-2 text-white hover:bg-white/10 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg></button>
          <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
          <button onClick={handleRotate} className="p-2 text-white hover:bg-white/10 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
