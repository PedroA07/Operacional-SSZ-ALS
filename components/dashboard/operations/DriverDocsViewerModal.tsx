
import React, { useState, useEffect } from 'react';
import { Trip, DriverCapturedDoc, TripDocument, User } from '../../../types';
import { db } from '../../../utils/storage';
import { GoogleGenAI } from "@google/genai";

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

  useEffect(() => {
    setDocs(trip.driver_docs || []);
  }, [trip.driver_docs]);

  const extractNFKey = async (doc: DriverCapturedDoc) => {
    if (isProcessing) return;
    setIsProcessing(doc.id);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Converte data URL para base64 puro
      const base64Data = doc.url.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
              { text: "Extraia a CHAVE DE ACESSO de 44 dígitos desta Nota Fiscal (NF-e). Retorne APENAS os números, sem espaços ou caracteres especiais. Se não encontrar uma chave de 44 dígitos, retorne 'NAO_LOCALIZADO'." }
            ]
          }
        ]
      });

      const extracted = response.text?.trim() || 'NAO_LOCALIZADO';
      const cleanKey = extracted.replace(/\D/g, '');

      if (cleanKey.length === 44) {
        // Atualiza o documento local com a chave
        const updatedDocs = docs.map(d => d.id === doc.id ? { ...d, extractedKey: cleanKey } : d);
        setDocs(updatedDocs);
        
        // Salva no banco
        const updatedTrip = { ...trip, driver_docs: updatedDocs };
        await db.saveTrip(updatedTrip);
      } else {
        alert("IA: Chave de acesso não localizada nesta imagem. Verifique se a foto está nítida.");
      }
    } catch (error) {
      console.error("Erro AI:", error);
      alert("Falha na comunicação com o processador de documentos.");
    } finally {
      setIsProcessing(null);
    }
  };

  const linkToTripNF = async (key: string) => {
    if (!confirm(`Deseja vincular a chave ${key} como a oficial desta OS?`)) return;
    
    try {
      const updatedTrip: Trip = {
        ...trip,
        nfKey: key
      };
      await db.saveTrip(updatedTrip, user);
      onSuccess();
      alert("Chave vinculada com sucesso! Você já pode gerar o DANFE.");
    } catch (e) {
      alert("Erro ao salvar.");
    }
  };

  const openMeuDanfe = (key: string) => {
    window.open(`https://meudanfe.com.br/ch/${key}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Documentos do Motorista</p>
              <h3 className="text-xl font-black uppercase">OS {trip.os} › {trip.driver.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* GALERIA LATERAL */}
          <div className="w-full md:w-80 bg-slate-50 border-r border-slate-200 overflow-y-auto custom-scrollbar p-6 space-y-4">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Fotos Recebidas ({docs.length})</p>
             {docs.length === 0 ? (
               <div className="py-20 text-center text-slate-300 font-bold uppercase italic text-[10px]">Nenhuma foto enviada</div>
             ) : docs.map(doc => (
               <button 
                 key={doc.id}
                 onClick={() => setSelectedDoc(doc)}
                 className={`w-full text-left group transition-all ${selectedDoc?.id === doc.id ? 'ring-4 ring-blue-500 ring-offset-2' : ''}`}
               >
                 <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-200 shadow-sm">
                    <img src={doc.url} className="w-full h-full object-cover" alt="Scan" />
                    {doc.extractedKey && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                      </div>
                    )}
                 </div>
                 <p className="text-[8px] font-black text-slate-400 uppercase mt-2 px-1">{new Date(doc.timestamp).toLocaleString('pt-BR')}</p>
               </button>
             ))}
          </div>

          {/* ÁREA DE VISUALIZAÇÃO PRINCIPAL */}
          <div className="flex-1 bg-slate-800 p-8 flex flex-col overflow-hidden relative">
             {selectedDoc ? (
               <>
                 <div className="flex-1 bg-black/40 rounded-[2rem] overflow-hidden relative flex items-center justify-center border border-white/5 shadow-2xl">
                    <img src={selectedDoc.url} className="max-w-full max-h-full object-contain" alt="Full View" />
                    
                    {/* OVERLAY DE PROCESSAMENTO */}
                    {isProcessing === selectedDoc.id && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4 z-20">
                         <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">IA Analisando Documento...</p>
                         <p className="text-[9px] text-slate-400 uppercase">Localizando Chave de Acesso</p>
                      </div>
                    )}
                 </div>

                 {/* BARRA DE FERRAMENTAS INFERIOR */}
                 <div className="mt-6 flex flex-col lg:flex-row items-center gap-6">
                    <div className="flex-1 w-full bg-slate-900/50 p-6 rounded-3xl border border-white/5 flex flex-col lg:flex-row items-center justify-between gap-4">
                       <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Chave de Acesso Extraída (IA)</p>
                          <div className="bg-black/60 px-5 py-4 rounded-xl font-mono text-xl font-black text-emerald-400 tracking-[0.3em] border border-emerald-500/20 shadow-inner break-all">
                             {selectedDoc.extractedKey || '00000000000000000000000000000000000000000000'}
                          </div>
                       </div>
                       
                       <div className="flex gap-2 shrink-0">
                          {!selectedDoc.extractedKey ? (
                            <button 
                              onClick={() => extractNFKey(selectedDoc)}
                              className="px-8 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                            >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeWidth="2.5"/></svg>
                               Processar OCR
                            </button>
                          ) : (
                            <>
                               <button 
                                 onClick={() => linkToTripNF(selectedDoc.extractedKey!)}
                                 className="px-8 py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
                               >
                                  Vincular à OS
                               </button>
                               <button 
                                 onClick={() => openMeuDanfe(selectedDoc.extractedKey!)}
                                 className="px-8 py-5 bg-slate-100 text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-white transition-all flex items-center gap-2"
                               >
                                  Ver no Meu DANFE
                               </button>
                            </>
                          )}
                       </div>
                    </div>
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-6">
                  <div className="w-32 h-32 rounded-full bg-slate-700/30 flex items-center justify-center border-4 border-dashed border-slate-700">
                     <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5"/></svg>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xl font-black uppercase tracking-tight text-white">Nenhum documento selecionado</h4>
                    <p className="text-sm font-bold opacity-60 mt-2">Selecione uma foto na galeria lateral para processar</p>
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDocsViewerModal;
