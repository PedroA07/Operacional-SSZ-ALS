
import React, { useState, useRef, useEffect } from 'react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  aspectRatio?: number;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, onClose, imageSrc, onCrop, aspectRatio = 1 }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        imageRef.current = img;
        // Centraliza inicialmente
        setPosition({ x: 0, y: 0 });
        setZoom(1);
      };
    }
  }, [isOpen, imageSrc]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleConfirm = () => {
    if (!canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Define tamanho padrão para foto de perfil (400x400)
    canvas.width = 400;
    canvas.height = 400;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 400, 400);

    const img = imageRef.current;
    const drawWidth = img.width * zoom * (400 / 300); // Ajuste de escala baseado no container de 300px
    const drawHeight = img.height * zoom * (400 / 300);
    
    // Desenha a imagem baseada na posição e zoom
    // Offset de 200 é o centro do canvas de 400
    ctx.drawImage(
      img, 
      200 - (drawWidth / 2) + (position.x * (400/300)), 
      200 - (drawHeight / 2) + (position.y * (400/300)), 
      drawWidth, 
      drawHeight
    );

    onCrop(canvas.toDataURL('image/jpeg', 0.8));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[7000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Ajustar Enquadramento</h3>
            <p className="text-[8px] text-blue-400 font-bold uppercase mt-1">Selecione a área principal da foto</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        <div className="p-10 flex flex-col items-center gap-8">
          {/* Container de Preview com Máscara Circular */}
          <div 
            className="w-72 h-72 rounded-[2.5rem] border-4 border-slate-100 bg-slate-50 relative overflow-hidden cursor-move touch-none shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <div 
              className="absolute pointer-events-none transition-transform duration-75"
              style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                top: '50%',
                left: '50%',
                marginTop: imageRef.current ? -(imageRef.current.height / 2) : 0,
                marginLeft: imageRef.current ? -(imageRef.current.width / 2) : 0
              }}
            >
              <img src={imageSrc} className="max-w-none" alt="recorte" draggable={false} />
            </div>
            
            {/* Máscara de Guia */}
            <div className="absolute inset-0 pointer-events-none border-[30px] border-slate-900/40">
               <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[1.5rem]"></div>
            </div>
          </div>

          {/* Controles */}
          <div className="w-full space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                <span>Menos Zoom</span>
                <span>Zoom: {Math.round(zoom * 100)}%</span>
                <span>Mais Zoom</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.01" 
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onClose}
                className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirm}
                className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95"
              >
                Confirmar Recorte
              </button>
            </div>
          </div>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default ImageCropperModal;
