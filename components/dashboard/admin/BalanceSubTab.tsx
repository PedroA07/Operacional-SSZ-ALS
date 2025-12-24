
import React, { useState } from 'react';
import { Trip, TripDocument } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';

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
      onUpdate({ ...trip, documents: [...(trip.documents || []), doc] });
    };
    reader.readAsDataURL(file);
  };

  const pendingTrips = trips.filter(t => t.balancePayment?.status !== 'PAGO' && t.balancePayment?.status !== 'LIBERAR');
  const liberatedTrips = trips.filter(t => t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO');

  const columns = [
    { key: 'os', label: 'Nº OS', render: (t: Trip) => <span className="font-black text-blue-600">{t.os}</span> },
    { key: 'docs', label: 'Doc. Completo', render: (t: Trip) => {
      const hasFull = t.documents?.some(d => d.type === 'COMPLETO');
      return (
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${hasFull ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
          <span className={`text-[9px] font-black uppercase ${hasFull ? 'text-emerald-600' : 'text-red-500'}`}>
            {hasFull ? 'PDF Ok' : 'PDF Pendente'}
          </span>
          <label className="cursor-pointer ml-2 p-1 bg-slate-100 hover:bg-blue-100 rounded-lg transition-colors">
            <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(t, e)} />
            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
          </label>
        </div>
      );
    }},
    { key: 'action', label: 'Liberação Saldo', render: (t: Trip) => {
      const isLiberated = t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO';
      const hasFull = t.documents?.some(d => d.type === 'COMPLETO');
      
      return (
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={isLiberated}
            disabled={isLiberated}
            onChange={(e) => {
              if (e.target.checked) {
                if (!hasFull) {
                  if (!confirm("O PDF Completo ainda não foi anexado. Deseja liberar o saldo mesmo assim?")) {
                    e.target.checked = false;
                    return;
                  }
                }
                onUpdate({ ...t, balancePayment: { status: 'LIBERAR', liberatedAt: new Date().toISOString() } });
              }
            }}
            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className={`text-[9px] font-black uppercase ${isLiberated ? 'text-emerald-600' : 'text-slate-400'}`}>
            {isLiberated ? '✓ Liberado' : 'Fila Financeira'}
          </span>
        </div>
      );
    }}
  ];

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setShowLiberated(false)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showLiberated ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Pendentes ({pendingTrips.length})</button>
        <button onClick={() => setShowLiberated(true)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showLiberated ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Liberados ({liberatedTrips.length})</button>
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
