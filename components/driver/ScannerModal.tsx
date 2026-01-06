
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
      onClose();
    }
  }, [onClose]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen && step === 'camera') {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, step, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCurrentImage(dataUrl);
      setStep('preview');
      stopCamera();
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
      
      // Notificar sistema sobre o upload
      await db.addNotification(
        user,
        'DRIVER_DOC_UPLOADED',
        `Fotos Recebidas: OS ${trip.os}`,
        `O motorista ${user.displayName} enviou ${finalDocs.length} foto(s) de documentos.`,
        { os: trip.os, motorista: user.displayName, placa: trip.driver.plateHorse }
      );

      await onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao salvar fotos.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black flex flex-col animate-in fade-in duration-300 overflow-hidden">
      
      {/* HEADER ESCURO */}
      <header className="p-6 pt-12 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5 shrink-0 z-50">
        <div>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none">Scanner Digital</p>
          <h3 className="text-sm font-black text-white uppercase mt-1">Anexo OS {trip.os}</h3>
        </div>
        <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:bg-red-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
        </button>
      </header>

      {/* ÁREA DE CAPTURA / PREVIEW */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {step === 'camera' ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* MOLDE A4 TRACEJADO */}
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
              <div className="w-full aspect-[1/1.414] border-2 border-dashed border-white/40 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                 <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                 <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                 <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                 <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                 
                 <div className="absolute inset-0 flex items-center justify-center">
                   <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] text-center">
                     Enquadre o Documento A4
                   </p>
                 </div>
              </div>
            </div>
            
            <div className="absolute bottom-10 left-0 w-full flex flex-col items-center gap-6">
               {capturedImages.length > 0 && (
                 <div className="bg-blue-600/90 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg">
                   {capturedImages.length} foto(s) capturada(s)
                 </div>
               )}
               <button 
                 onClick={capturePhoto}
                 className="w-20 h-20 bg-white rounded-full border-4 border-blue-500 flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_30px_rgba(59,130,246,0.4)]"
               >
                 <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-full shadow-inner"></div>
               </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full p-6 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
             <div className="max-w-full max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <img src={currentImage!} className="max-w-full max-h-full" alt="Preview" />
             </div>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-4">Confira a nitidez da imagem</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* BOTÕES DE AÇÃO INFERIORES */}
      <footer className="p-6 bg-slate-950 border-t border-white/5 shrink-0 z-50">
        {step === 'preview' ? (
          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <button 
                  onClick={() => setStep('camera')}
                  className="py-4 bg-slate-900 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-900 transition-all border border-white/5"
                >
                  Refazer Foto
                </button>
                <button 
                  onClick={handleAddMore}
                  className="py-4 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest active:bg-blue-600 active:text-white transition-all"
                >
                  + Outra Página
                </button>
             </div>
             <button 
               disabled={isSaving}
               onClick={handleFinish}
               className="py-4 bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] active:bg-emerald-700 transition-all flex items-center justify-center"
             >
               {isSaving ? 'Enviando...' : 'Finalizar e Enviar'}
             </button>
          </div>
        ) : (
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest active:text-white transition-all"
          >
            Cancelar Scanner
          </button>
        )}
      </footer>
    </div>
  );
};

export default ScannerModal;
