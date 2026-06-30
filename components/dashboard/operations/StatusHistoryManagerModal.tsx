
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trip, User, StatusHistoryEntry, TripStatus } from '../../../types';
import { db } from '../../../utils/storage';
import { statusService } from '../../../utils/statusService';
import { showToast } from '../../shared/SimpleToast';
import CustomSelect from '../../shared/CustomSelect';

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
  const [customStatuses, setCustomStatuses] = useState<any[]>([]);

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
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      );
      setLocalHistory(sorted);
      db.getCustomStatuses().then(setCustomStatuses);
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
      showToast('A viagem precisa ter pelo menos um status no histórico.', 'warning');
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
        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      );

      const latest = finalHistory[0];
      const isCompleted = statusService.isTripCompleted(latest.status, trip, customStatuses);

      const updatedTrip: Trip = {
        ...trip,
        status: latest.status,
        statusTime: latest.dateTime,
        isCompleted: isCompleted,
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
        showToast('Histórico atualizado com sucesso!', 'success');
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      showToast('Falha ao sincronizar histórico.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const statusOptions = statusService.getCustomOptions(trip, customStatuses);

  return createPortal(
    <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
      <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
        <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[88vh] animate-in zoom-in-95 duration-300">

          {/* Header com identidade de histórico */}
          <header className="px-8 py-5 bg-slate-700 flex justify-between items-center shrink-0 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">Histórico de Status</p>
                <h3 className="font-black text-white text-sm uppercase tracking-widest leading-none">Gestão de Histórico</h3>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">OS: {trip.os} • {trip.driver.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </header>

          {/* Sub-header com contagem + add */}
          <div className="px-8 py-3.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{localHistory.length} eventos registrados</span>
            <button
              onClick={handleAddEntry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md hover:bg-blue-700 transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
              Adicionar Status
            </button>
          </div>

          {/* Lista de eventos */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2.5 custom-scrollbar bg-slate-50">
            {localHistory.map((entry, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 ${idx === 0 ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                  {localHistory.length - idx}
                </div>

                <div className="flex-1 space-y-0.5">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Status</label>
                  <CustomSelect
                    value={entry.status}
                    onChange={v => handleUpdateEntry(idx, 'status', v)}
                    options={statusOptions.map(opt => ({ value: opt.value, label: opt.label.toUpperCase() }))}
                    inputClassName={`w-full bg-transparent font-black uppercase text-[11px] outline-none cursor-pointer ${idx === 0 ? 'text-blue-700' : 'text-slate-800'}`}
                  />
                </div>

                <div className="w-44 space-y-0.5">
                  <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Data / Hora</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-transparent font-bold text-slate-600 text-[10px] outline-none"
                    value={formatForInput(entry.dateTime)}
                    onChange={e => handleUpdateEntry(idx, 'dateTime', e.target.value)}
                  />
                </div>

                <button
                  onClick={() => handleRemoveEntry(idx)}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                  title="Remover status"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2"/></svg>
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <footer className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-8 py-3.5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
              Descartar
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="px-12 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Processando...' : 'Salvar Histórico'}
            </button>
          </footer>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StatusHistoryManagerModal;
