
import React, { useState, useEffect } from 'react';
import { Trip, TripScheduling, PreStacking, Port } from '../../../types';
import { db } from '../../../utils/storage';

interface SchedulingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  onSuccess: () => void;
  preStackingUnits: (Port | PreStacking)[];
}

const SchedulingEditModal: React.FC<SchedulingEditModalProps> = ({ 
  isOpen, 
  onClose, 
  trip, 
  onSuccess, 
  preStackingUnits 
}) => {
  const [formData, setFormData] = useState<TripScheduling>({
    dateTime: '',
    location: '',
    obs: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (trip) {
      setFormData({
        dateTime: trip.scheduling?.dateTime?.slice(0, 16) || trip.dateTime.slice(0, 16),
        location: trip.scheduling?.location || trip.destination?.name || '',
        locationId: trip.scheduling?.locationId || trip.destination?.id || '',
        obs: trip.scheduling?.obs || ''
      });
    }
  }, [trip, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || isSaving) return;

    setIsSaving(true);
    try {
      const updatedTrip = {
        ...trip,
        scheduling: {
          ...formData,
          dateTime: new Date(formData.dateTime).toISOString(),
          location: formData.location.toUpperCase()
        }
      };
      await db.saveTrip(updatedTrip);
      onSuccess();
      onClose();
    } catch (err) {
      alert("Erro ao salvar agendamento.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !trip) return null;

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const inputClass = "w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm";

  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Agendamento de Terminal</h3>
            <p className="text-[10px] font-bold opacity-80 mt-0.5">OS: {trip.os}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className={labelClass}>Data e Hora do Agendamento</label>
            <input 
              required 
              type="datetime-local" 
              className={inputClass} 
              value={formData.dateTime} 
              onChange={e => setFormData({...formData, dateTime: e.target.value})} 
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Local de Entrega / Terminal</label>
            <select 
              required 
              className={inputClass} 
              value={formData.locationId} 
              onChange={e => {
                const unit = preStackingUnits.find(u => u.id === e.target.value);
                if (unit) setFormData({...formData, locationId: unit.id, location: unit.name});
              }}
            >
               <option value="">Selecione o Terminal...</option>
               {preStackingUnits.map(u => <option key={u.id} value={u.id}>{u.legalName || u.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Observações (Opcional)</label>
            <textarea 
              className={`${inputClass} h-24 resize-none normal-case`} 
              value={formData.obs} 
              onChange={e => setFormData({...formData, obs: e.target.value})} 
              placeholder="Ex: Senha do agendamento, instruções..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="py-4 bg-slate-50 text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchedulingEditModal;
