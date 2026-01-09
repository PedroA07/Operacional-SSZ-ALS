
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
        const result = ev.target?.result as string;
        setScannerInitialImage(result);
        setIsScannerOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
    setScannerInitialImage(null);
  }, []);

  const handleScannerSuccess = useCallback(async () => {
    await onRefresh();
    if (selectedTrip) {
      // Re-localiza a viagem atualizada para manter o dossiê aberto correto
      const updated = trips.find(t => t.id === selectedTrip.id);
      if (updated) setSelectedTrip(updated);
    }
  }, [onRefresh, selectedTrip, trips]);

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
        <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col animate-in slide-in-from-bottom-full duration-500">
           <header className="p-6 pt-12 flex justify-between items-center bg-slate-950 border-b border-white/5 shrink-0">
              <div><p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Dossiê da OS</p><h3 className="text-xl font-black text-white uppercase mt-1">Nº {selectedTrip.os}</h3></div>
              <button onClick={() => setSelectedTrip(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white active:bg-red-600 transition-all"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg></button>
           </header>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
              <section className="bg-slate-900 p-7 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Razão Social</span><span className="text-sm font-bold text-white uppercase">{selectedTrip.customer.legalName || selectedTrip.customer.name}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Equipamento</span><span className="text-2xl font-mono font-black text-white">{selectedTrip.container || 'A DEFINIR'}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Localidade</span><span className="text-[10px] font-bold text-slate-400 uppercase">{selectedTrip.customer.city} - {selectedTrip.customer.state}</span></div>
              </section>

              <div className="grid grid-cols-2 gap-3">
                 <button onClick={handleOpenScanner} className="py-6 bg-blue-600 rounded-[2.2rem] flex flex-col items-center justify-center gap-2 border border-white/10 shadow-xl active:scale-95 transition-all"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2.5"/><path strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span className="text-[9px] font-black text-white uppercase tracking-widest">Capturar</span></button>
                 <button onClick={handleOpenFiles} className="py-6 bg-slate-800 rounded-[2.2rem] flex flex-col items-center justify-center gap-2 border border-white/5 shadow-xl active:scale-95 transition-all"><svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Anexar</span></button>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
           </div>
           
           <div className="p-6 bg-slate-950 border-t border-white/5 shrink-0"><button onClick={() => setSelectedTrip(null)} className="w-full py-5 bg-slate-900 text-slate-500 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-950 transition-all">Fechar Detalhes</button></div>
        </div>
      )}

      {isScannerOpen && selectedTrip && (
        <ScannerModal isOpen={isScannerOpen} onClose={handleCloseScanner} onSuccess={handleScannerSuccess} trip={selectedTrip} user={user} initialImage={scannerInitialImage} />
      )}
    </div>
  );
};

export default TripsTab;
