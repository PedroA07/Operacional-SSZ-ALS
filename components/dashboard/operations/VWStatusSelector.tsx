
import React from 'react';
import { TripStatus } from '../../../types';

interface VWStatusSelectorProps {
  currentStatus: TripStatus;
  onSelect: (status: TripStatus) => void;
}

const VWStatusSelector: React.FC<VWStatusSelectorProps> = ({ currentStatus, onSelect }) => {
  const options: { label: string; value: TripStatus; color: string; isFinal?: boolean }[] = [
    { label: 'Retirou o Cheio', value: 'Retirada do cheio', color: 'bg-blue-600' },
    { label: 'Chegou no Cragea', value: 'Chegou no Cragea', color: 'bg-indigo-600' },
    { label: 'Aguardando Carregar', value: 'Aguardando carregar', color: 'bg-amber-500' },
    { label: 'Saiu do Cragea', value: 'Saiu do Cragea', color: 'bg-blue-800' },
    { label: 'Chegou na Volkswagen', value: 'Chegou na Volkswagen', color: 'bg-cyan-600' },
    { label: 'Saiu da Volkswagen', value: 'Saiu da Volkswagen', color: 'bg-slate-700' },
    { label: 'Container sobre Rodas', value: 'Container sobre rodas', color: 'bg-emerald-500' },
    { label: 'Baixa Cragea (Concluir)', value: 'Viagem concluída', color: 'bg-emerald-800', isFinal: true },
  ];

  return (
    <div className="grid grid-cols-1 gap-3">
      {options.map((opt) => {
        const isSelected = currentStatus === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center justify-between px-6 border-2 ${
              isSelected 
              ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-inner' 
              : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
            }`}
          >
            <span className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${opt.color}`}></div>
              {opt.label}
            </span>
            {isSelected && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default VWStatusSelector;
