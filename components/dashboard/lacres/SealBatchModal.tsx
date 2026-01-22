
import React, { useState } from 'react';
import { db } from '../../../utils/storage';

interface SealBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SealBatchModal: React.FC<SealBatchModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ carrier: '', start: '', end: '' });
  const [isSaving, setIsSaving] = useState(false);

  const generateSequence = (start: string, end: string) => {
    // Regex para separar letras de números (ex: MLBR139071 -> MLBR e 139071)
    const matchStart = start.match(/^([A-Z]+)(\d+)$/i);
    const matchEnd = end.match(/^([A-Z]+)(\d+)$/i);

    if (!matchStart || !matchEnd) return [];
    
    const prefix = matchStart[1].toUpperCase();
    const numStart = parseInt(matchStart[2]);
    const numEnd = parseInt(matchEnd[2]);
    const len = matchStart[2].length;

    const records = [];
    for (let i = numStart; i <= numEnd; i++) {
      const numStr = i.toString().padStart(len, '0');
      records.push({ sealNumber: `${prefix}${numStr}` });
    }
    return records;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const records = generateSequence(form.start, form.end);
    if (records.length === 0) {
      alert("Formato de lacre inválido. Use Ex: MLBR12345");
      setIsSaving(false);
      return;
    }

    if (records.length > 500) {
      if (!confirm(`Isso gerará ${records.length} lacres. Continuar?`)) {
        setIsSaving(false);
        return;
      }
    }

    const success = await db.saveSealBatch({
      id: '',
      carrier: form.carrier.toUpperCase(),
      startNumber: form.start.toUpperCase(),
      endNumber: form.end.toUpperCase(),
      createdAt: ''
    }, records);

    if (success) onSuccess();
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <header className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Novo Lote de Lacres</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Geração Automática de Sequência</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </header>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Armador / Dono do Lote</label>
            <input required className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-700 font-bold uppercase focus:border-blue-500 outline-none" value={form.carrier} onChange={e => setForm({...form, carrier: e.target.value})} placeholder="EX: ALIANÇA, MSC, MAERSK" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Nº Lacre Inicial</label>
              <input required className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-700 font-bold uppercase focus:border-blue-500 outline-none" value={form.start} onChange={e => setForm({...form, start: e.target.value})} placeholder="MLBR139071" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Nº Lacre Final</label>
              <input required className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-700 font-bold uppercase focus:border-blue-500 outline-none" value={form.end} onChange={e => setForm({...form, end: e.target.value})} placeholder="MLBR139360" />
            </div>
          </div>

          <div className="pt-6">
             <button 
               disabled={isSaving}
               type="submit" 
               className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
             >
               {isSaving ? 'Gerando Lote...' : 'Criar Pasta de Lacres'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SealBatchModal;
