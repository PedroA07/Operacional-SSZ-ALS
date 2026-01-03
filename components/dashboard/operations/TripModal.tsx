
import React, { useState, useEffect } from 'react';
import { Trip, Driver, Customer, Category } from '../../../types';
import { db } from '../../../utils/storage';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  drivers: Driver[];
  customers: Customer[];
  categories: Category[];
  editTrip?: Trip | null;
}

const TripModal: React.FC<TripModalProps> = ({ isOpen, onClose, onSuccess, drivers, customers, categories, editTrip }) => {
  const [form, setForm] = useState<Partial<Trip>>({
    os: '', booking: '', ship: '', dateTime: '', type: 'EXPORTAÇÃO', status: 'Pendente',
    category: '', subCategory: '', container: '', tara: '', seal: '', cva: ''
  });

  useEffect(() => {
    if (editTrip) {
      setForm(editTrip);
    } else {
      setForm({
        os: '', booking: '', ship: '', dateTime: '', type: 'EXPORTAÇÃO', status: 'Pendente',
        category: '', subCategory: '', container: '', tara: '', seal: '', cva: ''
      });
    }
  }, [editTrip, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tripId = editTrip?.id || `trip-${Date.now()}`;
    
    const payload = {
      ...form,
      id: tripId,
      isLate: editTrip?.isLate || false,
      documents: editTrip?.documents || [],
      statusHistory: editTrip?.statusHistory || [{ status: form.status || 'Pendente', dateTime: new Date().toISOString() }],
      advancePayment: editTrip?.advancePayment || { status: 'BLOQUEADO' },
      balancePayment: editTrip?.balancePayment || { status: 'AGUARDANDO_DOCS' }
    };

    await db.saveTrip(payload as any);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const inputClass = "w-full px-4 py-3.5 rounded-xl border-none bg-slate-800 text-white font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-500";
  const selectClass = "w-full px-4 py-3.5 rounded-xl border-none bg-slate-800 text-white font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-[#f8fafc] w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 h-[92vh] flex flex-col">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.2em]">{editTrip ? 'Editar Programação' : 'Nova Programação'}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-12 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Tipo de Operação</label>
              <select required className={selectClass} value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                <option value="EXPORTAÇÃO">EXPORTAÇÃO</option>
                <option value="IMPORTAÇÃO">IMPORTAÇÃO</option>
                <option value="COLETA">COLETA</option>
                <option value="ENTREGA">ENTREGA</option>
                <option value="CABOTAGEM">CABOTAGEM</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>CVA (Certificado do Container)</label>
              <input className={`${inputClass} !bg-blue-900 !text-blue-100 border-2 border-blue-400`} placeholder="MANTER VAZIO SE NÃO HOUVER" value={form.cva} onChange={e => setForm({...form, cva: e.target.value.toUpperCase()})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <label className={labelClass}>Categoria Principal</label>
              <select required className={selectClass} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="">Selecione...</option>
                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className={labelClass}>Subcategoria</label>
              <select className={selectClass} value={form.subCategory} onChange={e => setForm({...form, subCategory: e.target.value})}>
                <option value="">Nenhuma</option>
                {categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === form.category).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Nº Ordem de Serviço (OS)</label>
              <input required className={inputClass} value={form.os} onChange={e => setForm({...form, os: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Data/Hora Agenda</label>
              <input required type="datetime-local" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={form.dateTime ? form.dateTime.slice(0, 16) : ''} onChange={e => setForm({...form, dateTime: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Cliente</label>
            <select required className={selectClass} value={form.customer?.id} onChange={e => {
              const c = customers.find(cust => cust.id === e.target.value);
              if (c) setForm({...form, customer: { id: c.id, name: c.name, city: c.city, state: c.state }});
            }}>
              <option value="">Selecione o cliente...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div><label className={labelClass}>Identif. Container</label><input required className={inputClass} value={form.container} onChange={e => setForm({...form, container: e.target.value.toUpperCase()})} /></div>
            <div className="grid grid-cols-2 gap-3">
               <div><label className={labelClass}>Tara</label><input className={inputClass} value={form.tara} onChange={e => setForm({...form, tara: e.target.value.toUpperCase()})} /></div>
               <div><label className={labelClass}>Lacre</label><input className={inputClass} value={form.seal} onChange={e => setForm({...form, seal: e.target.value.toUpperCase()})} /></div>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Motorista Alocado</label>
            <select required className={selectClass} value={form.driver?.id} onChange={e => {
              const d = drivers.find(drv => drv.id === e.target.value);
              if (d) setForm({...form, driver: { id: d.id, name: d.name, plateHorse: d.plateHorse, plateTrailer: d.plateTrailer, status: 'Pronto', cpf: d.cpf }});
            }}>
              <option value="">Selecione o motorista...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.plateHorse})</option>)}
            </select>
          </div>

          <button type="submit" className="w-full py-6 bg-[#2563eb] text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-blue-700 transition-all">
            {editTrip ? 'Atualizar Dados' : 'Gravar Programação'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TripModal;
