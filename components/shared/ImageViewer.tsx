
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
  
  // Hooks Modulares
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

  // Resetar ao mudar de URL
  useEffect(() => {
    handleReset();
  }, [url]);

  // Efeito para registrar eventos globais de mouse durante o arraste
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('touchend', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    resetPosition();
  };

  const handleReset = () => {
    resetZoom();
    resetPosition();
    setRotation(0);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full flex flex-col bg-slate-950 rounded-[2.5rem] overflow-hidden group select-none shadow-inner border border-white/5 ${className}`}
      style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'move' : 'default') }}
    >
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 touch-none"
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
      >
        <div 
          className="transition-transform duration-75 ease-out flex items-center justify-center pointer-events-none"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
        >
          <img 
            src={url} 
            alt={alt} 
            className="max-w-full max-h-full object-contain shadow-2xl" 
            onDoubleClick={handleReset} 
            draggable={false} 
          />
        </div>
      </div>

      {/* CONTROLES FLUTUANTES - SEM BOTÃO DE IA */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2.5 bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
        <button onClick={zoomOut} className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M20 12H4"/></svg></button>
        <div className="w-14 text-center text-[10px] font-black text-blue-400 font-mono tracking-tighter">{Math.round(scale * 100)}%</div>
        <button onClick={zoomIn} className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg></button>
        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
        <button onClick={handleRotate} className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors" title="Girar 90º"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
        <button onClick={handleReset} className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors" title="Redefinir"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
      </div>
    </div>
  );
};

export default ImageViewer;
