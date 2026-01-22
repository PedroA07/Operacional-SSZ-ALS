
import React, { useState, useEffect } from 'react';
import { AvantidaRecord } from '../../../types';
import { db } from '../../../utils/storage';

interface AvantidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRecord?: AvantidaRecord | null;
}

const AvantidaModal: React.FC<AvantidaModalProps> = ({ isOpen, onClose, onSuccess, editingRecord }) => {
  const [containerNumber, setContainerNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContainerNumber(editingRecord?.containerNumber || '');
    }
  }, [editingRecord, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber.trim()) return;

    setIsSaving(true);
    try {
      const success = await db.saveAvantidaRecord({
        id: editingRecord?.id || `new-${Date.now()}`,
        date: editingRecord?.date || new Date().toISOString().split('T')[0],
        containerNumber: containerNumber.toUpperCase().trim(),
        requestedPrice: editingRecord?.requestedPrice || 0,
        exportRef: editingRecord?.exportRef || '',
        customerRef: editingRecord?.customerRef || '',
        tripSettlement: editingRecord?.tripSettlement || '',
        verified: editingRecord?.verified || false,
        driverId: editingRecord?.driverId || '',
        createdAt: editingRecord?.createdAt || new Date().toISOString()
      });
      if (success) {
        setContainerNumber('');
        onSuccess();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <header className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Lançamento de Reuso</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Identificação Unitária</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1 block">Número do Container</label>
            <input 
              required 
              autoFocus
              className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-black uppercase text-xl focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner placeholder:text-slate-300" 
              value={containerNumber} 
              onChange={e => setContainerNumber(e.target.value)} 
              placeholder="ABCD1234567" 
            />
          </div>

          <div className="pt-4">
              <button 
                disabled={isSaving || !containerNumber.trim()}
                type="submit" 
                className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Gravando...' : 'Iniciar Lançamento'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvantidaModal;
