
import React, { useState, useEffect, useRef } from 'react';
import { Trip, Driver, Customer, Category, Port, PreStacking } from '../../../types';
import { db } from '../../../utils/storage';
import { osCategoryService } from '../../../utils/osCategoryService';
import { lookupCarrierByContainer } from '../../../utils/carrierService';

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
  // Estado isolado para evitar resets por re-render do componente pai
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

  // Inicialização estável
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
        obs: editTrip.ocFormData?.obs || ''
      });
      setSearches({
        customer: editTrip.customer?.legalName || editTrip.customer?.name || '',
        destination: editTrip.destination?.legalName || editTrip.destination?.name || '',
        driver: editTrip.driver?.name || ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        dateTime: new Date().toISOString().slice(0, 16),
        category: initialCategory || '',
        customer: initialCustomer ? { ...initialCustomer } : null,
        subCategory: initialCustomer?.name || ''
      }));
      if (initialCustomer) {
        setSearches(s => ({ ...s, customer: initialCustomer.legalName || initialCustomer.name }));
      }
    }
  }, [editTrip]);

  // Fechar dropdowns ao clicar fora
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
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block";

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-8">
      
      {/* SEÇÃO 1: IDENTIFICAÇÃO SOFT PREMIUM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className={labelClass}>Número da OS</label>
          <input 
            required 
            className={`${inputClass} text-xl border-blue-100 text-blue-700 placeholder:text-blue-100`} 
            placeholder="EX: 123ALC..."
            value={formData.os} 
            onChange={e => setFormData({...formData, os: e.target.value.toUpperCase()})} 
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Data/Hora Programada</label>
          <input required type="datetime-local" className={inputClass} value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})} />
        </div>
      </div>

      {/* SEÇÃO 2: CLIENTE E DESTINO (SOFT PREMIUM SELECTORS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* SELETOR DE CLIENTE */}
        <div className="relative" ref={dropdownRefs.customer}>
          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 ml-1 block">Cliente Contratante</label>
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
                      setFormData({...formData, customer: c, category: c.operations?.[0] || formData.category, subCategory: c.name});
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

        {/* SELETOR DE DESTINO */}
        <div className="relative" ref={dropdownRefs.destination}>
          <label className={labelClass}>Local de Entrega / Destino</label>
          <div className="relative">
            <input 
              type="text"
              placeholder="BUSCAR PORTO OU TERMINAL..."
              className={`${inputClass} pr-12 ${formData.destination ? 'border-blue-200 bg-blue-50/30' : ''}`}
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
                    className="w-full text-left p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200 group"
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

      {/* SEÇÃO 3: EQUIPAMENTO E MOTORISTA (SOFT STYLE) */}
      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="space-y-1">
              <label className={labelClass}>Nº Container</label>
              <input className={inputClass} placeholder="ABCD1234567" value={formData.container} onChange={e => handleContainerChange(e.target.value)} />
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Armador</label>
              <input className={`${inputClass} border-blue-50`} value={formData.agencia} onChange={e => setFormData({...formData, agencia: e.target.value.toUpperCase()})} />
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Tipo Unidade</label>
              <select className={inputClass} value={formData.containerType} onChange={e => setFormData({...formData, containerType: e.target.value})}>
                 <option value="40HC">40HC</option><option value="40HR">40HR</option><option value="20DC">20DC</option>
              </select>
           </div>
        </div>

        {/* MOTORISTA SOFT SELECTOR */}
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

      {/* FOOTER AÇÕES */}
      <div className="flex gap-4 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase hover:bg-slate-200 transition-all active:scale-95">Descartar</button>
        <button 
          type="submit" 
          disabled={isSaving || !formData.os || !formData.customer}
          className="flex-1 py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-30"
        >
          {isSaving ? 'Gravando Dados...' : editTrip ? 'Confirmar Alterações' : 'Salvar Nova Programação'}
        </button>
      </div>
    </form>
  );
};

export default TripForm;
