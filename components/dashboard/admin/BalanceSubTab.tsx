
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
    { key: 'docs', label: 'Status PDF', render: (t: Trip) => {
      const hasFull = t.documents?.some(d => d.type === 'COMPLETO');
      return (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasFull ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
          <span className={`text-[9px] font-black uppercase ${hasFull ? 'text-emerald-600' : 'text-red-500'}`}>
            {hasFull ? 'PDF Recebido' : 'Documento Pendente'}
          </span>
          {!hasFull && (
            <label className="cursor-pointer ml-2 p-1 bg-slate-100 hover:bg-blue-100 rounded transition-colors" title="Anexar PDF">
              <input type="file" className="hidden" accept=".pdf" onChange={e => handleFileUpload(t, e)} />
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
            </label>
          )}
        </div>
      );
    }},
    { key: 'action', label: 'Saldo (30%)', render: (t: Trip) => {
      const hasFull = t.documents?.some(d => d.type === 'COMPLETO');
      const isLiberated = t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO';
      
      return (
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={isLiberated}
            disabled={!hasFull || isLiberated}
            onChange={(e) => {
              if (e.target.checked) {
                onUpdate({ ...t, balancePayment: { status: 'LIBERAR', liberatedAt: new Date().toISOString() } });
              }
            }}
            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
          />
          <button 
            disabled={!hasFull || isLiberated}
            className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${
              isLiberated ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              hasFull ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-300 cursor-not-allowed'
            }`}
          >
            {isLiberated ? '✓ SALDO LIBERADO' : 'LIBERAR PAGAMENTO'}
          </button>
        </div>
      );
    }}
  ];

  return (
    <div className="space-y-6">
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setShowLiberated(false)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showLiberated ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Fila de Saldos ({pendingTrips.length})</button>
        <button onClick={() => setShowLiberated(true)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showLiberated ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Pagamentos Autorizados ({liberatedTrips.length})</button>
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
