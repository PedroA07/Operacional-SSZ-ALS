
import React, { useState } from 'react';
import { Trip, User, TripDocument } from '../../../types';
import ImageViewer from '../../shared/ImageViewer';
import DocumentViewerModal from '../operations/DocumentViewerModal';
import { fileStorage } from '../../../utils/fileStorage';
import { db } from '../../../utils/storage';

interface TripDocsOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  user: User;
  onSuccess: () => void;
}

const TripDocsOverviewModal: React.FC<TripDocsOverviewModalProps> = ({ isOpen, onClose, trip, user, onSuccess }) => {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{ url: string; title: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUpdateDossie = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const url = await fileStorage.uploadTripDoc(file, trip.os, 'COMPLETO');
      const doc: TripDocument = { 
        id: `full-pdf-${Date.now()}`, 
        type: 'COMPLETO', 
        url, 
        fileName: `DOSSIÊ - ${trip.os}`, 
        uploadDate: new Date().toISOString() 
      };
      await db.saveTrip({ ...trip, completoDoc: doc }, user);
      onSuccess();
    } catch (err) {
      alert("Falha ao subir arquivo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveDossie = async () => {
    if (!confirm("Remover o Dossiê Final permanentemente desta pasta?")) return;
    setIsProcessing(true);
    try {
      await db.saveTrip({ ...trip, completoDoc: undefined }, user);
      onSuccess();
    } finally {
      setIsProcessing(false);
    }
  };

  const InfoItem = ({ label, value, color = "text-slate-700" }: { label: string; value: string; color?: string }) => (
    <div className="flex flex-col">
      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</span>
      <span className={`text-[10px] font-black uppercase truncate ${color}`}>{value || '---'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#f8fafc] w-full max-w-7xl h-[94vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-500">
        
        <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0 shadow-xl">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-black italic text-2xl shadow-2xl rotate-3">ALS</div>
              <div>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">Central de Documentação Operacional</p>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Pasta OS {trip.os}</h2>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                 <p className="text-[8px] font-black text-slate-500 uppercase">Abertura Pasta</p>
                 <p className="text-sm font-black text-white">{new Date(trip.dateTime).toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all active:scale-90">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
            
            {/* GRID DE DADOS TÉCNICOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b pb-2">Logística e Container</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Container" value={trip.container} color="text-blue-700 font-mono text-lg" />
                    <InfoItem label="Tipo / Armador" value={`${trip.containerType || '40HC'} — ${trip.ocFormData?.agencia || 'GERAL'}`} />
                    <InfoItem label="Lacre" value={trip.seal} />
                    <InfoItem label="CVA" value={trip.cva} color="text-amber-600" />
                    <InfoItem label="Navio" value={trip.ship} />
                    <InfoItem label="Booking" value={trip.booking} color="text-blue-600" />
                  </div>
               </div>

               <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b pb-2">Recurso Humano e Placas</h4>
                  <InfoItem label="Motorista Alocado" value={trip.driver.name} color="text-slate-900 text-sm" />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <InfoItem label="Cavalo" value={trip.driver.plateHorse} color="text-slate-900 font-mono" />
                    <InfoItem label="Carreta" value={trip.driver.plateTrailer} color="text-slate-500 font-mono" />
                  </div>
                  <InfoItem label="Celular" value={trip.driver.phone || '---'} color="text-emerald-600" />
               </div>

               <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b pb-2">Cliente e Destino</h4>
                  <InfoItem label="Remetente" value={trip.customer.name} />
                  <InfoItem label="Unidade Entrega" value={trip.scheduling?.location || trip.destination?.name || 'A DEFINIR'} color="text-indigo-600" />
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mt-2">
                     <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Janela Agendada</p>
                     <p className="text-[10px] font-black text-blue-700">{trip.scheduling ? new Date(trip.scheduling.dateTime).toLocaleString('pt-BR') : 'PENDENTE'}</p>
                  </div>
               </div>
            </div>

            {/* ARQUIVOS PDF DA VIAGEM */}
            <div className="space-y-4">
               <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-200 pb-2">Documentação Digitalizada (PDF)</h4>
               <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { label: 'O.S. PDF', doc: trip.osDoc, color: 'from-emerald-600 to-emerald-700', icon: '📄' },
                    { label: 'AGENDAMENTO', doc: trip.agendamentoDoc, color: 'from-blue-600 to-blue-700', icon: '📅' },
                    { label: 'CT-E / CONHEC.', doc: trip.cteDoc, color: 'from-indigo-600 to-indigo-700', icon: '💼' },
                    { label: 'CONTRATO FRETE', doc: trip.freightContractDoc, color: 'from-slate-800 to-slate-900', icon: '📝' },
                    { label: 'DOSSIÊ FINAL', doc: trip.completoDoc, color: 'from-amber-600 to-amber-700', icon: '🏆', isFull: true }
                  ].map((item, idx) => item.doc ? (
                    <div key={idx} className="relative group/doc">
                       <button 
                        onClick={() => setDocPreview({ url: item.doc!.url, title: item.label })}
                        className={`h-28 w-full bg-gradient-to-br ${item.color} rounded-[1.8rem] p-5 text-white shadow-xl hover:scale-105 transition-all text-left relative overflow-hidden`}
                      >
                        <span className="text-2xl absolute bottom-1 right-1 opacity-20">{item.icon}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60 block mb-1">Visualizar</span>
                        <span className="text-[10px] font-black uppercase leading-tight">{item.label}</span>
                      </button>
                      {item.isFull && (
                        <button onClick={handleRemoveDossie} className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/doc:opacity-100 transition-opacity">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2"/></svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div key={idx} className="h-28 bg-white border border-dashed border-slate-300 rounded-[1.8rem] p-5 flex flex-col justify-center items-center">
                       {item.isFull ? (
                         <label className="cursor-pointer flex flex-col items-center gap-2 group/add">
                            <input type="file" accept=".pdf" className="hidden" onChange={handleUpdateDossie} />
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover/add:bg-blue-600 transition-all">
                               <svg className="w-4 h-4 text-slate-400 group-hover/add:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5"/></svg>
                            </div>
                            <span className="text-[7px] font-black uppercase text-slate-400 group-hover/add:text-blue-600">Anexar Dossiê</span>
                         </label>
                       ) : (
                         <span className="text-[7px] font-black uppercase text-slate-300">Ausente</span>
                       )}
                    </div>
                  ))}
               </div>
            </div>

            {/* FOTOS DO MOTORISTA */}
            <div className="space-y-4">
               <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-200 pb-2">Evidências e Fotos de Campo</h4>
               <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
                  {trip.driver_docs && trip.driver_docs.length > 0 ? trip.driver_docs.map((img) => (
                    <button 
                      key={img.id}
                      onClick={() => setActivePhoto(img.url)}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-md hover:ring-4 hover:ring-blue-500 transition-all bg-white p-1"
                    >
                      <img src={img.url} className="w-full h-full object-cover rounded-lg" loading="lazy" />
                    </button>
                  )) : (
                    <div className="col-span-full py-10 text-center border border-dashed border-slate-200 rounded-3xl">
                       <p className="text-[9px] font-black text-slate-300 uppercase italic">Nenhuma evidência fotográfica registrada</p>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* PAINEL LATERAL: CRONOLOGIA */}
          <div className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0">
             <div className="p-8 bg-slate-900 text-white shadow-lg">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Situação Atual</p>
                <div className={`px-4 py-2 rounded-xl border-2 font-black uppercase text-center text-[10px] ${trip.status === 'Viagem concluída' ? 'bg-emerald-600 border-emerald-500' : 'bg-blue-600 border-blue-500'}`}>
                   {trip.status}
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Histórico da Pasta</h5>
                {(trip.statusHistory || []).map((step, idx) => (
                  <div key={idx} className="flex gap-3 relative">
                     {idx < (trip.statusHistory?.length || 0) - 1 && (
                       <div className="absolute left-[4.5px] top-4 bottom-[-20px] w-[1.5px] bg-slate-100"></div>
                     )}
                     <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 border border-white shadow-md ${idx === 0 ? 'bg-blue-600 ring-2 ring-blue-50 animate-pulse' : 'bg-slate-300'}`}></div>
                     <div className="min-w-0">
                        <p className={`text-[9px] font-black uppercase leading-tight ${idx === 0 ? 'text-blue-700' : 'text-slate-600'}`}>{step.status}</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1">{new Date(step.dateTime).toLocaleString('pt-BR')}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* MODAIS DE VISUALIZAÇÃO SOBREPOSTOS */}
      {activePhoto && (
        <div className="fixed inset-0 z-[4000] bg-black/98 flex flex-col animate-in fade-in duration-300">
           <header className="h-20 flex justify-between items-center px-10 border-b border-white/10 shrink-0 pt-6">
              <span className="text-white font-black uppercase text-[10px] tracking-widest">Foto de Campo HD</span>
              <button onClick={() => setActivePhoto(null)} className="w-12 h-12 bg-white/10 text-white hover:bg-red-600 rounded-full flex items-center justify-center transition-all">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
           </header>
           <div className="flex-1 p-10 flex items-center justify-center overflow-hidden">
              <div className="w-full h-full max-w-5xl"><ImageViewer url={activePhoto} /></div>
           </div>
        </div>
      )}

      {docPreview && (
        <DocumentViewerModal 
          isOpen={true} 
          onClose={() => setDocPreview(null)} 
          url={docPreview.url} 
          title={docPreview.title} 
        />
      )}
    </div>
  );
};

export default TripDocsOverviewModal;
