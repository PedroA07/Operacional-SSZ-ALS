
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trip, User, DriverCapturedDoc } from '../../types';
import { db } from '../../utils/storage';

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (err) { setIsCameraReady(false); }
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      if (initialImage) {
        setCurrentImage(initialImage);
        setStep('preview');
      } else {
        startCamera();
      }
    }
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera, initialImage]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    setCurrentImage(canvas.toDataURL('image/jpeg', 0.85));
    setStep('preview');
    stopCamera();
  };

  const handleFinish = async () => {
    if (isSaving || !currentImage) return;
    setIsSaving(true);
    const newDoc: DriverCapturedDoc = { id: `scan-${Date.now()}`, url: currentImage, timestamp: new Date().toISOString() };
    const updatedTrip: Trip = { ...trip, driver_docs: [newDoc, ...(trip.driver_docs || [])] };
    
    if (await db.saveTrip(updatedTrip, user)) {
      await onSuccess();
      onClose();
    }
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col h-[100dvh]">
      <header className="px-6 py-4 bg-slate-950 border-b border-white/10 flex justify-between items-center shrink-0">
        <div>
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Scanner Operacional</p>
          <h3 className="text-xs font-black text-white uppercase mt-1">OS {trip.os}</h3>
        </div>
        <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
      </header>

      <div className="flex-1 relative flex items-center justify-center bg-black">
        {step === 'camera' && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 border-2 border-dashed border-blue-500/50 m-12 rounded-3xl pointer-events-none flex items-center justify-center"><p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Enquadre o Documento</p></div>
            <div className="absolute bottom-10 w-full flex justify-center"><button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-blue-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all"><div className="w-14 h-14 bg-blue-600 rounded-full"></div></button></div>
          </>
        )}

        {step === 'preview' && currentImage && (
          <div className="w-full h-full p-6 animate-in zoom-in-95 flex flex-col">
             <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-2xl"><img src={currentImage} className="w-full h-full object-contain" /></div>
             <div className="flex gap-4 mt-6">
                <button onClick={() => { setStep('camera'); setCurrentImage(null); startCamera(); }} className="flex-1 py-5 bg-slate-800 text-slate-300 rounded-3xl text-[10px] font-black uppercase">Refazer</button>
                <button onClick={handleFinish} disabled={isSaving} className="flex-1 py-5 bg-emerald-600 text-white rounded-3xl text-[10px] font-black uppercase shadow-xl active:scale-95">{isSaving ? 'Enviando...' : 'Confirmar e Enviar'}</button>
             </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerModal;
