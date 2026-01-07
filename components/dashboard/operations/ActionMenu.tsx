
import React, { useState, useRef, useEffect } from 'react';
import { Trip } from '../../../types';

interface ActionMenuProps {
  trip: Trip;
  onEditTrip: (t: Trip) => void;
  onEditOC: (t: Trip) => void;
  onEditMinuta: (t: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onViewDriverDocs: (t: Trip) => void;
  handleFileUpload: (trip: Trip, type: any, e: any) => void;
  deleteDocument: (trip: Trip, type: any) => void;
  onViewDoc: (url: string, title: string) => void;
  handlePrint: (url: string, fileName: string) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ 
  trip, 
  onEditTrip, 
  onEditOC, 
  onEditMinuta, 
  onDeleteTrip, 
  onViewDriverDocs, 
  handleFileUpload, 
  deleteDocument, 
  onViewDoc, 
  handlePrint 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const DocItem = ({ type, label, iconColor }: { type: 'OS_PDF' | 'AGENDAMENTO' | 'CTE' | 'CVA' | 'COMPLETO', label: string, iconColor: string }) => {
    const doc = type === 'OS_PDF' ? trip.osDoc : type === 'AGENDAMENTO' ? trip.agendamentoDoc : type === 'CTE' ? trip.cteDoc : type === 'CVA' ? trip.cvaDoc : trip.completoDoc;
    
    if (doc) {
      return (
        <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 rounded-xl transition-colors group">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-2 h-2 rounded-full ${iconColor} shrink-0`}></div>
            <span className="text-[10px] font-black text-slate-700 uppercase truncate">{label}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
             <button onClick={() => onViewDoc(doc.url, doc.fileName)} className="p-1.5 hover:text-blue-600 transition-colors" title="Ver"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
             <button onClick={() => handlePrint(doc.url, doc.fileName)} className="p-1.5 hover:text-slate-900 transition-colors" title="Imp"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4"/></svg></button>
             <button onClick={() => deleteDocument(trip, type)} className="p-1.5 hover:text-red-500 transition-colors" title="Del"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
          </div>
        </div>
      );
    }

    return (
      <label className="flex items-center gap-2 py-2 px-3 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer group">
        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(trip, type, e)} />
        <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
        <span className="text-[9px] font-black text-slate-400 group-hover:text-blue-600 uppercase tracking-tight">Anexar {label}</span>
      </label>
    );
  };

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-1.5">
         <button 
           onClick={() => onViewDriverDocs(trip)}
           className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
           title="Fotos do Motorista"
         >
           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
           {trip.driver_docs && trip.driver_docs.length > 0 && <span className="text-[9px] font-black">{trip.driver_docs.length}</span>}
         </button>

         <button 
           onClick={() => setIsOpen(!isOpen)}
           className={`p-2 rounded-xl border-2 transition-all ${isOpen ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
         >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/></svg>
         </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-slate-200 p-2 z-[999] animate-in fade-in slide-in-from-top-2 zoom-in-95 origin-top-right">
          <div className="p-4 space-y-4">
             <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-2 mb-2">Gestão da Viagem</p>
                <button onClick={() => { onEditTrip(trip); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-900 hover:text-white rounded-xl transition-all group">
                   <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                   <span className="text-[10px] font-black uppercase">Editar Programação</span>
                </button>
                <button onClick={() => { onEditOC(trip); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-600 hover:text-white rounded-xl transition-all group">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  <span className="text-[10px] font-black uppercase">Editar Ordem Coleta</span>
                </button>
                <button onClick={() => { onEditMinuta(trip); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-600 hover:text-white rounded-xl transition-all group">
                   <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                   <span className="text-[10px] font-black uppercase">Minuta Pre-Stacking</span>
                </button>
             </div>

             <div className="space-y-1 pt-3 border-t border-slate-50">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-2 mb-2">Documentos e Anexos</p>
                <DocItem type="OS_PDF" label="OS Original PDF" iconColor="bg-emerald-500" />
                <DocItem type="CTE" label="Arquivo do CT-e" iconColor="bg-indigo-500" />
                <DocItem type="COMPLETO" label="Dossiê Completo" iconColor="bg-blue-500" />
             </div>

             <button 
               onClick={() => { onDeleteTrip(trip.id); setIsOpen(false); }}
               className="w-full flex items-center gap-3 px-3 py-3 mt-2 text-red-500 hover:bg-red-50 rounded-xl transition-all group"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                <span className="text-[10px] font-black uppercase">Excluir Viagem</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
