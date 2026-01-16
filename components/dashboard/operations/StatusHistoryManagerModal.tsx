
import React, { useState, useEffect } from 'react';
import { Trip, User } from '../../../types';
import { db } from '../../../utils/storage';
import { reportGenerator, TableReportData } from '../../../utils/reportGenerator';

interface StatusHistoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  user: User;
  onSuccess: () => void;
}

const StatusHistoryManagerModal: React.FC<StatusHistoryManagerModalProps> = ({ isOpen, onClose, trip, user, onSuccess }) => {
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
    // Simula salvamento ou integração futura com o storage
    // Por enquanto, apenas gera o feedback de sucesso
    setTimeout(() => {
      setIsSaving(false);
      onSuccess();
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  const Row = ({ label, field }: { label: string, field: keyof TableReportData }) => (
    <div className="grid grid-cols-[150px_1fr] border-b border-black last:border-b-0">
      <div className="bg-[#5b9bd5] text-white font-black text-[10px] p-3 border-r border-black flex items-center justify-center uppercase text-center">
        {label}
      </div>
      <input 
        className="p-3 text-[11px] font-black text-center uppercase outline-none focus:bg-blue-50"
        value={data[field]}
        onChange={e => setData({...data, [field]: e.target.value.toUpperCase()})}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest">Edição Manual (Estilo Planilha)</h3>
          <button onClick={onClose}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </div>

        <div className="p-10 bg-slate-50">
          <div className="border border-black bg-white shadow-lg overflow-hidden rounded-sm">
            <Row label="Motorista" field="motorista" />
            <Row label="Container" field="container" />
            <Row label="Retirada Cragea" field="retiradaCragea" />
            <Row label="Chegada Volks" field="chegadaVolks" />
            <Row label="Saida Volks" field="saidaVolks" />
            <Row label="Baixa Cragea" field="baixaCragea" />
          </div>
          
          <div className="mt-8 flex gap-3">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95"
            >
              {isSaving ? 'Gravando...' : 'Salvar Alterações'}
            </button>
            <button onClick={onClose} className="px-8 py-4 bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Sair</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusHistoryManagerModal;
