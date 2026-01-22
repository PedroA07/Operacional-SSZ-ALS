
import React, { useState, useEffect, useRef } from 'react';
import { AvantidaRecord, AvantidaStatus, AvantidaPriceRule } from '../../../types';
import { db } from '../../../utils/storage';
import { lookupCarrierByContainer } from '../../../utils/carrierService';

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
  const [priceDisplay, setPriceDisplay] = useState(''); // Estado para máscara de moeda

  useEffect(() => {
    if (isOpen) {
      if (editingRecord) {
        setDate(editingRecord.date);
        setContainerNumber(editingRecord.containerNumber);
        setShippingLine(editingRecord.shippingLine);
        setStatus(editingRecord.status || 'EM ANÁLISE');
        setImportLocation(editingRecord.importLocation || 'SÃO PAULO');
        setReuseDate(editingRecord.reuseDate || '');
        
        // Formata o preço vindo do banco para a máscara BRL
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
    }
  }, [editingRecord, isOpen]);

  // Função para máscara de moeda em tempo real
  const handlePriceChange = (value: string) => {
    // Remove tudo que não for número
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setPriceDisplay('0,00');
      return;
    }
    // Converte para centavos e formata
    const amount = (parseInt(digits) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setPriceDisplay(amount);
  };

  // Efeito inteligente para preenchimento automático baseado no container
  useEffect(() => {
    const container = containerNumber.toUpperCase().trim();
    if (container.length >= 4) {
      const carrier = lookupCarrierByContainer(container);
      
      if (carrier && carrier.name !== lastDetectedCarrier.current) {
        setShippingLine(carrier.name);
        lastDetectedCarrier.current = carrier.name;
        
        // Busca preço padrão para este armador
        const rule = priceRules.find(r => r.shippingLine.toUpperCase() === carrier.name.toUpperCase());
        if (rule) {
          setPriceDisplay(rule.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      } else if (!carrier && container.length === 4) {
          lastDetectedCarrier.current = null;
      }
    }
  }, [containerNumber, priceRules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber.trim()) return;

    // Converte máscara "1.250,00" -> 1250.00 (Número puro para o banco)
    const numericPrice = parseFloat(priceDisplay.replace(/\./g, '').replace(',', '.')) || 0;

    setIsSaving(true);
    try {
      const container = containerNumber.toUpperCase().trim();
      
      const success = await db.saveAvantidaRecord({
        id: editingRecord?.id || `new-${Date.now()}`,
        date,
        containerNumber: container,
        exportRef: editingRecord?.exportRef || '',
        requestedPrice: numericPrice,
        customerRef: editingRecord?.customerRef || '',
        tripSettlement: editingRecord?.tripSettlement || '',
        verified: editingRecord?.verified || false,
        driverId: editingRecord?.driverId || '',
        createdAt: editingRecord?.createdAt || new Date().toISOString(),
        shippingLine: shippingLine.toUpperCase(),
        importLocation: importLocation.toUpperCase(),
        reuseDate: (reuseDate && reuseDate.trim() !== "") ? reuseDate : null,
        status
      });

      if (success) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      alert(`Falha ao salvar registro: ${err.message || 'Erro de comunicação.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const labelClass = "text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner placeholder:text-slate-300";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <header className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Lançamento Avantida</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Gestão de Custos e Reuso</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Data do Pedido</label>
              <input 
                type="date"
                required
                className={inputClass}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Data de Reutilização</label>
              <input 
                type="date"
                className={inputClass}
                value={reuseDate}
                onChange={e => setReuseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Número do Container</label>
            <input 
              required 
              autoFocus
              className={`${inputClass} text-lg font-black font-mono`} 
              value={containerNumber} 
              onChange={e => setContainerNumber(e.target.value.toUpperCase())} 
              placeholder="ABCD1234567" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Armador / Linha</label>
              <input 
                required
                className={`${inputClass} bg-blue-50/20 border-blue-50`}
                value={shippingLine} 
                onChange={e => setShippingLine(e.target.value.toUpperCase())} 
                placeholder="AUTODETECTAR..." 
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Valor do Reuso (R$)</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 group-focus-within:text-blue-500 transition-colors">R$</span>
                <input 
                  type="text"
                  inputMode="numeric"
                  required
                  className={`${inputClass} pl-12 text-emerald-600 font-black text-lg`}
                  value={priceDisplay} 
                  onChange={e => handlePriceChange(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Localização Importação</label>
              <input 
                required
                className={inputClass}
                value={importLocation}
                onChange={e => setImportLocation(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Estado da Solicitação</label>
              <select 
                className={`${inputClass} appearance-none cursor-pointer`}
                value={status}
                onChange={e => setStatus(e.target.value as AvantidaStatus)}
              >
                <option value="EM ANÁLISE">EM ANÁLISE</option>
                <option value="APROVADO">APROVADO</option>
                <option value="RECUSADO">RECUSADO</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
              <button 
                disabled={isSaving || !containerNumber.trim()}
                type="submit" 
                className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Gravando...' : 'Gravar Registro'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvantidaModal;
