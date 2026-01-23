
import React, { useState } from 'react';
import { Trip, TripDocument, User } from '../../../types';
import { fileStorage } from '../../../utils/fileStorage';
import { db } from '../../../utils/storage';
import ImageViewer from '../../shared/ImageViewer';

interface FullDocManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  user: User;
  onSuccess: () => void;
}

const FullDocManagerModal: React.FC<FullDocManagerModalProps> = ({ isOpen, onClose, trip, user, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const doc = trip.completoDoc;

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const url = await fileStorage.uploadTripDoc(file, trip.os, 'COMPLETO');
      const newDoc: TripDocument = {
        id: `full-${Date.now()}`,
        type: 'COMPLETO',
        url,
        fileName: `DOSSIÊ ATUALIZADO - ${trip.os}`,
        uploadDate: new Date().toISOString()
      };
      await db.saveTrip({ ...trip, completoDoc: newDoc }, user);
      onSuccess();
    } catch (err) {
      alert("Erro ao substituir documento.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remover este dossiê permanentemente da viagem?")) return;
    setIsProcessing(true);
    try {
      await db.saveTrip({ ...trip, completoDoc: undefined }, user);
      onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao remover documento.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
      <header className="h-20 bg-slate-900 border-b border-white/10 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black italic">PDF</div>
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Gestor de Dossiê</p>
            <h3 className="text-sm font-bold text-white uppercase mt-1">OS {trip.os} › {trip.driver.name}</h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase cursor-pointer transition-all shadow-lg active:scale-95">
            <input type="file" className="hidden" accept=".pdf" onChange={handleReplace} disabled={isProcessing} />
            {isProcessing ? 'Subindo...' : 'Substituir PDF'}
          </label>
          <button 
            onClick={handleDelete}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 rounded-xl text-[9px] font-black uppercase transition-all"
          >
            Excluir
          </button>
          <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
          <button onClick={onClose} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-hidden p-6">
        {doc ? (
          <div className="w-full h-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <ImageViewer url={doc.url} alt="Dossiê Completo" />
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-400">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento não localizado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullDocManagerModal;
