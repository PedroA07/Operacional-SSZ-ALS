
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 h-[90vh] flex flex-col">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Nova Programação</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 grid grid-cols-2 gap-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Categoria</label>
            <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="">Selecione...</option>
              {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Subcategoria</label>
            <select className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={form.subCategory} onChange={e => setForm({...form, subCategory: e.target.value})}>
              <option value="">Nenhuma</option>
              {categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === form.category).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Nº OS</label><input required className="w-full px-4 py-3 rounded-xl border border-slate-200 uppercase font-bold" value={form.os} onChange={e => setForm({...form, os: e.target.value.toUpperCase()})} /></div>
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Data/Hora Programação</label><input required type="datetime-local" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" value={form.dateTime} onChange={e => setForm({...form, dateTime: e.target.value})} /></div>
          
          <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase">Cliente</label>
            <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" onChange={e => {
              const c = customers.find(cust => cust.id === e.target.value);
              if (c) setForm({...form, customer: { id: c.id, name: c.name, city: c.city, state: c.state }});
            }}>
              <option value="">Selecione o cliente...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Container</label><input required className="w-full px-4 py-3 rounded-xl border border-slate-200 uppercase font-bold" value={form.container} onChange={e => setForm({...form, container: e.target.value.toUpperCase()})} /></div>
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">CVA (Certificado)</label><input className="w-full px-4 py-3 rounded-xl border border-slate-200 uppercase font-bold" value={form.cva} onChange={e => setForm({...form, cva: e.target.value.toUpperCase()})} /></div>
          
          <div className="grid grid-cols-2 gap-4 col-span-2">
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Tara</label><input className="w-full px-4 py-3 rounded-xl border border-slate-200 uppercase font-bold" value={form.tara} onChange={e => setForm({...form, tara: e.target.value.toUpperCase()})} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Lacre</label><input className="w-full px-4 py-3 rounded-xl border border-slate-200 uppercase font-bold" value={form.seal} onChange={e => setForm({...form, seal: e.target.value.toUpperCase()})} /></div>
          </div>

          <div className="col-span-2 space-y-1">
            <label className="text-[9px] font-black text-blue-500 uppercase">Motorista</label>
            <select required className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold" onChange={e => {
              const d = drivers.find(drv => drv.id === e.target.value);
              if (d) setForm({...form, driver: { id: d.id, name: d.name, plateHorse: d.plateHorse, plateTrailer: d.plateTrailer, status: 'Pronto', cpf: d.cpf }});
            }}>
              <option value="">Selecione o motorista...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.plateHorse})</option>)}
            </select>
          </div>

          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Navio</label><input className="w-full px-4 py-3 rounded-xl border border-slate-200 uppercase font-bold" value={form.ship} onChange={e => setForm({...form, ship: e.target.value.toUpperCase()})} /></div>
          <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Booking</label><input className="w-full px-4 py-3 rounded-xl border border-slate-200 uppercase font-bold" value={form.booking} onChange={e => setForm({...form, booking: e.target.value.toUpperCase()})} /></div>

          <button type="submit" className="col-span-2 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">Salvar Programação</button>
        </form>
      </div>
    </div>
  );
};

export default NewTripModal;
