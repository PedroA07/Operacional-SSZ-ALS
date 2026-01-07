
import React, { useState, useMemo, useRef } from 'react';
import { Trip } from '../../../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import DocumentViewerModal from '../../dashboard/operations/DocumentViewerModal';
import OrdemColetaTemplate from '../../dashboard/forms/OrdemColetaTemplate';
import PreStackingTemplate from '../../dashboard/forms/PreStackingTemplate';

interface TripsTabProps {
  trips: Trip[];
}

const TripsTab: React.FC<TripsTabProps> = ({ trips }) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ url: '', title: '' });
  const [isGenerating, setIsGenerating] = useState(false);

  const ocRef = useRef<HTMLDivElement>(null);
  const minutaRef = useRef<HTMLDivElement>(null);

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

  const filteredTrips = useMemo(() => {
    return trips.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [trips]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      
      {/* TEMPLATES OCULTOS PARA GERAÇÃO */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
         {selectedTrip?.ocFormData && <div ref={ocRef}><OrdemColetaTemplate formData={selectedTrip.ocFormData} selectedDriver={selectedTrip.driver} selectedRemetente={selectedTrip.customer} selectedDestinatario={selectedTrip.destination} /></div>}
         {selectedTrip?.preStackingFormData && <div ref={minutaRef}><PreStackingTemplate formData={selectedTrip.preStackingFormData} selectedDriver={selectedTrip.driver} selectedRemetente={selectedTrip.customer} selectedDestinatario={selectedTrip.destination} /></div>}
      </div>

      <div className="px-1 py-4"><h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Minhas Viagens</h2></div>

      <div className="space-y-3">
        {filteredTrips.map((t) => (
          <button key={t.id} onClick={() => setSelectedTrip(t)} className="w-full p-6 rounded-[2rem] bg-slate-900 border border-white/10 text-left flex flex-col gap-2 shadow-xl active:scale-95 transition-all">
             <div className="flex justify-between items-start">
                <p className="text-xl font-black text-blue-500 leading-none">OS {t.os}</p>
                <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${t.status === 'Viagem concluída' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>{t.status}</span>
             </div>
             <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{t.customer.name}</p>
          </button>
        ))}
      </div>

      {selectedTrip && (
        <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col animate-in slide-in-from-bottom-full duration-500">
           <header className="p-8 pt-14 flex justify-between items-center bg-slate-950 border-b border-white/5">
              <div><p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Dossiê da OS</p><h3 className="text-xl font-black text-white uppercase mt-1">Nº {selectedTrip.os}</h3></div>
              <button onClick={() => setSelectedTrip(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white active:bg-red-600 transition-all"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg></button>
           </header>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
              <section className="bg-slate-900 p-7 rounded-[2.5rem] border border-white/5 space-y-4 shadow-2xl">
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Contratante</span><span className="text-sm font-bold text-white uppercase">{selectedTrip.customer.name}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Equipamento</span><span className="text-sm font-mono font-black text-blue-400">{selectedTrip.container || 'A DEFINIR'}</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Navio / Booking</span><span className="text-xs font-bold text-slate-300 uppercase">{selectedTrip.ship || '---'} | {selectedTrip.booking || '---'}</span></div>
              </section>

              <section className="space-y-3">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Documentos Liberados</p>
                 
                 {selectedTrip.ocFormData && (
                   <button onClick={() => generatePDF(ocRef, `OC - OS ${selectedTrip.os}`)} className="w-full p-6 bg-blue-600/10 border border-blue-500/30 rounded-3xl flex items-center justify-between active:scale-95 transition-all shadow-lg">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg></div>
                        <div><span className="text-[11px] font-black text-white uppercase block">Ordem de Coleta</span><span className="text-[8px] text-blue-400 font-bold uppercase">Digital p/ Impressão</span></div>
                      </div>
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                   </button>
                 )}

                 {selectedTrip.preStackingFormData && (
                   <button onClick={() => generatePDF(minutaRef, `Minuta - OS ${selectedTrip.os}`)} className="w-full p-6 bg-emerald-600/10 border border-emerald-500/30 rounded-3xl flex items-center justify-between active:scale-95 transition-all shadow-lg">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 a2 2 0 110-4m0 4v2m0-6V4" strokeWidth="2.5"/></svg></div>
                        <div><span className="text-[11px] font-black text-white uppercase block">Minuta Pre-Stacking</span><span className="text-[8px] text-emerald-400 font-bold uppercase">Comprovante Cheio</span></div>
                      </div>
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                   </button>
                 )}

                 {selectedTrip.osDoc && (
                   <button onClick={() => { setPreviewData({ url: selectedTrip.osDoc!.url, title: 'OS Original' }); setIsDocViewerOpen(true); }} className="w-full p-5 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-between active:bg-blue-600 transition-all">
                      <div className="flex items-center gap-4"><span className="text-[11px] font-black uppercase text-white">Anexo OS PDF</span></div>
                      <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="3"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2"/></svg>
                   </button>
                 )}
              </section>
           </div>
           
           <div className="p-6 bg-slate-950 border-t border-white/5"><button onClick={() => setSelectedTrip(null)} className="w-full py-5 bg-slate-900 text-slate-500 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-950 transition-all">Voltar para Lista</button></div>
        </div>
      )}

      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewData.url} title={previewData.title} />
      
      {isGenerating && <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col items-center justify-center space-y-4"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><p className="text-[10px] font-black text-white uppercase tracking-widest">Processando Documento...</p></div>}
    </div>
  );
};

export default TripsTab;
