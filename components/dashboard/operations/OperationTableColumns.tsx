
import React from 'react';
import { Trip, TripStatus } from '../../../types';

export const getOperationTableColumns = (
  openStatusEditor: (t: Trip, s: TripStatus) => void,
  onEditTrip: (t: Trip) => void,
  onEditOC: (t: Trip) => void,
  onEditMinuta: (t: Trip) => void,
  onDownloadMinuta: (t: Trip) => void,
  onDeleteTrip: (id: string) => void
) => [
  { 
    key: 'dateTime', 
    label: '1. Prog. / Operação', 
    render: (t: Trip) => (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col">
          <span className="font-black text-slate-800">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
          <span className="text-blue-600 font-bold">{new Date(t.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
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
    )
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
    key: 'customer',
    label: '3. Cliente / Local',
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5 max-w-[250px] whitespace-normal break-words">
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
    label: '4. CVA',
    render: (t: Trip) => (
      <div className="flex items-center justify-center">
        {t.cva ? (
          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full text-[9px] font-black">{t.cva}</span>
        ) : (
          <span className="text-slate-300 italic text-[8px]">---</span>
        )}
      </div>
    )
  },
  {
    key: 'equipment',
    label: '5. Equipamento',
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
    key: 'driver', 
    label: '6. Motorista', 
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
    key: 'destination',
    label: '7. Destino',
    render: (t: Trip) => (
      <div className="flex flex-col space-y-0.5 max-w-[180px] whitespace-normal break-words">
        {t.destination ? (
          <>
            <p className="font-black text-slate-700 uppercase text-[10px] leading-tight">
              {t.destination.legalName || t.destination.name}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase italic">FAN: {t.destination.name}</p>
            <div className="flex flex-col mt-1 border-t border-slate-50 pt-1">
               <p className="text-[8px] font-black text-blue-600">CNPJ: {t.destination.cnpj || '---'}</p>
               <p className="text-[8px] font-black text-emerald-600 uppercase">{t.destination.city} - {t.destination.state}</p>
            </div>
          </>
        ) : (
          <span className="text-slate-300 italic text-[8px]">Não definido</span>
        )}
      </div>
    )
  },
  {
    key: 'booking_navio',
    label: '8. Booking / Navio',
    render: (t: Trip) => (
      <div className="flex flex-col whitespace-normal break-words max-w-[120px]">
        <span className="text-[10px] font-black text-blue-800">{t.booking || '---'}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{t.ship || '---'}</span>
      </div>
    )
  },
  {
    key: 'actions',
    label: '9. Opções',
    render: (t: Trip) => (
      <div className="flex flex-col gap-2 min-w-[120px]">
        {/* EDITAR DADOS GERAIS */}
        <button 
          onClick={() => onEditTrip(t)} 
          className="w-full flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          <span className="text-[8px] font-black uppercase">Editar Viagem</span>
        </button>

        {/* OC: EDITAR */}
        {t.ocFormData && (
          <button 
            onClick={() => onEditOC(t)} 
            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span className="text-[8px] font-black uppercase">Editar OC</span>
          </button>
        )}

        {/* MINUTA */}
        <div className="grid grid-cols-2 gap-1">
           <button onClick={() => onDownloadMinuta(t)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
              <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
           </button>
           <button onClick={() => onEditMinuta(t)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
              <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
           </button>
        </div>

        {/* EXCLUIR */}
        <button 
          onClick={() => onDeleteTrip(t.id)} 
          className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
          <span className="text-[8px] font-black uppercase">Remover</span>
        </button>
      </div>
    )
  }
];
