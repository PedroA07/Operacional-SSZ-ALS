
import React, { useState } from 'react';
import { Trip } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';

interface Props {
  trips: Trip[];
  onUpdate: (trip: Trip) => void;
  userId: string;
}

const AdvanceSubTab: React.FC<Props> = ({ trips, onUpdate, userId }) => {
  const [showLiberated, setShowLiberated] = useState(false);

  const pendingTrips = trips.filter(t => t.advancePayment?.status !== 'PAGO' && t.advancePayment?.status !== 'LIBERAR');
  const liberatedTrips = trips.filter(t => t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO');

  const columns = [
    { key: 'os', label: 'Nº OS', render: (t: Trip) => <span className="font-black text-blue-600">{t.os}</span> },
    { key: 'driver', label: 'Motorista', render: (t: Trip) => <span className="font-bold uppercase text-slate-600">{t.driver?.name}</span> },
    { key: 'action', label: 'Liberação (70%)', render: (t: Trip) => {
      const isLiberated = t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO';
      return (
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            checked={isLiberated}
            onChange={(e) => {
              if (e.target.checked) {
                onUpdate({ ...t, advancePayment: { status: 'LIBERAR', liberatedAt: new Date().toISOString() } });
              }
            }}
            disabled={isLiberated}
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className={`text-[10px] font-black uppercase ${isLiberated ? 'text-emerald-500' : 'text-slate-400'}`}>
            {isLiberated ? '✓ Liberado para Pagamento' : 'Aguardando Conferência'}
          </span>
        </div>
      );
    }}
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setShowLiberated(false)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!showLiberated ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Pendentes ({pendingTrips.length})</button>
          <button onClick={() => setShowLiberated(true)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${showLiberated ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Liberados ({liberatedTrips.length})</button>
        </div>
      </div>

      <SmartOperationTable 
        userId={userId} 
        componentId={`admin-advance-${showLiberated ? 'liberated' : 'pending'}`} 
        columns={columns} 
        data={showLiberated ? liberatedTrips : pendingTrips} 
        title={showLiberated ? "Adiantamentos Autorizados" : "Fila de Conferência Financeira"}
      />
    </div>
  );
};

export default AdvanceSubTab;
