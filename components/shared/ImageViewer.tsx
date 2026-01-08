
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
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Resetar ao mudar de URL
  useEffect(() => {
    handleReset();
  }, [url]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
    setPosition({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setExtractedText(null);
  };

  const handleExtractText = async () => {
    if (isExtracting) return;
    setIsExtracting(true);
    setOcrProgress(0);
    setExtractedText(null);
    
    try {
      const text = await ocrService.extractAllText(url, (p) => setOcrProgress(p));
      setExtractedText(text || 'Nenhum texto identificado no documento.');
    } catch (err) {
      alert("Falha ao ler o documento localmente. Tente uma foto com melhor iluminação.");
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
      className={`relative w-full h-full flex flex-col bg-slate-900 rounded-[2rem] overflow-hidden group select-none ${className}`}
      style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'move' : 'default') }}
    >
      <div 
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4"
        onMouseDown={startDragging}
        onTouchStart={startDragging}
      >
        <div 
          className="transition-transform duration-75 ease-out flex items-center justify-center"
          style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` }}
        >
          <img src={url} alt={alt} className="max-w-full max-h-full object-contain shadow-2xl pointer-events-none" onDoubleClick={handleReset} draggable={false} />
        </div>

        {isExtracting && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in">
             <div className="w-64 space-y-4">
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Escaneando Texto...</p>
                   <span className="text-[10px] font-mono text-white font-black">{Math.round(ocrProgress * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${ocrProgress * 100}%` }}></div>
                </div>
                <p className="text-[8px] text-slate-400 font-bold uppercase text-center tracking-widest">Processamento Local Ativo</p>
             </div>
          </div>
        )}

        {extractedText && (
          <div className="absolute inset-x-6 top-6 bottom-24 z-[60] bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.4)] flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
                   <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Texto Extraído</p>
                </div>
                <button onClick={() => setExtractedText(null)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <textarea 
                   readOnly
                   className="w-full h-full text-xs font-mono text-slate-700 leading-relaxed bg-transparent border-none outline-none resize-none select-all"
                   value={extractedText}
                />
             </div>
             <div className="p-6 border-t border-slate-100 flex justify-center bg-white rounded-b-[2.5rem]">
                <button onClick={handleCopyText} className={`px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-xl ${copyFeedback ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-blue-600 active:scale-95'}`}>
                  {copyFeedback ? 'Copiado para Área de Transferência' : 'Copiar Tudo'}
                </button>
             </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2.5 bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
        <button onClick={handleZoomOut} className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M20 12H4"/></svg></button>
        <div className="w-14 text-center text-[10px] font-black text-blue-400 font-mono tracking-tighter">{Math.round(scale * 100)}%</div>
        <button onClick={handleZoomIn} className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg></button>
        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
        <button onClick={handleRotate} className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors" title="Girar 90º"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
        <button 
          onClick={handleExtractText} 
          disabled={isExtracting} 
          className={`px-5 py-3 rounded-xl transition-all flex items-center gap-2 ${extractedText ? 'bg-blue-600 text-white shadow-lg' : 'text-white hover:bg-white/10'}`} 
          title="Ações de Texto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Ações de Texto</span>
        </button>
        <button onClick={handleReset} className="p-3 text-white hover:bg-white/10 rounded-xl transition-colors" title="Redefinir Vista"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
      </div>
    </div>
  );
};

export default ImageViewer;
