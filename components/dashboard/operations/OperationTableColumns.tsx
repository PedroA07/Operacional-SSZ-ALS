
import React from 'react';
import { Trip, TripStatus } from '../../../types';

export const getOperationTableColumns = (
  openStatusEditor: (t: Trip, s: TripStatus) => void,
  onEditTrip: (t: Trip) => void,
  onEditOC: (t: Trip) => void,
  onDeleteTrip: (id: string) => void
) => [
  { 
    key: 'dateTime', 
    label: '1. Programação', 
    render: (t: Trip) => (
      <div className="flex flex-col">
        <span className="font-black text-slate-800">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
        <span className="text-blue-600 font-bold">{new Date(t.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    )
  },
  { 
    key: 'type', 
    label: '2. Operação', 
    render: (t: Trip) => (
      <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
        t.type === 'EXPORTAÇÃO' ? 'bg-blue-100 text-blue-700' : 
        t.type === 'IMPORTAÇÃO' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
      }`}>
        {t.type}
      </span>
    )
  },
  { 
    key: 'os_status', 
    label: '3. OS / Status', 
    render: (t: Trip) => (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-black text-blue-700 tracking-tight">OS: {t.os}</p>
        <div className="flex items-center gap-2">
           <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[8px] font-black uppercase">{t.status}</span>
           <button onClick={() => openStatusEditor(t, t.status)} className="p-1 hover:text-blue-500 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2.5"/></svg>
           </button>
        </div>
      </div>
    )
  },
  {
    key: 'customer',
    label: '4. Cliente / Local',
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5 max-w-[200px]">
        <p className="font-black text-slate-800 uppercase text-[10px] leading-tight">
          {t.customer?.legalName || 'S.R'}
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
    key: 'cva',
    label: '5. CVA',
    render: (t: Trip) => (
      <div className="flex items-center justify-center">
        {t.cva ? (
          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full text-[9px] font-black">{t.cva}</span>
        ) : (
          <span className="text-slate-300 italic text-[8px]">Não inf.</span>
        )}
      </div>
    )
  },
  {
    key: 'equipment',
    label: '6. Equipamento',
    render: (t: Trip) => (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center gap-2">
           <span className="font-black text-slate-800 text-[11px]">{t.container || '---'}</span>
           {(t as any).genset && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">Genset</span>}
        </div>
        <p className="text-[8px] font-black text-blue-600 uppercase italic">{t.type} - {t.tara || '---'}</p>
        <div className="flex gap-2">
           <span className="text-[8px] font-bold text-slate-400">LACRE: {t.seal || '---'}</span>
        </div>
      </div>
    )
  },
  { 
    key: 'driver', 
    label: '7. Motorista', 
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5">
        <span className="font-black text-slate-800 uppercase text-[10px] truncate max-w-[150px]">{t.driver?.name}</span>
        <span className="text-[8px] font-bold text-slate-400">CPF: {t.driver?.cpf}</span>
        <div className="mt-1 space-y-0.5">
           <p className="text-[8px] font-black uppercase text-blue-600">Cavalo: <span className="font-mono">{t.driver?.plateHorse}</span></p>
           <p className="text-[8px] font-black uppercase text-slate-500">Carreta: <span className="font-mono">{t.driver?.plateTrailer}</span></p>
        </div>
      </div>
    )
  },
  {
    key: 'destination',
    label: '8. Destino',
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5 max-w-[180px]">
        {t.destination ? (
          <>
            <p className="font-black text-slate-700 uppercase text-[10px] leading-tight truncate">
              {t.destination.legalName || t.destination.name}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase italic truncate">FAN: {t.destination.name}</p>
            <p className="text-[8px] font-black text-emerald-600 uppercase mt-1">{t.destination.city} - {t.destination.state}</p>
          </>
        ) : (
          <span className="text-slate-300 italic text-[8px]">Não definido</span>
        )}
      </div>
    )
  },
  {
    key: 'booking_navio',
    label: '9. Booking / Navio',
    render: (t: Trip) => (
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-blue-800">{t.booking || '---'}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{t.ship || '---'}</span>
      </div>
    )
  },
  {
    key: 'actions',
    label: '10. Opções',
    render: (t: Trip) => (
      <div className="flex items-center gap-1.5">
        {/* EDITAR PROGRAMAÇÃO */}
        <button 
          onClick={() => onEditTrip(t)} 
          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group relative"
          title="Editar Programação"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </button>

        {/* EDITAR OC (APENAS SE HOUVER ocFormData) */}
        {t.ocFormData && (
          <button 
            onClick={() => onEditOC(t)} 
            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm group relative"
            title="Editar Ordem de Coleta"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </button>
        )}

        {/* EXCLUIR */}
        <button 
          onClick={() => onDeleteTrip(t.id)} 
          className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm group relative"
          title="Excluir Programação"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    )
  }
];
