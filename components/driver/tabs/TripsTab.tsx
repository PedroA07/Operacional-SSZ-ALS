
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Trip, DriverCapturedDoc, User } from '../../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import DocumentViewerModal from '../../dashboard/operations/DocumentViewerModal';
import OrdemColetaTemplate from '../../dashboard/forms/OrdemColetaTemplate';
import PreStackingTemplate from '../../dashboard/forms/PreStackingTemplate';
import ImageViewer from '../../shared/ImageViewer';
import ScannerModal from '../ScannerModal';

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
  const [scannerInitialImage, setScannerInitialImage] = useState<string | null>(null);

  const [activePhoto, setActivePhoto] = useState<DriverCapturedDoc | null>(null);

  const ocRef = useRef<HTMLDivElement>(null);
  const minutaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenScanner = useCallback(() => {
    setScannerInitialImage(null);
    setIsScannerOpen(true);
  }, []);

  const handleOpenFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setScannerInitialImage(ev.target?.result as string);
        setIsScannerOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
  }, []);

  const handleScannerSuccess = useCallback(async () => {
    await onRefresh();
    const updated = trips.find(t => t.id === selectedTrip?.id);
    if (updated) setSelectedTrip(updated);
  }, [onRefresh, selectedTrip?.id, trips]);

  const generatePDF = async (ref: React.RefObject<HTMLDivElement>, title: string) => {
    if (!ref.current || isGenerating) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewData({ url, title: title.toUpperCase() });
      setIsDocViewerOpen(true);
    } catch (e) {
      alert("Falha ao processar documento digital.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const getPriority = (trip: Trip) => {
        if (trip.status === 'Viagem concluída' || trip.status === 'Viagem cancelada') return 3;
        if (trip.status === 'Pendente') return 2;
        return 1;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) return priorityA - priorityB;

      const timeA = new Date(a.dateTime).getTime();
      const timeB = new Date(b.dateTime).getTime();

      if (priorityA === 3) return timeB - timeA; 
      return timeA - timeB; 
    });
  }, [trips]);

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
          const isFinished = t.status === 'Viagem concluída' || t.status === 'Viagem cancelada';
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
                    {isActive ? '● ATIVA' : t.status}
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
        <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col animate-in slide-in-from-bottom-full duration-500">
           <header className="p-6 pt-12 flex justify-between items-center bg-slate-950 border-b border-white/5 shrink-0">
              <div><p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Dossiê da OS</p><h3 className="text-xl font-black text-white uppercase mt-1">Nº {selectedTrip.os}</h3></div>
              <button onClick={() => setSelectedTrip(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white active:bg-red-600 transition-all"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg></button>
           </header>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
              <section className="bg-slate-900 p-7 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Razão Social</span><span className="text-sm font-bold text-white uppercase">{selectedTrip.customer.legalName || selectedTrip.customer.name}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Equipamento</span><span className="text-2xl font-mono font-black text-white">{selectedTrip.container || 'A DEFINIR'}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Navio / Booking</span><span className="text-xs font-bold text-slate-300 uppercase">{selectedTrip.ship || '---'} | {selectedTrip.booking || '---'}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Localidade</span><span className="text-[10px] font-bold text-slate-400 uppercase">{selectedTrip.customer.city} - {selectedTrip.customer.state}</span></div>
              </section>

              <div className="grid grid-cols-2 gap-3">
                 <button onClick={handleOpenScanner} className="py-6 bg-blue-600 rounded-[2.2rem] flex flex-col items-center justify-center gap-2 border border-white/10 shadow-xl active:scale-95 transition-all"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2.5"/><path strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span className="text-[9px] font-black text-white uppercase tracking-widest">Capturar</span></button>
                 <button onClick={handleOpenFiles} className="py-6 bg-slate-800 rounded-[2.2rem] flex flex-col items-center justify-center gap-2 border border-white/5 shadow-xl active:scale-95 transition-all"><svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Anexar</span></button>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
              </div>

              {selectedTrip.driver_docs && selectedTrip.driver_docs.length > 0 && (
                <section className="space-y-3">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Arquivos Enviados</p>
                   <div className="grid grid-cols-2 gap-3">
                      {selectedTrip.driver_docs.map((doc) => (
                        <button key={doc.id} onClick={() => setActivePhoto(doc)} className="aspect-[3/4] bg-slate-900 rounded-3xl border border-white/10 overflow-hidden relative shadow-lg active:scale-95 transition-all"><img src={doc.url} className="w-full h-full object-cover" alt="Scan" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4"><p className="text-[7px] font-black text-white/70 uppercase">{new Date(doc.timestamp).toLocaleTimeString('pt-BR')}</p></div></button>
                      ))}
                   </div>
                </section>
              )}

              <section className="space-y-3">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Documentos Liberados</p>
                 {selectedTrip.ocFormData && (
                   <button onClick={() => generatePDF(ocRef, `OC - OS ${selectedTrip.os}`)} className="w-full p-6 bg-blue-600/10 border border-blue-500/30 rounded-3xl flex items-center justify-between active:scale-95 transition-all shadow-lg"><div className="flex items-center gap-4 text-left"><div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg></div><div><span className="text-[11px] font-black text-white uppercase block">Ordem de Coleta</span><span className="text-[8px] text-blue-400 font-bold uppercase tracking-tight">Digital p/ Impressão</span></div></div><svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg></button>
                 )}
                 {selectedTrip.preStackingFormData && (
                   <button onClick={() => generatePDF(minutaRef, `Minuta - OS ${selectedTrip.os}`)} className="w-full p-6 bg-emerald-600/10 border border-emerald-500/30 rounded-3xl flex items-center justify-between active:scale-95 transition-all shadow-lg"><div className="flex items-center gap-4 text-left"><div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeWidth="2.5"/></svg></div><div><span className="text-[11px] font-black text-white uppercase block">Minuta Pre-Stacking</span><span className="text-[8px] text-emerald-400 font-bold uppercase tracking-tight">Comprovante de Cheio</span></div></div><svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg></button>
                 )}
              </section>
           </div>
           
           <div className="p-6 bg-slate-950 border-t border-white/5 shrink-0"><button onClick={() => setSelectedTrip(null)} className="w-full py-5 bg-slate-900 text-slate-500 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-950 transition-all">Fechar Detalhes</button></div>
        </div>
      )}

      {activePhoto && (
        <div className="fixed inset-0 z-[5000] bg-slate-950 flex flex-col animate-in fade-in duration-300">
           <header className="h-20 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 shrink-0 safe-top">
              <div className="min-w-0 pr-4"><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Visualização</p><p className="text-xs font-bold text-white uppercase truncate mt-1">{new Date(activePhoto.timestamp).toLocaleString('pt-BR')}</p></div>
              <button onClick={() => setActivePhoto(null)} className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center active:bg-red-700 transition-all shadow-xl shrink-0"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg></button>
           </header>
           <div className="flex-1 overflow-hidden p-4 flex items-center justify-center bg-black"><ImageViewer url={activePhoto.url} className="w-full h-full max-w-4xl" /></div>
        </div>
      )}

      {isScannerOpen && selectedTrip && (
        <ScannerModal isOpen={isScannerOpen} onClose={handleCloseScanner} onSuccess={handleScannerSuccess} trip={selectedTrip} user={user} initialImage={scannerInitialImage} />
      )}

      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewData.url} title={previewData.title} />
      {isGenerating && <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col items-center justify-center space-y-4"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><p className="text-[10px] font-black text-white uppercase tracking-widest">Processando...</p></div>}
    </div>
  );
};

export default TripsTab;
