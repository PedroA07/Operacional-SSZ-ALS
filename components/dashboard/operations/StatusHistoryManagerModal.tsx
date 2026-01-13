
import React, { useState } from 'react';
import { Trip, StatusHistoryEntry, User, TripStatus } from '../../../types';
import { db } from '../../../utils/storage';
import { emailFormatter } from '../../../utils/emailFormatter';
import { statusService } from '../../../utils/statusService';

interface StatusHistoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  allTrips: Trip[];
  user: User;
  onSuccess: () => void;
}

const StatusHistoryManagerModal: React.FC<StatusHistoryManagerModalProps> = ({ isOpen, onClose, trip, allTrips, user, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editStatusName, setEditStatusName] = useState<TripStatus>('Pendente');

  if (!isOpen) return null;

  const handleCopyToEmail = async () => {
    try {
      const html = emailFormatter.toCompactRichText(trip, allTrips);
      const plain = emailFormatter.toPlainText(trip, allTrips);

      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plain], { type: 'text/plain' });
      
      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobPlain
      })];

      await navigator.clipboard.write(data);
      
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const startEditing = (index: number, entry: StatusHistoryEntry) => {
    setEditingIndex(index);
    setEditStatusName(entry.status);
    
    const date = new Date(entry.dateTime);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    setEditTime(localTime);
  };

  const handleSaveEdit = async (index: number) => {
    if (!editTime || !editStatusName) return;
    setIsProcessing(true);
    try {
      const newHistory = [...(trip.statusHistory || [])];
      newHistory[index] = {
        ...newHistory[index],
        status: editStatusName,
        dateTime: new Date(editTime).toISOString()
      };

      // Recalcula o status principal baseado na cronologia (o mais recente ganha)
      const sorted = [...newHistory].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      
      const updatedTrip: Trip = {
        ...trip,
        status: sorted[0].status,
        statusTime: sorted[0].dateTime,
        statusHistory: newHistory
      };

      await db.saveTrip(updatedTrip, user);
      setEditingIndex(null);
      onSuccess();
    } catch (e) {
      alert("Erro ao atualizar o registro.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteEntry = async (index: number) => {
    if (!confirm("Deseja remover este registro permanentemente?")) return;

    setIsProcessing(true);
    try {
      const newHistory = [...(trip.statusHistory || [])];
      newHistory.splice(index, 1);

      let newMainStatus: TripStatus = 'Pendente';
      let newMainTime = trip.dateTime;

      if (newHistory.length > 0) {
        const sorted = [...newHistory].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
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
      alert("Erro ao remover registro.");
    } finally {
      setIsProcessing(false);
    }
  };

  const statusOptions = statusService.getOptions(trip);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Edição Completa de Status</h3>
            <p className="text-[10px] text-blue-400 font-bold mt-1 uppercase">OS: {trip.os}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCopyToEmail}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-lg active:scale-95 ${copyFeedback ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              {copyFeedback ? 'Copiado!' : 'Copiar Posição'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
          {(!trip.statusHistory || trip.statusHistory.length === 0) ? (
            <div className="py-20 text-center text-slate-300 font-black uppercase italic text-xs">Sem histórico registrado</div>
          ) : (
            trip.statusHistory
              .slice()
              .sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
              .map((entry, idx) => {
                const originalIndex = trip.statusHistory.indexOf(entry);
                const isEditing = editingIndex === originalIndex;

                return (
                  <div key={originalIndex} className={`flex flex-col p-6 rounded-[2rem] border transition-all ${isEditing ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-slate-50 border-slate-100 group hover:border-blue-200'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${idx === 0 ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`}></div>
                        <div className="flex-1 min-w-0">
                          {!isEditing ? (
                            <>
                              <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{entry.status}</p>
                              <div className="mt-2 space-y-1">
                                <p className="text-[9px] font-mono font-bold text-slate-500">
                                   <span className="text-blue-500">OPERAÇÃO:</span> {new Date(entry.dateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {entry.createdAt && (
                                  <p className="text-[7px] font-mono text-slate-300 uppercase">
                                    REGISTRO: {new Date(entry.createdAt).toLocaleString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="space-y-4 animate-in slide-in-from-left-2">
                               <div className="space-y-1">
                                 <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest ml-1">Tipo de Evento</label>
                                 <select 
                                   className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 bg-white text-[10px] font-black uppercase outline-none focus:border-blue-500"
                                   value={editStatusName}
                                   onChange={e => setEditStatusName(e.target.value as TripStatus)}
                                 >
                                   {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                 </select>
                               </div>
                               <div className="space-y-1">
                                 <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest ml-1">Horário Operacional</label>
                                 <input 
                                   type="datetime-local" 
                                   className="w-full px-4 py-3 rounded-xl border-2 border-blue-100 bg-white text-[10px] font-black outline-none focus:border-blue-500"
                                   value={editTime}
                                   onChange={e => setEditTime(e.target.value)}
                                 />
                               </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isEditing ? (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button 
                            disabled={isProcessing}
                            onClick={() => startEditing(originalIndex, entry)}
                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"
                            title="Editar Status por Completo"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732"/></svg>
                          </button>
                          <button 
                            disabled={isProcessing}
                            onClick={() => handleDeleteEntry(originalIndex)}
                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"
                            title="Remover Registro"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 shrink-0">
                           <button 
                             onClick={() => handleSaveEdit(originalIndex)}
                             className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95"
                           >
                             Gravar
                           </button>
                           <button 
                             onClick={() => setEditingIndex(null)}
                             className="px-4 py-2.5 bg-white text-slate-400 border border-slate-200 rounded-xl text-[9px] font-black uppercase"
                           >
                             Sair
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center shrink-0">
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            * Alterações no histórico atualizam automaticamente a posição atual da OS no painel principal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusHistoryManagerModal;
