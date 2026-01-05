
import React, { useState } from 'react';
import { Trip } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import { maskCNPJ, maskCPF } from '../../../utils/masks';

interface Props {
  trips: Trip[];
  onUpdate: (trip: Trip) => void;
  userId: string;
}

const AdvanceSubTab: React.FC<Props> = ({ trips, onUpdate, userId }) => {
  const [showLiberated, setShowLiberated] = useState(false);

  const pendingTrips = trips.filter(t => t.advancePayment?.status !== 'PAGO' && t.advancePayment?.status !== 'LIBERAR');
  const liberatedTrips = trips.filter(t => t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO');

  const handleToggleLiberation = (t: Trip, isChecked: boolean) => {
    if (isChecked) {
      onUpdate({ ...t, advancePayment: { status: 'LIBERAR', liberatedAt: new Date().toISOString() } });
    } else {
      if (confirm("ATENÇÃO: Deseja ESTORNAR a liberação deste adiantamento e voltar para a fila de bloqueados?")) {
        onUpdate({ ...t, advancePayment: { status: 'BLOQUEADO', liberatedAt: undefined } });
      }
    }
  };

  const columns = [
    { 
      key: 'os', 
      label: '1. Ordem de Serviço', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-blue-600 text-sm">{t.os}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
        </div>
      )
    },
    { 
      key: 'customer_info', 
      label: '2. Cliente / Localidade', 
      render: (t: Trip) => (
        <div className="flex flex-col max-w-[250px]">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight truncate">{t.customer?.legalName || t.customer?.name}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase italic">Fantasia: {t.customer?.name}</span>
          <div className="flex gap-2 mt-1 items-center">
            <span className="text-[8px] font-black text-blue-500">{maskCNPJ(t.customer?.cnpj || '')}</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase">{t.customer?.city} - {t.customer?.state}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'driver_info', 
      label: '3. Motorista / Placas', 
      render: (t: Trip) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight">{t.driver?.name}</span>
          <span className="text-[8px] font-bold text-slate-400">CPF: {maskCPF(t.driver?.cpf || '')}</span>
          <div className="flex gap-2 mt-1">
            <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase">{t.driver?.plateHorse}</span>
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[8px] font-mono font-bold uppercase">{t.driver?.plateTrailer}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'action', 
      label: '4. Status Financeiro (70%)', 
      render: (t: Trip) => {
        const isLiberated = t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO';
        const isPaid = t.advancePayment?.status === 'PAGO';
        
        return (
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={isLiberated}
              onChange={(e) => handleToggleLiberation(t, e.target.checked)}
              disabled={isPaid} // Se já foi pago pelo banco, não permite voltar etapa aqui
              className={`w-5 h-5 rounded border-slate-300 transition-all cursor-pointer ${isPaid ? 'opacity-50 cursor-not-allowed' : 'text-blue-600 focus:ring-blue-500'}`}
            />
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase ${isPaid ? 'text-emerald-600' : isLiberated ? 'text-blue-500' : 'text-slate-400'}`}>
                {isPaid ? '✓ PAGAMENTO REALIZADO' : isLiberated ? '✓ LIBERADO P/ FINANCEIRO' : 'AGUARDANDO CONFERÊNCIA'}
              </span>
              {t.advancePayment?.liberatedAt && (
                <span className="text-[7px] font-bold text-slate-300 uppercase">Liberado em: {new Date(t.advancePayment.liberatedAt).toLocaleString('pt-BR')}</span>
              )}
            </div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button onClick={() => setShowLiberated(false)} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all ${!showLiberated ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Pendentes ({pendingTrips.length})</button>
          <button onClick={() => setShowLiberated(true)} className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all ${showLiberated ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Liberados ({liberatedTrips.length})</button>
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Etapa: Autorização de Pagamento Inicial (70%)</p>
      </div>

      <SmartOperationTable 
        userId={userId} 
        componentId={`admin-advance-${showLiberated ? 'liberated' : 'pending'}`} 
        columns={columns} 
        data={showLiberated ? liberatedTrips : pendingTrips} 
        title={showLiberated ? "Fila de Pagamento (Adiantamentos)" : "Fila de Conferência Operacional"}
      />
    </div>
  );
};

export default AdvanceSubTab;
