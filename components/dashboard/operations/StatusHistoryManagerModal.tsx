
import React, { useState, useEffect } from 'react';
import { Trip, User, StatusHistoryEntry, TripStatus } from '../../../types';
import { db } from '../../../utils/storage';
import { statusService } from '../../../utils/statusService';

interface StatusHistoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  allTrips: Trip[];
  user: User;
  onSuccess: () => any;
}

const StatusHistoryManagerModal: React.FC<StatusHistoryManagerModalProps> = ({ 
  isOpen, 
  onClose, 
  trip, 
  user, 
  onSuccess 
}) => {
  const [localHistory, setLocalHistory] = useState<StatusHistoryEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Função para formatar data ISO para o input datetime-local (YYYY-MM-DDTHH:mm)
  const formatForInput = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      // Ajusta para o fuso horário local para o input mostrar o tempo correto
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (isOpen && trip) {
      const sorted = [...(trip.statusHistory || [])].sort((a, b) => 
        new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );
      setLocalHistory(sorted);
    }
  }, [isOpen, trip]);

  const handleUpdateEntry = (index: number, field: keyof StatusHistoryEntry, value: string) => {
    const updated = [...localHistory];
    if (field === 'dateTime') {
      // Quando o input datetime-local muda, salvamos como ISO string
      updated[index] = { ...updated[index], [field]: new Date(value).toISOString() };
    } else {
      updated[index] = { ...updated[index], [field]: value } as any;
    }
    setLocalHistory(updated);
  };

  const handleRemoveEntry = (index: number) => {
    if (localHistory.length <= 1) {
      alert("A viagem precisa ter pelo menos um status no histórico.");
      return;
    }
    if (confirm("Deseja realmente remover este registro do histórico?")) {
      const updated = localHistory.filter((_, i) => i !== index);
      setLocalHistory(updated);
    }
  };

  const handleAddEntry = () => {
    const now = new Date().toISOString();
    const newEntry: StatusHistoryEntry = {
      status: 'Pendente',
      dateTime: now,
      createdAt: now
    };
    setLocalHistory([newEntry, ...localHistory]);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const finalHistory = [...localHistory].sort((a, b) => 
        new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );

      const latest = finalHistory[finalHistory.length - 1];

      const updatedTrip: Trip = {
        ...trip,
        status: latest.status,
        statusTime: latest.dateTime,
        statusHistory: finalHistory
      };

      const success = await db.saveTrip(updatedTrip, user);
      
      if (success) {
        await db.addNotification(
          user, 
          'SYSTEM', 
          'Histórico Alterado', 
          `O histórico da OS ${trip.os} foi editado manualmente por ${user.displayName}.`,
          { os: trip.os }
        );
        onSuccess();
        onClose();
      }
    } catch (err) {
      alert("Falha ao sincronizar histórico.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const statusOptions = statusService.getOptions(trip);

  return (
    <div className="fixed inset-0 z-[4500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95">
        
        <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
               <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest leading-none">Gestão de Histórico Completo</h3>
              <p className="text-[10px] font-bold text-blue-400 uppercase mt-2">OS: {trip.os} • {trip.driver.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </header>

        <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{localHistory.length} Eventos Registrados</span>
           <button 
             onClick={handleAddEntry}
             className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md hover:bg-emerald-700 transition-all active:scale-95"
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
              Adicionar Status
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar bg-[#f8fafc]">
          {localHistory.map((entry, idx) => (
            <div 
              key={idx} 
              className={`p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 ${idx === 0 ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {localHistory.length - idx}
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição do Status</label>
                <select 
                  className="w-full bg-transparent font-black text-slate-800 uppercase text-[11px] outline-none cursor-pointer focus:text-blue-600"
                  value={entry.status}
                  onChange={e => handleUpdateEntry(idx, 'status', e.target.value)}
                >
                  {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="w-48 space-y-1">
                <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Data/Hora do Evento</label>
                <input 
                  type="datetime-local"
                  className="w-full bg-transparent font-bold text-slate-600 text-[10px] outline-none"
                  value={formatForInput(entry.dateTime)}
                  onChange={e => handleUpdateEntry(idx, 'dateTime', e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
                <button 
                  onClick={() => handleRemoveEntry(idx)}
                  className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
                  title="Excluir este registro"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <footer className="p-8 bg-white border-t border-slate-100 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
           >
             Descartar
           </button>
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
           >
             {isSaving ? 'Processando...' : 'Salvar Histórico'}
           </button>
        </footer>
      </div>
    </div>
  );
};

export default StatusHistoryManagerModal;
