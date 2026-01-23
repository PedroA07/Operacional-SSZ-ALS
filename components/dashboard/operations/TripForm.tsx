
import React, { useState, useEffect, useRef } from 'react';
import { Trip, Driver, Customer, Category, Port, PreStacking } from '../../../types';
import { lookupCarrierByContainer } from '../../../utils/carrierService';
import { maskSeal, maskCNPJ } from '../../../utils/masks';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import { searchService } from '../../../utils/searchService';

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
    scheduling: null // Agendamento agora é sempre NULL na criação inicial
  });

  const hasInitialized = useRef<string | null>(null);

  useEffect(() => {
    const currentId = editTrip?.id || 'new_trip';
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
        agencia: editTrip.ocFormData?.agencia || '',
        padrao: editTrip.ocFormData?.padrao || 'CARGA GERAL',
        embarcador: editTrip.ocFormData?.embarcador || '',
        autColeta: editTrip.ocFormData?.autColeta || '',
        obs: editTrip.ocFormData?.obs || editTrip.scheduling?.obs || '',
        cva: editTrip.cva || '',
        tara: editTrip.tara || '',
        seal: editTrip.seal || '',
        ship: editTrip.ship || '',
        booking: editTrip.booking || '',
        scheduling: editTrip.scheduling || null
      });
    } else {
      const defaultCat = initialCategory || (categories.length > 0 ? categories[0].name : '');
      setFormData(prev => ({
        ...prev,
        category: defaultCat,
        customer: initialCustomer || prev.customer,
        dateTime: getLocalISOTime(),
        scheduling: null
      }));
    }
    hasInitialized.current = currentId;
  }, [editTrip, initialCategory, initialCustomer, categories]);

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

  const SelectedEntityCard = ({ entity, onClear, type }: any) => {
    if (!entity) return null;
    const isCustomer = type === 'customer';
    return (
      <div className="bg-white p-5 rounded-3xl border-2 border-blue-500 shadow-lg flex items-center justify-between animate-in zoom-in-95">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{isCustomer ? 'Cliente Selecionado' : 'Destino Selecionado'}</p>
          <h5 className="text-sm font-black text-slate-900 uppercase truncate leading-tight">{entity.legalName || entity.name}</h5>
          {entity.legalName && entity.name !== entity.legalName && (
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 italic">FAN: {entity.name}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{maskCNPJ(entity.cnpj)}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase">{entity.city} - {entity.state}</span>
          </div>
        </div>
        <button type="button" onClick={onClear} className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all ml-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
        </button>
      </div>
    );
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-10 pb-10">
      
      {/* I. CATEGORIA */}
      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">I. Configuração da Categoria Operacional</h4>
        <div className="space-y-1">
          <label className={labelClass}>Vincular à Categoria do Banco de Dados</label>
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

      {/* II. DADOS DA VIAGEM */}
      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">II. Dados da Viagem</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Número da OS</label>
            <input 
              required 
              className={`${inputClass} text-xl border-blue-100 text-blue-700`} 
              placeholder="EX: 123ALC..."
              value={formData.os} 
              onChange={e => setFormData({...formData, os: e.target.value.toUpperCase()})} 
            />
          </div>
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Navio / Embarcação</label>
            <input 
              className={inputClass} 
              placeholder="NOME DO NAVIO"
              value={formData.ship} 
              onChange={e => setFormData({...formData, ship: e.target.value.toUpperCase()})} 
            />
          </div>
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Booking / Reserva</label>
            <input 
              className={inputClass} 
              placeholder="Nº BOOKING"
              value={formData.booking} 
              onChange={e => setFormData({...formData, booking: e.target.value.toUpperCase()})} 
            />
          </div>
          <div className="md:col-span-6 space-y-1">
            <label className={labelClass}>Modalidade</label>
            <select className={inputClass} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="EXPORTAÇÃO">EXPORTAÇÃO</option>
              <option value="IMPORTAÇÃO">IMPORTAÇÃO</option>
              <option value="COLETA">COLETA</option>
              <option value="ENTREGA">ENTREGA</option>
            </select>
          </div>
          <div className="md:col-span-6 space-y-1">
            <label className={labelClass}>Previsão Início da Viagem</label>
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

      {/* III. CLIENTE */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">III. Identificação do Cliente</h4>
        {formData.customer ? (
          <SelectedEntityCard entity={formData.customer} type="customer" onClear={() => setFormData({...formData, customer: null})} />
        ) : (
          <AutocompleteSearch 
            label="Buscar Cliente"
            placeholder="Razão, Fantasia ou CNPJ..."
            data={customers}
            onSelect={(c) => setFormData({...formData, customer: c})}
            mapToAutocomplete={searchService.mapCustomer}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>}
          />
        )}
      </div>

      {/* IV. DESTINO */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">IV. Local de Entrega / Destino</h4>
        {formData.destination ? (
          <SelectedEntityCard entity={formData.destination} type="destination" onClear={() => setFormData({...formData, destination: null})} />
        ) : (
          <AutocompleteSearch 
            label="Buscar Terminal / Porto"
            placeholder="Nome do Terminal ou Porto..."
            data={ports}
            onSelect={(p) => setFormData({...formData, destination: p})}
            mapToAutocomplete={searchService.mapPort}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>}
          />
        )}
      </div>

      {/* V. DETALHES OPERACIONAIS */}
      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">V. Detalhes Operacionais Adicionais</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-1">
              <label className={labelClass}>Autorização de Coleta</label>
              <input 
                className={inputClass}
                placeholder="Nº AUTORIZAÇÃO"
                value={formData.autColeta} 
                onChange={e => setFormData({...formData, autColeta: e.target.value.toUpperCase()})} 
              />
           </div>
           <div className="space-y-1">
              <label className={labelClass}>Embarcador (Shipper)</label>
              <input 
                className={inputClass}
                placeholder="NOME DO EMBARCADOR"
                value={formData.embarcador} 
                onChange={e => setFormData({...formData, embarcador: e.target.value.toUpperCase()})} 
              />
           </div>
        </div>
      </div>

      {/* VI. MOTORISTA */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">VI. Recurso de Transporte</h4>
        {formData.driver ? (
          <div className="bg-slate-900 p-6 rounded-3xl text-white flex items-center justify-between shadow-xl animate-in zoom-in-95">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xl italic shadow-lg">ALS</div>
                <div>
                   <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Motorista Alocado</p>
                   <h5 className="text-sm font-black uppercase leading-none">{formData.driver.name}</h5>
                   <div className="flex gap-3 mt-2">
                      <span className="text-[10px] font-mono font-black text-blue-200 bg-white/5 px-2 py-0.5 rounded border border-white/10">{formData.driver.plateHorse}</span>
                      <span className="text-[10px] font-mono font-black text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">{formData.driver.plateTrailer}</span>
                   </div>
                </div>
             </div>
             <button type="button" onClick={() => setFormData({...formData, driver: null})} className="w-10 h-10 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
             </button>
          </div>
        ) : (
          <AutocompleteSearch 
            label="Buscar Motorista"
            placeholder="Nome ou Placa..."
            data={drivers}
            onSelect={(d) => setFormData({...formData, driver: d})}
            mapToAutocomplete={searchService.mapDriver}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>}
          />
        )}
      </div>

      {/* VII. EQUIPAMENTO */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 space-y-6 shadow-sm">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">VII. Dados do Equipamento</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <div className="md:col-span-3 space-y-1">
              <label className={labelClass}>Container</label>
              <input className={inputClass} value={formData.container} onChange={e => handleContainerChange(e.target.value)} placeholder="ABCD1234567" />
           </div>
           <div className="md:col-span-2 space-y-1">
              <label className={labelClass}>Tipo Unidade</label>
              <select className={inputClass} value={formData.containerType} onChange={e => setFormData({...formData, containerType: e.target.value})}>
                 <option value="40HC">40HC</option><option value="20DC">20DC</option><option value="40HR">40HR</option>
              </select>
           </div>
           <div className="md:col-span-2 space-y-1">
              <label className={labelClass}>Lacre</label>
              <input className={inputClass} value={formData.seal} onChange={e => setFormData({...formData, seal: maskSeal(e.target.value)})} placeholder="LACRE" />
           </div>
           <div className="md:col-span-2 space-y-1">
              <label className={labelClass}>Certificado (CVA)</label>
              <input className={inputClass} value={formData.cva} onChange={e => setFormData({...formData, cva: e.target.value.toUpperCase()})} placeholder="Nº CVA" />
           </div>
           <div className="md:col-span-3 space-y-1">
              <label className={labelClass}>Armador</label>
              <input className={inputClass} value={formData.agencia} onChange={e => setFormData({...formData, agencia: e.target.value.toUpperCase()})} placeholder="AGÊNCIA" />
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
