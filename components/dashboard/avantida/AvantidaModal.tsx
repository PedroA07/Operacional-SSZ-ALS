
import React, { useState, useEffect } from 'react';
import { AvantidaRecord, AvantidaStatus } from '../../../types';
import { db } from '../../../utils/storage';
import { lookupCarrierByContainer } from '../../../utils/carrierService';

interface AvantidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRecord?: AvantidaRecord | null;
}

const AvantidaModal: React.FC<AvantidaModalProps> = ({ isOpen, onClose, onSuccess, editingRecord }) => {
  const [isSaving, setIsSaving] = useState(false);

  // Estados dos campos
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [containerNumber, setContainerNumber] = useState('');
  const [shippingLine, setShippingLine] = useState('');
  const [status, setStatus] = useState<AvantidaStatus>('EM ANÁLISE');
  const [importLocation, setImportLocation] = useState('SÃO PAULO');
  const [reuseDate, setReuseDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingRecord) {
        setDate(editingRecord.date);
        setContainerNumber(editingRecord.containerNumber);
        setShippingLine(editingRecord.shippingLine);
        setStatus(editingRecord.status || 'EM ANÁLISE');
        setImportLocation(editingRecord.importLocation || 'SÃO PAULO');
        setReuseDate(editingRecord.reuseDate || '');
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setContainerNumber('');
        setShippingLine('');
        setStatus('EM ANÁLISE');
        setImportLocation('SÃO PAULO');
        setReuseDate('');
      }
    }
  }, [editingRecord, isOpen]);

  // Efeito para preencher armador automaticamente
  useEffect(() => {
    if (containerNumber.length >= 4) {
      const carrier = lookupCarrierByContainer(containerNumber.toUpperCase());
      if (carrier) setShippingLine(carrier.name);
    }
  }, [containerNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber.trim()) return;

    setIsSaving(true);
    try {
      const container = containerNumber.toUpperCase().trim();
      
      const success = await db.saveAvantidaRecord({
        id: editingRecord?.id || `new-${Date.now()}`,
        date,
        containerNumber: container,
        exportRef: editingRecord?.exportRef || '',
        requestedPrice: editingRecord?.requestedPrice || 0,
        customerRef: editingRecord?.customerRef || '',
        tripSettlement: editingRecord?.tripSettlement || '',
        verified: editingRecord?.verified || false,
        driverId: editingRecord?.driverId || '',
        createdAt: editingRecord?.createdAt || new Date().toISOString(),
        shippingLine: shippingLine.toUpperCase(),
        importLocation: importLocation.toUpperCase(),
        reuseDate,
        status
      });

      if (success) {
        onSuccess();
      }
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
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Gestão de Reuso Avantida</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Formulário de Controle de Solicitação</p>
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

          <div className="space-y-1">
            <label className={labelClass}>Armador / Linha de Expedição</label>
            <input 
              required
              className={`${inputClass} bg-blue-50/20 border-blue-50`}
              value={shippingLine} 
              onChange={e => setShippingLine(e.target.value.toUpperCase())} 
              placeholder="AUTODETECTAR..." 
            />
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
                {isSaving ? 'Sincronizando...' : 'Gravar Registro'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvantidaModal;
