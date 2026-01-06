
import React, { useState, useMemo } from 'react';
import { Trip, TripDocument } from '../../../types';

interface TripsTabProps {
  trips: Trip[];
}

const TripsTab: React.FC<TripsTabProps> = ({ trips }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todas' | 'ativas' | 'concluidas'>('todas');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string, label: string } | null>(null);

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchSearch = t.os.toLowerCase().includes(search.toLowerCase()) || 
                          t.customer.name.toLowerCase().includes(search.toLowerCase()) ||
                          (t.container || '').toLowerCase().includes(search.toLowerCase());
      
      const isFinished = t.status === 'Viagem concluída' || t.status === 'Viagem cancelada';
      if (filter === 'ativas') return matchSearch && !isFinished;
      if (filter === 'concluidas') return matchSearch && isFinished;
      return matchSearch;
    });
  }, [trips, search, filter]);

  const openDocViewer = (doc: TripDocument | undefined, label: string) => {
    if (doc?.url) {
      setPreviewDoc({ url: doc.url, label });
    }
  };

  const DetailRow = ({ label, value, blue = false, mono = false }: any) => (
    <div className="flex flex-col py-3 border-b border-white/5 last:border-0">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-[12px] font-bold uppercase ${blue ? 'text-blue-400' : 'text-slate-100'} ${mono ? 'font-mono' : ''}`}>
        {value || 'NÃO INFORMADO'}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* HEADER E BUSCA */}
      <div className="space-y-4 px-1">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Minhas Viagens</h2>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="BUSCAR OS, CLIENTE OU CONTAINER..." 
            className="w-full pl-11 pr-5 py-4 bg-slate-900/80 border border-white/10 rounded-2xl text-[11px] font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 shadow-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>
        </div>

        <div className="flex gap-2">
          {['todas', 'ativas', 'concluidas'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${filter === f ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE VIAGENS */}
      <div className="space-y-3">
        {filteredTrips.length > 0 ? filteredTrips.map((t) => {
          const isFinished = t.status === 'Viagem concluída' || t.status === 'Viagem cancelada';
          return (
            <button 
              key={t.id}
              onClick={() => setSelectedTrip(t)}
              className={`w-full p-5 rounded-[2rem] border text-left flex items-center justify-between transition-all group ${isFinished ? 'bg-slate-900/30 border-white/5 grayscale opacity-60' : 'bg-slate-900 border-white/10 shadow-xl active:scale-95 active:border-blue-600'}`}
            >
              <div className="min-w-0">
                <p className="text-lg font-black text-white uppercase leading-none mb-2">OS {t.os}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[200px]">{t.customer.name}</p>
                <div className="flex gap-2 mt-3">
                  <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${isFinished ? 'bg-slate-800 text-slate-400' : 'bg-blue-600 text-white'}`}>{t.status}</span>
                  <span className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[7px] font-mono text-slate-400 uppercase tracking-tighter">{t.container || 'A DEFINIR'}</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-800 group-active:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
            </button>
          );
        }) : (
          <div className="py-20 text-center text-slate-600 font-black uppercase text-[10px] italic">Nenhuma viagem encontrada</div>
        )}
      </div>

      {/* DETALHE DA VIAGEM SELECIONADA */}
      {selectedTrip && (
        <div className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col animate-in slide-in-from-bottom-full duration-500">
           <header className="p-6 pt-12 flex justify-between items-center bg-slate-950 border-b border-white/5 shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Dossiê da OS</p>
                <h3 className="text-xl font-black text-white uppercase mt-1">Nº {selectedTrip.os}</h3>
              </div>
              <button onClick={() => setSelectedTrip(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white active:bg-red-600 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
              </button>
           </header>

           <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-32">
              <section className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl space-y-2">
                 <DetailRow label="Cliente / Localidade" value={`${selectedTrip.customer.name} › ${selectedTrip.customer.city}`} blue />
                 <DetailRow label="Container" value={selectedTrip.container} mono />
                 <DetailRow label="Ship / Booking" value={`${selectedTrip.ship || '---'} / ${selectedTrip.booking || '---'}`} />
                 <DetailRow label="Data Programada" value={new Date(selectedTrip.dateTime).toLocaleString('pt-BR')} />
                 {selectedTrip.scheduling && (
                   <div className="mt-4 p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">Agendamento no Local</p>
                      <p className="text-sm font-black text-white uppercase">{selectedTrip.scheduling.location}</p>
                      <p className="text-xs font-bold text-slate-300 mt-1">{new Date(selectedTrip.scheduling.dateTime).toLocaleString('pt-BR')}</p>
                   </div>
                 )}
              </section>

              {/* DOCUMENTOS ANEXADOS - AGORA ABREM NO MODAL INTERNO */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Documentos Digitais</h4>
                <div className="grid gap-3">
                   {[
                     { label: 'Ordem de Coleta', doc: selectedTrip.osDoc },
                     { label: 'Comprovante Agendamento', doc: selectedTrip.agendamentoDoc },
                     { label: 'CT-e / Completo', doc: selectedTrip.completoDoc || selectedTrip.cteDoc },
                     { label: 'Certificado CVA', doc: selectedTrip.cvaDoc },
                     { label: 'Contrato de Frete', doc: selectedTrip.freightContractDoc }
                   ].map((item, idx) => item.doc && (
                     <button 
                       key={idx}
                       onClick={() => openDocViewer(item.doc, item.label)}
                       className="w-full p-5 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-between active:bg-blue-600 transition-all shadow-xl group"
                     >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-active:text-white">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
                           </div>
                           <span className="text-[11px] font-black uppercase text-white tracking-tighter">{item.label}</span>
                        </div>
                        <svg className="w-4 h-4 text-slate-700 group-active:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="3.5"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2"/></svg>
                     </button>
                   ))}
                   {![selectedTrip.osDoc, selectedTrip.agendamentoDoc, selectedTrip.completoDoc, selectedTrip.cteDoc, selectedTrip.cvaDoc, selectedTrip.freightContractDoc].some(Boolean) && (
                     <div className="p-10 text-center bg-slate-900/50 rounded-3xl border border-dashed border-white/5">
                        <p className="text-[9px] font-bold text-slate-600 uppercase">Nenhum documento anexado a esta viagem.</p>
                     </div>
                   )}
                </div>
              </section>
           </div>
           
           <div className="p-6 bg-slate-950 border-t border-white/5 fixed bottom-0 left-0 w-full z-[1010]">
              <button onClick={() => setSelectedTrip(null)} className="w-full py-5 bg-slate-900 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-900 transition-all">Voltar para a Lista</button>
           </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO DE DOCUMENTO INTERNO (PORTAL DO MOTORISTA) */}
      {previewDoc && (
        <div className="fixed inset-0 z-[2000] bg-[#020617] flex flex-col animate-in fade-in duration-300">
           <header className="p-6 pt-12 flex justify-between items-center bg-slate-950 border-b border-white/5 shrink-0">
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Visualizador Digital</p>
                <h3 className="text-sm font-black text-white uppercase mt-1">{previewDoc.label}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white active:bg-red-600 transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
              </button>
           </header>
           <div className="flex-1 bg-white overflow-hidden relative">
              {previewDoc.url.startsWith('data:image') ? (
                <div className="w-full h-full flex items-center justify-center p-4 bg-slate-200 overflow-auto">
                   <img src={previewDoc.url} className="max-w-full shadow-2xl rounded-lg" alt="Doc" />
                </div>
              ) : (
                <iframe src={previewDoc.url} className="w-full h-full border-none" title="Doc Preview"></iframe>
              )}
           </div>
           <div className="p-6 bg-slate-950 border-t border-white/5 flex gap-3">
              <button onClick={() => window.open(previewDoc.url, '_blank')} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:bg-blue-700 transition-all">Abrir Externo</button>
              <button onClick={() => setPreviewDoc(null)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-900 transition-all">Fechar</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default TripsTab;
