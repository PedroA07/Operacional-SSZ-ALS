
import React from 'react';
import { Trip, TripStatus, TripDocument, User, DriverCapturedDoc } from '../../../types';
import { db } from '../../../utils/storage';
import ActionMenu from './ActionMenu';

export const getOperationTableColumns = (
  openStatusEditor: (t: Trip, s: TripStatus) => void,
  onEditTrip: (t: Trip) => void,
  onEditOC: (t: Trip) => void,
  onEditMinuta: (t: Trip) => void,
  onViewDoc: (url: string, title: string) => void,
  onDeleteTrip: (id: string) => void,
  onRefreshData: () => void,
  onEditScheduling: (t: Trip) => void,
  actingUser: User,
  onLocateDriver: (driverId: string) => void,
  onViewDriverDocs: (t: Trip) => void,
  onOpenHistoryManager: (t: Trip) => void 
) => {
  
  const handleFileUpload = async (trip: Trip, type: 'OS_PDF' | 'AGENDAMENTO' | 'CTE' | 'CVA' | 'COMPLETO' | 'BATCH', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const updatedTrip = { ...trip };
    // Fix: Explicitly cast Array.from result to File[] to avoid unknown type errors in readAsDataURL
    const filesArray = Array.from(files) as File[];

    // Se for um upload em LOTE (BATCH), adicionamos todos ao driver_docs
    if (type === 'BATCH') {
      const newDocs: DriverCapturedDoc[] = [];
      
      for (const file of filesArray) {
        const reader = new FileReader();
        const promise = new Promise<void>((resolve) => {
          reader.onload = () => {
            newDocs.push({
              id: `batch-doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              url: reader.result as string,
              timestamp: new Date().toISOString()
            });
            resolve();
          };
          // Fix: reader.readAsDataURL expects a Blob; file is now typed as File (which extends Blob)
          reader.readAsDataURL(file);
        });
        await promise;
      }

      updatedTrip.driver_docs = [...(updatedTrip.driver_docs || []), ...newDocs];
      
      try {
        await db.saveTrip(updatedTrip, actingUser);
        await db.addNotification(actingUser, 'DOC_ATTACHED', `Lote de Arquivos`, `${actingUser.displayName} anexou ${filesArray.length} arquivos no dossiê da OS ${trip.os}.`, { os: trip.os, motorista: trip.driver.name });
        onRefreshData();
      } catch (err) { alert("Erro ao salvar lote no banco."); }
      return;
    }

    // Se for um tipo específico (OS, CTE, etc), processamos o primeiro e o restante vai pro dossiê se houver mais de um
    const firstFile = filesArray[0];
    const reader = new FileReader();
    
    reader.onload = async () => {
      let prefix = 'DOC';
      let docLabel = 'Documento';

      if (type === 'OS_PDF') { prefix = 'OS'; docLabel = 'OS Digital'; }
      else if (type === 'AGENDAMENTO') { prefix = 'AGD'; docLabel = 'Agendamento'; }
      else if (type === 'CTE') { prefix = 'CTE'; docLabel = 'CT-e'; }
      else if (type === 'CVA') { prefix = 'CVA'; docLabel = 'Certificado CVA'; }
      else if (type === 'COMPLETO') { prefix = 'DOSSIE'; docLabel = 'Dossiê Completo'; }

      const customFileName = `${prefix} - ${trip.driver.name} - ${trip.os}`;
      const doc: TripDocument = { 
        id: `${type.toLowerCase()}-${Date.now()}`, 
        type: type as any, 
        url: reader.result as string, 
        fileName: customFileName, 
        uploadDate: new Date().toISOString() 
      };

      if (type === 'OS_PDF') updatedTrip.osDoc = doc;
      else if (type === 'AGENDAMENTO') updatedTrip.agendamentoDoc = doc;
      else if (type === 'CTE') updatedTrip.cteDoc = doc;
      else if (type === 'CVA') updatedTrip.cvaDoc = doc;
      else if (type === 'COMPLETO') updatedTrip.completoDoc = doc;

      // Se o usuário selecionou mais de um arquivo para um campo específico,
      // salvamos os excedentes no dossiê geral para não perdê-los.
      if (filesArray.length > 1) {
        const extraDocs: DriverCapturedDoc[] = [];
        for (let i = 1; i < filesArray.length; i++) {
          const extraReader = new FileReader();
          const p = new Promise<void>((res) => {
            extraReader.onload = () => {
              extraDocs.push({
                id: `extra-doc-${Date.now()}-${i}`,
                url: extraReader.result as string,
                timestamp: new Date().toISOString()
              });
              res();
            };
            // Fix: extraReader.readAsDataURL expects a Blob; filesArray[i] is now typed as File
            extraReader.readAsDataURL(filesArray[i]);
          });
          await p;
        }
        updatedTrip.driver_docs = [...(updatedTrip.driver_docs || []), ...extraDocs];
      }
      
      try {
        await db.saveTrip(updatedTrip, actingUser);
        await db.addNotification(actingUser, 'DOC_ATTACHED', `Documento Anexado: ${docLabel}`, `${actingUser.displayName} anexou ${docLabel} na OS ${trip.os}.`, { os: trip.os, motorista: trip.driver.name, docType: docLabel });
        onRefreshData();
      } catch (err) { alert("Erro ao salvar no banco."); }
    };
    // Fix: reader.readAsDataURL expects a Blob; firstFile is now typed as File
    reader.readAsDataURL(firstFile);
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
      await db.saveTrip(updatedTrip, actingUser);
      onRefreshData();
    } catch (err) { alert("Erro ao excluir do banco."); }
  };

  const handlePrint = (url: string, fileName: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><body style="margin:0;">${url.startsWith('data:image') ? `<img src="${url}" style="max-width:100%;">` : `<embed width="100%" height="100%" src="${url}" type="application/pdf">`}</body></html>`);
      printWindow.document.close();
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1000);
    }
  };

  const DocumentBlockForTable = ({ trip, type, label }: { trip: Trip, type: 'AGENDAMENTO', label: string }) => {
    const doc = trip.agendamentoDoc;

    if (doc) {
      return (
        <div className="flex items-center gap-1.5 p-1.5 bg-blue-50 rounded-xl border border-blue-100 mt-2">
           <button onClick={() => onViewDoc(doc.url, doc.fileName)} className="p-1 text-blue-600 hover:bg-white rounded-lg transition-all" title="Ver"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
           <span className="text-[7.5px] font-black text-blue-600 uppercase">Ver PDF</span>
        </div>
      );
    }

    return (
      <label className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-100 text-slate-400 rounded-lg hover:border-blue-300 transition-all cursor-pointer mt-2 group">
        <input type="file" className="hidden" accept=".pdf,image/*" multiple onChange={(e) => handleFileUpload(trip, type, e)} />
        <svg className="w-2.5 h-2.5 group-hover:text-blue-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        <span className="text-[7px] font-black uppercase">Anexar</span>
      </label>
    );
  };

  const getStatusStyle = (status: TripStatus, isLatest: boolean) => {
    if (status === 'Viagem concluída') {
      return isLatest 
        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md ring-2 ring-emerald-50' 
        : 'bg-emerald-50 border-emerald-100 text-emerald-600';
    }
    if (status === 'Viagem cancelada') {
      return isLatest 
        ? 'bg-amber-500 border-amber-600 text-white shadow-md ring-2 ring-amber-50' 
        : 'bg-amber-100 text-amber-600 border-amber-100';
    }
    return isLatest 
      ? 'bg-blue-600 border-blue-700 text-white shadow-md ring-2 ring-blue-50' 
      : 'bg-white border-slate-100 text-slate-400';
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
             <span className={`w-fit px-2 py-0.5 rounded text-[7px] font-black uppercase ${t.type === 'EXPORTAÇÃO' ? 'bg-blue-100 text-blue-700' : t.type === 'IMPORTAÇÃO' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>{t.type}</span>
             <div className="flex items-center gap-1"><span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Vínculo:</span><span className="text-[8px] font-black text-blue-800 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{t.category} {t.subCategory ? `› ${t.subCategory}` : ''}</span></div>
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
           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onOpenHistoryManager(t)} className="p-1 hover:text-blue-500 transition-colors bg-slate-50 rounded-lg border border-slate-100" title="Gerenciar Histórico"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg></button>
              <button onClick={() => openStatusEditor(t, t.status)} className="p-1 hover:text-blue-500 transition-colors bg-slate-50 rounded-lg border border-slate-100" title="Novo Status"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg></button>
           </div>
        </div>
        <div className="flex flex-col gap-1.5 border-l-2 border-blue-50 pl-3">
           {(t.statusHistory || [])
             .slice()
             // ORDENAÇÃO POR REGISTRO REAL (createdAt)
             .sort((a,b) => new Date(b.createdAt || b.dateTime).getTime() - new Date(a.createdAt || a.dateTime).getTime())
             .slice(0, 3)
             .map((step, idx) => (
             <div key={idx} className={`flex flex-col p-1.5 rounded-lg border ${getStatusStyle(step.status, idx === 0)}`}>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[7.5px] font-black uppercase truncate">{step.status}</span>
                  <span className={`font-mono text-[7px] font-bold ${idx === 0 ? 'text-white/70' : 'text-slate-300'}`}>{new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
             </div>
           ))}
           {(t.statusHistory?.length || 0) > 3 && (
             <button onClick={() => onOpenHistoryManager(t)} className="text-[7px] font-black text-blue-500 uppercase tracking-widest text-left hover:underline">+ Ver Histórico Completo</button>
           )}
        </div>
      </div>
    )
  },
  { 
    key: 'driver', 
    label: '3. Motorista', 
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5 max-w-[200px] whitespace-normal">
        <div className="flex items-center justify-between">
           <span className="font-black text-slate-800 uppercase text-[10px] leading-tight">{t.driver?.name}</span>
           <button 
             onClick={() => onLocateDriver(t.driver.id)}
             className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
             title="Localizar Motorista"
           >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="3"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="3"/></svg>
           </button>
        </div>
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
        <div className="flex items-center gap-2"><span className="font-black text-slate-800 text-[11px]">{t.container || '---'}</span>{(t as any).genset && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">Genset</span>}</div>
        <p className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg w-fit">{t.containerType || (t.ocFormData?.tipo) || '---'}</p>
        <div className="flex gap-2 mt-1"><span className="text-[8px] font-bold text-slate-400">T: {t.tara || '---'}</span><span className="text-[8px] font-bold text-slate-400">L: {t.seal || '---'}</span></div>
      </div>
    )
  },
  {
    key: 'cva',
    label: '5. CVA',
    render: (t: Trip) => (
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100 w-fit shadow-sm">
          {t.cva || '---'}
        </span>
      </div>
    )
  },
  { 
    key: 'customer', 
    label: '6. Cliente', 
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5 max-w-[250px] whitespace-normal">
        <p className="font-black text-blue-600 uppercase text-[11px] leading-tight">{t.customer?.name}</p>
        {t.customer?.legalName && t.customer.legalName !== t.customer.name && (
          <p className="text-[8px] font-bold text-slate-400 uppercase italic leading-tight">RS: {t.customer.legalName}</p>
        )}
        <div className="flex flex-col mt-1 border-t border-slate-50 pt-1">
           <span className="text-[8px] font-black text-slate-500">CNPJ: {t.customer?.cnpj || '---'}</span>
           <span className="text-[8px] font-bold text-slate-400">{t.customer?.city} - {t.customer?.state}</span>
        </div>
      </div>
    )
  },
  { key: 'destination_ship_booking', label: '7. Destino / Navio / Booking', render: (t: Trip) => (<div className="flex flex-col space-y-2 max-w-[220px] whitespace-normal"><div className="flex flex-col space-y-0.5"><p className="font-black text-slate-700 uppercase text-[10px] leading-tight">{t.destination?.legalName || t.destination?.name || '---'}</p>{t.destination && (<span className="text-[8px] font-bold text-slate-400 uppercase">{t.destination.city} - {t.destination.state}</span>)}</div><div className="flex flex-col pt-1.5 border-t border-slate-100 gap-1.5"><div className="flex flex-col"><span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter leading-none">Navio:</span><span className="font-black text-slate-800 text-[9px] uppercase truncate">{t.ship || '---'}</span></div><div className="flex flex-col"><span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter leading-none">Booking:</span><span className="text-blue-600 font-bold text-[9px] uppercase truncate">{t.booking || '---'}</span></div></div></div>)},
  { key: 'scheduling_info', label: '8. Agendamento', render: (t: Trip) => { const sch = t.scheduling; if (!sch) return (<button onClick={() => onEditScheduling(t)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-dashed border-slate-300"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg><span className="text-[8px] font-black uppercase">Agendar</span></button>); const schDate = new Date(sch.dateTime); return (<div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 min-w-[180px] group relative"><div className="flex justify-between items-start mb-2"><div className="flex flex-col" onClick={() => t.agendamentoDoc && onViewDoc(t.agendamentoDoc.url, t.agendamentoDoc.fileName)}><span className="text-[9px] font-black text-emerald-700 uppercase leading-none">{schDate.toLocaleDateString('pt-BR')}</span><span className="text-[11px] font-black text-slate-800 mt-0.5">{schDate.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span></div><div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => onEditScheduling(t)} className="p-1.5 bg-white text-blue-600 rounded-lg shadow-sm border border-blue-100"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button></div></div><div className="border-t border-emerald-100/50 pt-2"><p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Terminal:</p><p className="text-[9px] font-bold text-slate-600 uppercase leading-tight truncate">{sch.location}</p></div><DocumentBlockForTable trip={t} type="AGENDAMENTO" label="PDF" /></div>); } },
  { 
    key: 'actions', 
    label: '9. Opções', 
    render: (t: Trip) => (
      <ActionMenu 
        trip={t}
        onEditTrip={onEditTrip}
        onEditOC={onEditOC}
        onEditMinuta={onEditMinuta}
        onDeleteTrip={onDeleteTrip}
        onViewDriverDocs={onViewDriverDocs}
        handleFileUpload={handleFileUpload}
        deleteDocument={deleteDocument}
        onViewDoc={onViewDoc}
        handlePrint={handlePrint}
      />
    ) 
  }
]};
