
import React, { useState } from 'react';
import { AvantidaPriceRule } from '../../../types';
import { db } from '../../../utils/storage';
import { CARRIERS } from '../../../constants/carriers';
import CustomSelect from '../../shared/CustomSelect';

interface AvantidaPriceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rules: AvantidaPriceRule[];
}

const AvantidaPriceConfigModal: React.FC<AvantidaPriceConfigModalProps> = ({ isOpen, onClose, onSuccess, rules }) => {
  const [shippingLine, setShippingLine] = useState('');
  const [priceDisplay, setPriceDisplay] = useState(''); // String formatada para o usuário
  const [isSaving, setIsSaving] = useState(false);

  // Função para formatar número para Moeda Brasileira durante a digitação
  const handlePriceChange = (value: string) => {
    // Remove tudo que não for número
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setPriceDisplay('');
      return;
    }

    // Converte para decimal (centavos)
    const amount = (parseInt(digits) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    setPriceDisplay(amount);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Converte a string "1.250,00" para o número 1250.00
    const numericPrice = parseFloat(priceDisplay.replace(/\./g, '').replace(',', '.'));
    
    if (!shippingLine || isNaN(numericPrice)) {
      alert("Por favor, selecione um armador e digite um valor válido.");
      return;
    }

    setIsSaving(true);
    try {
      const existingRule = rules.find(r => r.shippingLine.toUpperCase() === shippingLine.toUpperCase());
      
      const success = await db.saveAvantidaPrice({
        id: existingRule?.id,
        shippingLine: shippingLine,
        price: numericPrice
      });

      if (success) {
        setShippingLine('');
        setPriceDisplay('');
        onSuccess();
      }
    } catch (err: any) {
      console.error("Erro técnico:", err);
      if (err.code === '42501' || err.status === 401) {
         alert("ERRO DE PERMISSÃO (401): Verifique se as políticas de RLS no Supabase foram desativadas para esta tabela.");
      } else {
         alert(`ERRO AO SALVAR: ${err.message || 'Falha de comunicação.'}`);
      }
    } finally {
      setIsSaving(false);
    }
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
              <CustomSelect
                required
                value={shippingLine}
                onChange={v => setShippingLine(v)}
                placeholder="SELECIONE..."
                options={CARRIERS.map(c => ({ value: c.name, label: c.name.toUpperCase() }))}
                inputClassName="w-full px-4 py-3 rounded-xl border border-blue-100 bg-white text-[10px] font-bold uppercase outline-none focus:ring-4 focus:ring-blue-500/10"
              />
           </div>
           <div className="w-40 space-y-1">
              <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest ml-1">Preço (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">R$</span>
                <input 
                  required
                  type="text"
                  inputMode="numeric"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-blue-100 bg-white text-[11px] font-black text-emerald-600 outline-none"
                  placeholder="0,00"
                  value={priceDisplay}
                  onChange={e => handlePriceChange(e.target.value)}
                />
              </div>
           </div>
           <button 
             disabled={isSaving || !shippingLine || !priceDisplay}
             type="submit"
             className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
           >
             {isSaving ? 'Gravando...' : 'Salvar Preço'}
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
                         <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Sincronizado via Cloud</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <span className="text-sm font-black text-emerald-600">R$ {rule.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50">
                   <p className="text-[10px] font-black text-slate-300 uppercase italic">Nenhum preço configurado</p>
                </div>
              )}
           </div>
        </div>
        
        <footer className="p-6 bg-slate-50 border-t text-center shrink-0">
           <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em]">ALS TRANSPORTES • SISTEMA DE PRECIFICAÇÃO</p>
        </footer>
      </div>
    </div>
  );
};

export default AvantidaPriceConfigModal;
