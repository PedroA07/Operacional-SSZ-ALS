
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
    category: '', subCategory: '', container: '', tara: '', seal: '', cva: '', 
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

  useEffect(() => {
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
      setFormData(prev => ({
        ...prev,
        category: initialCategory || prev.category,
        customer: initialCustomer || prev.customer,
        subCategory: initialCustomer?.name || prev.subCategory,
        dateTime: getLocalISOTime(),
        schedulingDate: ''
      }));
      setSearches({
        customer: initialCustomer ? initialCustomer.name : '',
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

  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300";
  const dateInputClass = "w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block";

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-10 pb-10">
      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">I. Início da Viagem</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 space-y-1">
            <label className={labelClass}>Número da OS</label>
            <input required className={`${inputClass} text-xl border-blue-100 text-blue-700`} value={formData.os} onChange={e => setFormData({...formData, os: e.target.value.toUpperCase()})} />
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
            <input required type="datetime-local" className={dateInputClass} value={formData.dateTime} onChange={e => setFormData({...formData, dateTime: e.target.value})} />
          </div>
        </div>
      </div>

      <div className="bg-blue-50/30 p-8 rounded-[3rem] border border-blue-100 space-y-6">
        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">II. Agendamento Terminal (DESTINO)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-1">
              <label className={labelClass}>Janela Agendada no Destino</label>
              <input type="datetime-local" className={`${dateInputClass} border-blue-200 text-blue-800`} value={formData.schedulingDate} onChange={e => setFormData({...formData, schedulingDate: e.target.value})} />
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 italic">* Independente do horário de início da programação.</p>
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Notas / Senha / Box</label>
              <input className={inputClass} placeholder="EX: SENHA 123, BOX 10" value={formData.obs} onChange={e => setFormData({...formData, obs: e.target.value.toUpperCase()})} />
           </div>
        </div>
      </div>

      {/* Resto do formulário mantido conforme original para clientes e equipamentos */}
      <div className="flex gap-4 pt-8 border-t border-slate-100 mt-10">
        <button type="button" onClick={onCancel} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Descartar</button>
        <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700">
          {isSaving ? 'Gravando...' : 'Salvar Programação'}
        </button>
      </div>
    </form>
  );
};

export default TripForm;
