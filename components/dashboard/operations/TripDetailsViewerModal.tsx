
import React, { useState } from 'react';
import { Trip, User } from '../../../types';
import ImageViewer from '../../shared/ImageViewer';
import DocumentViewerModal from './DocumentViewerModal';

interface TripDetailsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  user: User;
}

const TripDetailsViewerModal: React.FC<TripDetailsViewerModalProps> = ({ isOpen, onClose, trip, user }) => {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{ url: string; title: string } | null>(null);

  if (!isOpen) return null;

  const SectionTitle = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
      <div className="text-blue-600">{icon}</div>
      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{title}</h4>
    </div>
  );

  const DataItem = ({ label, value, color = "text-slate-700" }: { label: string; value: string; color?: string }) => (
    <div className="flex flex-col">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-[11px] font-black uppercase truncate ${color}`}>{value || '---'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
        
        {/* HEADER */}
        <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic text-xl shadow-lg">ALS</div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Dossiê Detalhado da Operação</p>
              <h3 className="text-2xl font-black uppercase">OS {trip.os} › {trip.type}</h3>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${trip.status === 'Viagem concluída' ? 'bg-emerald-600 border-emerald-500' : 'bg-blue-600 border-blue-500'}`}>
              {trip.status}
            </span>
            <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {/* COLUNA ESQUERDA: DADOS */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
            
            {/* GRID PRINCIPAL */}
            <div className="grid grid-cols-3 gap-10">
               {/* LOGÍSTICA */}
               <section>
                  <SectionTitle title="Logística e Marítimo" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
                  <div className="space-y-5">
                    <DataItem label="Navio" value={trip.ship} />
                    <DataItem label="Booking" value={trip.booking} color="text-blue-600" />
                    <DataItem label="Data Programada" value={new Date(trip.dateTime).toLocaleString('pt-BR')} />
                    <DataItem label="Categoria" value={`${trip.category} ${trip.subCategory ? '› ' + trip.subCategory : ''}`} color="text-indigo-600" />
                  </div>
               </section>

               {/* EQUIPAMENTO */}
               <section>
                  <SectionTitle title="Equipamento" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>} />
                  <div className="space-y-5">
                    <DataItem label="Nº Container" value={trip.container} color="text-blue-700 font-mono text-xs" />
                    <DataItem label="Tipo" value={trip.containerType || '40HC'} />
                    <DataItem label="Lacre" value={trip.seal} />
                    <DataItem label="Tara" value={trip.tara} />
                  </div>
               </section>

               {/* MOTORISTA */}
               <section>
                  <SectionTitle title="Transporte" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} />
                  <div className="space-y-5">
                    <DataItem label="Motorista" value={trip.driver.name} />
                    <DataItem label="CPF" value={trip.driver.cpf || '---'} />
                    <div className="flex gap-4">
                      <DataItem label="Cavalo" value={trip.driver.plateHorse} color="text-slate-900 bg-slate-100 px-2 rounded" />
                      <DataItem label="Carreta" value={trip.driver.plateTrailer} color="text-slate-500" />
                    </div>
                  </div>
               </section>
            </div>

            {/* ORIGEM E DESTINO */}
            <div className="grid grid-cols-2 gap-10">
               <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                  <SectionTitle title="Origem / Cliente" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>} />
                  <div className="space-y-4">
                    <DataItem label="Razão Social" value={trip.customer.legalName || trip.customer.name} />
                    <DataItem label="Localidade" value={`${trip.customer.city} - ${trip.customer.state}`} />
                    <DataItem label="CNPJ" value={trip.customer.cnpj || '---'} />
                  </div>
               </div>
               <div className="bg-blue-50/30 p-8 rounded-[2.5rem] border border-blue-100/50">
                  <SectionTitle title="Destino / Terminal" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
                  <div className="space-y-4">
                    <DataItem label="Local" value={trip.scheduling?.location || trip.destination?.name || 'A DEFINIR'} color="text-blue-700" />
                    {trip.scheduling && (
                      <>
                        <DataItem label="Data Agendada" value={new Date(trip.scheduling.dateTime).toLocaleString('pt-BR')} />
                        <DataItem label="Observações de Destino" value={trip.scheduling.obs || 'Nenhuma nota informada'} />
                      </>
                    )}
                  </div>
               </div>
            </div>

            {/* DOCUMENTAÇÃO */}
            <section>
              <SectionTitle title="Arquivo Digital (PDFs)" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'OS PDF', doc: trip.osDoc, color: 'bg-emerald-600' },
                  { label: 'Agendamento', doc: trip.agendamentoDoc, color: 'bg-blue-600' },
                  { label: 'CT-e', doc: trip.cteDoc, color: 'bg-indigo-600' },
                  { label: 'Contrato', doc: trip.freightContractDoc, color: 'bg-slate-700' },
                  { label: 'Completo', doc: trip.completoDoc, color: 'bg-slate-900' }
                ].map((item, idx) => item.doc ? (
                  <button 
                    key={idx}
                    onClick={() => setDocPreview({ url: item.doc!.url, title: item.label })}
                    className={`flex items-center gap-3 px-6 py-4 ${item.color} text-white rounded-2xl shadow-lg hover:scale-105 transition-all group`}
                  >
                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
                ) : null)}
                {(!trip.osDoc && !trip.agendamentoDoc && !trip.cteDoc && !trip.freightContractDoc && !trip.completoDoc) && (
                   <p className="text-[10px] font-bold text-slate-300 uppercase italic">Nenhum documento anexado pela base.</p>
                )}
              </div>
            </section>

            {/* FOTOS DE CAMPO */}
            <section>
              <SectionTitle title="Fotos do Motorista" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
              <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {trip.driver_docs && trip.driver_docs.length > 0 ? trip.driver_docs.map((img) => (
                  <button 
                    key={img.id}
                    onClick={() => setActivePhoto(img.url)}
                    className="aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:scale-105 transition-all group relative"
                  >
                    <img src={img.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                )) : (
                   <p className="text-[10px] font-bold text-slate-300 uppercase italic col-span-full">Nenhuma foto enviada de campo.</p>
                )}
              </div>
            </section>
          </div>

          {/* BARRA LATERAL: TIMELINE */}
          <div className="w-85 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0">
             <div className="p-8 bg-white border-b border-slate-200">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Cronologia de Status</h4>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Histórico completo da OS</p>
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                {(trip.statusHistory || []).map((step, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                     {idx < (trip.statusHistory?.length || 0) - 1 && (
                       <div className="absolute left-[7px] top-6 bottom-[-24px] w-[2px] bg-slate-200"></div>
                     )}
                     <div className={`w-4 h-4 rounded-full mt-1 shrink-0 border-2 border-white shadow-sm ${idx === 0 ? 'bg-blue-600 ring-4 ring-blue-50 animate-pulse' : 'bg-slate-300'}`}></div>
                     <div>
                        <p className={`text-[10px] font-black uppercase leading-tight ${idx === 0 ? 'text-blue-700' : 'text-slate-600'}`}>{step.status}</p>
                        <p className="text-[9px] font-mono text-slate-400 mt-1">{new Date(step.dateTime).toLocaleDateString('pt-BR')} às {new Date(step.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                  </div>
                ))}
             </div>
             <div className="p-8 bg-slate-100 border-t border-slate-200">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Registrado por: {trip.driver.name}</p>
             </div>
          </div>
        </div>
      </div>

      {/* VIEWERS OVERLAY */}
      {activePhoto && (
        <div className="fixed inset-0 z-[3000] bg-black/95 flex flex-col animate-in fade-in duration-300">
           <header className="h-20 flex justify-between items-center px-10 border-b border-white/10 shrink-0">
              <span className="text-white font-black uppercase text-xs tracking-widest">Visualização de Foto</span>
              <button onClick={() => setActivePhoto(null)} className="text-white p-3 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
           </header>
           <div className="flex-1 p-10"><ImageViewer url={activePhoto} /></div>
        </div>
      )}

      {docPreview && (
        <DocumentViewerModal isOpen={true} onClose={() => setDocPreview(null)} url={docPreview.url} title={docPreview.title} />
      )}
    </div>
  );
};

export default TripDetailsViewerModal;
