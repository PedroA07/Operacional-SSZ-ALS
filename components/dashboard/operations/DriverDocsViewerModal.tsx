
import React, { useState, useEffect } from 'react';
import { Trip, DriverCapturedDoc, User } from '../../../types';
import { db } from '../../../utils/storage';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
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
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DriverCapturedDoc | null>(null);
  const [manualKey, setManualKey] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  useEffect(() => {
    setDocs(trip.driver_docs || []);
  }, [trip.driver_docs]);

  useEffect(() => {
    if (selectedDoc) {
      setManualKey(selectedDoc.extractedKey || '');
    }
  }, [selectedDoc]);

  const extractNFKey = async (doc: DriverCapturedDoc) => {
    if (isProcessing) return;
    setIsProcessing(doc.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = doc.url.split(',')[1];
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Extraia a CHAVE DE ACESSO de 44 dígitos desta Nota Fiscal (NF-e). Retorne APENAS os números." }
          ]
        }
      });
      const cleanKey = (response.text || '').replace(/\D/g, '');
      if (cleanKey.length === 44) {
        const updatedDocs = docs.map(d => d.id === doc.id ? { ...d, extractedKey: cleanKey } : d);
        setDocs(updatedDocs);
        setManualKey(cleanKey);
        await db.saveTrip({ ...trip, driver_docs: updatedDocs }, user);
      } else { alert("IA: Chave não localizada."); }
    } catch (error) { alert("Falha na comunicação IA."); } finally { setIsProcessing(null); }
  };

  const handleSaveManualKey = async () => {
    if (!selectedDoc) return;
    const cleanKey = manualKey.replace(/\D/g, '');
    if (cleanKey.length !== 44) return alert("Chave deve ter 44 dígitos.");
    const updatedDocs = docs.map(d => d.id === selectedDoc.id ? { ...d, extractedKey: cleanKey } : d);
    setDocs(updatedDocs);
    await db.saveTrip({ ...trip, driver_docs: updatedDocs }, user);
    alert("Salvo com sucesso.");
  };

  const linkToTripNF = async (key: string) => {
    if (!confirm(`Vincular chave ${key} como oficial?`)) return;
    await db.saveTrip({ ...trip, nfKey: key.replace(/\D/g, '') }, user);
    onSuccess();
    alert("Vínculo efetuado.");
  };

  const confirmDelete = (id: string) => {
    setDocToDelete(id);
    setIsDeleteModalOpen(true);
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
        
        {/* HEADER */}
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg></div>
            <div><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dossiê de Fotos do Motorista</p><h3 className="text-xl font-black uppercase">OS {trip.os} › {trip.driver.name}</h3></div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* GALERIA ESQUERDA (Thumbnails) */}
          <div className="w-48 bg-slate-50 border-r border-slate-200 overflow-y-auto custom-scrollbar p-4 space-y-4 shrink-0">
             {docs.length === 0 ? (
               <div className="py-24 text-center text-slate-300 font-bold uppercase italic text-[8px]">Sem fotos</div>
             ) : docs.map(doc => (
               <button 
                 key={doc.id} onClick={() => setSelectedDoc(doc)}
                 className={`w-full aspect-video rounded-xl overflow-hidden border-2 transition-all ${selectedDoc?.id === doc.id ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
               >
                 <img src={doc.url} className="w-full h-full object-cover" alt="" />
               </button>
             ))}
          </div>

          {/* VISUALIZAÇÃO CENTRAL (Foco na Imagem) */}
          <div className="flex-1 bg-slate-100 p-8 flex items-center justify-center relative overflow-hidden">
             {selectedDoc ? (
               <div className="w-full h-full rounded-3xl overflow-hidden shadow-inner border border-slate-200 bg-black">
                  <ImageViewer url={selectedDoc.url} />
               </div>
             ) : (
               <div className="text-center text-slate-300 font-black uppercase tracking-widest">Selecione uma imagem para começar</div>
             )}
          </div>

          {/* BARRA LATERAL DIREITA (Ferramentas) */}
          {selectedDoc && (
            <div className="w-80 bg-white border-l border-slate-200 p-8 flex flex-col gap-8 shrink-0 overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-500">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-6">Processamento & IA</p>
                  <div className="space-y-6">
                     <div className="bg-blue-50 p-6 rounded-[1.8rem] border border-blue-100 space-y-4">
                        <div className="flex justify-between items-center">
                           <span className="text-[8px] font-black text-blue-600 uppercase">Chave de Acesso (44)</span>
                           {!selectedDoc.extractedKey && <button onClick={() => extractNFKey(selectedDoc)} disabled={!!isProcessing} className="text-[8px] font-black text-blue-500 hover:underline">USAR IA</button>}
                        </div>
                        <input className="w-full bg-white px-4 py-3 rounded-xl font-mono text-sm font-black text-slate-800 border border-blue-100" placeholder="0000..." value={manualKey} onChange={e => setManualKey(e.target.value.replace(/\D/g, ''))} />
                        <button onClick={handleSaveManualKey} className="w-full py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md active:scale-95">Salvar Identificador</button>
                     </div>

                     {manualKey.length === 44 && (
                       <div className="space-y-2">
                          <button onClick={() => linkToTripNF(manualKey)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg active:scale-95">Vincular como Oficial</button>
                          <button onClick={() => window.open(`https://meudanfe.com.br/ch/${manualKey}`, '_blank')} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase shadow-lg active:scale-95">Visualizar DANFE</button>
                       </div>
                     )}
                  </div>
               </div>

               <div className="mt-auto space-y-3">
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center">Gestão de Arquivo</p>
                  <button onClick={() => { const l=document.createElement('a'); l.href=selectedDoc.url; l.download=`ALS_${trip.os}.jpg`; l.click(); }} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-[9px] font-black uppercase hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Download Original
                  </button>
                  <button onClick={() => confirmDelete(selectedDoc.id)} className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Excluir Imagem
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMAÇÃO EXCLUSÃO */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div>
              <div><h4 className="text-lg font-black uppercase text-slate-800">Remover Foto?</h4><p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Esta ação é irreversível e o arquivo será apagado do dossiê.</p></div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setIsDeleteModalOpen(false)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
                 <button onClick={executeDelete} className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DriverDocsViewerModal;
