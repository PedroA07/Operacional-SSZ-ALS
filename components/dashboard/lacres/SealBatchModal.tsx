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
    // Regex aprimorada: O prefixo de letras ([A-Z]*) agora é opcional (?)
    // Isso permite lacres como "12345" ou "MLBR12345"
    const matchStart = start.trim().match(/^([A-Z]*)(\d+)$/i);
    const matchEnd = end.trim().match(/^([A-Z]*)(\d+)$/i);

    if (!matchStart || !matchEnd) return [];
    
    const prefixStart = matchStart[1].toUpperCase();
    const prefixEnd = matchEnd[1].toUpperCase();
    
    if (prefixStart !== prefixEnd) {
      alert("Os prefixos de letras do início e fim devem ser iguais.");
      return [];
    }

    const numStart = parseInt(matchStart[2]);
    const numEnd = parseInt(matchEnd[2]);
    const len = matchStart[2].length;

    if (numEnd < numStart) {
      alert("O número final não pode ser menor que o inicial.");
      return [];
    }

    const records = [];
    for (let i = numStart; i <= numEnd; i++) {
      const numStr = i.toString().padStart(len, '0');
      records.push({ sealNumber: `${prefixStart}${numStr}` });
    }
    return records;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const records = generateSequence(form.start, form.end);
    
    if (records.length === 0) {
      setIsSaving(false);
      return;
    }

    if (records.length > 1000) {
      alert("O limite máximo por lote é de 1000 unidades.");
      setIsSaving(false);
      return;
    }

    try {
      const success = await db.saveSealBatch({
        id: '',
        carrier: form.carrier.toUpperCase().trim(),
        startNumber: form.start.toUpperCase().trim(),
        endNumber: form.end.toUpperCase().trim(),
        createdAt: ''
      }, records);

      if (success) {
        setForm({ carrier: '', start: '', end: '' });
        onSuccess();
      } else {
        alert("Erro ao gravar no banco de dados. Verifique a conexão.");
      }
    } catch (err) {
      console.error("Erro no salvamento do lote:", err);
      alert("Falha crítica ao processar o lote.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-700 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <header className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Novo Lote de Lacres</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Geração Automática de Sequência</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className={labelClass}>Armador / Dono do Lote</label>
            <input 
              required 
              className={inputClass} 
              value={form.carrier} 
              onChange={e => setForm({...form, carrier: e.target.value})} 
              placeholder="EX: ALIANÇA, MSC, MAERSK" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Nº Lacre Inicial</label>
              <input 
                required 
                className={inputClass} 
                value={form.start} 
                onChange={e => setForm({...form, start: e.target.value})} 
                placeholder="MLBR139071 ou 1000" 
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Nº Lacre Final</label>
              <input 
                required 
                className={inputClass} 
                value={form.end} 
                onChange={e => setForm({...form, end: e.target.value})} 
                placeholder="MLBR139360 ou 1100" 
              />
            </div>
          </div>

          <div className="pt-6">
             <button 
               disabled={isSaving}
               type="submit" 
               className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
             >
               {isSaving ? (
                 <>
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span>Gerando Lote...</span>
                 </>
               ) : 'Criar Pasta de Lacres'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SealBatchModal;