
import React, { useState } from 'react';
import { Trip, Driver, Customer, Category } from '../../../types';
import { db } from '../../../utils/storage';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  drivers: Driver[];
  customers: Customer[];
  categories: Category[];
}

const NewTripModal: React.FC<NewTripModalProps> = ({ isOpen, onClose, onSuccess, drivers, customers, categories }) => {
  const [form, setForm] = useState<Partial<Trip>>({
    os: '', booking: '', ship: '', dateTime: '', type: 'EXPORTAÇÃO', status: 'Pendente',
    category: '', subCategory: '', container: '', tara: '', seal: '', cva: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tripId = `trip-${Date.now()}`;
    await db.saveTrip({
      ...form,
      id: tripId,
      isLate: false,
      documents: [],
      advancePayment: { status: 'BLOQUEADO' },
      balancePayment: { status: 'AGUARDANDO_DOCS' }
    } as any);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelBlueClass = "text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1.5 block";
  const inputClass = "w-full px-4 py-3.5 rounded-xl border-none bg-[#333333] text-white font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500";
  const selectClass = "w-full px-4 py-3.5 rounded-xl border-none bg-[#333333] text-white font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-[#f8fafc] w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.2em]">Nova Programação</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-12 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Row 1: Category / Subcategory */}
          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <label className={labelClass}>Categoria</label>
              <select required className={selectClass} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="">Selecione...</option>
                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <div className="absolute right-4 top-[38px] pointer-events-none text-slate-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
              </div>
            </div>
            <div className="relative">
              <label className={labelClass}>Subcategoria</label>
              <select className={selectClass} value={form.subCategory} onChange={e => setForm({...form, subCategory: e.target.value})}>
                <option value="">Nenhuma</option>
                {categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === form.category).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <div className="absolute right-4 top-[38px] pointer-events-none text-slate-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
              </div>
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
              <div className="relative">
                <input required type="datetime-local" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={form.dateTime} onChange={e => setForm({...form, dateTime: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Row 3: Customer (Full Width) */}
          <div className="relative">
            <label className={labelBlueClass}>Cliente</label>
            <select required className={selectClass} onChange={e => {
              const c = customers.find(cust => cust.id === e.target.value);
              if (c) setForm({...form, customer: { id: c.id, name: c.name, city: c.city, state: c.state }});
            }}>
              <option value="">Selecione o cliente...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="absolute right-4 top-[38px] pointer-events-none text-slate-400">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
            </div>
          </div>

          {/* Row 4: Container / CVA */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Container</label>
              <input required className={inputClass} value={form.container} onChange={e => setForm({...form, container: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>CVA (Certificado)</label>
              <input className={`${inputClass} border-2 border-slate-700`} value={form.cva} onChange={e => setForm({...form, cva: e.target.value.toUpperCase()})} />
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
            <select required className={selectClass} onChange={e => {
              const d = drivers.find(drv => drv.id === e.target.value);
              if (d) setForm({...form, driver: { id: d.id, name: d.name, plateHorse: d.plateHorse, plateTrailer: d.plateTrailer, status: 'Pronto', cpf: d.cpf }});
            }}>
              <option value="">Selecione o motorista...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.plateHorse})</option>)}
            </select>
            <div className="absolute right-4 top-[38px] pointer-events-none text-slate-400">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
            </div>
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
          <button type="submit" className="w-full py-6 bg-[#2563eb] text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all duration-300">
            Salvar Programação
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewTripModal;
