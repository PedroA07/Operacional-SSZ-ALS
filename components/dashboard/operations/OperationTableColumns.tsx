
import React from 'react';
import { Trip, TripStatus, TripDocument, User, DriverCapturedDoc, Driver } from '../../../types';
import { db } from '../../../utils/storage';
import { fileStorage } from '../../../utils/fileStorage';
import { imageCompressor } from '../../../utils/imageCompressor';
import ActionMenu from './ActionMenu';

// Novos componentes de coluna modulares
import { DriverColumn } from './columns/DriverColumn';
import { EquipmentColumn } from './columns/EquipmentColumn';
import { ShipBookingColumn } from './columns/ShipBookingColumn';
import { CustomerColumn } from './columns/CustomerColumn';
import { DestinationColumn } from './columns/DestinationColumn';
import { StatusColumn } from './columns/StatusColumn';

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
  onOpenHistoryManager: (t: Trip) => void,
  allDrivers: Driver[] = []
) => {
  
  const handleFileUpload = async (trip: Trip, type: 'OS_PDF' | 'AGENDAMENTO' | 'CTE' | 'CVA' | 'COMPLETO' | 'BATCH', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const updatedTrip = { ...trip };
    const filesArray = Array.from(files) as File[];

    if (type === 'BATCH') {
      const newDocs: DriverCapturedDoc[] = [];
      for (const file of filesArray) {
        let fileToUpload: File | string = file;
        
        // Se for imagem, reduz a qualidade antes do upload
        if (file.type.startsWith('image/')) {
          fileToUpload = await imageCompressor.compress(file, {
            maxWidth: 800,
            quality: 0.4
          });
        }

        const photoId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const url = await fileStorage.uploadTripPhoto(fileToUpload, trip.os, photoId);
        newDocs.push({ id: photoId, url, timestamp: new Date().toISOString() });
      }
      updatedTrip.driver_docs = [...(updatedTrip.driver_docs || []), ...newDocs];
    } else {
      const file = filesArray[0];
      let fileToUpload: File | string = file;

      // Compressão para anexos individuais de imagem (ex: foto de CVA)
      if (file.type.startsWith('image/')) {
        fileToUpload = await imageCompressor.compress(file, {
          maxWidth: 800,
          quality: 0.4
        });
      }

      const docTypeLabel = type.replace('_PDF', '').toLowerCase();
      const url = await fileStorage.uploadTripDoc(fileToUpload, trip.os, docTypeLabel);
      
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

  return [
    { 
      key: 'dateTime', 
      label: '1. Prog.', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5 min-w-[70px]">
          <span className="font-black text-slate-800 text-[10px] leading-tight">{new Date(t.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
          <span className="font-black text-blue-600 text-[10px] leading-tight">{new Date(t.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
          <span className="text-[6.5px] font-black text-blue-800 uppercase bg-blue-50 px-1 rounded border border-blue-100 w-fit mt-0.5">{t.category?.substring(0, 8)}</span>
        </div>
      )
    },
    { 
      key: 'os_status', 
      label: '2. OS / Status', 
      render: (t: Trip) => StatusColumn(t, openStatusEditor, onOpenHistoryManager)
    },
    { 
      key: 'driver', 
      label: '3. Motorista / Identificação', 
      render: (t: Trip) => DriverColumn(t, onLocateDriver, allDrivers)
    },
    {
      key: 'equipment',
      label: '4. Detalhes Equipamento',
      render: EquipmentColumn
    },
    {
      key: 'ship_booking',
      label: '5. Navio / Booking',
      render: ShipBookingColumn
    },
    { 
      key: 'customer', 
      label: '6. Cliente / Origem', 
      render: CustomerColumn
    },
    {
      key: 'destination_sch',
      label: '7. Destino / Agendamento',
      render: (t: Trip) => DestinationColumn(t, onEditScheduling)
    },
    {
      key: 'finance',
      label: '8. Financeiro',
      render: (t: Trip) => (
        <div className="flex flex-col gap-2 min-w-[80px]">
           <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-slate-400 uppercase w-6">70%</span>
              <div className={`w-2.5 h-2.5 rounded-full ${t.advancePayment?.status === 'PAGO' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : t.advancePayment?.status === 'LIBERAR' ? 'bg-blue-500' : 'bg-slate-200'}`} title={`Adiantamento: ${t.advancePayment?.status}`}></div>
           </div>
           <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-slate-400 uppercase w-6">30%</span>
              <div className={`w-2.5 h-2.5 rounded-full ${t.balancePayment?.status === 'PAGO' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : t.balancePayment?.status === 'LIBERAR' ? 'bg-blue-500' : 'bg-slate-200'}`} title={`Saldo: ${t.balancePayment?.status}`}></div>
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
