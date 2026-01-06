
import React, { useMemo, useState } from 'react';
import { Trip, TripDocument } from '../../../types';

interface DocsTabProps {
  trips: Trip[];
}

const DocsTab: React.FC<DocsTabProps> = ({ trips }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{url: string, title: string} | null>(null);

  const allDocuments = useMemo(() => {
    const docs: {tripOs: string, doc: TripDocument}[] = [];
    trips.forEach(t => {
      if (t.osDoc) docs.push({ tripOs: t.os, doc: t.osDoc });
      if (t.agendamentoDoc) docs.push({ tripOs: t.os, doc: t.agendamentoDoc });
      if (t.cteDoc) docs.push({ tripOs: t.os, doc: t.cteDoc });
      if (t.completoDoc) docs.push({ tripOs: t.os, doc: t.completoDoc });
      if (t.cvaDoc) docs.push({ tripOs: t.os, doc: t.cvaDoc });
    });
    return docs;
  }, [trips]);

  const openDoc = (url: string, title: string) => {
    setSelectedDoc({ url, title });
    setIsViewerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
       <div className="text-center py-6">
          <h3 className="text-lg font-black uppercase">Dossiê Digital</h3>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Arquivos das suas operações vinculadas</p>
       </div>
       
       <div className="space-y-3">
          {allDocuments.length > 0 ? allDocuments.map((item, idx) => (
            <button 
              key={`${item.doc.id}-${idx}`}
              onClick={() => openDoc(item.doc.url, item.doc.fileName)}
              className="w-full p-5 bg-slate-900 border border-white/5 rounded-[1.8rem] flex items-center justify-between active:bg-blue-600 transition-all group"
            >
               <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-blue-500 group-active:text-white shrink-0">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2.5"/></svg>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[11px] font-black text-white uppercase truncate">{item.doc.fileName}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase group-active:text-blue-100">OS: {item.tripOs} • {new Date(item.doc.uploadDate).toLocaleDateString('pt-BR')}</p>
                  </div>
               </div>
               <svg className="w-4 h-4 text-slate-700 group-active:text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
            </button>
          )) : (
            <div className="py-20 bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-white/5 text-center px-10">
               <p className="text-[10px] font-black text-slate-600 uppercase italic">Nenhum anexo digital foi enviado ainda.</p>
            </div>
          )}
       </div>

       {isViewerOpen && selectedDoc && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in fade-in duration-300">
           <div className="h-20 bg-slate-900 flex items-center justify-between px-6 shrink-0 border-b border-white/5">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Documento Online</p>
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
