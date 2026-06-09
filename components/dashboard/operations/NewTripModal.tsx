import React, { useState, useEffect } from 'react';
import { Trip, Driver, Customer, Category, TripStatus, OperationType } from '../../../types';
import { db } from '../../../utils/storage';
import CustomSelect from '../../shared/CustomSelect';
import DateTimePicker from '../../shared/DateTimePicker';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  drivers: Driver[];
  customers: Customer[];
  categories: Category[];
}

const NewTripModal: React.FC<NewTripModalProps> = ({ isOpen, onClose, onSuccess, drivers, customers, categories }) => {
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);

  const getDefaultType = (types: OperationType[]) => {
    const saved = localStorage.getItem('defaultOperationType');
    if (saved) {
      const found = types.find(t => t.id === saved);
      if (found) return found.name;
    }
    return types[0]?.name || 'EXPORTAÇÃO';
  };

  const getCategoryForType = (typeName: string, types: OperationType[]) => {
    const op = types.find(t => t.name === typeName);
    if (!op?.config?.defaultCategoryId) return '';
    const cat = categories.find(c => c.id === op.config!.defaultCategoryId);
    return cat?.name || '';
  };

  const [form, setForm] = useState<Partial<Trip>>({
    os: '', booking: '', ship: '', dateTime: '', type: 'EXPORTAÇÃO', status: 'Pendente',
    category: '', subCategory: '', container: '', tara: '', seal: '', cva: ''
  });

  useEffect(() => {
    db.getOperationTypes().then(types => {
      if (types && types.length > 0) {
        setOperationTypes(types);
        const defType = getDefaultType(types);
        const defCategory = getCategoryForType(defType, types);
        setForm(prev => ({ ...prev, type: defType, category: defCategory || prev.category }));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tripId = `trip-${Date.now()}`;
    const now = new Date().toISOString();
    
    await db.saveTrip({
      ...form,
      id: tripId,
      isLate: false,
      documents: [],
      advancePayment: { status: 'BLOQUEADO' },
      balancePayment: { status: 'AGUARDANDO_DOCS' },
      // REGRA: Status Pendente com horário da criação
      statusHistory: [{ status: 'Pendente' as TripStatus, dateTime: now, createdAt: now }]
    } as any);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";
  const labelBlueClass = "text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300";
  const selectClass = "w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Nova Programação</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registro de viagem operacional</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 rounded-full transition-all shadow-sm active:scale-90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Row 0: Tipo de Programação */}
          <div>
            <label className={labelClass}>Tipo de Programação</label>
            <CustomSelect
              required
              value={form.type || ''}
              onChange={v => {
                const autoCategory = getCategoryForType(v, operationTypes);
                setForm(prev => ({ ...prev, type: v, category: autoCategory || prev.category || '' }));
              }}
              placeholder="Selecione..."
              options={
                operationTypes.length > 0
                  ? operationTypes.map(t => ({ value: t.name, label: t.name }))
                  : [
                      { value: 'EXPORTAÇÃO', label: 'EXPORTAÇÃO' },
                      { value: 'IMPORTAÇÃO', label: 'IMPORTAÇÃO' },
                      { value: 'COLETA', label: 'COLETA' },
                      { value: 'ENTREGA', label: 'ENTREGA' },
                      { value: 'CABOTAGEM', label: 'CABOTAGEM' },
                    ]
              }
              inputClassName={selectClass}
            />
          </div>

          {/* Row 1: Vínculo / Sub-vínculo */}
          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <label className={labelClass}>
                Vínculo Operacional
                {form.category && getCategoryForType(form.type || '', operationTypes) === form.category && (
                  <span className="ml-2 text-[8px] text-blue-400 normal-case font-bold animate-pulse">✓ automático</span>
                )}
              </label>
              <CustomSelect
                required
                value={form.category || ''}
                onChange={v => setForm({...form, category: v})}
                placeholder="Selecione..."
                options={categories.filter(c => !c.parentId).map(c => ({ value: c.name, label: c.name }))}
                inputClassName={selectClass}
              />
            </div>
            <div className="relative">
              <label className={labelClass}>Sub-vínculo</label>
              <CustomSelect
                value={form.subCategory || ''}
                onChange={v => setForm({...form, subCategory: v})}
                placeholder="Nenhuma"
                options={categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === form.category).map(c => ({ value: c.name, label: c.name }))}
                inputClassName={selectClass}
              />
            </div>
          </div>

          {/* Row 2: OS / Date */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Nº OS</label>
              <input required className={inputClass} value={form.os} onChange={e => setForm({...form, os: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Data/Hora Programação</label>
              <DateTimePicker
                required
                value={form.dateTime || ''}
                onChange={v => setForm({...form, dateTime: v})}
                placeholder="Data/Hora Programação..."
                inputClassName="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold focus:border-blue-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 3: Customer (Full Width) */}
          <div className="relative">
            <label className={labelBlueClass}>Cliente</label>
            <CustomSelect
              required
              value={form.customer?.id || ''}
              onChange={v => {
                const c = customers.find(cust => cust.id === v);
                if (c) setForm({...form, customer: { id: c.id, name: c.name, city: c.city, state: c.state }});
              }}
              placeholder="Selecione o cliente..."
              options={customers.map(c => ({ value: c.id, label: c.name }))}
              inputClassName={selectClass}
            />
          </div>

          {/* Row 4: Container / CVA */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Container</label>
              <input required className={inputClass} value={form.container} onChange={e => setForm({...form, container: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>CVA (Certificado)</label>
              <input className={inputClass} value={form.cva} onChange={e => setForm({...form, cva: e.target.value.toUpperCase()})} />
            </div>
          </div>

          {/* Row 5: Tara / Lacre */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Tara</label>
              <input className={inputClass} value={form.tara} onChange={e => setForm({...form, tara: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Lacre</label>
              <input className={inputClass} value={form.seal} onChange={e => setForm({...form, seal: e.target.value.toUpperCase()})} />
            </div>
          </div>

          {/* Row 6: Driver (Full Width) */}
          <div className="relative">
            <label className={labelBlueClass}>Motorista</label>
            <CustomSelect
              required
              value={form.driver?.id || ''}
              onChange={v => {
                const d = drivers.find(drv => drv.id === v);
                if (d) setForm({...form, driver: { id: d.id, name: d.name, plateHorse: d.plateHorse, plateTrailer: d.plateTrailer, status: 'Pronto', cpf: d.cpf, phone: d.phone }});
              }}
              placeholder="Selecione o motorista..."
              options={drivers.map(d => ({ value: d.id, label: `${d.name} (${d.plateHorse})` }))}
              inputClassName={selectClass}
            />
          </div>

          {/* Row 7: Ship / Booking */}
          <div className="grid grid-cols-2 gap-6 pb-6">
            <div>
              <label className={labelClass}>Navio</label>
              <input className={inputClass} value={form.ship} onChange={e => setForm({...form, ship: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Booking</label>
              <input className={inputClass} value={form.booking} onChange={e => setForm({...form, booking: e.target.value.toUpperCase()})} />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-[0.98]">
            Salvar Programação
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewTripModal;