
import React, { useState, useEffect } from 'react';
import { Trip, Driver, Customer, Category, Port, PreStacking } from '../../../types';
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
  const [ports, setPorts] = useState<(Port | PreStacking)[]>([]);
  const [form, setForm] = useState<Partial<Trip>>({
    os: '', booking: '', ship: '', dateTime: '', type: 'EXPORTAÇÃO', status: 'Pendente',
    category: '', subCategory: '', container: '', tara: '', seal: '', cva: '', containerType: '40HC'
  });

  useEffect(() => {
    const loadPorts = async () => {
      const [p, ps] = await Promise.all([db.getPorts(), db.getPreStacking()]);
      setPorts([...p, ...ps]);
    };
    loadPorts();
  }, []);

  useEffect(() => {
    if (editTrip) {
      setForm(editTrip);
    } else {
      setForm({
        os: '', booking: '', ship: '', dateTime: new Date().toISOString().slice(0, 16), 
        type: 'EXPORTAÇÃO', status: 'Pendente',
        category: '', subCategory: '', container: '', tara: '', seal: '', cva: '', containerType: '40HC'
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
      statusHistory: editTrip?.statusHistory || [{ status: 'Pendente', dateTime: new Date().toISOString() }],
      advancePayment: editTrip?.advancePayment || { status: 'BLOQUEADO' },
      balancePayment: editTrip?.balancePayment || { status: 'AGUARDANDO_DOCS' }
    };

    await db.saveTrip(payload as any);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300";
  const selectClass = "w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-[#f8fafc] w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 h-[95vh] flex flex-col">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.2em]">{editTrip ? 'Editar Programação' : 'Nova Programação'}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
          
          <div className="grid grid-cols-3 gap-6">
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
              <label className={labelClass}>Categoria Master</label>
              <select required className={selectClass} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="">Selecione...</option>
                {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Subcategoria / Filtro</label>
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
              <input required type="datetime-local" className={inputClass} value={form.dateTime ? form.dateTime.slice(0, 16) : ''} onChange={e => setForm({...form, dateTime: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className={labelClass}>Cliente (Pagador / Remetente)</label>
               <select required className={selectClass} value={form.customer?.id} onChange={e => {
                 const c = customers.find(cust => cust.id === e.target.value);
                 if (c) setForm({...form, customer: { id: c.id, name: c.name, legalName: c.legalName, cnpj: c.cnpj, city: c.city, state: c.state }});
               }}>
                 <option value="">Selecione o cliente...</option>
                 {customers.map(c => <option key={c.id} value={c.id}>{c.legalName || c.name}</option>)}
               </select>
            </div>
            <div className="space-y-1">
               <label className={labelClass}>Destino (Terminal / Porto / Entrega)</label>
               <select required className={selectClass} value={form.destination?.id} onChange={e => {
                 const p = ports.find(pt => pt.id === e.target.value);
                 if (p) setForm({...form, destination: { id: p.id, name: p.name, legalName: p.legalName, cnpj: p.cnpj, city: p.city, state: p.state }});
               }}>
                 <option value="">Selecione o destino...</option>
                 {ports.map(p => <option key={p.id} value={p.id}>{p.legalName || p.name} ({p.city})</option>)}
               </select>
            </div>
          </div>

          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Detalhes do Equipamento</p>
             <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-1">
                   <label className={labelClass}>Identif. Container</label>
                   <input required className={inputClass} value={form.container} onChange={e => setForm({...form, container: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                   <label className={labelClass}>Tipo Container</label>
                   <select className={selectClass} value={form.containerType} onChange={e => setForm({...form, containerType: e.target.value})}>
                      <option value="40HC">40HC</option>
                      <option value="40HR">40HR (REEFER)</option>
                      <option value="40DC">40DC</option>
                      <option value="20DC">20DC</option>
                      <option value="20RF">20RF</option>
                   </select>
                </div>
                <div className="space-y-1">
                   <label className={labelClass}>CVA</label>
                   <input className={inputClass} value={form.cva} onChange={e => setForm({...form, cva: e.target.value.toUpperCase()})} />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1"><label className={labelClass}>Tara (KG)</label><input className={inputClass} value={form.tara} onChange={e => setForm({...form, tara: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-1"><label className={labelClass}>Lacre Armador</label><input className={inputClass} value={form.seal} onChange={e => setForm({...form, seal: e.target.value.toUpperCase()})} /></div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className={labelClass}>Motorista Alocado</label>
               <select required className={selectClass} value={form.driver?.id} onChange={e => {
                 const d = drivers.find(drv => drv.id === e.target.value);
                 if (d) setForm({...form, driver: { id: d.id, name: d.name, plateHorse: d.plateHorse, plateTrailer: d.plateTrailer, status: 'Pronto', cpf: d.cpf }});
               }}>
                 <option value="">Selecione o motorista...</option>
                 {drivers.map(d => <option key={d.id} value={d.id}>{d.name} [{d.plateHorse}]</option>)}
               </select>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClass} value={form.ship} onChange={e => setForm({...form, ship: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClass} value={form.booking} onChange={e => setForm({...form, booking: e.target.value.toUpperCase()})} /></div>
             </div>
          </div>

          <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 transition-all">
            {editTrip ? 'Atualizar Dados da Programação' : 'Gravar Nova Programação'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TripModal;
