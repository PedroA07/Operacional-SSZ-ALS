
import React, { useState } from 'react';
import { Trip, StatusHistoryEntry, User, TripStatus } from '../../../types';
import { db } from '../../../utils/storage';

interface StatusHistoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  user: User;
  onSuccess: () => void;
}

const StatusHistoryManagerModal: React.FC<StatusHistoryManagerModalProps> = ({ isOpen, onClose, trip, user, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleDeleteEntry = async (index: number) => {
    if (!confirm("Deseja realmente remover este registro do histórico?")) return;

    setIsProcessing(true);
    try {
      const newHistory = [...(trip.statusHistory || [])];
      newHistory.splice(index, 1);

      let newMainStatus: TripStatus = 'Pendente';
      let newMainTime = trip.dateTime;

      if (newHistory.length > 0) {
        const sorted = [...newHistory].sort((a, b) => new Date(b.createdAt || b.dateTime).getTime() - new Date(a.createdAt || a.dateTime).getTime());
        newMainStatus = sorted[0].status;
        newMainTime = sorted[0].dateTime;
      }

      const updatedTrip: Trip = {
        ...trip,
        status: newMainStatus,
        statusTime: newMainTime,
        statusHistory: newHistory
      };

      await db.saveTrip(updatedTrip, user);
      onSuccess();
    } catch (e) {
      alert("Erro ao atualizar histórico.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Gerenciar Histórico</h3>
            <p className="text-[10px] text-blue-400 font-bold mt-1 uppercase">OS: {trip.os}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
          {(!trip.statusHistory || trip.statusHistory.length === 0) ? (
            <div className="py-20 text-center text-slate-300 font-black uppercase italic text-xs">Sem histórico registrado</div>
          ) : (
            trip.statusHistory
              .slice()
              .sort((a,b) => new Date(b.createdAt || b.dateTime).getTime() - new Date(a.createdAt || a.dateTime).getTime())
              .map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${idx === 0 ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`}></div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{entry.status}</p>
                    <p className="text-[9px] font-mono font-bold text-slate-400 mt-1.5">
                      Op: {new Date(entry.dateTime).toLocaleDateString('pt-BR')} {new Date(entry.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[7px] font-mono text-slate-300 mt-0.5 uppercase">
                      Reg: {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('pt-BR') + ' ' + new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Legado'}
                    </p>
                  </div>
                </div>
                <button 
                  disabled={isProcessing}
                  onClick={() => handleDeleteEntry(trip.statusHistory.indexOf(entry))}
                  className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center shrink-0">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            * O histórico é ordenado pela hora exata em que o status foi gravado no sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusHistoryManagerModal;
