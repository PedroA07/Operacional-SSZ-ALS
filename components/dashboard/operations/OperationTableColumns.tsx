
import React from 'react';
import { Trip, TripStatus, TripDocument } from '../../../types';
import { db } from '../../../utils/storage';

export const getOperationTableColumns = (
  openStatusEditor: (t: Trip, s: TripStatus) => void,
  onEditTrip: (t: Trip) => void,
  onEditOC: (t: Trip) => void,
  onEditMinuta: (t: Trip) => void,
  onViewDoc: (url: string, title: string) => void,
  onDeleteTrip: (id: string) => void,
  onRefreshData: () => void,
  onEditScheduling: (t: Trip) => void
) => {
  
  const handleFileUpload = async (trip: Trip, type: 'OS_PDF' | 'AGENDAMENTO' | 'CTE' | 'CVA' | 'COMPLETO', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      let prefix = 'DOC';
      if (type === 'OS_PDF') prefix = 'OS';
      else if (type === 'AGENDAMENTO') prefix = 'AGD';
      else if (type === 'CTE') prefix = 'CTE';
      else if (type === 'CVA') prefix = 'CVA';
      else if (type === 'COMPLETO') prefix = 'DOSSIE';

      const customFileName = `${prefix} - ${trip.driver.name} - ${trip.os}`;
      
      const doc: TripDocument = { 
        id: `${type.toLowerCase()}-${Date.now()}`, 
        type: type as any, 
        url: reader.result as string, 
        fileName: customFileName, 
        uploadDate: new Date().toISOString() 
      };

      const updatedTrip = { ...trip };
      if (type === 'OS_PDF') updatedTrip.osDoc = doc;
      else if (type === 'AGENDAMENTO') updatedTrip.agendamentoDoc = doc;
      else if (type === 'CTE') updatedTrip.cteDoc = doc;
      else if (type === 'CVA') updatedTrip.cvaDoc = doc;
      else if (type === 'COMPLETO') updatedTrip.completoDoc = doc;
      
      try {
        await db.saveTrip(updatedTrip);
        onRefreshData();
        alert(`Documento vinculado com sucesso!`);
      } catch (err) {
        alert("Erro ao salvar no banco de dados.");
      }
    };
    reader.readAsDataURL(file);
  };

  const deleteDocument = async (trip: Trip, type: 'OS_PDF' | 'AGENDAMENTO' | 'CTE' | 'CVA' | 'COMPLETO') => {
    if (!confirm(`Remover anexo selecionado?`)) return;
    
    const updatedTrip = { ...trip };
    if (type === 'OS_PDF') updatedTrip.osDoc = undefined;
    else if (type === 'AGENDAMENTO') updatedTrip.agendamentoDoc = undefined;
    else if (type === 'CTE') updatedTrip.cteDoc = undefined;
    else if (type === 'CVA') updatedTrip.cvaDoc = undefined;
    else if (type === 'COMPLETO') updatedTrip.completoDoc = undefined;
    
    try {
      await db.saveTrip(updatedTrip);
      onRefreshData();
    } catch (err) {
      alert("Erro ao excluir do banco de dados.");
    }
  };

  const handlePrint = (url: string, fileName: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${fileName}</title></head>
          <body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;background:#f4f4f4;">
            ${url.startsWith('data:image') 
              ? `<img src="${url}" style="max-width:100%; height:auto; box-shadow:0 0 20px rgba(0,0,0,0.2);">`
              : `<embed width="100%" height="100%" src="${url}" type="application/pdf">`
            }
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 1000);
    }
  };

  const DocumentBlock = ({ trip, type, label, forceVisible = true }: { trip: Trip, type: 'OS_PDF' | 'AGENDAMENTO' | 'CTE' | 'CVA' | 'COMPLETO', label: string, forceVisible?: boolean }) => {
    if (!forceVisible) return null;
    
    const doc = type === 'OS_PDF' ? trip.osDoc 
                : type === 'AGENDAMENTO' ? trip.agendamentoDoc 
                : type === 'CTE' ? trip.cteDoc 
                : type === 'CVA' ? trip.cvaDoc 
                : trip.completoDoc;
    
    const colorClass = type === 'OS_PDF' ? 'emerald' 
                    : type === 'AGENDAMENTO' ? 'blue' 
                    : type === 'CTE' ? 'indigo' 
                    : type === 'CVA' ? 'amber' 
                    : 'slate';

    if (doc) {
      return (
        <div className={`space-y-1 p-2 bg-${colorClass}-50 rounded-xl border border-${colorClass}-100 shadow-inner`}>
           <p className={`text-[7px] font-black text-${colorClass}-600 uppercase mb-1 tracking-tighter`}>{label}</p>
           <div className="grid grid-cols-4 gap-1">
              <button onClick={() => onViewDoc(doc.url, doc.fileName)} className={`p-1.5 bg-white text-${colorClass}-600 rounded-lg hover:bg-${colorClass}-600 hover:text-white transition-all shadow-sm border border-${colorClass}-100`} title="Visualizar"><svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
              <button onClick={() => handlePrint(doc.url, doc.fileName)} className="p-1.5 bg-white text-slate-600 rounded-lg hover:bg-slate-600 hover:text-white transition-all shadow-sm border border-slate-100" title="Imprimir"><svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4"/></svg></button>
              <label className="p-1.5 bg-white text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100 cursor-pointer" title="Substituir"><input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(trip, type, e)} /><svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></label>
              <button onClick={() => deleteDocument(trip, type)} className="p-1.5 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100" title="Excluir"><svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
           </div>
        </div>
      );
    }

    return (
      <label className={`w-full flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:border-${colorClass}-400 hover:bg-${colorClass}-50 transition-all shadow-sm cursor-pointer group`}>
        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(trip, type, e)} />
        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-${colorClass}-500 transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        <span className="text-[7.5px] font-black uppercase tracking-tight">Anexar {label}</span>
      </label>
    );
  };

  return [
  { 
    key: 'dateTime', 
    label: '1. Prog. / Operação', 
    render: (t: Trip) => {
      const displayTimeStr = t.ocFormData?.horarioAgendado || t.dateTime;
      const dateObj = new Date(displayTimeStr);
      
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col">
            <span className="font-black text-slate-800 text-[11px]">{dateObj.toLocaleDateString('pt-BR')}</span>
            <span className="text-blue-600 font-bold text-[10px]">{dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="space-y-1">
             <span className={`w-fit px-2 py-0.5 rounded text-[7px] font-black uppercase ${
               t.type === 'EXPORTAÇÃO' ? 'bg-blue-100 text-blue-700' : 
               t.type === 'IMPORTAÇÃO' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
             }`}>
               {t.type}
             </span>
             <div className="flex items-center gap-1">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Vínculo:</span>
                <span className="text-[8px] font-black text-blue-800 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  {t.category} {t.subCategory ? `› ${t.subCategory}` : ''}
                </span>
             </div>
          </div>
        </div>
      );
    }
  },
  { 
    key: 'os_status', 
    label: '2. OS / Histórico Status', 
    render: (t: Trip) => (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <div className="flex items-center justify-between group">
           <p className="text-xs font-black text-blue-700 tracking-tight">OS: {t.os}</p>
           <button onClick={() => openStatusEditor(t, t.status)} className="p-1 hover:text-blue-500 transition-colors bg-slate-50 rounded-lg border border-slate-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
           </button>
        </div>
        <div className="flex flex-col gap-1.5 border-l-2 border-blue-50 pl-3">
           {(t.statusHistory || []).slice().sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map((step, idx) => (
             <div key={idx} className={`flex flex-col p-1.5 rounded-lg border ${idx === 0 ? 'bg-blue-600 border-blue-700 text-white shadow-md ring-2 ring-blue-50' : 'bg-white border-slate-100 text-slate-400'}`}>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[7.5px] font-black uppercase truncate">{step.status}</span>
                  <span className={`font-mono text-[7px] font-bold ${idx === 0 ? 'text-blue-200' : 'text-slate-300'}`}>
                    {new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                  </span>
                </div>
                {idx === 0 && <div className="text-[6px] font-bold uppercase opacity-60 mt-0.5">{new Date(step.dateTime).toLocaleDateString('pt-BR')}</div>}
             </div>
           ))}
        </div>
      </div>
    )
  },
  { 
    key: 'driver', 
    label: '3. Motorista', 
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5 max-w-[200px] whitespace-normal break-words">
        <span className="font-black text-slate-800 uppercase text-[10px] leading-tight">{t.driver?.name}</span>
        <span className="text-[8px] font-bold text-slate-400">CPF: {t.driver?.cpf}</span>
        <div className="mt-1 space-y-0.5">
           <p className="text-[8px] font-black uppercase text-blue-600">Cavalo: <span className="font-mono">{t.driver?.plateHorse}</span></p>
           <p className="text-[8px] font-black uppercase text-slate-500">Carreta: <span className="font-mono">{t.driver?.plateTrailer}</span></p>
        </div>
      </div>
    )
  },
  {
    key: 'equipment',
    label: '4. Equipamento',
    render: (t: Trip) => (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center gap-2">
           <span className="font-black text-slate-800 text-[11px]">{t.container || '---'}</span>
           {(t as any).genset && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">Genset</span>}
        </div>
        <p className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg w-fit">
          {t.containerType || (t.ocFormData?.tipo) || '---'}
        </p>
        <div className="flex gap-2 mt-1">
           <span className="text-[8px] font-bold text-slate-400">T: {t.tara || '---'}</span>
           <span className="text-[8px] font-bold text-slate-400">L: {t.seal || '---'}</span>
        </div>
      </div>
    )
  },
  {
    key: 'cva_info',
    label: '5. CVA / Dossiê',
    render: (t: Trip) => (
      <div className="flex flex-col gap-2 min-w-[120px]">
        {t.cva ? (
          <div className="space-y-1.5">
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-mono font-black uppercase shadow-sm">
              CVA: {t.cva}
            </span>
            <DocumentBlock trip={t} type="CVA" label="Certificado CVA" />
          </div>
        ) : (
          <span className="text-[9px] font-bold text-slate-300 uppercase italic">N/I CVA</span>
        )}
      </div>
    )
  },
  {
    key: 'customer',
    label: '6. Cliente',
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5 max-w-[250px] whitespace-normal break-words">
        <p className="font-black text-slate-800 uppercase text-[10px] leading-tight">
          {t.customer?.legalName || t.customer?.name}
        </p>
        <p className="text-[9px] font-bold text-slate-400 uppercase italic">
          FAN: {t.customer?.name}
        </p>
        <div className="flex flex-col mt-1 border-t border-slate-50 pt-1">
           <span className="text-[8px] font-black text-blue-600">CNPJ: {t.customer?.cnpj || '---'}</span>
           <span className="text-[8px] font-bold text-slate-500">{t.customer?.city} - {t.customer?.state}</span>
        </div>
      </div>
    )
  },
  {
    key: 'destination_ship_booking',
    label: '7. Destino / Navio / Booking',
    render: (t: Trip) => (
      <div className="flex flex-col space-y-2 max-w-[220px] whitespace-normal">
        <div className="flex flex-col space-y-0.5">
          <p className="font-black text-slate-700 uppercase text-[10px] leading-tight">
            {t.destination?.legalName || t.destination?.name || '---'}
          </p>
          {t.destination && (
            <span className="text-[8px] font-bold text-slate-400 uppercase">
              {t.destination.city} - {t.destination.state}
            </span>
          )}
        </div>
        
        <div className="flex flex-col pt-1.5 border-t border-slate-100 gap-1.5">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter leading-none">Navio:</span>
            <span className="font-black text-slate-800 text-[9px] uppercase truncate">{t.ship || '---'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter leading-none">Booking:</span>
            <span className="text-blue-600 font-bold text-[9px] uppercase truncate">{t.booking || '---'}</span>
          </div>
        </div>
      </div>
    )
  },
  { 
    key: 'scheduling_info', 
    label: '8. Agendamento', 
    render: (t: Trip) => {
      const sch = t.scheduling;
      if (!sch) return (
        <button onClick={() => onEditScheduling(t)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-dashed border-slate-300">
           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
           <span className="text-[8px] font-black uppercase">Agendar</span>
        </button>
      );

      const schDate = new Date(sch.dateTime);

      return (
        <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 min-w-[180px] group relative">
           <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col" onClick={() => t.agendamentoDoc && onViewDoc(t.agendamentoDoc.url, t.agendamentoDoc.fileName)}>
                 <span className="text-[9px] font-black text-emerald-700 uppercase leading-none">{schDate.toLocaleDateString('pt-BR')}</span>
                 <span className="text-[11px] font-black text-slate-800 mt-0.5">{schDate.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => onEditScheduling(t)} className="p-1.5 bg-white text-blue-600 rounded-lg shadow-sm border border-blue-100">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
              </div>
           </div>
           <div className="border-t border-emerald-100/50 pt-2">
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Terminal:</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase leading-tight truncate">{sch.location}</p>
           </div>
           <div className="mt-2">
             <DocumentBlock trip={t} type="AGENDAMENTO" label="Anexo PDF" />
           </div>
        </div>
      );
    }
  },
  {
    key: 'actions',
    label: '9. Opções',
    render: (t: Trip) => {
      return (
        <div className="flex flex-col gap-2 min-w-[160px]">
          <button 
            onClick={() => onEditTrip(t)} 
            className="w-full flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            <span className="text-[8px] font-black uppercase">Editar Viagem</span>
          </button>

          <DocumentBlock trip={t} type="OS_PDF" label="OS PDF" />
          <DocumentBlock trip={t} type="CTE" label="CT-e (Arquivo)" />
          <DocumentBlock trip={t} type="COMPLETO" label="Dossiê Completo" />

          {t.ocFormData && (
            <button 
              onClick={() => onEditOC(t)} 
              className="w-full flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span className="text-[7.5px] font-black uppercase">Editar OC</span>
            </button>
          )}

          <button 
            onClick={() => onEditMinuta(t)} 
            className="w-full flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            <span className="text-[7.5px] font-black uppercase">Minuta PreS.</span>
          </button>

          <button 
            onClick={() => onDeleteTrip(t.id)} 
            className="w-full flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm group"
          >
            <svg className="w-3 h-3 text-red-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
            <span className="text-[7.5px] font-black uppercase">Remover</span>
          </button>
        </div>
      )
    }
  }
]};
