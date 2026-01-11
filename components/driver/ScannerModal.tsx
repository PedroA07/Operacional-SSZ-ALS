
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
  initialImages?: string[];
}

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onSuccess, trip, user, initialImages = [] }) => {
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
    setCurrentImage(canvas.toDataURL('image/jpeg', 0.8));
    setStep('preview');
  };

  const handleFinish = async () => {
    if (isSaving || !currentImage) return;
    setIsSaving(true);
    try {
      const photoId = `img_${Date.now()}`;
      const osClean = trip.os.replace(/[^a-z0-9]/gi, '_');
      
      // SALVA NA PASTA ESPECÍFICA DA VIAGEM NO R2
      const publicUrl = await fileStorage.uploadTripPhoto(currentImage, osClean, photoId);
      
      const newDoc: DriverCapturedDoc = { id: photoId, url: publicUrl, timestamp: new Date().toISOString() };
      const updatedTrip = { ...trip, driver_docs: [...(trip.driver_docs || []), newDoc] };
      
      await db.saveTrip(updatedTrip, user);
      await onSuccess();
      onClose();
    } catch (e) {
      alert("Erro ao enviar foto.");
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
            <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-blue-500"></button>
          </div>
          <button onClick={onClose} className="absolute top-10 right-6 text-white text-xl">✕</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-6 bg-slate-900">
          <img src={currentImage!} className="flex-1 object-contain rounded-3xl" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button onClick={() => setStep('camera')} className="py-4 bg-white/10 text-white rounded-2xl">Refazer</button>
            <button onClick={handleFinish} disabled={isSaving} className="py-4 bg-blue-600 text-white rounded-2xl font-black">
              {isSaving ? 'Enviando...' : 'Confirmar Foto'}
            </button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ScannerModal;
