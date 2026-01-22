
import React, { useState } from 'react';
import { AvantidaPriceRule } from '../../../types';
import { db } from '../../../utils/storage';
import { CARRIERS } from '../../../constants/carriers';

interface AvantidaPriceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rules: AvantidaPriceRule[];
}

const AvantidaPriceConfigModal: React.FC<AvantidaPriceConfigModalProps> = ({ isOpen, onClose, onSuccess, rules }) => {
  const [form, setForm] = useState({ shippingLine: '', price: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shippingLine || form.price <= 0) return;

    setIsSaving(true);
    const success = await db.saveAvantidaPrice({
      shippingLine: form.shippingLine,
      price: form.price
    });

    if (success) {
      setForm({ shippingLine: '', price: 0 });
      onSuccess();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover regra de preço?')) {
      await db.deleteAvantidaPrice(id);
      onSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[85vh]">
        <header className="p-8 bg-slate-50 border-b flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Tabela de Preços Avantida</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Defina o custo fixo por tipo de armador</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </header>

        <form onSubmit={handleAdd} className="p-8 bg-blue-50/30 border-b border-blue-100 flex flex-wrap items-end gap-4 shrink-0">
           <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest ml-1">Selecionar Armador</label>
              <select 
                required
                className="w-full px-4 py-3 rounded-xl border border-blue-100 bg-white text-[10px] font-bold uppercase outline-none focus:ring-4 focus:ring-blue-500/10"
                value={form.shippingLine}
                onChange={e => setForm({...form, shippingLine: e.target.value})}
              >
                <option value="">SELECIONE...</option>
                {CARRIERS.map(c => (
                  <option key={c.name} value={c.name}>{c.name.toUpperCase()}</option>
                ))}
              </select>
           </div>
           <div className="w-32 space-y-1">
              <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest ml-1">Preço (R$)</label>
              <input 
                required
                type="number"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-blue-100 bg-white text-[10px] font-bold uppercase outline-none"
                value={form.price}
                onChange={e => setForm({...form, price: Number(e.target.value)})}
              />
           </div>
           <button 
             disabled={isSaving || !form.shippingLine}
             type="submit"
             className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
           >
             Vincular Preço
           </button>
        </form>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           <div className="space-y-2">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors group">
                   <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[9px]">
                         {rule.shippingLine.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                         <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{rule.shippingLine}</p>
                         <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Atualizado em: {new Date(rule.updatedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <span className="text-sm font-black text-emerald-600">R$ {rule.price.toFixed(2)}</span>
                      <button 
                        onClick={() => handleDelete(rule.id)}
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                      </button>
                   </div>
                </div>
              ))}
              {rules.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50">
                   <p className="text-[10px] font-black text-slate-300 uppercase italic">Nenhum preço configurado</p>
                </div>
              )}
           </div>
        </div>
        
        <footer className="p-6 bg-slate-50 border-t text-center shrink-0">
           <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">ALS TRANSPORTES • PRICING ENGINE</p>
        </footer>
      </div>
    </div>
  );
};

export default AvantidaPriceConfigModal;
