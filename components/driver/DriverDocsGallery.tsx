
import React from 'react';
import { DriverCapturedDoc } from '../../types';
import ImageViewer from '../shared/ImageViewer';

interface DriverDocsGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  docs: DriverCapturedDoc[];
  os: string;
}

const DriverDocsGallery: React.FC<DriverDocsGalleryProps> = ({ isOpen, onClose, docs, os }) => {
  const [selectedDoc, setSelectedDoc] = React.useState<DriverCapturedDoc | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[4000] bg-[#020617] flex flex-col animate-in slide-in-from-bottom duration-500">
      <header className="p-6 pt-12 flex justify-between items-center bg-slate-950 border-b border-white/5 shrink-0">
        <div>
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Meus Arquivos Enviados</p>
          <h3 className="text-xl font-black text-white uppercase mt-1">OS {os}</h3>
        </div>
        <button onClick={onClose} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white active:bg-red-600 transition-all">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {docs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <svg className="w-16 h-16 text-white mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>
            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma foto enviada para esta OS</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pb-20">
            {docs.map((doc) => (
              <button 
                key={doc.id} 
                onClick={() => setSelectedDoc(doc)}
                className="aspect-[3/4] bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10 relative shadow-2xl active:scale-95 transition-all"
              >
                <img src={doc.url} className="w-full h-full object-cover" alt="Upload" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-[8px] font-black text-blue-400 uppercase">{new Date(doc.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedDoc && (
        <div className="fixed inset-0 z-[5000] bg-black flex flex-col animate-in fade-in">
          <header className="h-20 bg-slate-950 border-b border-white/10 flex items-center justify-between px-6 shrink-0 pt-6">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">Visualizar Anexo</p>
            <button onClick={() => setSelectedDoc(null)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
          </header>
          <div className="flex-1 overflow-hidden p-4">
            <ImageViewer url={selectedDoc.url} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDocsGallery;
