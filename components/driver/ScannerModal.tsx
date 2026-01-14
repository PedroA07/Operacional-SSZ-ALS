
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trip, User, DriverCapturedDoc } from '../../types';
import { db } from '../../utils/storage';
import { fileStorage } from '../../utils/fileStorage';
import { imageCompressor } from '../../utils/imageCompressor';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  trip: Trip;
  user: User;
  initialImages?: string[];
}

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onSuccess, trip, user, initialImages = [] }) => {
  const [step, setStep] = useState<'camera' | 'preview'>('camera');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen && initialImages.length > 0) {
      setCurrentImage(initialImages[0]);
      setStep('preview');
    } else if (isOpen) {
      setStep('camera');
      setCurrentImage(null);
      startCamera();
    }
  }, [isOpen, initialImages]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1920 }, // Buscando Full HD
          height: { ideal: 1080 }
        } 
      });

      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) { 
      console.error("Camera access error:", err);
      setCameraError("Acesso à câmera negado ou não encontrado. Verifique as configurações do celular.");
    }
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Configurações de alta qualidade para o canvas de captura
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Captura inicial de alta fidelidade
    const rawImage = canvas.toDataURL('image/jpeg', 0.9);
    setCurrentImage(rawImage);
    setStep('preview');
    stopCamera();
  };

  const handleFinish = async () => {
    if (isSaving || !currentImage) return;
    setIsSaving(true);
    try {
      // Compressão HD para garantir leitura por OCR e operadores
      const compressedImage = await imageCompressor.compress(currentImage, {
        maxWidth: 1600, 
        quality: 0.75
      });

      const photoId = `img_${Date.now()}`;
      const osClean = trip.os.replace(/[^a-z0-9]/gi, '_');
      
      const publicUrl = await fileStorage.uploadTripPhoto(compressedImage, osClean, photoId);
      
      if (!publicUrl || publicUrl.includes('undefined')) {
        throw new Error("O servidor retornou uma URL inválida.");
      }

      const newDoc: DriverCapturedDoc = { 
        id: photoId, 
        url: publicUrl, 
        timestamp: new Date().toISOString() 
      };
      
      const updatedTrip = { 
        ...trip, 
        driver_docs: [...(trip.driver_docs || []), newDoc] 
      };
      
      await db.saveTrip(updatedTrip, user);
      
      await onSuccess();
      onClose();
    } catch (e: any) {
      console.error("Critical Upload Error:", e);
      alert(`Falha no envio: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col">
      {step === 'camera' ? (
        <div className="flex-1 relative bg-black flex flex-col items-center justify-center">
          {cameraError ? (
            <div className="p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
              </div>
              <p className="text-white font-bold text-sm uppercase leading-relaxed">{cameraError}</p>
              <button onClick={startCamera} className="px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase">Tentar Abrir Câmera</button>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-12 w-full flex justify-center items-center gap-8">
                <button onClick={onClose} className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
                </button>
                <button onClick={capturePhoto} className="w-24 h-24 bg-white rounded-full border-[6px] border-blue-600 shadow-2xl active:scale-90 transition-all flex items-center justify-center">
                   <div className="w-16 h-16 rounded-full bg-blue-600/10 border-2 border-blue-600/20"></div>
                </button>
                <div className="w-14 h-14 opacity-0"></div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-6 bg-slate-950">
          <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border border-white/5">
             <img src={currentImage!} className="w-full h-full object-contain" alt="Preview" />
             {isSaving && (
               <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white space-y-4">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Otimizando Foto HD...</p>
               </div>
             )}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8 pb-6">
            <button 
              disabled={isSaving}
              onClick={() => {
                if (initialImages.length > 0) onClose();
                else { setStep('camera'); startCamera(); }
              }} 
              className="py-6 bg-white/5 text-slate-400 rounded-3xl text-[11px] font-black uppercase tracking-widest border border-white/5 active:bg-white/10 disabled:opacity-20"
            >
              Refazer Foto
            </button>
            <button 
              onClick={handleFinish} 
              disabled={isSaving} 
              className="py-6 bg-blue-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Enviar Agora</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerModal;
