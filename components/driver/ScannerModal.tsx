
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trip, User, DriverCapturedDoc } from '../../types';
import { db } from '../../utils/storage';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  trip: Trip;
  user: User;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onSuccess, trip, user }) => {
  const [step, setStep] = useState<'camera' | 'preview'>('camera');
  const [capturedImages, setCapturedImages] = useState<DriverCapturedDoc[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Função para parar a câmera - chamada apenas no fechamento total
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  // Inicialização única da câmera
  const startCamera = useCallback(async () => {
    if (streamRef.current) return; // Já está rodando
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Erro Câmera:", err);
      alert("Acesso à câmera negado. Por favor, libere a permissão no seu navegador.");
      onClose();
    }
  }, [onClose]);

  // Efeito de controle de ciclo de vida: Liga ao abrir, desliga ao fechar
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      // Captura na resolução nativa do sensor
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCurrentImage(dataUrl);
      setStep('preview');
      // NOTA: Não paramos o stream aqui para evitar o "pisca" ao voltar
    }
  };

  const handleAddMore = () => {
    if (currentImage) {
      const newDoc: DriverCapturedDoc = {
        id: `scan-${Date.now()}`,
        url: currentImage,
        timestamp: new Date().toISOString()
      };
      setCapturedImages(prev => [...prev, newDoc]);
      setCurrentImage(null);
      setStep('camera');
    }
  };

  const handleRefazer = () => {
    setCurrentImage(null);
    setStep('camera');
  };

  const handleFinish = async () => {
    if (isSaving) return;
    
    const finalDocs = [...capturedImages];
    if (currentImage) {
      finalDocs.push({
        id: `scan-${Date.now()}`,
        url: currentImage,
        timestamp: new Date().toISOString()
      });
    }

    if (finalDocs.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const updatedTrip: Trip = {
        ...trip,
        driver_docs: [...(trip.driver_docs || []), ...finalDocs]
      };
      
      await db.saveTrip(updatedTrip);
      
      await db.addNotification(
        user,
        'DRIVER_DOC_UPLOADED',
        `Scanner OS ${trip.os}`,
        `${user.displayName} enviou ${finalDocs.length} foto(s).`,
        { os: trip.os, motorista: user.displayName, fotos: String(finalDocs.length) }
      );

      await onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao salvar arquivos no banco.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black flex flex-col h-[100dvh] animate-in fade-in duration-200 overflow-hidden">
      
      {/* HEADER FIXO - Z-60 */}
      <header className="px-6 py-4 bg-slate-950/90 backdrop-blur-md border-b border-white/10 flex justify-between items-center shrink-0 z-[60]">
        <div>
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none">Câmera ALS Transportes</p>
          <h3 className="text-xs font-black text-white uppercase mt-1">OS {trip.os}</h3>
        </div>
        <button 
          onClick={onClose} 
          className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white active:bg-red-600 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
        </button>
      </header>

      {/* VIEWPORT DA CÂMERA / PREVIEW */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        
        {/* Camada 1: Vídeo (Sempre montado para não piscar) */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${step === 'preview' ? 'opacity-20' : 'opacity-100'}`}
        />

        {/* Camada 2: Molde A4 (Apenas no step camera) */}
        {step === 'camera' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-10 animate-in fade-in duration-500">
            <div className="w-full max-w-[320px] aspect-[1/1.414] border-2 border-dashed border-blue-500/50 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
               <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
               <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
               <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
               <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
               
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-tight">
                   Enquadre o documento
                 </p>
               </div>
            </div>
          </div>
        )}

        {/* Camada 3: Foto Capturada (Step preview) */}
        {step === 'preview' && currentImage && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
             <div className="w-full max-w-[340px] aspect-[1/1.414] bg-white rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border-4 border-white">
                <img src={currentImage} className="w-full h-full object-cover" alt="Captura" />
             </div>
          </div>
        )}

        {/* Botão de Captura Flutuante */}
        {step === 'camera' && (
          <div className="absolute bottom-8 left-0 w-full flex flex-col items-center gap-4 z-40">
             {capturedImages.length > 0 && (
               <div className="bg-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase shadow-2xl animate-bounce">
                 {capturedImages.length} Página(s) na Pilha
               </div>
             )}
             <button 
               onClick={capturePhoto}
               disabled={!isCameraReady}
               className={`w-20 h-20 bg-white rounded-full border-4 border-blue-500 flex items-center justify-center active:scale-75 transition-all shadow-[0_0_40px_rgba(59,130,246,0.6)] ${!isCameraReady ? 'opacity-30 grayscale' : ''}`}
             >
               <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-full shadow-inner"></div>
             </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* FOOTER FIXO */}
      <footer className="p-6 bg-slate-950 border-t border-white/10 shrink-0 z-50 safe-bottom">
        {step === 'preview' ? (
          <div className="flex flex-col gap-3">
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleRefazer}
                  className="py-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] font-black uppercase border border-white/5 active:bg-white active:text-black transition-all"
                >
                  Refazer Foto
                </button>
                <button 
                  onClick={handleAddMore}
                  className="py-4 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase active:bg-blue-600 active:text-white transition-all"
                >
                  + Outra Página
                </button>
             </div>
             <button 
               disabled={isSaving}
               onClick={handleFinish}
               className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl active:bg-emerald-700 transition-all flex items-center justify-center gap-3"
             >
               {isSaving ? (
                 <>
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   Enviando...
                 </>
               ) : 'Enviar ao Operacional'}
             </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
             <button 
               onClick={onClose}
               className="flex-1 py-4 bg-slate-900 text-slate-500 rounded-2xl text-[10px] font-black uppercase active:text-white transition-all"
             >
               Cancelar
             </button>
             {capturedImages.length > 0 && (
                <button 
                  onClick={handleFinish}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"
                >
                  Enviar {capturedImages.length} Foto(s)
                </button>
             )}
          </div>
        )}
      </footer>

      <style>{`
        .safe-bottom {
          padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
};

export default ScannerModal;
