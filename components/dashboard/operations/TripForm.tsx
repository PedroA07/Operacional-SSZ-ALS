
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
  const getLocalISOTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState<any>({
    os: '', booking: '', ship: '', dateTime: getLocalISOTime(), type: 'EXPORTAÇÃO', status: 'Pendente',
    category: '', container: '', tara: '', seal: '', cva: '', 
    containerType: '40HC', agencia: '', padrao: 'CARGA GERAL', embarcador: '', obs: '', autColeta: '',
    customer: null, destination: null, driver: null,
    schedulingDate: '' 
  });

  const [searches, setSearches] = useState({ customer: '', destination: '', driver: '' });
  const [dropdowns, setDropdowns] = useState({ customer: false, destination: false, driver: false });
  const dropdownRefs = {
    customer: useRef<HTMLDivElement>(null),
    destination: useRef<HTMLDivElement>(null),
    driver: useRef<HTMLDivElement>(null)
  };

  // REF CRÍTICA: Impede que o sync do Dashboard resete o que o usuário está digitando
  const hasInitialized = useRef<string | null>(null);

  useEffect(() => {
    const currentId = editTrip?.id || 'new_trip';
    
    // Se já inicializamos este formulário para este ID (ou para uma nova trip), não reseta mais
    if (hasInitialized.current === currentId) return;

    const formatToInput = (isoString?: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    if (editTrip) {
      setFormData({
        ...editTrip,
        dateTime: formatToInput(editTrip.dateTime),
        schedulingDate: formatToInput(editTrip.scheduling?.dateTime),
        agencia: editTrip.ocFormData?.agencia || '',
        padrao: editTrip.ocFormData?.padrao || 'CARGA GERAL',
        embarcador: editTrip.ocFormData?.embarcador || '',
        autColeta: editTrip.ocFormData?.autColeta || '',
        obs: editTrip.ocFormData?.obs || editTrip.scheduling?.obs || '',
        cva: editTrip.cva || '',
        tara: editTrip.tara || '',
        seal: editTrip.seal || ''
      });
      setSearches({
        customer: editTrip.customer?.name || editTrip.customer?.legalName || '',
        destination: editTrip.destination?.name || editTrip.destination?.legalName || '',
        driver: editTrip.driver?.name || ''
      });
    } else {
      const defaultCat = initialCategory || (categories.length > 0 ? categories[0].name : '');
      
      setFormData(prev => ({
        ...prev,
        category: defaultCat,
        customer: initialCustomer || prev.customer,
        dateTime: getLocalISOTime(),
        schedulingDate: ''
      }));
      setSearches({
        customer: initialCustomer ? initialCustomer.name : '',
        destination: '',
        driver: ''
      });
    }

    hasInitialized.current = currentId;
  }, [editTrip, initialCategory, initialCustomer, categories]);

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

  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300";
  const dateInputClass = "w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block";

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-10 pb-10">
      
      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">I. Configuração da Categoria Operacional</h4>
        <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Vincular à Categoria do Banco de Dados (Obrigatório)</label>
              <select 
                required 
                className={inputClass} 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="">Selecione uma Categoria Registrada...</option>
                {categories.filter(c => !c.parentId).map(c => (
                  <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
        </div>
      </div>

      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">II. Início da Viagem (Coleta/Retirada)</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 space-y-1">
            <label className={labelClass}>Número da OS</label>
            <input 
              required 
              className={`${inputClass} text-xl border-blue-100 text-blue-700`} 
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
            </select>
          </div>
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Data/Hora Programação (INÍCIO)</label>
            <input 
              required 
              type="datetime-local" 
              className={dateInputClass} 
              value={formData.dateTime} 
              onChange={e => setFormData({...formData, dateTime: e.target.value})} 
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50/30 p-8 rounded-[3rem] border border-blue-100 space-y-6">
        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">III. Destino e Agendamento no Terminal</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="relative" ref={dropdownRefs.destination}>
              <label className={labelClass}>Local de Entrega / Porto</label>
              <input 
                type="text"
                placeholder="BUSCAR TERMINAL..."
                className={inputClass}
                value={searches.destination}
                onFocus={() => setDropdowns(d => ({ ...d, destination: true }))}
                onChange={e => {
                  setSearches({...searches, destination: e.target.value});
                  setDropdowns(d => ({ ...d, destination: true }));
                }}
              />
              {dropdowns.destination && (
                <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
                    {ports.filter(p => (p.name || '').toUpperCase().includes(searches.destination.toUpperCase())).map(p => (
                      <button key={p.id} type="button" onClick={() => {
                        setFormData({...formData, destination: p});
                        setSearches({...searches, destination: p.name});
                        setDropdowns(d => ({ ...d, destination: false }));
                      }} className="w-full text-left p-3 hover:bg-blue-50 rounded-xl text-[10px] font-black uppercase">
                        {p.name} - {p.city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
           </div>

           <div className="space-y-1">
              <label className={labelClass}>Janela Agendada no Destino (TERMINAL)</label>
              <input 
                type="datetime-local" 
                className={`${dateInputClass} border-blue-200 text-blue-800`}
                value={formData.schedulingDate} 
                onChange={e => setFormData({...formData, schedulingDate: e.target.value})} 
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative" ref={dropdownRefs.customer}>
          <label className={labelClass}>Cliente Contratante (Subcategoria Real)</label>
          <input 
            type="text"
            placeholder="BUSCAR CLIENTE..."
            className={inputClass}
            value={searches.customer}
            onFocus={() => setDropdowns(d => ({ ...d, customer: true }))}
            onChange={e => {
              setSearches({...searches, customer: e.target.value});
              setDropdowns(d => ({ ...d, customer: true }));
            }}
          />
          {dropdowns.customer && (
            <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="max-h-60 overflow-y-auto p-2">
                {customers.filter(c => (c.name || '').toUpperCase().includes(searches.customer.toUpperCase())).map(c => (
                  <button key={c.id} type="button" onClick={() => {
                    setFormData({...formData, customer: c});
                    setSearches({...searches, customer: c.name});
                    setDropdowns(d => ({ ...d, customer: false }));
                  }} className="w-full text-left p-3 hover:bg-blue-50 rounded-xl text-[10px] font-black uppercase">{c.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRefs.driver}>
          <label className={labelClass}>Motorista / Veículo</label>
          <input 
            type="text"
            placeholder="BUSCAR MOTORISTA OU PLACA..."
            className={inputClass}
            value={searches.driver}
            onFocus={() => setDropdowns(d => ({ ...d, driver: true }))}
            onChange={e => {
              setSearches({...searches, driver: e.target.value});
              setDropdowns(d => ({ ...d, driver: true }));
            }}
          />
          {dropdowns.driver && (
            <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="max-h-60 overflow-y-auto p-2">
                {drivers.filter(d => d.name.toUpperCase().includes(searches.driver.toUpperCase()) || d.plateHorse.toUpperCase().includes(searches.driver.toUpperCase())).map(d => (
                  <button key={d.id} type="button" onClick={() => {
                    setFormData({...formData, driver: d});
                    setSearches({...searches, driver: d.name});
                    setDropdowns(d => ({ ...d, driver: false }));
                  }} className="w-full text-left p-3 hover:bg-blue-50 rounded-xl flex justify-between items-center group">
                    <span className="text-[10px] font-black uppercase">{d.name}</span>
                    <span className="bg-slate-900 text-white px-2 py-1 rounded font-mono text-[9px]">{d.plateHorse}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 space-y-6 shadow-sm">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">IV. Dados do Equipamento</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="space-y-1">
              <label className={labelClass}>Container</label>
              <input className={inputClass} value={formData.container} onChange={e => handleContainerChange(e.target.value)} />
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Tipo Unidade</label>
              <select className={inputClass} value={formData.containerType} onChange={e => setFormData({...formData, containerType: e.target.value})}>
                 <option value="40HC">40HC</option><option value="20DC">20DC</option><option value="40HR">40HR</option>
              </select>
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Lacre</label>
              <input className={inputClass} value={formData.seal} onChange={e => setFormData({...formData, seal: maskSeal(e.target.value)})} />
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Armador</label>
              <input className={inputClass} value={formData.agencia} onChange={e => setFormData({...formData, agencia: e.target.value.toUpperCase()})} />
           </div>
        </div>
      </div>

      <div className="flex gap-4 pt-8 border-t border-slate-100 mt-10">
        <button type="button" onClick={onCancel} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Descartar</button>
        <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700">
          {isSaving ? 'Gravando...' : editTrip ? 'Confirmar Alterações' : 'Salvar Nova Programação'}
        </button>
      </div>
    </form>
  );
};

export default TripForm;
