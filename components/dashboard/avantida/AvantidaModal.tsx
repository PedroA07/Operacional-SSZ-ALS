
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
  const [form, setForm] = useState<Partial<AvantidaRecord>>({
    date: new Date().toISOString().split('T')[0],
    containerNumber: '',
    exportRef: '',
    requestedPrice: 0,
    customerRef: '',
    tripSettlement: '',
    verified: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setForm(editingRecord);
    } else {
      setForm({
        date: new Date().toISOString().split('T')[0],
        containerNumber: '',
        exportRef: '',
        requestedPrice: 0,
        customerRef: '',
        tripSettlement: '',
        verified: false
      });
    }
  }, [editingRecord, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await db.saveAvantidaRecord({
      ...form,
      id: editingRecord?.id || `new-${Date.now()}`
    });
    if (success) onSuccess();
    setIsSaving(false);
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[90vh]">
        <header className="p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-emerald-400 font-black italic shadow-lg">AV</div>
             <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingRecord ? 'Editar Lançamento' : 'Novo Registro Avantida'}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Controle de Reutilização</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </header>

        <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-[#fcfdfe]">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                 <label className={labelClass}>Data do Pedido</label>
                 <input type="date" required className={inputClass} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className={labelClass}>Nº do Container</label>
                 <input required className={inputClass} value={form.containerNumber} onChange={e => setForm({...form, containerNumber: e.target.value.toUpperCase()})} placeholder="ABCD1234567" />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                 <label className={labelClass}>Exportar Ref.</label>
                 <input className={inputClass} value={form.exportRef} onChange={e => setForm({...form, exportRef: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-1">
                 <label className={labelClass}>Preço Pedido (R$)</label>
                 <input type="number" step="0.01" required className={inputClass} value={form.requestedPrice} onChange={e => setForm({...form, requestedPrice: Number(e.target.value)})} />
              </div>
           </div>

           <div className="space-y-1 pt-4 border-t border-slate-100">
              <label className={labelClass}>Referência do Cliente</label>
              <input className={inputClass} value={form.customerRef} onChange={e => setForm({...form, customerRef: e.target.value.toUpperCase()})} placeholder="NOME OU COD. CLIENTE" />
           </div>

           <div className="space-y-1">
              <label className={labelClass}>Acerto de Viagem (Motorista)</label>
              <input className={inputClass} value={form.tripSettlement} onChange={e => setForm({...form, tripSettlement: e.target.value.toUpperCase()})} placeholder="ID ACERTO OU OBSERVAÇÃO" />
           </div>

           <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between mt-6">
              <div>
                 <p className="text-[10px] font-black text-slate-800 uppercase">Conferência / Verificado</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Marque se os dados foram validados pelo operacional</p>
              </div>
              <input 
                type="checkbox" 
                checked={form.verified} 
                onChange={e => setForm({...form, verified: e.target.checked})}
                className="w-7 h-7 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
           </div>

           <div className="pt-10">
              <button 
                disabled={isSaving}
                type="submit" 
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Gravando Registro...' : 'Salvar no Avantida'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default AvantidaModal;
