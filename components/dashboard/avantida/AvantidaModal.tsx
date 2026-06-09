
import React, { useState, useEffect, useRef } from 'react';
import { AvantidaRecord, AvantidaStatus, AvantidaPriceRule } from '../../../types';
import { db } from '../../../utils/storage';
import { lookupCarrierByContainer } from '../../../utils/carrierService';
import { CARRIERS } from '../../../constants/carriers';
import { showToast } from '../../shared/SimpleToast';
import DatePicker from '../../shared/DatePicker';
import CustomSelect from '../../shared/CustomSelect';

interface AvantidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRecord?: AvantidaRecord | null;
  priceRules?: AvantidaPriceRule[];
}

const AvantidaModal: React.FC<AvantidaModalProps> = ({ isOpen, onClose, onSuccess, editingRecord, priceRules = [] }) => {
  const [isSaving, setIsSaving] = useState(false);
  const lastDetectedCarrier = useRef<string | null>(null);

  // Estados dos campos
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [containerNumber, setContainerNumber] = useState('');
  const [shippingLine, setShippingLine] = useState('');
  const [status, setStatus] = useState<AvantidaStatus>('EM ANÁLISE');
  const [importLocation, setImportLocation] = useState('SÃO PAULO');
  const [reuseDate, setReuseDate] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('0,00');

  // REF CRÍTICA: Bloqueia resets durante digitação (sync do pai)
  const hasInitialized = useRef<string | null>(null);

  // Inicialização do Modal
  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = null;
      return;
    }

    const currentId = editingRecord?.id || 'new_avantida';
    if (hasInitialized.current === currentId) return;

    if (editingRecord) {
      setDate(editingRecord.date);
      setContainerNumber(editingRecord.containerNumber);
      setShippingLine(editingRecord.shippingLine);
      setStatus(editingRecord.status || 'EM ANÁLISE');
      setImportLocation(editingRecord.importLocation || 'SÃO PAULO');
      setReuseDate(editingRecord.reuseDate || '');
      
      const initialPrice = editingRecord.requestedPrice || 0;
      setPriceDisplay(initialPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      lastDetectedCarrier.current = editingRecord.shippingLine;
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setContainerNumber('');
      setShippingLine('');
      setStatus('EM ANÁLISE');
      setImportLocation('SÃO PAULO');
      setReuseDate('');
      setPriceDisplay('0,00');
      lastDetectedCarrier.current = null;
    }

    hasInitialized.current = currentId;
  }, [editingRecord, isOpen]);

  // Função auxiliar para buscar e aplicar preço
  const applyPriceRule = (carrierName: string) => {
    const rule = priceRules.find(r => r.shippingLine.toUpperCase() === carrierName.toUpperCase());
    if (rule) {
      setPriceDisplay(rule.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  };

  // 1. Detecção Automática via Container (ISO 6346)
  useEffect(() => {
    const container = containerNumber.toUpperCase().trim();
    if (container.length >= 4) {
      const carrier = lookupCarrierByContainer(container);
      if (carrier && carrier.name !== lastDetectedCarrier.current) {
        setShippingLine(carrier.name);
        lastDetectedCarrier.current = carrier.name;
        applyPriceRule(carrier.name);
      }
    }
  }, [containerNumber, priceRules]);

  // 2. Reação à mudança manual do Armador (Shipping Line)
  const handleShippingLineChange = (val: string) => {
    const upperVal = val.toUpperCase();
    setShippingLine(upperVal);
    applyPriceRule(upperVal);
  };

  const handlePriceChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setPriceDisplay('0,00');
      return;
    }
    const amount = (parseInt(digits) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setPriceDisplay(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber.trim()) return;

    const numericPrice = parseFloat(priceDisplay.replace(/\./g, '').replace(',', '.')) || 0;

    setIsSaving(true);
    try {
      const success = await db.saveAvantidaRecord({
        id: editingRecord?.id || `new-${Date.now()}`,
        date,
        containerNumber: containerNumber.toUpperCase().trim(),
        exportRef: editingRecord?.exportRef || '',
        requestedPrice: numericPrice,
        customerRef: editingRecord?.customerRef || '',
        tripSettlement: editingRecord?.tripSettlement || '',
        verified: editingRecord?.verified || false,
        driverId: editingRecord?.driverId || '',
        createdAt: editingRecord?.createdAt || new Date().toISOString(),
        shippingLine: shippingLine.toUpperCase(),
        importLocation: importLocation.toUpperCase(),
        reuseDate: (reuseDate && reuseDate.trim() !== "") ? reuseDate : undefined,
        status
      });

      if (success) {
        showToast('Registro Avantida salvo com sucesso!', 'success');
        onSuccess();
      }
    } catch (err: any) {
      showToast(`Falha ao salvar: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
             </div>
             <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Lançamento Avantida</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão Automática de Preços</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 rounded-full transition-all shadow-sm active:scale-90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Data do Pedido</label>
              <DatePicker value={date} onChange={setDate} placeholder="Data do pedido..." />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Data de Reuso</label>
              <DatePicker value={reuseDate} onChange={setReuseDate} placeholder="Data de reuso..." />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Número do Container</label>
            <input 
              required 
              autoFocus
              className={`${inputClass} text-lg font-black font-mono border-blue-100`} 
              value={containerNumber} 
              onChange={e => setContainerNumber(e.target.value.toUpperCase())} 
              placeholder="ABCD1234567" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Armador (Shipping Line)</label>
              <div className="relative group">
                <input 
                  list="carrier-list"
                  required
                  className={`${inputClass} bg-blue-50/20 border-blue-50`}
                  value={shippingLine} 
                  onChange={e => handleShippingLineChange(e.target.value)} 
                  placeholder="DIGITE OU SELECIONE..." 
                />
                <datalist id="carrier-list">
                  {CARRIERS.map(c => <option key={c.name} value={c.name} />)}
                </datalist>
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Preço de Reuso (Sugestão)</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 group-focus-within:text-blue-500 transition-colors">R$</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  required
                  className={`${inputClass} pl-12 text-emerald-600 font-black text-lg border-emerald-100`}
                  value={priceDisplay} 
                  onChange={e => handlePriceChange(e.target.value)} 
                />
              </div>
              <p className="text-[7px] font-black text-slate-400 uppercase mt-1.5 ml-1 italic">* Valor preenchido conforme regra do armador.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Localização Importação</label>
              <input required className={inputClass} value={importLocation} onChange={e => setImportLocation(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Estado da Solicitação</label>
              <CustomSelect
                value={status}
                onChange={v => setStatus(v as AvantidaStatus)}
                options={[
                  { value: 'EM ANÁLISE', label: 'EM ANÁLISE' },
                  { value: 'APROVADO', label: 'APROVADO' },
                  { value: 'RECUSADO', label: 'RECUSADO' },
                ]}
                inputClassName={`${inputClass} cursor-pointer`}
              />
            </div>
          </div>

          <div className="pt-4">
              <button
                disabled={isSaving || !containerNumber.trim()}
                type="submit"
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? 'Gravando...' : 'Gravar Registro Avantida'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvantidaModal;
