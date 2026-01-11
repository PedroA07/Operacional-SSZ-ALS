
import React from 'react';
import { Trip, TripStatus, TripDocument, User, DriverCapturedDoc } from '../../../types';
import { db } from '../../../utils/storage';
import { fileStorage } from '../../../utils/fileStorage';
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
    return isLatest ? 'bg-blue-600 text-white' : 'bg-white text-slate-400';
  };

  return [
    { 
      key: 'dateTime', 
      label: '1. Prog. / Operação', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-1">
          <span className="font-black text-slate-800 text-[10px]">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
          <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase w-fit ${t.type === 'EXPORTAÇÃO' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{t.type}</span>
          <span className="text-[7px] font-black text-blue-800 uppercase bg-blue-50 px-1 py-0.5 rounded border border-blue-100 w-fit">{t.category}</span>
        </div>
      )
    },
    { 
      key: 'os_status', 
      label: '2. OS / Status', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-1.5 min-w-[180px]">
           <p className="text-xs font-black text-blue-700">OS: {t.os}</p>
           <div className="flex flex-col gap-1">
              {(t.statusHistory || []).slice(0, 2).map((step, idx) => (
                <div 
                  key={idx} 
                  onClick={(e) => {
                    e.stopPropagation();
                    openStatusEditor(t, step.status);
                  }}
                  className={`px-2 py-1 rounded text-[7.5px] font-black uppercase border cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 ${getStatusStyle(step.status, idx === 0)}`}
                  title="Clique para atualizar status"
                >
                  {step.status} - {new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                </div>
              ))}
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenHistoryManager(t); }}
                className="text-[7px] font-black text-slate-300 uppercase hover:text-blue-500 text-left pl-1 mt-0.5"
              >
                + Ver Histórico Completo
              </button>
           </div>
        </div>
      )
    },
    { 
      key: 'driver', 
      label: '3. Motorista', 
      render: (t: Trip) => (
        <div className="flex flex-col">
           <span className="font-black text-slate-800 uppercase text-[10px]">{t.driver?.name}</span>
           <div className="flex items-center gap-2 mt-1">
              <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase w-fit">{t.driver?.plateHorse}</span>
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
      label: '4. Equipamento',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 text-[10px]">{t.container || 'A DEFINIR'}</span>
          <span className="text-[8px] font-bold text-slate-400 mt-1">{t.containerType || '40HC'}</span>
        </div>
      )
    },
    { 
      key: 'customer', 
      label: '6. Cliente', 
      render: (t: Trip) => (
        <div className="max-w-[150px] truncate">
          <p className="font-black text-blue-600 uppercase text-[10px]">{t.customer?.name}</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase">{t.customer?.city}</p>
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
