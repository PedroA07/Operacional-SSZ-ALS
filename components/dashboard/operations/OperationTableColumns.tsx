
import React from 'react';
import { Trip, TripStatus, TripDocument, User, DriverCapturedDoc, Driver, Category } from '../../../types';
import { db } from '../../../utils/storage';
import { fileStorage } from '../../../utils/fileStorage';
import FinanceAction from './FinanceAction';

// Componentes de coluna modulares
import { DriverColumn } from './columns/DriverColumn';
import { EquipmentColumn } from './columns/EquipmentColumn';
import { makeShipBookingColumn } from './columns/ShipBookingColumn';
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
  categories: Category[] = [],
  operationTypes: any[] = [],
  getGateTag?: (ship: string) => React.ReactNode
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
      width: 110,
      render: (t: Trip) => {
        const cat = categories.find(c => c.name.toUpperCase() === t.category?.toUpperCase());
        const catColor = cat?.color || '#3b82f6';
        const opType = operationTypes.find((ot: any) => ot.name?.toUpperCase() === t.type?.toUpperCase());
        const typeColor = opType?.color;
        const d = new Date(t.dateTime);
        return (
          <div className="flex flex-col gap-1.5 w-[106px]">
            {/* Data e hora */}
            <div className="flex flex-col gap-0.5">
              <span className="font-black text-slate-800 text-[13px] leading-none">
                {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
              <span className="font-black text-blue-600 text-[12px] leading-none">
                {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {/* Badges compactos */}
            <div className="flex flex-col gap-0.5">
              {t.category && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase border w-fit text-white leading-tight"
                  style={{ backgroundColor: catColor, borderColor: catColor }}
                >
                  {t.category}
                </span>
              )}
              {t.type && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase border w-fit leading-tight"
                  style={typeColor ? { backgroundColor: `${typeColor}22`, color: typeColor, borderColor: `${typeColor}55` } : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}
                >
                  {t.type}
                </span>
              )}
            </div>
          </div>
        );
      }
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
      render: makeShipBookingColumn(getGateTag)
    },
    { 
      key: 'customer', 
      label: '6. Cliente / Origem', 
      render: CustomerColumn
    },
    {
      key: 'is_scheduled',
      label: '7. Agendamento',
      render: (t: Trip) => (
        <div className="flex flex-col items-center justify-center gap-1.5 min-w-[100px]">
          <div className={`w-8 h-8 rounded-2xl flex items-center justify-center shadow-sm transition-all ${t.isScheduled ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
            {t.isScheduled ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
            )}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${t.isScheduled ? 'text-emerald-600' : 'text-slate-400'}`}>
            {t.isScheduled ? 'Agendado' : 'Pendente'}
          </span>
        </div>
      )
    },
    {
      key: 'destination_sch',
      label: '8. Destino',
      render: (t: Trip) => DestinationColumn(t, onEditScheduling)
    },
    {
      key: 'finance',
      label: '9. Financeiro',
      render: (t: Trip) => (
        <FinanceAction trip={t} user={actingUser} onRefresh={onRefreshData} />
      )
    },
    { 
      key: 'category_only', 
      label: 'Categoria', 
      render: (t: Trip) => {
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
      }
    },
    {
      key: 'type_only',
      label: 'Modalidade',
      render: (t: Trip) => {
        const opType = operationTypes.find((ot: any) => ot.name?.toUpperCase() === t.type?.toUpperCase());
        const typeColor = opType?.color;
        return (
          <span
            className="px-2 py-0.5 rounded text-[8px] font-black uppercase border shadow-sm w-fit"
            style={typeColor ? { backgroundColor: `${typeColor}25`, color: typeColor, borderColor: `${typeColor}60` } : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}
          >
            {t.type}
          </span>
        );
      }
    },
    {
      key: 'os_only',
      label: 'OS',
      render: (t: Trip) => (
        <span className="text-[11px] font-black text-blue-700 uppercase">OS: {t.os}</span>
      )
    },
    {
      key: 'status_only',
      label: 'Status',
      render: (t: Trip) => {
        const latestStatus = t.statusHistory?.[t.statusHistory.length - 1]?.status || t.status;
        const cls =
          latestStatus === 'Viagem concluída' || t.isCompleted ? 'bg-emerald-600 text-white border-emerald-700' :
          latestStatus === 'Reutilização'   ? 'bg-emerald-700 text-white border-emerald-800' :
          latestStatus === 'Cancelado'      ? 'bg-red-600 text-white border-red-700' :
          latestStatus === 'Frete Morto'    ? 'bg-amber-500 text-white border-amber-600' :
          latestStatus === 'Viagem cancelada' ? 'bg-red-100 text-red-700 border-red-200' :
          'bg-blue-50 text-blue-600 border-blue-100';
        return (
          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${cls}`}>
            {latestStatus}
          </span>
        );
      }
    },
    {
      key: 'is_scheduled_only',
      label: 'Agendado',
      render: (t: Trip) => {
        const isScheduled = t.isScheduled || !!t.scheduledLocationId;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isScheduled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}></div>
            <span className={`text-[10px] font-black uppercase ${isScheduled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {isScheduled ? 'SIM' : 'NÃO'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'ship_only',
      label: 'Navio',
      render: (t: Trip) => (
        <span className="text-[10px] font-black text-slate-700 uppercase">{t.ship || '---'}</span>
      )
    },
    {
      key: 'booking_only',
      label: 'Booking',
      render: (t: Trip) => (
        <span className="text-[10px] font-black text-blue-600 font-mono uppercase">{t.booking || '---'}</span>
      )
    },
    { 
      key: 'actions', 
      label: '10. Opções', 
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
