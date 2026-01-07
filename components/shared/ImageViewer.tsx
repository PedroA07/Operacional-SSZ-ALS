import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageViewerProps {
  url: string;
  alt?: string;
  className?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ url, alt = "Documento", className = "" }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Handlers de Zoom
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    // Resetar posição ao girar para evitar comportamentos estranhos de offset
    setPosition({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Handlers de Arrastar (Panning)
  const startDragging = (e: React.MouseEvent | React.TouchEvent) => {
    if (scale <= 1 && rotation === 0) return; // Só arrasta se tiver zoom ou rotação
    
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragStart({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };

  const onDragging = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const stopDragging = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDragging);
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('touchmove', onDragging);
      window.addEventListener('touchend', stopDragging);
    } else {
      window.removeEventListener('mousemove', onDragging);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onDragging);
      window.removeEventListener('touchend', stopDragging);
    }
    return () => {
      window.removeEventListener('mousemove', onDragging);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onDragging);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging, onDragging]);

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative w-full h-full flex flex-col bg-slate-900/40 rounded-[2rem] overflow-hidden group select-none ${className}`}
      style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'move' : 'default') }}
    >
      {/* Área da Imagem */}
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4"
        onMouseDown={startDragging}
        onTouchStart={startDragging}
      >
        <div 
          className="transition-transform duration-75 ease-out flex items-center justify-center"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          }}
        >
          <img 
            src={url} 
            alt={alt} 
            className="max-w-full max-h-full object-contain shadow-2xl pointer-events-none"
            onDoubleClick={handleReset}
            draggable={false}
          />
        </div>
      </div>

      {/* Dica de Uso */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="text-[8px] font-black text-white/70 uppercase tracking-[0.2em]">Scroll para Zoom • Arraste para Mover</p>
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
          title="Resetar Visualização"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        </button>
      </div>
    </div>
  );
};

export default ImageViewer;