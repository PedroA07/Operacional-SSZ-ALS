
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trip, User, DriverCapturedDoc } from '../../types';
import { db } from '../../utils/storage';
import { fileStorage } from '../../utils/fileStorage';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  trip: Trip;
  user: User;
  initialImage?: string | null;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onSuccess, trip, user, initialImage }) => {
  const [step, setStep] = useState<'camera' | 'preview'>(initialImage ? 'preview' : 'camera');
  const [capturedImages, setCapturedImages] = useState<DriverCapturedDoc[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(initialImage || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showSessionGallery, setShowSessionGallery] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (step === 'preview') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (err) { 
      setIsCameraReady(false); 
      console.error("Erro ao acessar câmera:", err);
    }
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      if (initialImage) {
        setCurrentImage(initialImage);
        setStep('preview');
        stopCamera();
      } else {
        startCamera();
      }
    }
    return () => stopCamera();
  }, [isOpen, initialImage, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCurrentImage(dataUrl);
    setStep('preview');
    stopCamera();
  };

  const handleKeepPhoto = () => {
    if (!currentImage) return;
    const newDoc: DriverCapturedDoc = { 
      id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, 
      url: currentImage, 
      timestamp: new Date().toISOString() 
    };
    setCapturedImages(prev => [...prev, newDoc]);
    setCurrentImage(null);
    setStep('camera');
    startCamera();
  };

  const handleFinish = async () => {
    if (isSaving) return;
    
    const docsToUpload = [...capturedImages];
    if (currentImage) {
      docsToUpload.push({ 
        id: `scan-last-${Date.now()}`, 
        url: currentImage, 
        timestamp: new Date().toISOString() 
      });
    }
    
    if (docsToUpload.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    
    try {
      const finalDocsForDatabase: DriverCapturedDoc[] = [];
      
      // Processa cada imagem: Tenta Storage, se falhar usa Base64
      for (const doc of docsToUpload) {
        if (doc.url.startsWith('data:')) {
          try {
            const fileName = `drv_os_${trip.os}_${Date.now()}.jpg`;
            // Tenta o upload oficial
            const storagePath = await fileStorage.uploadFile(doc.url, 'docs', fileName, 'trips');
            const publicUrl = fileStorage.getPublicUrl(storagePath, 'trips');
            finalDocsForDatabase.push({ ...doc, url: publicUrl });
          } catch (storageErr) {
            console.warn("Storage falhou, usando Fallback Base64 para garantir envio.");
            // Fallback: Salva o Base64 diretamente no banco (limite do JSONB é grande o suficiente)
            finalDocsForDatabase.push(doc);
          }
        } else {
          finalDocsForDatabase.push(doc);
        }
      }

      const updatedTrip: Trip = { 
        ...trip, 
        driver_docs: [...(trip.driver_docs || []), ...finalDocsForDatabase] 
      };

      const success = await db.saveTrip(updatedTrip, user);
      if (success) {
        await db.addNotification(user, 'DRIVER_DOC_UPLOADED', `Fotos Enviadas: OS ${trip.os}`, `${user.displayName} enviou ${finalDocsForDatabase.length} novas fotos de campo.`, { os: trip.os, motorista: user.displayName });
        await onSuccess();
        onClose();
      } else {
        alert("Erro ao gravar no banco de dados. Verifique sua conexão.");
      }
    } catch (e) {
      console.error("Erro crítico no processo de salvamento:", e);
      alert("Falha ao sincronizar arquivos. Tente novamente em uma área com melhor sinal.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col h-[100dvh] overflow-hidden">
      <header className="px-6 py-4 bg-slate-950/95 border-b border-white/10 flex justify-between items-center shrink-0 z-50 pt-8">
        <div><p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Scanner de Documentos ALS</p><h3 className="text-xs font-black text-white uppercase mt-1">OS {trip.os}</h3></div>
        <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
      </header>

      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {step === 'camera' && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="w-full h-full relative">
                  <div className="absolute inset-0 bg-black/90" style={{
                    maskImage: 'radial-gradient(ellipse at center, transparent 35%, black 65%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 35%, black 65%)'
                  }}></div>
                  
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] aspect-[1/1.41] max-h-[75%] border-2 border-white/10 rounded-[3rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-blue-500 rounded-tl-[3rem] shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-blue-500 rounded-tr-[3rem] shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-blue-500 rounded-bl-[3rem] shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-blue-500 rounded-br-[3rem] shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                    
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em] text-center px-10">Centralize o Documento</p>
                  </div>
               </div>
            </div>

            <div className="absolute bottom-10 w-full flex items-center justify-center gap-10 px-10 z-50">
               <button onClick={() => capturedImages.length > 0 && setShowSessionGallery(true)} className="relative w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-95 transition-all overflow-hidden">{capturedImages.length > 0 ? <><img src={capturedImages[capturedImages.length-1].url} className="w-full h-full object-cover opacity-60" alt="" /><span className="absolute inset-0 flex items-center justify-center text-[11px] font-black bg-blue-600/40">{capturedImages.length}</span></> : <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2.5"/></svg>}</button>
               <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-blue-500 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] active:scale-75 transition-all"><div className="w-14 h-14 bg-blue-600 rounded-full border-2 border-white/20"></div></button>
               <button onClick={handleFinish} disabled={capturedImages.length === 0 && !currentImage} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${ (capturedImages.length > 0 || currentImage) ? 'bg-emerald-600 text-white shadow-lg active:scale-95' : 'bg-slate-800 text-slate-600'}`}><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg></button>
            </div>
          </>
        )}

        {step === 'preview' && currentImage && (
          <div className="w-full h-full p-6 animate-in zoom-in-95 flex flex-col bg-slate-950">
             <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-2xl relative"><img src={currentImage} className="w-full h-full object-contain" alt="" /><div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest">Confirme a Legibilidade</div></div>
             <div className="flex gap-4 mt-8 pb-4">
                <button onClick={() => { setStep('camera'); setCurrentImage(null); startCamera(); }} className="flex-1 py-5 bg-slate-900 text-slate-300 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border border-white/5 active:bg-red-600 transition-colors">Descartar</button>
                <button onClick={handleKeepPhoto} className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>{initialImage ? 'Confirmar' : 'Próxima'}</button>
             </div>
          </div>
        )}

        {showSessionGallery && (
          <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
             <header className="p-6 bg-slate-900 border-b border-white/10 flex justify-between items-center shrink-0 pt-10"><h4 className="text-sm font-black text-white uppercase tracking-widest">Capturas da Sessão</h4><button onClick={() => setShowSessionGallery(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button></header>
             <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4 custom-scrollbar">{capturedImages.map((img, i) => (<div key={img.id} className="aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 relative group"><img src={img.url} className="w-full h-full object-cover" alt="" /><div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] text-white">#{i+1}</div><button onClick={() => setCapturedImages(capturedImages.filter(ci => ci.id !== img.id))} className="absolute top-2 right-2 w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button></div>))}</div>
             <div className="p-6 bg-slate-950 border-t border-white/10 shrink-0 pb-10"><button onClick={() => setShowSessionGallery(false)} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl">Voltar para Câmera</button></div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {isSaving && (
        <div className="absolute inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white"><div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><p className="text-[10px] font-black uppercase tracking-[0.4em] mt-6 animate-pulse">Sincronizando Dossiê...</p></div>
      )}
    </div>
  );
};

export default ScannerModal;
