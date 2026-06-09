
import React, { useState, useEffect, useRef } from 'react';
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
    locationId: '',
    obs: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper para converter data do banco (UTC) para o formato do input (Local)
  const formatToLocalInput = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (trip && isOpen) {
      setFormData({
        dateTime: formatToLocalInput(trip.scheduling?.dateTime || trip.dateTime),
        location: trip.scheduling?.location || trip.destination?.name || '',
        locationId: trip.scheduling?.locationId || trip.destination?.id || '',
        obs: trip.scheduling?.obs || ''
      });
      setSearchTerm('');
    }
  }, [trip, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || isSaving) return;

    setIsSaving(true);
    try {
      const updatedTrip = {
        ...trip,
        scheduling: {
          ...formData,
          // Salva como ISO (UTC)
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

  const filteredUnits = preStackingUnits.filter(u =>
    (u.legalName || u.name || '').toUpperCase().includes(searchTerm.toUpperCase()) ||
    (u.city || '').toUpperCase().includes(searchTerm.toUpperCase())
  );

  const selectedUnit = preStackingUnits.find(u => u.id === formData.locationId);

  return (
    <div className="fixed inset-0 z-[650] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="p-8 bg-emerald-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest leading-none">Agendamento de Terminal</h3>
            <p className="text-[10px] font-bold opacity-80 mt-2">OS: {trip.os} • {trip.driver.name}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/15 hover:bg-white/30 rounded-full transition-all active:scale-90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data e Hora da Janela</label>
            <input 
              required 
              type="datetime-local" 
              className="w-full px-6 py-5 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 text-lg outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner" 
              value={formData.dateTime} 
              onChange={e => setFormData({...formData, dateTime: e.target.value})} 
            />
          </div>

          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Local do Agendamento</label>
            <button 
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all flex items-center justify-between ${isDropdownOpen ? 'border-emerald-500 bg-white ring-4 ring-emerald-50' : 'border-slate-50 bg-slate-50'}`}
            >
              {selectedUnit ? (
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-800 uppercase leading-tight truncate">{selectedUnit.legalName || selectedUnit.name}</p>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5 tracking-tighter">{selectedUnit.city} - {selectedUnit.state}</p>
                </div>
              ) : (
                <span className="text-slate-400 font-bold text-sm uppercase">Selecionar Local...</span>
              )}
              <svg className={`w-4 h-4 text-slate-300 transition-transform ${isDropdownOpen ? 'rotate-180 text-emerald-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 z-[100] overflow-hidden animate-in slide-in-from-top-2">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="BUSCAR TERMINAL..." 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[11px] font-black uppercase outline-none focus:border-emerald-500 transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {filteredUnits.map(unit => (
                    <button 
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        setFormData({...formData, locationId: unit.id, location: unit.name});
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left p-4 rounded-2xl hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-700 uppercase group-hover:text-emerald-800 truncate">{unit.legalName || unit.name}</p>
                        </div>
                        <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase ml-4 shrink-0">{unit.city}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações de Agenda</label>
            <textarea 
              className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-700 text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all h-24 resize-none" 
              value={formData.obs} 
              onChange={e => setFormData({...formData, obs: e.target.value})} 
              placeholder="Ex: Box, Senha de retirada..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button type="button" onClick={onClose} className="py-5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">Cancelar</button>
            <button
              type="submit"
              disabled={isSaving || !formData.locationId}
              className="py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchedulingEditModal;
