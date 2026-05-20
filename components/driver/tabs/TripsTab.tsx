
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Trip, DriverCapturedDoc, User } from '../../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import DocumentViewerModal from '../../dashboard/operations/DocumentViewerModal';
import OrdemColetaTemplate from '../../dashboard/forms/OrdemColetaTemplate';
import PreStackingTemplate from '../../dashboard/forms/PreStackingTemplate';
import ImageViewer from '../../shared/ImageViewer';
import ScannerModal from '../ScannerModal';
import SchedulingInfo from '../SchedulingInfo';

interface TripsTabProps {
  trips: Trip[];
  user: User;
  onRefresh: () => Promise<void>;
}

const TripsTab: React.FC<TripsTabProps> = ({ trips, user, onRefresh }) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ url: '', title: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerInitialImages, setScannerInitialImages] = useState<string[]>([]);
  const [activePhoto, setActivePhoto] = useState<DriverCapturedDoc | null>(null);

  const ocRef = useRef<HTMLDivElement>(null);
  const minutaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenScanner = useCallback(() => {
    setScannerInitialImages([]);
    setIsScannerOpen(true);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      const readPromises = fileList.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(readPromises);
      setScannerInitialImages(results);
      setIsScannerOpen(true);
    }
    e.target.value = '';
  };

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
    setScannerInitialImages([]);
  }, []);

  const handleScannerSuccess = useCallback(async () => {
    await onRefresh();
    if (selectedTrip) {
      const updated = trips.find(t => t.id === selectedTrip.id);
      if (updated) setSelectedTrip(updated);
    }
  }, [onRefresh, selectedTrip, trips]);

  const generatePDF = async (type: 'OC' | 'MINUTA') => {
    if (!selectedTrip || isGenerating) return;
    setIsGenerating(true);
    try {
      const element = type === 'OC' ? ocRef.current : minutaRef.current;
      if (!element) throw new Error("Template não carregado.");
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      setPreviewData({ url: imgData, title: type === 'OC' ? 'Ordem de Coleta ALS' : 'Minuta Pre-Stacking ALS' });
      setIsDocViewerOpen(true);
    } catch (e) {
      alert("Falha ao gerar visualização do documento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const getPriority = (trip: Trip) => {
        if (trip.isCompleted || trip.status === 'Viagem concluída' || trip.status === 'Viagem cancelada' || trip.status === 'Reutilização') return 3;
        if (trip.status === 'Pendente') return 2;
        return 1;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) return priorityA - priorityB;
      const timeA = new Date(a.dateTime).getTime();
      const timeB = new Date(b.dateTime).getTime();

      return timeA - timeB; 
    });
  }, [trips]);

  const DocButton = ({ label, doc, color = 'blue' }: { label: string, doc?: any, color?: string }) => {
    if (!doc) return null;
    const colors: any = {
      blue: 'bg-blue-600/10 border-blue-500/20 text-blue-400',
      indigo: 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400',
      emerald: 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400',
      amber: 'bg-amber-600/10 border-amber-500/20 text-amber-400'
    };
    return (
      <button 
        onClick={() => { setPreviewData({ url: doc.url, title: label }); setIsDocViewerOpen(true); }}
        className={`w-full p-4 rounded-2xl border ${colors[color]} flex items-center justify-between active:scale-95 transition-all group shadow-xl`}
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
      </button>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
         {selectedTrip?.ocFormData && <div ref={ocRef}><OrdemColetaTemplate formData={selectedTrip.ocFormData} selectedDriver={selectedTrip.driver} selectedRemetente={selectedTrip.customer} selectedDestinatario={selectedTrip.destination} /></div>}
         {selectedTrip?.preStackingFormData && <div ref={minutaRef}><PreStackingTemplate formData={selectedTrip.preStackingFormData} selectedDriver={selectedTrip.driver} selectedRemetente={selectedTrip.customer} selectedDestinatario={selectedTrip.destination} /></div>}
      </div>

      <div className="px-1 py-4"><h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Histórico de Atividades</h2></div>

      <div className="space-y-3">
        {sortedTrips.map((t) => {
          const tripDate = new Date(t.dateTime);
          const isFinished = t.isCompleted || t.status === 'Viagem concluída' || t.status === 'Viagem cancelada' || t.status === 'Reutilização';
          const isPending = t.status === 'Pendente';
          const isActive = !isFinished && !isPending;

          return (
            <button 
              key={t.id} 
              onClick={() => setSelectedTrip(t)} 
              className={`w-full p-6 rounded-[2.2rem] border text-left flex flex-col gap-3 transition-all active:scale-[0.98] shadow-xl ${
                isActive 
                ? 'bg-blue-600 border-blue-400/30 ring-4 ring-blue-500/10' 
                : isPending 
                ? 'bg-slate-900 border-white/10' 
                : 'bg-slate-950 border-white/5 opacity-60 grayscale-[0.3]'
              }`}
            >
               <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-xl font-black leading-none ${isActive ? 'text-white' : 'text-blue-500'}`}>OS {t.os}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className={`text-[9px] font-black ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{tripDate.toLocaleDateString('pt-BR')}</span>
                       <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                       <span className={`text-[9px] font-black ${isActive ? 'text-blue-200' : 'text-blue-400'}`}>{tripDate.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[7px] font-black uppercase ${
                    isActive 
                    ? 'bg-white text-blue-600' 
                    : isFinished 
                    ? 'bg-slate-800 text-slate-400' 
                    : 'bg-blue-900/40 text-blue-400 border border-blue-500/20'
                  }`}>
                    {isActive ? '● EM CURSO' : t.status}
                  </span>
               </div>

               <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className={`text-[10px] font-black uppercase truncate flex-1 ${isActive ? 'text-white' : 'text-slate-100'}`}>{t.customer.name}</p>
                    <span className={`text-[10px] font-mono font-black ${isActive ? 'text-blue-200' : 'text-blue-500'}`}>{t.container || '---'}</span>
                  </div>
                  <p className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-blue-100/60' : 'text-slate-500'}`}>
                    {t.customer.city} - {t.customer.state}
                  </p>
               </div>
            </button>
          );
        })}
      </div>

      {selectedTrip && (
        <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col animate-in slide-in-from-bottom-full duration-500 h-[100dvh]">
           <header className="p-6 pt-12 flex justify-between items-center bg-slate-950 border-b border-white/5 shrink-0">
              <div><p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Dossiê da OS</p><h3 className="text-xl font-black text-white uppercase mt-1">Nº {selectedTrip.os}</h3></div>
              <button onClick={() => setSelectedTrip(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white active:bg-red-600 transition-all"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg></button>
           </header>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 custom-scrollbar">
              <section className="bg-slate-900 p-7 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cliente / Destino</span><span className="text-sm font-bold text-white uppercase">{selectedTrip.customer.name}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Equipamento Alocado</span><span className="text-2xl font-mono font-black text-white">{selectedTrip.container || 'A DEFINIR'}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Data Programada</span><span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(selectedTrip.dateTime).toLocaleString('pt-BR')}</span></div>
              </section>

              {/* Informação de Agendamento */}
              {selectedTrip.scheduling && (
                <SchedulingInfo trip={selectedTrip} />
              )}

              {/* DOCUMENTOS DO ESCRITÓRIO */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Documentação Oficial (PDF)</h4>
                 <div className="space-y-2">
                    <DocButton label="OS Digitalizada" doc={selectedTrip.osDoc} color="emerald" />
                    <DocButton label="Conhecimento de Frete (CT-e)" doc={selectedTrip.cteDoc} color="indigo" />
                    <DocButton label="Comprovante Agendamento" doc={selectedTrip.agendamentoDoc} color="blue" />
                    <DocButton label="Dossiê de Viagem Completo" doc={selectedTrip.completoDoc} color="amber" />
                    {(!selectedTrip.osDoc && !selectedTrip.cteDoc && !selectedTrip.agendamentoDoc && !selectedTrip.completoDoc) && (
                      <div className="py-4 text-center border border-white/5 bg-white/5 rounded-2xl">
                        <p className="text-[8px] font-bold text-slate-600 uppercase">Nenhum anexo externo disponível</p>
                      </div>
                    )}
                 </div>
              </div>

              {/* FORMULÁRIOS ALS */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Formulários ALS (Gerados)</h4>
                 <div className="grid grid-cols-1 gap-2">
                    {selectedTrip.ocFormData && (
                      <button 
                        onClick={() => generatePDF('OC')}
                        disabled={isGenerating}
                        className="p-5 bg-white/5 border border-white/10 rounded-[1.8rem] flex items-center justify-between active:bg-blue-600 transition-all group"
                      >
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black italic text-xs">OC</div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Ordem de Coleta Digital</span>
                         </div>
                         <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
                      </button>
                    )}
                    {selectedTrip.preStackingFormData && (
                      <button 
                        onClick={() => generatePDF('MINUTA')}
                        disabled={isGenerating}
                        className="p-5 bg-white/5 border border-white/10 rounded-[1.8rem] flex items-center justify-between active:bg-blue-600 transition-all group"
                      >
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black italic text-xs">PS</div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Minuta Pre-Stacking</span>
                         </div>
                         <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
                      </button>
                    )}
                 </div>
              </div>

              {/* FOTOS ENVIADAS PELO MOTORISTA */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fotos Enviadas de Campo</h4>
                 <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleOpenScanner} className="aspect-square bg-blue-600 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2.5"/><path strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                       <span className="text-[8px] font-black uppercase">Nova</span>
                    </button>
                    {selectedTrip.driver_docs?.map((doc, idx) => (
                      <button 
                        key={doc.id} 
                        onClick={() => setActivePhoto(doc)}
                        className="aspect-square rounded-2xl overflow-hidden border border-white/10 active:scale-95 transition-all shadow-xl"
                      >
                         <img src={doc.url} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                 </div>
              </div>
           </div>
           
           <div className="p-6 bg-slate-950 border-t border-white/5 shrink-0 pb-12"><button onClick={() => setSelectedTrip(null)} className="w-full py-5 bg-slate-900 text-slate-500 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-950 transition-all shadow-lg">Fechar Dossiê</button></div>
        </div>
      )}

      {isDocViewerOpen && (
        <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewData.url} title={previewData.title} />
      )}

      {activePhoto && (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col animate-in fade-in">
           <header className="h-20 bg-slate-950 border-b border-white/10 flex items-center justify-between px-6 shrink-0 pt-10">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Visualizar Foto de Campo</p>
              <button onClick={() => setActivePhoto(null)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
           </header>
           <div className="flex-1 overflow-hidden p-4">
              <ImageViewer url={activePhoto.url} />
           </div>
        </div>
      )}

      {isScannerOpen && selectedTrip && (
        <ScannerModal 
          isOpen={isScannerOpen} 
          onClose={handleCloseScanner} 
          onSuccess={handleScannerSuccess} 
          trip={selectedTrip} 
          user={user} 
          initialImages={scannerInitialImages} 
        />
      )}
      
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
    </div>
  );
};

export default TripsTab;
