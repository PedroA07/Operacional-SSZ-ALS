
import React from 'react';
import { Trip, TripStatus, TripDocument, User, DriverCapturedDoc } from '../../../types';
import { db } from '../../../utils/storage';
import { fileStorage } from '../../../utils/fileStorage';
import { maskCNPJ } from '../../../utils/masks';
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
    const filesArray = Array.from(files) as File[];

    if (type === 'BATCH') {
      const newDocs: DriverCapturedDoc[] = [];
      for (const file of filesArray) {
        const photoId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const url = await fileStorage.uploadTripPhoto(file, trip.os, photoId);
        newDocs.push({ id: photoId, url, timestamp: new Date().toISOString() });
      }
      updatedTrip.driver_docs = [...(updatedTrip.driver_docs || []), ...newDocs];
    } else {
      const file = filesArray[0];
      const docTypeLabel = type.replace('_PDF', '').toLowerCase();
      const url = await fileStorage.uploadTripDoc(file, trip.os, docTypeLabel);
      
      const doc: TripDocument = { 
        id: `${docTypeLabel}-${Date.now()}`, 
        type: type as any, 
        url: url, 
        fileName: `${docTypeLabel.toUpperCase()} - ${trip.os}`, 
        uploadDate: new Date().toISOString() 
      };

      if (type === 'OS_PDF') updatedTrip.osDoc = doc;
      else if (type === 'AGENDAMENTO') updatedTrip.agendamentoDoc = doc;
      else if (type === 'CTE') updatedTrip.cteDoc = doc;
      else if (type === 'CVA') updatedTrip.cvaDoc = doc;
      else if (type === 'COMPLETO') updatedTrip.completoDoc = doc;
    }
    
    await db.saveTrip(updatedTrip, actingUser);
    onRefreshData();
  };

  const deleteDocument = async (trip: Trip, type: 'OS_PDF' | 'AGENDAMENTO' | 'CTE' | 'CVA' | 'COMPLETO') => {
    if (!confirm(`Remover anexo selecionado?`)) return;
    const updatedTrip = { ...trip };
    if (type === 'OS_PDF') updatedTrip.osDoc = undefined;
    else if (type === 'AGENDAMENTO') updatedTrip.agendamentoDoc = undefined;
    else if (type === 'CTE') updatedTrip.cteDoc = undefined;
    else if (type === 'CVA') updatedTrip.cvaDoc = undefined;
    else if (type === 'COMPLETO') updatedTrip.completoDoc = undefined;
    await db.saveTrip(updatedTrip, actingUser);
    onRefreshData();
  };

  const handlePrint = (url: string, fileName: string) => {
    window.open(url, '_blank')?.print();
  };

  const getStatusStyle = (status: TripStatus, isLatest: boolean) => {
    if (status === 'Viagem concluída') return isLatest ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600';
    if (status === 'Viagem cancelada') return isLatest ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600';
    return isLatest ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-50' : 'bg-white text-slate-400 border-slate-100';
  };

  return [
    { 
      key: 'dateTime', 
      label: '1. Prog. / Hora', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-slate-800 text-[10px]">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
            <span className="font-black text-blue-600 text-[10px] bg-blue-50 px-1 rounded">{new Date(t.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase w-fit ${t.type === 'EXPORTAÇÃO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{t.type}</span>
          <span className="text-[7px] font-black text-blue-800 uppercase bg-blue-50 px-1 py-0.5 rounded border border-blue-100 w-fit">{t.category}</span>
        </div>
      )
    },
    { 
      key: 'os_status', 
      label: '2. OS / Status Histórico', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-1.5 min-w-[200px]">
           <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-blue-700 tracking-tighter">OS: {t.os}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); openStatusEditor(t, t.status); }}
                className="w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-all shadow-sm active:scale-90"
                title="Adicionar Novo Status"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              </button>
           </div>
           
           {/* LISTA DE STATUS COM SCROLL INTERNO PARA MOSTRAR TODOS */}
           <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
              {(t.statusHistory || []).map((step, idx) => (
                <div 
                  key={idx} 
                  onClick={(e) => {
                    e.stopPropagation();
                    openStatusEditor(t, step.status);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[7.5px] font-black uppercase border cursor-pointer hover:scale-[1.01] transition-transform active:scale-95 flex justify-between items-center ${getStatusStyle(step.status, idx === 0)}`}
                  title="Clique para editar este registro"
                >
                  <span className="truncate pr-2">{step.status}</span>
                  <span className="opacity-60 font-mono">{new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
              ))}
           </div>

           <button 
             onClick={(e) => { e.stopPropagation(); onOpenHistoryManager(t); }}
             className="text-[7px] font-black text-slate-300 uppercase hover:text-blue-500 text-left pl-1 mt-0.5 flex items-center gap-1"
           >
             <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             Gerenciar Histórico Completo
           </button>
        </div>
      )
    },
    { 
      key: 'driver', 
      label: '3. Motorista / Placas', 
      render: (t: Trip) => (
        <div className="flex flex-col">
           <span className="font-black text-slate-800 uppercase text-[10px] truncate max-w-[120px]">{t.driver?.name}</span>
           <div className="flex items-center gap-1.5 mt-1.5">
              <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0">{t.driver?.plateHorse}</span>
              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase shrink-0 border border-slate-200">{t.driver?.plateTrailer}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onLocateDriver(t.driver.id); }}
                className="p-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                title="Localizar Motorista (GPS)"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </button>
           </div>
        </div>
      )
    },
    {
      key: 'equipment',
      label: '4. Equipamento / Lacre',
      render: (t: Trip) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-800 text-[10px] font-mono">{t.container || 'A DEFINIR'}</span>
            <span className="px-1.5 bg-blue-50 text-blue-600 rounded text-[7px] font-black border border-blue-100">{t.containerType || '40HC'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[7.5px] font-black text-slate-400 uppercase leading-none">L: <span className="text-slate-600">{t.seal || '---'}</span></span>
            <span className="text-[7.5px] font-black text-slate-400 uppercase leading-none mt-0.5">T: <span className="text-slate-600">{t.tara || '---'}</span></span>
          </div>
        </div>
      )
    },
    {
      key: 'ship_booking',
      label: '5. Navio / Booking',
      render: (t: Trip) => (
        <div className="flex flex-col gap-1 max-w-[130px]">
           <p className="text-[9px] font-black text-slate-700 uppercase truncate leading-none" title={t.ship}>{t.ship || 'A DEFINIR'}</p>
           <p className="text-[9px] font-black text-blue-600 truncate" title={t.booking}>{t.booking || '---'}</p>
        </div>
      )
    },
    { 
      key: 'customer', 
      label: '6. Cliente / Origem', 
      render: (t: Trip) => (
        <div className="max-w-[150px] space-y-0.5">
          <p className="font-black text-slate-800 uppercase text-[10px] truncate leading-tight">{t.customer?.name}</p>
          <p className="text-[7px] font-bold text-slate-400 uppercase leading-none">{t.customer?.city} - {t.customer?.state}</p>
          <p className="text-[7px] font-mono font-bold text-blue-400/70">{t.customer?.cnpj ? maskCNPJ(t.customer.cnpj).slice(-10) : ''}</p>
        </div>
      )
    },
    {
      key: 'destination_sch',
      label: '7. Destino / Agend.',
      render: (t: Trip) => (
        <div className="flex flex-col gap-1 max-w-[140px]">
           <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <p className="text-[9px] font-black text-slate-700 uppercase truncate leading-none">{t.destination?.name || 'A DEFINIR'}</p>
           </div>
           {t.scheduling ? (
             <div className="bg-emerald-50 p-1 rounded border border-emerald-100/50">
                <p className="text-[7.5px] font-black text-emerald-700 uppercase leading-none">
                  {new Date(t.scheduling.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} 
                  {t.scheduling.obs && <span className="ml-1 text-emerald-500">[{t.scheduling.obs.slice(0,10)}...]</span>}
                </p>
             </div>
           ) : (
             <button 
               onClick={(e) => { e.stopPropagation(); onEditScheduling(t); }}
               className="text-[7px] font-black text-blue-500 uppercase hover:underline text-left"
             >
               + Agendar Terminal
             </button>
           )}
        </div>
      )
    },
    {
      key: 'finance',
      label: '8. Financeiro / Docs',
      render: (t: Trip) => (
        <div className="flex flex-col gap-1.5">
           <div className="flex items-center gap-2">
              <span className="text-[7px] font-black text-slate-400 uppercase w-4">70%</span>
              <div className={`w-2 h-2 rounded-full ${t.advancePayment?.status === 'PAGO' ? 'bg-emerald-500' : t.advancePayment?.status === 'LIBERAR' ? 'bg-blue-500' : 'bg-slate-200'}`} title={`Adiantamento: ${t.advancePayment?.status}`}></div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[7px] font-black text-slate-400 uppercase w-4">30%</span>
              <div className={`w-2 h-2 rounded-full ${t.balancePayment?.status === 'PAGO' ? 'bg-emerald-500' : t.balancePayment?.status === 'LIBERAR' ? 'bg-blue-500' : 'bg-slate-200'}`} title={`Saldo: ${t.balancePayment?.status}`}></div>
           </div>
        </div>
      )
    },
    { 
      key: 'actions', 
      label: '9. Opções', 
      render: (t: Trip) => (
        <div onClick={(e) => e.stopPropagation()}>
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
        </div>
      ) 
    }
  ];
};
