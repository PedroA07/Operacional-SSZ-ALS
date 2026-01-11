
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 } } 
      });
      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
      }
    } catch (err) { console.error(err); }
  }, []);

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  useEffect(() => {
    if (isOpen) startCamera();
    return () => stopCamera();
  }, [isOpen, startCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    
    // Captura bruta do canvas
    const rawImage = canvas.toDataURL('image/jpeg', 0.95);
    setCurrentImage(rawImage);
    setStep('preview');
  };

  const handleFinish = async () => {
    if (isSaving || !currentImage) return;
    setIsSaving(true);
    try {
      // COMPRESSÃO ANTES DO UPLOAD
      // Reduzimos para 1600px (perfeito para OCR e visualização) e qualidade 0.75
      const compressedImage = await imageCompressor.compress(currentImage, {
        maxWidth: 1600,
        quality: 0.75
      });

      const photoId = `img_${Date.now()}`;
      const osClean = trip.os.replace(/[^a-z0-9]/gi, '_');
      
      const publicUrl = await fileStorage.uploadTripPhoto(compressedImage, osClean, photoId);
      
      const newDoc: DriverCapturedDoc = { id: photoId, url: publicUrl, timestamp: new Date().toISOString() };
      const updatedTrip = { ...trip, driver_docs: [...(trip.driver_docs || []), newDoc] };
      
      await db.saveTrip(updatedTrip, user);
      await onSuccess();
      onClose();
    } catch (e) {
      alert("Erro ao enviar foto comprimida.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col">
      {step === 'camera' ? (
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-10 w-full flex justify-center">
            <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-blue-500 shadow-2xl active:scale-90 transition-all"></button>
          </div>
          <button onClick={onClose} className="absolute top-10 right-6 text-white text-xl p-4 bg-black/20 rounded-full">✕</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-6 bg-slate-900">
          <div className="flex-1 relative rounded-3xl overflow-hidden shadow-2xl bg-black">
             <img src={currentImage!} className="w-full h-full object-contain" alt="Preview" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button onClick={() => setStep('camera')} className="py-5 bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Refazer</button>
            <button onClick={handleFinish} disabled={isSaving} className="py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
              {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirmar & Enviar'}
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerModal;
