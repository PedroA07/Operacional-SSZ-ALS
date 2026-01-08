
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

  // REGRA: Aparecem adiantamentos se iniciou a viagem OU se já concluiu
  const pendingTrips = trips.filter(t => {
    const isNotPaidOrLiberated = t.advancePayment?.status !== 'PAGO' && t.advancePayment?.status !== 'LIBERAR';
    const isRelevantStatus = [
      'Retirada de vazio', 
      'Retirada do cheio', 
      'Em viagem', 
      'Chegou no cliente', 
      'Pegou NF', 
      'Saiu do cliente', 
      'Chegou no destino', 
      'Devolução do cheio',
      'Viagem concluída' // Garantia: Viagem finalizada mas adiantamento esquecido aparece aqui
    ].includes(t.status);
    
    return isNotPaidOrLiberated && isRelevantStatus;
  });

  const liberatedTrips = trips.filter(t => {
    const isLiberatedOrPaid = t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO';
    return isLiberatedOrPaid;
  });

  const handleToggleLiberation = (t: Trip, isChecked: boolean) => {
    if (isChecked) {
      onUpdate({ ...t, advancePayment: { status: 'LIBERAR', liberatedAt: new Date().toISOString() } });
    } else {
      if (confirm("Deseja ESTORNAR a liberação deste adiantamento?")) {
        onUpdate({ ...t, advancePayment: { status: 'BLOQUEADO', liberatedAt: undefined } });
      }
    }
  };

  const columns = [
    { 
      key: 'os', 
      label: 'Ordem de Serviço', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-blue-600 text-sm">{t.os}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
        </div>
      )
    },
    { 
      key: 'customer_info', 
      label: 'Cliente / Localidade', 
      render: (t: Trip) => (
        <div className="flex flex-col max-w-[250px]">
          <span className="font-black text-slate-800 uppercase text-[10px] truncate">{t.customer?.legalName || t.customer?.name}</span>
          <div className="flex gap-2 mt-1">
            <span className="text-[8px] font-black text-blue-500">{maskCNPJ(t.customer?.cnpj || '')}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'driver_info', 
      label: 'Motorista / Placa', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase text-[10px]">{t.driver?.name}</span>
          <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase mt-1 w-fit">{t.driver?.plateHorse}</span>
        </div>
      )
    },
    {
      key: 'trip_status',
      label: 'Status Operacional',
      render: (t: Trip) => {
        return (
          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${t.status === 'Viagem concluída' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
            {t.status === 'Viagem concluída' ? '✓ CONCLUÍDA' : t.status}
          </span>
        );
      }
    },
    { 
      key: 'action', 
      label: 'Liberação (70%)', 
      render: (t: Trip) => {
        const isLiberated = t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO';
        const isPaid = t.advancePayment?.status === 'PAGO';
        
        return (
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={isLiberated}
              onChange={(e) => handleToggleLiberation(t, e.target.checked)}
              disabled={isPaid}
              className={`w-5 h-5 rounded border-slate-300 ${isPaid ? 'opacity-50' : 'text-blue-600 cursor-pointer'}`}
            />
            <span className={`text-[10px] font-black uppercase ${isPaid ? 'text-emerald-600' : isLiberated ? 'text-blue-500' : 'text-slate-400'}`}>
              {isPaid ? '✓ PAGO' : isLiberated ? '✓ LIBERADO' : 'PENDENTE'}
            </span>
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
        <div className="text-right">
           <p className="text-[7px] text-blue-500 font-bold uppercase italic tracking-widest">Controle de Adiantamento Operacional</p>
        </div>
      </div>

      <SmartOperationTable 
        userId={userId} 
        componentId={`admin-advance-${showLiberated ? 'lib' : 'pend'}`} 
        columns={columns} 
        data={showLiberated ? liberatedTrips : pendingTrips} 
        title={showLiberated ? "Histórico de Adiantamentos" : "Fila de Adiantamentos Pendentes"}
      />
    </div>
  );
};

export default AdvanceSubTab;
