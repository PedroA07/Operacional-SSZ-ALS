
import React, { useMemo, useState } from 'react';
import { Trip, TripDocument } from '../../../types';

interface DocsTabProps {
  trips: Trip[];
}

const DocsTab: React.FC<DocsTabProps> = ({ trips }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{url: string, title: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtramos apenas as viagens que possuem o campo freightContractDoc preenchido
  const contractDocuments = useMemo(() => {
    return trips
      .filter(t => t.freightContractDoc)
      .map(t => ({
        tripOs: t.os,
        customerName: t.customer.name,
        doc: t.freightContractDoc!
      }))
      .filter(item => 
        item.tripOs.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [trips, searchQuery]);

  const openDoc = (url: string, title: string) => {
    setSelectedDoc({ url, title });
    setIsViewerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
       <div className="text-center py-6">
          <h3 className="text-lg font-black uppercase">Contratos de Frete</h3>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Acesso exclusivo aos seus contratos assinados</p>
       </div>

       {/* BARRA DE BUSCA */}
       <div className="px-1">
          <div className="relative">
            <input 
              type="text" 
              placeholder="BUSCAR POR OS OU CLIENTE..." 
              className="w-full pl-12 pr-6 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white font-bold text-[10px] uppercase outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
       </div>
       
       <div className="space-y-3">
          {contractDocuments.length > 0 ? contractDocuments.map((item, idx) => (
            <button 
              key={`${item.doc.id}-${idx}`}
              onClick={() => openDoc(item.doc.url, `Contrato: ${item.tripOs}`)}
              className="w-full p-5 bg-slate-900 border border-white/5 rounded-[1.8rem] flex items-center justify-between active:bg-blue-600 transition-all group shadow-xl"
            >
               <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-active:text-white shrink-0 border border-blue-500/20">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[11px] font-black text-white uppercase truncate">Contrato de Frete - OS {item.tripOs}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase group-active:text-blue-100 mt-0.5">{item.customerName}</p>
                  </div>
               </div>
               <div className="flex flex-col items-end gap-1">
                  <span className="text-[7px] font-mono text-slate-600 group-active:text-blue-200">{new Date(item.doc.uploadDate).toLocaleDateString('pt-BR')}</span>
                  <svg className="w-4 h-4 text-slate-700 group-active:text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
               </div>
            </button>
          )) : (
            <div className="py-24 bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-white/5 text-center px-10">
               <p className="text-[10px] font-black text-slate-600 uppercase italic leading-relaxed">Nenhum contrato de frete<br/>localizado para esta busca.</p>
            </div>
          )}
       </div>

       {isViewerOpen && selectedDoc && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in fade-in duration-300">
           <div className="h-20 bg-slate-900 flex items-center justify-between px-6 shrink-0 border-b border-white/5">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Documento Digitalizado</p>
                <p className="text-xs font-bold text-white uppercase truncate mt-1">{selectedDoc.title}</p>
              </div>
              <button 
                onClick={() => setIsViewerOpen(false)}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:bg-red-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
           </div>
           <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center">
              {selectedDoc.url.startsWith('data:image') ? (
                <img src={selectedDoc.url} className="max-w-full max-h-full object-contain" alt="Doc" />
              ) : (
                <iframe src={selectedDoc.url} className="w-full h-full border-none" title="Doc Viewer" />
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default DocsTab;
