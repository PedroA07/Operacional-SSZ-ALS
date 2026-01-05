
import React, { useState } from 'react';
import { Trip, TripDocument } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import { maskCNPJ, maskCPF } from '../../../utils/masks';

interface Props {
  trips: Trip[];
  onUpdate: (trip: Trip) => void;
  userId: string;
}

const BalanceSubTab: React.FC<Props> = ({ trips, onUpdate, userId }) => {
  const [showLiberated, setShowLiberated] = useState(false);

  const handleFileUpload = (trip: Trip, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const doc: TripDocument = { id: `doc-${Date.now()}`, type: 'COMPLETO', url: reader.result as string, fileName: file.name, uploadDate: new Date().toISOString() };
      onUpdate({ ...trip, completoDoc: doc });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleLiberation = (t: Trip, isChecked: boolean) => {
    if (isChecked) {
      onUpdate({ ...t, balancePayment: { status: 'LIBERAR', liberatedAt: new Date().toISOString() } });
    } else {
      if (confirm("Deseja ESTORNAR a liberação deste saldo? A OS voltará para a fila de Documentação.")) {
        onUpdate({ ...t, balancePayment: { status: 'AGUARDANDO_DOCS', liberatedAt: undefined } });
      }
    }
  };

  const pendingTrips = trips.filter(t => t.balancePayment?.status !== 'PAGO' && t.balancePayment?.status !== 'LIBERAR');
  const liberatedTrips = trips.filter(t => t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO');

  const columns = [
    { key: 'os', label: '1. Ordem de Serviço', render: (t: Trip) => <span className="font-black text-blue-600 text-sm">{t.os}</span> },
    { 
      key: 'customer_info', 
      label: '2. Cliente / CNPJ', 
      render: (t: Trip) => (
        <div className="flex flex-col max-w-[240px]">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight truncate">{t.customer?.legalName || t.customer?.name}</span>
          <span className="text-[8px] font-black text-slate-400">{maskCNPJ(t.customer?.cnpj || '')}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{t.customer?.city} - {t.customer?.state}</span>
        </div>
      )
    },
    { 
      key: 'driver_info', 
      label: '3. Motorista / Placas', 
      render: (t: Trip) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight truncate">{t.driver?.name}</span>
          <span className="text-[8px] font-bold text-slate-400">CPF: {maskCPF(t.driver?.cpf || '')}</span>
          <div className="flex gap-1.5 mt-1">
            <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">{t.driver?.plateHorse}</span>
            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 text-[8px] font-mono font-bold">{t.driver?.plateTrailer}</span>
          </div>
        </div>
      )
    },
    { key: 'docs', label: '4. Documentação', render: (t: Trip) => {
      const hasFull = !!t.completoDoc;
      return (
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${hasFull ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
          <span className={`text-[9px] font-black uppercase ${hasFull ? 'text-emerald-600' : 'text-red-500'}`}>
            {hasFull ? 'PDF Ok' : 'Pendente'}
          </span>
          {!hasFull && (
            <label className="cursor-pointer ml-1 p-1.5 bg-slate-100 hover:bg-blue-100 rounded-lg transition-colors group">
              <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(t, e)} />
              <svg className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
            </label>
          )}
        </div>
      );
    }},
    { key: 'action', label: '5. Liberação Saldo', render: (t: Trip) => {
      const isLiberated = t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO';
      const isPaid = t.balancePayment?.status === 'PAGO';
      
      return (
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={isLiberated}
            disabled={isPaid}
            onChange={(e) => handleToggleLiberation(t, e.target.checked)}
            className={`w-5 h-5 rounded border-slate-300 transition-all cursor-pointer ${isPaid ? 'opacity-50 cursor-not-allowed text-emerald-600' : 'text-indigo-600 focus:ring-indigo-500'}`}
          />
          <div className="flex flex-col">
            <span className={`text-[9px] font-black uppercase ${isPaid ? 'text-emerald-600' : isLiberated ? 'text-indigo-600' : 'text-slate-400'}`}>
              {isPaid ? '✓ PAGO' : isLiberated ? '✓ LIBERADO' : 'AGUARDANDO DOCS'}
            </span>
          </div>
        </div>
      );
    }}
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setShowLiberated(false)} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all ${!showLiberated ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Pendentes ({pendingTrips.length})</button>
          <button onClick={() => setShowLiberated(true)} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all ${showLiberated ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Liberados ({liberatedTrips.length})</button>
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Quitação de Saldo Final (30%)</p>
      </div>

      <SmartOperationTable 
        userId={userId} 
        componentId={`admin-balance-${showLiberated ? 'lib' : 'pend'}`} 
        columns={columns} 
        data={showLiberated ? liberatedTrips : pendingTrips} 
      />
    </div>
  );
};

export default BalanceSubTab;
