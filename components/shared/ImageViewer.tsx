
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ocrService } from '../../utils/ocrService';

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
  
  // Estados para OCR Local
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    setPosition({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setExtractedText(null);
    setExtractProgress(0);
  };

  const handleExtractText = async () => {
    if (isExtracting) return;
    setIsExtracting(true);
    setExtractedText(null);
    setExtractProgress(0);
    
    try {
      const text = await ocrService.extractAllText(url, (p) => setExtractProgress(p));
      setExtractedText(text);
    } catch (err) {
      alert("Falha no processador de texto local.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const startDragging = (e: React.MouseEvent | React.TouchEvent) => {
    if (scale <= 1 && rotation === 0) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const onDragging = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const stopDragging = () => setIsDragging(false);

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
      className={`relative w-full h-full flex flex-col bg-slate-950/20 rounded-[2rem] overflow-hidden group select-none ${className}`}
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

        {/* LOADING OCR LOCAL */}
        {isExtracting && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center space-y-6 animate-in fade-in">
             <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                   <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                   <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * extractProgress)} className="text-blue-500 transition-all duration-300" />
                </svg>
                <span className="absolute text-[10px] font-black text-white">{Math.round(extractProgress * 100)}%</span>
             </div>
             <div className="text-center">
                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Scanner Local Ativo</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-2">Processando caracteres sem IA externa...</p>
             </div>
          </div>
        )}

        {/* RESULTADO OCR OVERLAY (ESTILO FERRAMENTA DE CAPTURA) */}
        {extractedText && (
          <div className="absolute inset-x-6 top-6 bottom-24 z-[60] bg-white/95 backdrop-blur-xl border border-blue-200 rounded-[2rem] shadow-2xl flex flex-col animate-in slide-in-from-top-4 duration-500">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                   </div>
                   <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Ações de Texto (Local)</p>
                </div>
                <button onClick={() => setExtractedText(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed select-all">
                     {extractedText}
                  </pre>
                </div>
             </div>
             <div className="p-6 border-t border-slate-100 flex justify-center bg-white">
                <button 
                  onClick={handleCopyText}
                  className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${copyFeedback ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'}`}
                >
                  {copyFeedback ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      Copiado para Área de Transferência
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                      Copiar Todo o Texto
                    </>
                  )}
                </button>
             </div>
          </div>
        )}
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
          onClick={handleExtractText}
          disabled={isExtracting}
          className={`p-3 rounded-xl transition-all ${extractedText ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/10'}`}
          title="Ações de Texto (Local)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
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
