
import React from 'react';
import { Trip, TripStatus } from '../../../types';

export const getOperationTableColumns = (openStatusEditor: (t: Trip, s: TripStatus) => void) => [
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
  }
];
