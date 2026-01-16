
import React, { useState, useEffect, memo } from 'react';
import { Trip, User } from '../../../types';
import { reportGenerator, TableReportData } from '../../../utils/reportGenerator';

interface StatusHistoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  allTrips: Trip[]; // Adicionado para resolver erro de build
  user: User;
  onSuccess: () => any; // Ajustado para aceitar retornos diversos (como boolean de dispatchEvent)
}

// Subcomponente memoizado para inputs individuais
const ExcelRow = memo(({ 
  label, 
  value, 
  onChange 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void 
}) => (
  <div className="grid grid-cols-[150px_1fr] border-b border-black last:border-b-0">
    <div className="bg-[#5b9bd5] text-black font-black text-[10px] p-3 border-r border-black flex items-center justify-center uppercase text-center select-none">
      {label}
    </div>
    <input 
      type="text"
      className="p-3 text-[11px] font-black text-center uppercase outline-none focus:bg-blue-50 w-full transition-colors"
      style={{ textTransform: 'uppercase' }}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
));

const StatusHistoryManagerModal: React.FC<StatusHistoryManagerModalProps> = ({ isOpen, onClose, trip, allTrips, user, onSuccess }) => {
  const [data, setData] = useState<TableReportData>({
    motorista: '', container: '', retiradaCragea: '', chegadaVolks: '', saidaVolks: '', baixaCragea: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && trip) {
      const history = trip.statusHistory || [];
      const getVal = (terms: string[]) => {
        const h = history.find(entry => terms.some(term => entry.status.toLowerCase().includes(term.toLowerCase())));
        return h ? reportGenerator.formatFullDate(h.dateTime) : "";
      };

      setData({
        motorista: trip.driver.name.toUpperCase(),
        container: (trip.container || "").toUpperCase(),
        retiradaCragea: getVal(['Cragea', 'Retirada do cheio']),
        chegadaVolks: getVal(['Chegou na Volkswagen', 'Chegada na Volkswagen']),
        saidaVolks: getVal(['Saiu da Volkswagen', 'Saída da Volkswagen']),
        baixaCragea: getVal(['Viagem concluída', 'Baixa Cragea'])
      });
    }
  }, [isOpen, trip]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulação de salvamento reativo
    setTimeout(() => {
      setIsSaving(false);
      onSuccess();
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black italic text-xs">ALS</div>
             <h3 className="text-xs font-black uppercase tracking-widest">Edição Rápida Individual</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </div>

        <div className="p-10 bg-[#f8fafc]">
          <div className="border border-black bg-white shadow-xl overflow-hidden rounded-sm mx-auto w-full">
            <ExcelRow label="Motorista" value={data.motorista} onChange={(val) => setData(p => ({...p, motorista: val}))} />
            <ExcelRow label="Container" value={data.container} onChange={(val) => setData(p => ({...p, container: val}))} />
            <ExcelRow label="Retirada Cragea" value={data.retiradaCragea} onChange={(val) => setData(p => ({...p, retiradaCragea: val}))} />
            <ExcelRow label="Chegada Volks" value={data.chegadaVolks} onChange={(val) => setData(p => ({...p, chegadaVolks: val}))} />
            <ExcelRow label="Saida Volks" value={data.saidaVolks} onChange={(val) => setData(p => ({...p, saidaVolks: val}))} />
            <ExcelRow label="Baixa Cragea" value={data.baixaCragea} onChange={(val) => setData(p => ({...p, baixaCragea: val}))} />
          </div>
          
          <div className="mt-10 flex gap-3">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95"
            >
              {isSaving ? 'Gravando...' : 'Gravar Alterações'}
            </button>
            <button onClick={onClose} className="px-8 py-5 bg-slate-200 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all">Sair</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusHistoryManagerModal;
