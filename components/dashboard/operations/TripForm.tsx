
import React, { useState, useEffect, useRef } from 'react';
import { Trip, Driver, Customer, Category, Port, PreStacking } from '../../../types';
import { lookupCarrierByContainer } from '../../../utils/carrierService';
import { maskSeal } from '../../../utils/masks';

interface TripFormProps {
  editTrip?: Trip | null;
  initialCategory?: string;
  initialCustomer?: Customer;
  drivers: Driver[];
  customers: Customer[];
  categories: Category[];
  ports: (Port | PreStacking)[];
  onCancel: () => void;
  onSave: (data: any) => Promise<void>;
  isSaving: boolean;
}

const TripForm: React.FC<TripFormProps> = ({ 
  editTrip, initialCategory, initialCustomer, drivers, customers, categories, ports, onCancel, onSave, isSaving 
}) => {
  const [formData, setFormData] = useState<any>({
    os: '', booking: '', ship: '', dateTime: '', type: 'EXPORTAÇÃO', status: 'Pendente',
    category: '', subCategory: '', container: '', tara: '', seal: '', cva: '', 
    containerType: '40HC', agencia: '', padrao: 'CARGA GERAL', embarcador: '', obs: '', autColeta: '',
    customer: null, destination: null, driver: null
  });

  const [searches, setSearches] = useState({ customer: '', destination: '', driver: '' });
  const [dropdowns, setDropdowns] = useState({ customer: false, destination: false, driver: false });
  const dropdownRefs = {
    customer: useRef<HTMLDivElement>(null),
    destination: useRef<HTMLDivElement>(null),
    driver: useRef<HTMLDivElement>(null)
  };

  useEffect(() => {
    if (editTrip) {
      const date = new Date(editTrip.dateTime);
      const offset = date.getTimezoneOffset() * 60000;
      const localDate = new Date(date.getTime() - offset).toISOString().slice(0, 16);

      setFormData({
        ...editTrip,
        dateTime: localDate,
        agencia: editTrip.ocFormData?.agencia || '',
        padrao: editTrip.ocFormData?.padrao || 'CARGA GERAL',
        embarcador: editTrip.ocFormData?.embarcador || '',
        autColeta: editTrip.ocFormData?.autColeta || '',
        obs: editTrip.ocFormData?.obs || '',
        cva: editTrip.cva || '',
        tara: editTrip.tara || '',
        seal: editTrip.seal || ''
      });
      setSearches({
        customer: editTrip.customer?.legalName || editTrip.customer?.name || '',
        destination: editTrip.destination?.legalName || editTrip.destination?.name || '',
        driver: editTrip.driver?.name || ''
      });
    } else {
      setFormData({
        os: '', booking: '', ship: '', 
        dateTime: new Date().toISOString().slice(0, 16),
        type: 'EXPORTAÇÃO', status: 'Pendente',
        category: initialCategory || '',
        subCategory: initialCustomer?.name || '',
        container: '', tara: '', seal: '', cva: '', 
        containerType: '40HC', agencia: '', padrao: 'CARGA GERAL', 
        embarcador: '', obs: '', autColeta: '',
        customer: initialCustomer ? { ...initialCustomer } : null,
        destination: null, driver: null
      });
      setSearches({
        customer: initialCustomer ? (initialCustomer.legalName || initialCustomer.name) : '',
        destination: '',
        driver: ''
      });
    }
  }, [editTrip, initialCategory, initialCustomer]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRefs.customer.current && !dropdownRefs.customer.current.contains(e.target as Node)) setDropdowns(d => ({ ...d, customer: false }));
      if (dropdownRefs.destination.current && !dropdownRefs.destination.current.contains(e.target as Node)) setDropdowns(d => ({ ...d, destination: false }));
      if (dropdownRefs.driver.current && !dropdownRefs.driver.current.contains(e.target as Node)) setDropdowns(d => ({ ...d, driver: false }));
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleContainerChange = (val: string) => {
    const container = val.toUpperCase();
    const carrier = lookupCarrierByContainer(container);
    setFormData(prev => ({
      ...prev,
      container,
      agencia: carrier ? carrier.name : prev.agencia
    }));
  };

  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300";
  const dateInputClass = "w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block";

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-10 pb-10">
      
      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">I. Identificação Master</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 space-y-1">
            <label className={labelClass}>Número da OS</label>
            <input 
              required 
              className={`${inputClass} text-xl border-blue-100 text-blue-700 placeholder:text-blue-100`} 
              placeholder="EX: 123ALC..."
              value={formData.os} 
              onChange={e => setFormData({...formData, os: e.target.value.toUpperCase()})} 
            />
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className={labelClass}>Modalidade</label>
            <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="EXPORTAÇÃO">EXPORTAÇÃO</option>
              <option value="IMPORTAÇÃO">IMPORTAÇÃO</option>
              <option value="COLETA">COLETA</option>
              <option value="ENTREGA">ENTREGA</option>
              <option value="CABOTAGEM">CABOTAGEM</option>
            </select>
          </div>
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Data/Hora Programada</label>
            <input 
              required 
              type="datetime-local" 
              className={dateInputClass} 
              value={formData.dateTime} 
              onChange={e => setFormData({...formData, dateTime: e.target.value})} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-1">
              <label className={labelClass}>Categoria Operacional</label>
              <select required className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                 <option value="">SELECIONAR CATEGORIA...</option>
                 {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
           </div>
           <div className="space-y-1">
              <label className={labelClass}>CVA (Certificado de Vistoria)</label>
              <input className={`${inputClass} border-amber-100 text-amber-700`} placeholder="Nº CERTIFICADO" value={formData.cva} onChange={e => setFormData({...formData, cva: e.target.value.toUpperCase()})} />
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] ml-4">II. Clientes e Destinos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="relative" ref={dropdownRefs.customer}>
            <label className={labelClass}>Cliente Contratante</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="BUSCAR RAZÃO OU FANTASIA..."
                className={`${inputClass} pr-12 ${formData.customer ? 'border-emerald-200 bg-emerald-50/30' : ''}`}
                value={searches.customer}
                onFocus={() => setDropdowns(d => ({ ...d, customer: true }))}
                onChange={e => {
                  setSearches({...searches, customer: e.target.value});
                  setDropdowns(d => ({ ...d, customer: true }));
                }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
              </div>
            </div>

            {dropdowns.customer && (
              <div className="absolute z-[100] w-full mt-2 bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-2">
                <div className="max-h-72 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {customers.filter(c => (c.legalName || c.name).toUpperCase().includes(searches.customer.toUpperCase())).map(c => (
                    <button 
                      key={c.id} type="button"
                      onClick={() => {
                        setFormData({...formData, customer: c, subCategory: c.name});
                        setSearches({...searches, customer: c.legalName || c.name});
                        setDropdowns(d => ({ ...d, customer: false }));
                      }}
                      className="w-full text-left p-4 rounded-2xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 group"
                    >
                      <p className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-700">{c.legalName || c.name}</p>
                      {c.legalName && c.name !== c.legalName && <p className="text-[9px] font-bold text-blue-400 uppercase italic mt-0.5">FAN: {c.name}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">{c.city} - {c.state}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRefs.destination}>
            <label className={labelClass}>Local de Entrega / Destino</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="BUSCAR PORTO OU TERMINAL..."
                className={`${inputClass} pr-12 ${formData.destination ? 'border-indigo-200 bg-indigo-50/30' : ''}`}
                value={searches.destination}
                onFocus={() => setDropdowns(d => ({ ...d, destination: true }))}
                onChange={e => {
                  setSearches({...searches, destination: e.target.value});
                  setDropdowns(d => ({ ...d, destination: true }));
                }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/></svg>
              </div>
            </div>

            {dropdowns.destination && (
              <div className="absolute z-[100] w-full mt-2 bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-2">
                <div className="max-h-72 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {ports.filter(p => (p.legalName || p.name).toUpperCase().includes(searches.destination.toUpperCase())).map(p => (
                    <button 
                      key={p.id} type="button"
                      onClick={() => {
                        setFormData({...formData, destination: p});
                        setSearches({...searches, destination: p.legalName || p.name});
                        setDropdowns(d => ({ ...d, destination: false }));
                      }}
                      className="w-full text-left p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-indigo-100 group"
                    >
                      <p className="text-[11px] font-black text-slate-700 uppercase leading-tight group-hover:text-slate-900">{p.legalName || p.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{p.city} - {p.state}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 space-y-8 shadow-sm">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">III. Equipamento e Unidade</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="space-y-1">
              <label className={labelClass}>Nº Container</label>
              <input className={inputClass} placeholder="ABCD1234567" value={formData.container} onChange={e => handleContainerChange(e.target.value)} />
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Tipo Unidade</label>
              <select className={inputClass} value={formData.containerType} onChange={e => setFormData({...formData, containerType: e.target.value})}>
                 <option value="40HC">40HC</option><option value="40HR">40HR</option><option value="40DC">40DC</option><option value="20DC">20DC</option><option value="20RF">20RF</option>
              </select>
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Padrão de Carga</label>
              <select className={inputClass} value={formData.padrao} onChange={e => setFormData({...formData, padrao: e.target.value})}>
                 <option value="CARGA GERAL">CARGA GERAL</option>
                 <option value="CARGO PREMIUM">CARGO PREMIUM</option>
                 <option value="PADRÃO ALIMENTO">PADRÃO ALIMENTO</option>
                 <option value="REEFER">REEFER</option>
                 <option value="PRODUTO QUÍMICO">PRODUTO QUÍMICO</option>
              </select>
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Armador (Agência)</label>
              <input className={`${inputClass} border-blue-50 bg-blue-50/20`} value={formData.agencia} onChange={e => setFormData({...formData, agencia: e.target.value.toUpperCase()})} />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
           <div className="space-y-1">
              <label className={labelClass}>Tara do Equipamento</label>
              <input className={inputClass} placeholder="EX: 3.840 KG" value={formData.tara} onChange={e => setFormData({...formData, tara: e.target.value.toUpperCase()})} />
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Lacre Oficial</label>
              <input className={inputClass} placeholder="EX: AA123456" value={formData.seal} onChange={e => setFormData({...formData, seal: maskSeal(e.target.value)})} />
           </div>
        </div>
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.37c-.26.08-.48.26-.6.5s-.14.52-.06.78L3.95 19zM6 6h12v4.38l-6 1.71-6-1.71V6z" /></svg>
        </div>
        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">IV. Manifesto Marítimo</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Navio / Embarcação</label>
              <input className="w-full px-5 py-4 rounded-2xl bg-white/5 border-2 border-white/10 text-white font-black uppercase outline-none focus:border-blue-500 focus:bg-white/10 transition-all" placeholder="EX: MAERSK LUZON" value={formData.ship} onChange={e => setFormData({...formData, ship: e.target.value.toUpperCase()})} />
           </div>
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Booking / Referência</label>
              <input className="w-full px-5 py-4 rounded-2xl bg-white/5 border-2 border-white/10 text-blue-400 font-black uppercase outline-none focus:border-blue-500 focus:bg-white/10 transition-all" placeholder="EX: 123456789" value={formData.booking} onChange={e => setFormData({...formData, booking: e.target.value.toUpperCase()})} />
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Autorização de Coleta</label>
              <input className="w-full px-5 py-4 rounded-2xl bg-white/5 border-2 border-white/10 text-white font-black uppercase outline-none focus:border-blue-500 focus:bg-white/10 transition-all" value={formData.autColeta} onChange={e => setFormData({...formData, autColeta: e.target.value.toUpperCase()})} />
           </div>
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Embarcador / Shipper</label>
              <input className="w-full px-5 py-4 rounded-2xl bg-white/5 border-2 border-white/10 text-white font-black uppercase outline-none focus:border-blue-500 focus:bg-white/10 transition-all" value={formData.embarcador} onChange={e => setFormData({...formData, embarcador: e.target.value.toUpperCase()})} />
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] ml-4">V. Alocação de Recurso</h4>
        <div className="relative" ref={dropdownRefs.driver}>
          <label className={labelClass}>Motorista Alocado</label>
          <div className="relative">
            <input 
              type="text"
              placeholder="BUSCAR MOTORISTA OU PLACA..."
              className={`${inputClass} pr-12`}
              value={searches.driver}
              onFocus={() => setDropdowns(d => ({ ...d, driver: true }))}
              onChange={e => {
                setSearches({...searches, driver: e.target.value});
                setDropdowns(d => ({ ...d, driver: true }));
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>
            </div>
          </div>
          {dropdowns.driver && (
            <div className="absolute z-[100] w-full mt-2 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden p-2 animate-in fade-in">
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {drivers.filter(d => d.name.toUpperCase().includes(searches.driver.toUpperCase()) || d.plateHorse.toUpperCase().includes(searches.driver.toUpperCase())).map(d => (
                  <button key={d.id} type="button" onClick={() => {
                    setFormData({...formData, driver: { id: d.id, name: d.name, plateHorse: d.plateHorse, plateTrailer: d.plateTrailer, cpf: d.cpf, status: d.status }});
                    setSearches({...searches, driver: d.name});
                    setDropdowns(d => ({ ...d, driver: false }));
                  }} className="w-full text-left p-4 hover:bg-blue-50 rounded-2xl flex justify-between items-center group">
                    <div>
                      <p className="text-[11px] font-black uppercase text-slate-700 group-hover:text-blue-700">{d.name}</p>
                      <p className="text-[9px] font-mono text-slate-400 group-hover:text-blue-400">CPF: {d.cpf}</p>
                    </div>
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-mono text-[10px] font-bold">{d.plateHorse}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-8 border-t border-slate-100 mt-10">
        <button type="button" onClick={onCancel} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all active:scale-95">Descartar</button>
        <button 
          type="submit" 
          disabled={isSaving || !formData.os || !formData.customer || !formData.driver}
          className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3"
        >
          {isSaving ? (
             <>
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               Gravando Dados...
             </>
          ) : editTrip ? 'Confirmar Alterações' : 'Salvar Nova Programação'}
        </button>
      </div>
    </form>
  );
};

export default TripForm;
