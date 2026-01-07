import React, { useState, useEffect } from 'react';
import { Trip, DriverCapturedDoc, TripDocument, User } from '../../../types';
import { db } from '../../../utils/storage';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

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
      // Fix: Follow @google/genai guidelines for initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = doc.url.split(',')[1];
      
      // Fix: Follow @google/genai guidelines for generateContent request parameters
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Extraia a CHAVE DE ACESSO de 44 dígitos desta Nota Fiscal (NF-e). Retorne APENAS os números, sem espaços ou caracteres especiais. Se não encontrar uma chave de 44 dígitos, retorne 'NAO_LOCALIZADO'." }
          ]
        }
      });

      // Fix: access .text property directly as per guidelines
      const extracted = response.text?.trim() || 'NAO_LOCALIZADO';
      const cleanKey = extracted.replace(/\D/g, '');

      if (cleanKey.length === 44) {
        const updatedDocs = docs.map(d => d.id === doc.id ? { ...d, extractedKey: cleanKey } : d);
        setDocs(updatedDocs);
        setManualKey(cleanKey);
        const updatedTrip = { ...trip, driver_docs: updatedDocs };
        await db.saveTrip(updatedTrip, user);
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

  const handleSaveManualKey = async () => {
    if (!selectedDoc) return;
    const cleanKey = manualKey.replace(/\D/g, '');
    
    if (cleanKey.length !== 44) {
      alert("A chave de acesso deve conter exatamente 44 dígitos.");
      return;
    }

    try {
      const updatedDocs = docs.map(d => d.id === selectedDoc.id ? { ...d, extractedKey: cleanKey } : d);
      setDocs(updatedDocs);
      const updatedTrip = { ...trip, driver_docs: updatedDocs };
      await db.saveTrip(updatedTrip, user);
      alert("Identificador salvo manualmente com sucesso.");
    } catch (e) {
      alert("Erro ao salvar chave manual.");
    }
  };

  const linkToTripNF = async (key: string) => {
    const cleanKey = key.replace(/\D/g, '');
    if (!confirm(`Deseja vincular a chave ${cleanKey} como a oficial desta OS?`)) return;
    
    try {
      const updatedTrip: Trip = { ...trip, nfKey: cleanKey };
      await db.saveTrip(updatedTrip, user);
      onSuccess();
      alert("Chave vinculada com sucesso!");
    } catch (e) {
      alert("Erro ao salvar.");
    }
  };

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `ALS_DOC_${trip.os}_${id.substring(0, 5)}.jpg`;
    link.click();
  };

  const openMeuDanfe = (key: string) => {
    const cleanKey = key.replace(/\D/g, '');
    window.open(`https://meudanfe.com.br/ch/${cleanKey}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dossiê de Fotos do Motorista</p>
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
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Capturas Recebidas ({docs.length})</p>
             {docs.length === 0 ? (
               <div className="py-24 text-center text-slate-300 font-bold uppercase italic text-[10px]">Aguardando envio do motorista</div>
             ) : docs.map(doc => (
               <button 
                 key={doc.id}
                 onClick={() => setSelectedDoc(doc)}
                 className={`w-full text-left group transition-all rounded-2xl overflow-hidden bg-white border ${selectedDoc?.id === doc.id ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-blue-300'}`}
               >
                 <div className="relative aspect-video bg-slate-200 overflow-hidden">
                    <img src={doc.url} className="w-full h-full object-cover" alt="Scan" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <span className="bg-white/90 px-3 py-1 rounded-full text-[7px] font-black uppercase text-slate-900">Visualizar</span>
                    </div>
                    {doc.extractedKey && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>
                      </div>
                    )}
                 </div>
                 <div className="p-3">
                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none">{new Date(doc.timestamp).toLocaleString('pt-BR')}</p>
                 </div>
               </button>
             ))}
          </div>

          {/* ÁREA DE VISUALIZAÇÃO PRINCIPAL */}
          <div className="flex-1 bg-slate-800 p-8 flex flex-col overflow-hidden relative">
             {selectedDoc ? (
               <>
                 <div className="flex-1 bg-black/40 rounded-[2.5rem] overflow-hidden relative flex items-center justify-center border border-white/5 shadow-2xl group">
                    <img src={selectedDoc.url} className="max-w-full max-h-full object-contain" alt="Full View" />
                    
                    {/* Botão de Download flutuante na imagem */}
                    <button 
                      onClick={() => downloadImage(selectedDoc.url, selectedDoc.id)}
                      className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-blue-600 text-white rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                      title="Baixar Foto"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>

                    {/* OVERLAY DE PROCESSAMENTO */}
                    {isProcessing === selectedDoc.id && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4 z-20">
                         <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">Analista Digital processando...</p>
                         <p className="text-[9px] text-slate-400 uppercase">Localizando Chave de Acesso Oficial</p>
                      </div>
                    )}
                 </div>

                 {/* BARRA DE FERRAMENTAS INFERIOR REDESENHADA */}
                 <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Input Manual e OCR */}
                    <div className="lg:col-span-8 bg-slate-900/60 p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-xl">
                       <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Identificador da Nota Fiscal (44 Dígitos)</p>
                          {!selectedDoc.extractedKey && (
                            <button 
                              onClick={() => extractNFKey(selectedDoc)}
                              disabled={!!isProcessing}
                              className="px-4 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
                            >
                               Usar Inteligência Artificial
                            </button>
                          )}
                       </div>
                       
                       <div className="flex gap-3">
                          <input 
                            type="text" 
                            maxLength={54}
                            className="flex-1 bg-black/40 px-6 py-4 rounded-xl font-mono text-lg font-black text-emerald-400 tracking-[0.2em] border border-emerald-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                            placeholder="DIGITE OU COLE A CHAVE AQUI..."
                            value={manualKey}
                            onChange={e => setManualKey(e.target.value.replace(/\D/g, ''))}
                          />
                          <button 
                            onClick={handleSaveManualKey}
                            className="px-6 py-4 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-emerald-500 transition-all shadow-lg active:scale-95 shrink-0"
                          >
                            Salvar
                          </button>
                       </div>
                    </div>

                    {/* Ações de Vínculo */}
                    <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
                       {manualKey.length === 44 && (
                         <>
                            <button 
                              onClick={() => linkToTripNF(manualKey)}
                              className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                               Vincular como Oficial da OS
                            </button>
                            <button 
                              onClick={() => openMeuDanfe(manualKey)}
                              className="w-full py-5 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95"
                            >
                               Visualizar DANFE Digital
                            </button>
                         </>
                       )}
                       <button 
                          onClick={() => downloadImage(selectedDoc.url, selectedDoc.id)}
                          className="w-full py-4 bg-slate-700 text-slate-300 rounded-2xl text-[9px] font-black uppercase hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                       >
                          Baixar Imagem Original
                       </button>
                    </div>
                 </div>
               </>
             ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-6">
                  <div className="w-36 h-36 rounded-full bg-slate-700/20 flex items-center justify-center border-4 border-dashed border-slate-700/40 animate-pulse">
                     <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.5"/></svg>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xl font-black uppercase tracking-widest text-slate-500">Selecione uma foto da galeria</h4>
                    <p className="text-[10px] font-bold text-slate-600 uppercase mt-2">Para processar chaves ou baixar o arquivo</p>
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