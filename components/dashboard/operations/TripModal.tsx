
import React, { useState, useEffect } from 'react';
import { Trip, Driver, Customer, Category, Port, PreStacking } from '../../../types';
import { db } from '../../../utils/storage';
import { osCategoryService } from '../../../utils/osCategoryService';
import { lookupCarrierByContainer } from '../../../utils/carrierService';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  drivers: Driver[];
  customers: Customer[];
  categories: Category[];
  editTrip?: Trip | null;
  initialCategory?: string;
  initialCustomer?: Customer;
}

const TripModal: React.FC<TripModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  drivers, 
  customers, 
  categories, 
  editTrip,
  initialCategory,
  initialCustomer
}) => {
  const [ports, setPorts] = useState<(Port | PreStacking)[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<any>({
    os: '', booking: '', ship: '', dateTime: '', type: 'EXPORTAÇÃO', status: 'Pendente',
    category: '', subCategory: '', container: '', tara: '', seal: '', cva: '', 
    containerType: '40HC', agencia: '', padrao: 'CARGA GERAL', embarcador: '', obs: '', autColeta: ''
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
      setForm({
        ...editTrip,
        dateTime: editTrip.dateTime?.slice(0, 16),
        agencia: editTrip.ocFormData?.agencia || editTrip.containerType || '',
        padrao: editTrip.ocFormData?.padrao || 'CARGA GERAL',
        embarcador: editTrip.ocFormData?.embarcador || '',
        autColeta: editTrip.ocFormData?.autColeta || '',
        obs: editTrip.ocFormData?.obs || ''
      });
    } else {
      setForm({
        os: '', 
        booking: '', 
        ship: '', 
        dateTime: new Date().toISOString().slice(0, 16), 
        type: 'EXPORTAÇÃO', 
        status: 'Pendente',
        category: initialCategory || '', 
        subCategory: initialCustomer?.name || '', 
        container: '', 
        tara: '', 
        seal: '', 
        cva: '', 
        containerType: '40HC', 
        agencia: '', 
        padrao: 'CARGA GERAL', 
        embarcador: '', 
        obs: '', 
        autColeta: '',
        customer: initialCustomer ? { 
          id: initialCustomer.id, 
          name: initialCustomer.name, 
          legalName: initialCustomer.legalName, 
          cnpj: initialCustomer.cnpj, 
          city: initialCustomer.city, 
          state: initialCustomer.state 
        } : undefined
      });
    }
  }, [editTrip, isOpen, initialCategory, initialCustomer]);

  const handleContainerChange = (val: string) => {
    const container = val.toUpperCase();
    const carrier = lookupCarrierByContainer(container);
    
    setForm(prev => ({
      ...prev,
      container,
      agencia: carrier ? carrier.name : prev.agencia
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const tripId = editTrip?.id || `trip-${Date.now()}`;
      
      const finalCategory = form.category || 'Geral';
      const driverObj = drivers.find(d => d.id === form.driver?.id);
      const customerObj = customers.find(c => c.id === form.customer?.id);

      if (driverObj && customerObj) {
        await osCategoryService.syncVinculos(finalCategory, driverObj, customerObj);
      }

      const payload = {
        ...form,
        id: tripId,
        dateTime: new Date(form.dateTime).toISOString(),
        isLate: editTrip?.isLate || false,
        documents: editTrip?.documents || [],
        statusHistory: editTrip?.statusHistory || [{ status: 'Pendente', dateTime: new Date().toISOString() }],
        advancePayment: editTrip?.advancePayment || { status: 'BLOQUEADO' },
        balancePayment: editTrip?.balancePayment || { status: 'AGUARDANDO_DOCS' },
        ocFormData: {
          ...form,
          horarioAgendado: new Date(form.dateTime).toISOString()
        }
      };

      await db.saveTrip(payload as any);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao salvar viagem:", err);
      alert("Erro ao processar a programação.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300 shadow-sm";
  const selectClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-[#f8fafc] w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 h-[95vh] flex flex-col">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.2em]">{editTrip ? 'Editar Programação' : 'Nova Programação ALS'}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-[#f8fafc]">
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
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
                <div>
                  <label className={labelClass}>Data/Hora Agenda</label>
                  <input required type="datetime-local" className={inputClass} value={form.dateTime} onChange={e => setForm({...form, dateTime: e.target.value})} />
                </div>
             </div>

             <div className="space-y-1">
                <label className={labelClass}>Nº Ordem de Serviço (OS)</label>
                <input required className={inputClass} value={form.os} onChange={e => setForm({...form, os: e.target.value.toUpperCase()})} />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
               <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block">Cliente (Contratante)</label>
               <select required className={selectClass} value={form.customer?.id} onChange={e => {
                 const c = customers.find(cust => cust.id === e.target.value);
                 if (c) {
                    const autoCategory = (c.operations && c.operations.length > 0) ? c.operations[0] : form.category;
                    setForm({
                      ...form, 
                      customer: { id: c.id, name: c.name, legalName: c.legalName, cnpj: c.cnpj, city: c.city, state: c.state },
                      category: autoCategory,
                      subCategory: c.name 
                    });
                 }
               }}>
                 <option value="">Selecione o cliente...</option>
                 {customers.map(c => <option key={c.id} value={c.id}>{c.legalName || c.name}</option>)}
               </select>
            </div>
            <div className="space-y-1">
               <label className={labelClass}>Destino (Porto / Entrega)</label>
               <select required className={selectClass} value={form.destination?.id} onChange={e => {
                 const p = ports.find(pt => pt.id === e.target.value);
                 if (p) setForm({...form, destination: { id: p.id, name: p.name, legalName: p.legalName, cnpj: p.cnpj, city: p.city, state: p.state }});
               }}>
                 <option value="">Selecione o destino...</option>
                 {ports.map(p => <option key={p.id} value={p.id}>{p.legalName || p.name} ({p.city})</option>)}
               </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200">
             <div className="space-y-1">
                <label className={labelClass}>Categoria Master (Classificação)</label>
                <select required className={selectClass} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="">Selecione...</option>
                  {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className={labelClass}>Vínculo / Filtro (Subcategoria)</label>
                <input className={inputClass} placeholder="Geral" value={form.subCategory} onChange={e => setForm({...form, subCategory: e.target.value.toUpperCase()})} />
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1 ml-1">* Este vínculo será salvo no cadastro do motorista.</p>
             </div>
          </div>

          <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-6">
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Dossiê do Equipamento</p>
             <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 space-y-1">
                   <label className={labelClass}>Nº Container</label>
                   <input required className={inputClass} value={form.container} onChange={e => handleContainerChange(e.target.value)} />
                </div>
                <div className="col-span-3 space-y-1">
                   <label className={labelClass}>Tipo</label>
                   <select className={selectClass} value={form.containerType} onChange={e => setForm({...form, containerType: e.target.value})}>
                      <option value="40HC">40HC</option>
                      <option value="40HR">40HR</option>
                      <option value="40DC">40DC</option>
                      <option value="20DC">20DC</option>
                   </select>
                </div>
                <div className="col-span-3 space-y-1">
                   <label className={labelClass}>Armador / Agência</label>
                   <input className={inputClass} value={form.agencia} onChange={e => setForm({...form, agencia: e.target.value.toUpperCase()})} />
                </div>
                <div className="col-span-2 space-y-1">
                   <label className={labelClass}>CVA</label>
                   <input className={`${inputClass} border-blue-200 text-blue-700`} value={form.cva} onChange={e => setForm({...form, cva: e.target.value.toUpperCase()})} />
                </div>
             </div>
             <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1"><label className={labelClass}>Tara (KG)</label><input className={inputClass} value={form.tara} onChange={e => setForm({...form, tara: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-1"><label className={labelClass}>Lacre</label><input className={inputClass} value={form.seal} onChange={e => setForm({...form, seal: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-1"><label className={labelClass}>Padrão Unidade</label><input className={inputClass} value={form.padrao} onChange={e => setForm({...form, padrao: e.target.value.toUpperCase()})} /></div>
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

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className={labelClass}>Aut. Coleta</label>
                <input className={inputClass} value={form.autColeta} onChange={e => setForm({...form, autColeta: e.target.value.toUpperCase()})} />
             </div>
             <div className="space-y-1">
                <label className={labelClass}>Embarcador</label>
                <input className={inputClass} value={form.embarcador} onChange={e => setForm({...form, embarcador: e.target.value.toUpperCase()})} />
             </div>
          </div>

          <div className="space-y-1">
             <label className={labelClass}>Observações Adicionais</label>
             <textarea className={`${inputClass} h-24 resize-none normal-case`} value={form.obs} onChange={e => setForm({...form, obs: e.target.value})} placeholder="Instruções de carregamento..." />
          </div>

          <button type="submit" disabled={isSaving} className="w-full py-6 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-50">
            {isSaving ? (
              <div className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Processando Vínculos e Viagem...
              </div>
            ) : editTrip ? 'Finalizar Atualização de Viagem' : 'Cadastrar Programação no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TripModal;
