import React, { useState, useEffect, useRef } from 'react';
import { Trip, DriverCapturedDoc, User } from '../../../types';
import { db } from '../../../utils/storage';
import { textExtractionService, NFData } from '../../../utils/textExtractionService';
import { imageCompressor } from '../../../utils/imageCompressor';
import ImageViewer from '../../shared/ImageViewer';

interface DriverDocsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  user: User;
  onSuccess: () => void;
}

const DriverDocsViewerModal: React.FC<DriverDocsViewerModalProps> = ({ isOpen, onClose, trip, user, onSuccess }) => {
  const [docs, setDocs] = useState<DriverCapturedDoc[]>(trip.driver_docs || []);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<DriverCapturedDoc | null>(null);
  
  const [extractedContainer, setExtractedContainer] = useState<string | null>(null);
  const [extractedNF, setExtractedNF] = useState<NFData | null>(null);
  const [extractedGeneralText, setExtractedGeneralText] = useState<string | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const [isAddingMode, setIsAddingMode] = useState<'none' | 'choice' | 'camera'>('none');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocs(trip.driver_docs || []);
  }, [trip.driver_docs]);

  useEffect(() => {
    setExtractedContainer(null);
    setExtractedNF(null);
    setExtractedGeneralText(null);
    setOcrProgress(0);
  }, [selectedDoc]);

  const handleDownload = async () => {
    if (!selectedDoc) return;
    try {
      const response = await fetch(selectedDoc.url);
      const blob = await response.blob();
      const localUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = localUrl;
      link.download = `ALS_OS_${trip.os}_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(localUrl);
    } catch (e) {
      const link = document.createElement('a');
      link.href = selectedDoc.url;
      link.target = '_blank';
      link.download = `ALS_OS_${trip.os}.jpg`;
      link.click();
    }
  };

  const startCamera = async () => {
    setIsAddingMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Câmera indisponível.");
      setIsAddingMode('choice');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Added explicit type cast to File[] to fix 'unknown' type error in map
      const results = await Promise.all((Array.from(files) as File[]).map(async file => {
        // COMPRIMIR CADA ARQUIVO ANTES DE SALVAR
        return await imageCompressor.compress(file, {
          maxWidth: 1600,
          quality: 0.8
        });
      }));
      await saveNewDocs(results);
    }
    e.target.value = '';
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const raw = canvas.toDataURL('image/jpeg', 0.95);
      // COMPRIMIR CAPTURA
      const compressed = await imageCompressor.compress(raw, {
        maxWidth: 1600,
        quality: 0.8
      });
      saveNewDocs([compressed]);
      stopCamera();
    }
  };

  const saveNewDocs = async (urls: string[]) => {
    const newDocs: DriverCapturedDoc[] = urls.map((url, idx) => ({
      id: `op-scan-${Date.now()}-${idx}`,
      url: url,
      timestamp: new Date().toISOString()
    }));
    const updatedDocs = [...docs, ...newDocs];
    setDocs(updatedDocs);
    if (newDocs.length === 1) setSelectedDoc(newDocs[0]);
    setIsAddingMode('none');
    await db.saveTrip({ ...trip, driver_docs: updatedDocs }, user);
    onSuccess();
  };

  const handleExtractGeneralText = async () => {
    if (!selectedDoc || isProcessing) return;
    setIsProcessing(true);
    setOcrProgress(0);
    try {
      const result = await textExtractionService.extractGeneralText(selectedDoc.url, (p) => setOcrProgress(p));
      setExtractedGeneralText(result);
    } catch (e: any) {
      alert("Erro no processamento da imagem.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractContainer = async () => {
    if (!selectedDoc || isProcessing) return;
    setIsProcessing(true);
    setOcrProgress(0);
    try {
      const result = await textExtractionService.extractContainer(selectedDoc.url, (p) => setOcrProgress(p));
      setExtractedContainer(result);
      if (!result) alert("Padrão de container não localizado.");
    } catch (e: any) {
      alert("Erro ao extrair container.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractNF = async () => {
    if (!selectedDoc || isProcessing) return;
    setIsProcessing(true);
    setOcrProgress(0);
    try {
      const result = await textExtractionService.extractNF(selectedDoc.url, (p) => setOcrProgress(p));
      setExtractedNF(result);
      if (!result) alert("Chave NF-e não localizada.");
    } catch (e: any) {
      alert("Erro ao extrair NF-e.");
    } finally {
      setIsProcessing(false);
    }
  };

  const linkDataToTrip = async (type: 'container' | 'nf') => {
    const updatedTrip = { ...trip };
    if (type === 'container' && extractedContainer) updatedTrip.container = extractedContainer;
    else if (type === 'nf' && extractedNF) updatedTrip.nfKey = extractedNF.key;
    await db.saveTrip(updatedTrip, user);
    onSuccess();
    alert("Informação vinculada com sucesso.");
  };

  const executeDelete = async () => {
    if (!docToDelete) return;
    const updatedDocs = docs.filter(d => d.id !== docToDelete);
    setDocs(updatedDocs);
    await db.saveTrip({ ...trip, driver_docs: updatedDocs }, user);
    if (selectedDoc?.id === docToDelete) setSelectedDoc(null);
    setIsDeleteModalOpen(false);
    setDocToDelete(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-7xl h-[92vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10">
        
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dossiê de Campo</p>
              <h3 className="text-xl font-black uppercase">OS {trip.os} › {trip.driver.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-48 bg-slate-50 border-r border-slate-200 overflow-y-auto custom-scrollbar p-4 space-y-4 shrink-0">
             <button onClick={() => setIsAddingMode('choice')} className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg></div>
                <span className="text-[8px] font-black text-slate-400 uppercase">Novo</span>
             </button>
             {docs.slice().reverse().map(doc => (
               <button key={doc.id} onClick={() => { setSelectedDoc(doc); setIsAddingMode('none'); }} className={`w-full aspect-video rounded-xl overflow-hidden border-2 transition-all ${selectedDoc?.id === doc.id ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-60'}`}><img src={doc.url} className="w-full h-full object-cover" /></button>
             ))}
          </div>

          <div className="flex-1 bg-slate-100 p-8 flex items-center justify-center relative overflow-hidden">
             {isAddingMode === 'choice' && (
                <div className="flex gap-6 animate-in zoom-in-95">
                   <button onClick={startCamera} className="w-48 h-56 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition-all">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></div>
                      <span className="text-[10px] font-black uppercase text-slate-400">Câmera</span>
                   </button>
                   <button onClick={() => fileInputRef.current?.click()} className="w-48 h-56 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center justify-center gap-4 hover:border-emerald-500 transition-all">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                      <span className="text-[10px] font-black uppercase text-slate-400">Arquivos</span>
                   </button>
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                </div>
             )}

             {isAddingMode === 'camera' && (
                <div className="w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl relative">
                   <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                   <div className="absolute bottom-8 left-0 w-full flex justify-center gap-4">
                      <button onClick={() => { stopCamera(); setIsAddingMode('choice'); }} className="px-6 py-3 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase">Voltar</button>
                      <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-blue-500 flex items-center justify-center shadow-2xl active:scale-90 transition-all"><div className="w-10 h-10 bg-blue-600 rounded-full"></div></button>
                   </div>
                </div>
             )}

             {isAddingMode === 'none' && selectedDoc ? (
               <div className="w-full h-full rounded-3xl overflow-hidden bg-black"><ImageViewer url={selectedDoc.url} /></div>
             ) : isAddingMode === 'none' && (
               <div className="text-center text-slate-300 font-black uppercase tracking-widest">Selecione um arquivo lateral</div>
             )}
          </div>

          {selectedDoc && isAddingMode === 'none' && (
            <div className="w-85 bg-white border-l border-slate-200 p-8 flex flex-col gap-8 shrink-0 overflow-y-auto custom-scrollbar">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-6">Processamento de Texto</p>
                  
                  {isProcessing ? (
                    <div className="space-y-4 py-10 text-center">
                       <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Extraindo: {Math.round(ocrProgress * 100)}%</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                       <button onClick={handleExtractGeneralText} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                          Extrair Todo o Texto
                       </button>
                       <div className="grid grid-cols-2 gap-2">
                          <button onClick={handleExtractContainer} className="py-3.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase shadow-md hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1.5">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                             Container
                          </button>
                          <button onClick={handleExtractNF} className="py-3.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase shadow-md hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-1.5">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                             Chave NF-e
                          </button>
                       </div>
                    </div>
                  )}

                  {extractedGeneralText && (
                    <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                       <textarea readOnly className="w-full h-40 bg-white border border-slate-100 rounded-xl p-3 text-[10px] font-mono text-slate-600 resize-none outline-none" value={extractedGeneralText} />
                       <button onClick={() => { navigator.clipboard.writeText(extractedGeneralText); alert('Texto copiado.'); }} className="w-full py-3 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase">Copiar Texto</button>
                    </div>
                  )}

                  {extractedContainer && (
                    <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-3xl space-y-4">
                       <p className="text-[8px] font-black text-blue-500 uppercase text-center">Container Identificado</p>
                       <p className="text-2xl font-mono font-black text-blue-700 text-center">{extractedContainer}</p>
                       <button onClick={() => linkDataToTrip('container')} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase">Vincular à OS</button>
                    </div>
                  )}

                  {extractedNF && (
                    <div className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-5">
                       <p className="text-[8px] font-black text-emerald-600 uppercase text-center">NF-e Identificada</p>
                       <p className="text-[10px] font-mono font-black text-slate-800 break-all leading-tight text-center">{extractedNF.key}</p>
                       <button onClick={() => linkDataToTrip('nf')} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase">Vincular Chave</button>
                    </div>
                  )}
               </div>

               <div className="mt-auto space-y-3 pt-6 border-t border-slate-100">
                  <button onClick={handleDownload} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Salvar no Dispositivo
                  </button>
                  <button onClick={() => { setDocToDelete(selectedDoc.id); setIsDeleteModalOpen(true); }} className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Remover do Dossiê
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>

      {isDeleteModalOpen && docToDelete && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl">
              <h4 className="text-lg font-black uppercase text-slate-800">Apagar Documento?</h4>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setIsDeleteModalOpen(false)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Voltar</button>
                 <button onClick={executeDelete} className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Excluir</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DriverDocsViewerModal;