
import React from 'react';
import { Trip, TripStatus, TripDocument, User, DriverCapturedDoc, Driver, Category } from '../../../types';
import { db } from '../../../utils/storage';
import { fileStorage } from '../../../utils/fileStorage';
import FinanceAction from './FinanceAction';

// Componentes de coluna modulares
import { DriverColumn } from './columns/DriverColumn';
import { EquipmentColumn } from './columns/EquipmentColumn';
import { ShipBookingColumn } from './columns/ShipBookingColumn';
import { CustomerColumn } from './columns/CustomerColumn';
import { DestinationColumn } from './columns/DestinationColumn';
import { StatusColumn } from './columns/StatusColumn';
import { ActionsColumn } from './columns/ActionsColumn';

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
  onSetPriority: any,
  allDrivers: Driver[] = [],
  categories: Category[] = []
) => {
  
  const handleFileUpload = async (trip: Trip, type: 'OS_PDF' | 'AGENDAMENTO' | 'CTE' | 'CVA' | 'COMPLETO' | 'BATCH', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const updatedTrip = { ...trip };
    const filesArray = Array.from(files) as File[];

    try {
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
    } catch (err) {
      console.error("Falha no upload de documento:", err);
      alert("Falha ao subir arquivo para o R2.");
    }
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
      label: '1. Programação / Tipo', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <div className="flex flex-col gap-0.5">
            <span className="font-black text-slate-800 text-[11px] leading-tight">{new Date(t.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
            <span className="font-black text-blue-600 text-[11px] leading-tight">{new Date(t.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
          <div className="flex flex-col gap-1">
             {(() => {
               const cat = categories.find(c => c.name.toUpperCase() === t.category?.toUpperCase());
               const color = cat?.color || '#3b82f6';
               return (
                 <span 
                   className="px-2 py-0.5 rounded text-[8px] font-black uppercase border shadow-sm w-fit text-white"
                   style={{ backgroundColor: color, borderColor: color }}
                 >
                   {t.category}
                 </span>
               );
             })()}
          </div>
        </div>
      )
    },
    { 
      key: 'os_status', 
      label: '2. OS / Status HD', 
      render: (t: Trip) => StatusColumn(t, openStatusEditor, onOpenHistoryManager)
    },
    { 
      key: 'driver', 
      label: '3. Motorista / Identificação', 
      render: (t: Trip) => DriverColumn(t, onLocateDriver, allDrivers)
    },
    {
      key: 'equipment',
      label: '4. Container / Equipamento',
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
        <FinanceAction trip={t} user={actingUser} onRefresh={onRefreshData} />
      )
    },
    { 
      key: 'actions', 
      label: '9. Opções', 
      render: (t: Trip) => (
        <ActionsColumn 
          trip={t}
          actingUser={actingUser}
          onEditTrip={onEditTrip}
          onEditOC={onEditOC}
          onEditMinuta={onEditMinuta}
          onViewDoc={onViewDoc}
          onDeleteTrip={onDeleteTrip}
          onViewDriverDocs={onViewDriverDocs}
          handleFileUpload={handleFileUpload}
          deleteDocument={deleteDocument}
          handlePrint={handlePrint}
          onSetPriority={onSetPriority}
        />
      ) 
    }
  ];
};
