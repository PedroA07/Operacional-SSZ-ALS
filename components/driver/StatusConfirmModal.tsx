
import React, { useState, useEffect } from 'react';
import { TripStatus } from '../../types';
import DateTimePicker from '../shared/DateTimePicker';

interface StatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dateTime: string) => void;
  status: TripStatus;
  isSaving: boolean;
}

const StatusConfirmModal: React.FC<StatusConfirmModalProps> = ({ isOpen, onClose, onConfirm, status, isSaving }) => {
  const [eventTime, setEventTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
      setEventTime(localISOTime);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-end sm:items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        <div className="p-8 text-center border-b border-white/5">
          <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Confirmar Posição</h3>
          <p className="text-blue-400 font-black uppercase text-sm mt-2">{status}</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Data e Hora do Evento</label>
            <DateTimePicker
              value={eventTime}
              onChange={setEventTime}
              placeholder="Selecione a data e hora..."
              inputClassName="w-full !px-6 !py-5 !rounded-2xl !bg-white/5 !border-2 !border-white/10 !text-white !font-black !text-lg outline-none focus:!border-blue-500 transition-all placeholder:!text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onClose}
              className="py-5 bg-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button 
              disabled={isSaving}
              onClick={() => onConfirm(new Date(eventTime).toISOString())}
              className="py-5 bg-blue-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Confirmar'}
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-slate-950 text-center">
          <p className="text-[7px] text-slate-600 font-bold uppercase tracking-[0.3em]">Sistema de Monitoramento ALS</p>
        </div>
      </div>
    </div>
  );
};

export default StatusConfirmModal;
