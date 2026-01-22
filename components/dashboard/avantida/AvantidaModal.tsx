
import React, { useState, useEffect } from 'react';
import { AvantidaRecord, Driver } from '../../../types';
import { db } from '../../../utils/storage';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import { searchService } from '../../../utils/searchService';

interface AvantidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingRecord?: AvantidaRecord | null;
  drivers: Driver[];
}

const AvantidaModal: React.FC<AvantidaModalProps> = ({ isOpen, onClose, onSuccess, editingRecord, drivers }) => {
  const [form, setForm] = useState<Partial<AvantidaRecord>>({
    date: new Date().toISOString().split('T')[0],
    containerNumber: '',
    exportRef: '',
    requestedPrice: 0,
    customerRef: '',
    tripSettlement: '',
    verified: false,
    driverId: ''
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
        verified: false,
        driverId: ''
      });
    }
  }, [editingRecord, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.driverId) {
      alert("Por favor, localize e selecione um motorista cadastrado no sistema.");
      return;
    }
    setIsSaving(true);
    try {
      const success = await db.saveAvantidaRecord({
        ...form,
        id: editingRecord?.id || `new-${Date.now()}`
      });
      if (success) onSuccess();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";

  const selectedDriver = drivers.find(d => d.id === form.driverId);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[90vh]">
        <header className="p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg">AV</div>
             <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingRecord ? 'Editar Lançamento' : 'Novo Registro Avantida'}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Lançamento de Reutilização</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </header>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-[#fcfdfe]">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                 <label className={labelClass}>Data do Lançamento</label>
                 <input type="date" required className={inputClass} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className={labelClass}>Identificação do Container</label>
                 <input required className={inputClass} value={form.containerNumber} onChange={e => setForm({...form, containerNumber: e.target.value.toUpperCase()})} placeholder="ABCD1234567" />
              </div>
           </div>

           {/* Busca de Motorista do Sistema */}
           <div className="pt-2">
             <AutocompleteSearch 
                label="Motorista Vinculado (Pesquisar no Sistema)"
                placeholder="DIGITE NOME OU PLACA..."
                data={drivers}
                onSelect={(d) => setForm({...form, driverId: d.id})}
                mapToAutocomplete={searchService.mapDriver}
                initialValue={selectedDriver ? selectedDriver.name : ''}
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>}
             />
             {selectedDriver && (
               <div className="mt-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                     <span className="text-[10px] font-black text-blue-700 uppercase">{selectedDriver.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-blue-400">{selectedDriver.plateHorse}</span>
               </div>
             )}
           </div>

           <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                 <label className={labelClass}>Export Ref.</label>
                 <input className={inputClass} value={form.exportRef} onChange={e => setForm({...form, exportRef: e.target.value.toUpperCase()})} placeholder="REFERÊNCIA" />
              </div>
              <div className="space-y-1">
                 <label className={labelClass}>Preço Solicitado (Digitado)</label>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                    <input type="number" step="0.01" required className={`${inputClass} pl-12`} value={form.requestedPrice || ''} onChange={e => setForm({...form, requestedPrice: Number(e.target.value)})} placeholder="0,00" />
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                 <label className={labelClass}>Referência do Cliente</label>
                 <input className={inputClass} value={form.customerRef} onChange={e => setForm({...form, customerRef: e.target.value.toUpperCase()})} placeholder="NOME OU COD. CLIENTE" />
              </div>
              <div className="space-y-1">
                 <label className={labelClass}>Nº Acerto Viagem</label>
                 <input className={inputClass} value={form.tripSettlement} onChange={e => setForm({...form, tripSettlement: e.target.value.toUpperCase()})} placeholder="ID DO ACERTO" />
              </div>
           </div>

           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between mt-6 shadow-inner">
              <div>
                 <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Conferência / Auditoria</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Marque se os dados foram verificados pelo financeiro</p>
              </div>
              <input 
                type="checkbox" 
                checked={form.verified} 
                onChange={e => setForm({...form, verified: e.target.checked})}
                className="w-8 h-8 rounded-xl border-2 border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
              />
           </div>

           <div className="pt-10 pb-4">
              <button 
                disabled={isSaving}
                type="submit" 
                className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Gravando Registro...' : editingRecord ? 'Confirmar Alterações' : 'Salvar no Avantida'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default AvantidaModal;
