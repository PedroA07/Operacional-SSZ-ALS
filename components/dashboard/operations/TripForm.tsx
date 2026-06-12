
import React, { useState, useEffect, useRef } from 'react';
import { Trip, Driver, Customer, Category, Port, PreStacking } from '../../../types';
import ContainerInput from '../../shared/ContainerInput';
import { maskSeal, maskCNPJ } from '../../../utils/masks';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import { searchService } from '../../../utils/searchService';
import { osCategoryService } from '../../../utils/osCategoryService';
import { db } from '../../../utils/storage';
import DriverSwapModal, { DriverSwapResult } from '../drivers/DriverSwapModal';
import CustomSelect from '../../shared/CustomSelect';
import DateTimePicker from '../../shared/DateTimePicker';

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
  const [containerTypes, setContainerTypes] = useState<any[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [userHasChosenCategory, setUserHasChosenCategory] = useState(!!editTrip?.category);

  useEffect(() => {
    db.getContainerTypes().then(types => {
      if (types && types.length > 0) {
        setContainerTypes(types);
      } else {
        setContainerTypes([{id: 'default-1', name: '40HC'}, {id: 'default-2', name: '20DC'}, {id: 'default-3', name: '40HR'}]);
      }
    });

    db.getOperationTypes().then(types => {
      if (types && types.length > 0) {
        setOperationTypes(types);
      } else {
        setOperationTypes([
          {id: '1', name: 'EXPORTAÇÃO'},
          {id: '2', name: 'IMPORTAÇÃO'},
          {id: '3', name: 'COLETA'},
          {id: '4', name: 'ENTREGA'},
          {id: '5', name: 'CABOTAGEM'}
        ]);
      }
    });
  }, []);
  const getLocalISOTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState<any>({
    os: '', booking: '', ship: '', autColeta: '', embarcador: '', dateTime: getLocalISOTime(), type: '', status: 'Pendente',
    category: '', container: '', tara: '', seal: '', cva: '',
    containerType: '40HC', agencia: '', padrao: 'CARGA GERAL', obs: '',
    customer: null, destination: null, driver: null,
    scheduling: null,
    isScheduled: false
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
        agencia: editTrip.ocFormData?.agencia || editTrip.agencia || '',
        padrao: editTrip.ocFormData?.padrao || 'CARGA GERAL',
        obs: editTrip.ocFormData?.obs || editTrip.scheduling?.obs || '',
        cva: editTrip.cva || '',
        tara: editTrip.tara || '',
        seal: editTrip.seal || '',
        ship: editTrip.ship || '',
        booking: editTrip.booking || '',
        autColeta: editTrip.autColeta || '',
        embarcador: editTrip.embarcador || '',
        scheduling: editTrip.scheduling || null,
        category: (editTrip.category || '').toUpperCase()
      });
    } else {
      setFormData((prev: any) => ({
        ...prev,
        type: '',
        category: (initialCategory || '').toUpperCase(),
        customer: initialCustomer || prev.customer,
        dateTime: getLocalISOTime(),
        scheduling: null
      }));
    }
    hasInitialized.current = currentId;
  }, [editTrip, initialCategory, initialCustomer, categories, operationTypes]);

  const getCategoryForType = (typeName: string): string => {
    const op = operationTypes.find((t: any) => t.name === typeName);
    if (!op?.config?.defaultCategoryId) return '';
    const cat = categories.find((c: Category) => c.id === op.config.defaultCategoryId);
    return cat?.name?.toUpperCase() || '';
  };

  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block";

  const SelectedEntityCard = ({ entity, onClear, type }: any) => {
    if (!entity) return null;
    const isCustomer = type === 'customer';
    return (
      <div className="bg-white p-5 rounded-3xl border-2 border-blue-500 shadow-lg flex items-center justify-between animate-in zoom-in-95">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{isCustomer ? 'Cliente Selecionado' : 'Destino Selecionado'}</p>
          <h5 className="text-sm font-black text-slate-900 uppercase truncate leading-tight">{entity.legalName || entity.name}</h5>
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
      
      {/* I. DADOS DA VIAGEM */}
      <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">I. Dados Principais da Viagem</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Número da OS</label>
            <input required className={`${inputClass} text-xl border-blue-100 text-blue-700`} placeholder="EX: 123ALC..." value={formData.os} onChange={e => {
              const os = e.target.value.toUpperCase();
              setFormData((prev: any) => {
                const next = { ...prev, os };
                // Detecção automática do vínculo pelo padrão da OS (ex: 123ALC456A → ALIANÇA)
                if (!userHasChosenCategory) {
                  const detected = osCategoryService.detectCategoryFromOS(os);
                  if (detected) next.category = detected.toUpperCase();
                }
                return next;
              });
            }} />
          </div>
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              Tipo de Operação <span className="text-red-400">*</span>
            </label>
            <CustomSelect
              value={formData.type}
              onChange={v => {
                const autoCat = getCategoryForType(v);
                setFormData((prev: any) => ({
                  ...prev,
                  type: v,
                  category: (!userHasChosenCategory && autoCat) ? autoCat : prev.category,
                }));
              }}
              placeholder="SELECIONE O TIPO..."
              options={operationTypes.map(op => ({ value: op.name, label: op.name }))}
              inputClassName={`${inputClass} ${!formData.type ? 'border-red-300' : ''}`}
            />
            {!formData.type && (
              <p className="text-[8px] font-black text-red-500 uppercase mt-1 ml-1">Obrigatório</p>
            )}
          </div>
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Vínculo Operacional</label>
            <CustomSelect
              required
              value={formData.category}
              onChange={v => { setUserHasChosenCategory(true); setFormData({...formData, category: v}); }}
              placeholder={userHasChosenCategory ? 'SELECIONE...' : 'AUTO DETECTANDO...'}
              options={Array.from(new Set([
                ...categories.filter(c => !c.parentId).map(c => c.name.toUpperCase()),
                'ALIANÇA',
                'MERCOSUL'
              ])).sort().map(name => ({ value: name, label: name }))}
              inputClassName={`${inputClass} ${formData.category ? 'border-blue-300 text-blue-700' : ''}`}
            />
            {formData.category && !userHasChosenCategory && (
              <p className="text-[8px] font-black text-blue-500 uppercase mt-1 ml-1">✓ Detectado automaticamente</p>
            )}
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className={labelClass}>Navio / Embarcação</label>
            <input className={inputClass} placeholder="NOME DO NAVIO" value={formData.ship} onChange={e => setFormData({...formData, ship: e.target.value.toUpperCase()})} />
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className={labelClass}>Booking / Reserva</label>
            <input className={inputClass} placeholder="Nº BOOKING" value={formData.booking} onChange={e => setFormData({...formData, booking: e.target.value.toUpperCase()})} />
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className={labelClass}>Autorização de Coleta</label>
            <input className={inputClass} placeholder="AUT. COLETA" value={formData.autColeta} onChange={e => setFormData({...formData, autColeta: e.target.value.toUpperCase()})} />
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className={labelClass}>Embarcador (Shipper)</label>
            <input className={inputClass} placeholder="EMBARCADOR / SHIPPER" value={formData.embarcador} onChange={e => setFormData({...formData, embarcador: e.target.value.toUpperCase()})} />
            {formData.customer && (formData.customer.name || formData.customer.legalName) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 ml-1">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest shrink-0">Sugerir:</span>
                {formData.customer.name && (
                  <button type="button"
                    onClick={() => setFormData({...formData, embarcador: formData.customer.name.toUpperCase()})}
                    className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg hover:bg-blue-100 transition-all uppercase max-w-[160px] truncate"
                    title={`Fantasia: ${formData.customer.name}`}
                  >
                    {formData.customer.name}
                  </button>
                )}
                {formData.customer.legalName && formData.customer.legalName !== formData.customer.name && (
                  <button type="button"
                    onClick={() => setFormData({...formData, embarcador: formData.customer.legalName.toUpperCase()})}
                    className="text-[8px] font-black text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-all uppercase max-w-[160px] truncate"
                    title={`Razão Social: ${formData.customer.legalName}`}
                  >
                    {formData.customer.legalName}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Previsão Início</label>
            <DateTimePicker
                required
                value={formData.dateTime || ''}
                onChange={v => setFormData({...formData, dateTime: v})}
                placeholder="Previsão início..."
                inputClassName={inputClass}
              />
          </div>
          <div className="md:col-span-4 flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div 
                onClick={() => setFormData({...formData, isScheduled: !formData.isScheduled})}
                className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${formData.isScheduled ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200' : 'bg-white border-slate-200 group-hover:border-emerald-300'}`}
              >
                {formData.isScheduled && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
              </div>
              <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${formData.isScheduled ? 'text-emerald-600' : 'text-slate-400'}`}>Viagem Agendada?</span>
            </label>
          </div>
        </div>
      </div>

      {/* II. CLIENTE & DESTINO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">II. Identificação do Cliente</h4>
          {formData.customer ? (
            <SelectedEntityCard entity={formData.customer} type="customer" onClear={() => setFormData({...formData, customer: null})} />
          ) : (
            <AutocompleteSearch label="Buscar Cliente" placeholder="Razão ou CNPJ..." data={customers} onSelect={(c) => setFormData({...formData, customer: c})} mapToAutocomplete={searchService.mapCustomer} />
          )}
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">III. Local de Entrega</h4>
          {formData.destination ? (
            <SelectedEntityCard entity={formData.destination} type="destination" onClear={() => setFormData({...formData, destination: null})} />
          ) : (
            <AutocompleteSearch label="Buscar Terminal" placeholder="Nome do Terminal..." data={ports} onSelect={(p) => setFormData({...formData, destination: p})} mapToAutocomplete={searchService.mapPort} />
          )}
        </div>
      </div>

      {/* III. MOTORISTA */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">IV. Recurso de Transporte</h4>
        {formData.driver ? (
          <div className="space-y-4">
            {/* Card do motorista */}
            <div className="bg-slate-900 p-6 rounded-3xl text-white flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
                  {formData.driver.photo
                    ? <img src={formData.driver.photo} className="w-full h-full object-cover" />
                    : <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />}
                </div>
                <div>
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Motorista Alocado</p>
                  <h5 className="text-sm font-black uppercase leading-none">{formData.driver.name}</h5>
                  <div className="flex gap-3 mt-2">
                    <span className="text-[10px] font-mono font-black text-blue-200 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {formData.driver.plateHorse || '—'}
                    </span>
                    {formData.driver.plateTrailer && (
                      <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {formData.driver.plateTrailer}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Botão trocar motorista */}
                <button
                  type="button"
                  onClick={() => setSwapModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600/80 text-white text-[9px] font-black uppercase hover:bg-blue-500 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Trocar
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, driver: null })}
                  className="w-10 h-10 rounded-2xl bg-white/5 text-slate-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" /></svg>
                </button>
              </div>
            </div>

            {/* Seletores de placa */}
            {(() => {
              const driverFull = drivers.find(d => d.id === formData.driver?.id);
              const horses = driverFull?.platesHorse || (formData.driver?.plateHorse ? [{ id: 'h0', plate: formData.driver.plateHorse, isPrimary: true }] : []);
              const trailers = driverFull?.platesTrailer || (formData.driver?.plateTrailer ? [{ id: 't0', plate: formData.driver.plateTrailer, isPrimary: true }] : []);
              if (horses.length <= 1 && trailers.length <= 1) return null;
              return (
                <div className="grid grid-cols-2 gap-4">
                  {horses.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa do Cavalo</p>
                      <CustomSelect
                        value={formData.driver?.plateHorse || ''}
                        onChange={v => {
                          const entry = horses.find((h: any) => h.plate === v);
                          setFormData((prev: any) => ({
                            ...prev,
                            driver: { ...prev.driver, plateHorse: entry?.plate || '' }
                          }));
                        }}
                        options={horses.map((h: any) => ({
                          value: h.plate,
                          label: `${h.plate}${h.year ? ` (${h.year})` : ''}${h.isPrimary ? ' — Principal' : ''}`
                        }))}
                        inputClassName="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none text-sm"
                      />
                    </div>
                  )}
                  {trailers.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa da Carreta</p>
                      <CustomSelect
                        value={formData.driver?.plateTrailer || ''}
                        onChange={v => {
                          const entry = trailers.find((t: any) => t.plate === v);
                          setFormData((prev: any) => ({
                            ...prev,
                            driver: { ...prev.driver, plateTrailer: entry?.plate || '' }
                          }));
                        }}
                        placeholder="— Sem carreta —"
                        options={trailers.map((t: any) => ({
                          value: t.plate,
                          label: `${t.plate}${t.year ? ` (${t.year})` : ''}${t.isPrimary ? ' — Principal' : ''}`
                        }))}
                        inputClassName="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none text-sm"
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <AutocompleteSearch
            label="Buscar Motorista"
            placeholder="Nome ou Placa..."
            data={drivers}
            onSelect={(d: Driver) => {
              const ph = d.platesHorse?.find(e => e.isPrimary) || d.platesHorse?.[0];
              const pt = d.platesTrailer?.find(e => e.isPrimary) || d.platesTrailer?.[0];
              setFormData({
                ...formData,
                driver: {
                  ...d,
                  plateHorse: ph?.plate || d.plateHorse || '',
                  plateTrailer: pt?.plate || d.plateTrailer || ''
                }
              });
            }}
            mapToAutocomplete={searchService.mapDriver}
          />
        )}

        {/* Modal de troca */}
        <DriverSwapModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          driver={drivers.find(d => d.id === formData.driver?.id) || formData.driver || null}
          drivers={drivers}
          currentPlateHorse={formData.driver?.plateHorse || ''}
          currentPlateTrailer={formData.driver?.plateTrailer || ''}
          onConfirm={(result: DriverSwapResult) => {
            setFormData((prev: any) => ({
              ...prev,
              driver: { ...prev.driver, plateHorse: result.plateHorse, plateTrailer: result.plateTrailer }
            }));
          }}
        />
      </div>

      {/* IV. EQUIPAMENTO */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 space-y-6 shadow-sm">
        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">V. Dados do Equipamento</h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <div className="md:col-span-4 space-y-1">
              <label className={labelClass}>Container</label>
              <ContainerInput
                value={formData.container}
                onChange={(containerValue, carrierName) => setFormData((prev: any) => ({
                  ...prev,
                  container: containerValue,
                  agencia: carrierName !== '' ? carrierName : prev.agencia,
                }))}
                className={inputClass}
              />
           </div>
           <div className="md:col-span-4 space-y-1">
              <label className={labelClass}>Tipo Unidade</label>
              <CustomSelect
                 value={formData.containerType}
                 onChange={v => setFormData({...formData, containerType: v})}
                 options={containerTypes.map(type => ({ value: type.name, label: type.name }))}
                 inputClassName={inputClass}
              />
           </div>
           <div className="md:col-span-4 space-y-1">
              <label className={labelClass}>Tara do Contêiner (kg)</label>
              <input className={inputClass} value={formData.tara} onChange={e => setFormData({...formData, tara: e.target.value.replace(/[^0-9.,]/g, '')})} placeholder="EX: 4200" />
           </div>
           <div className="md:col-span-4 space-y-1">
              <label className={labelClass}>Lacre</label>
              <input className={inputClass} value={formData.seal} onChange={e => setFormData({...formData, seal: maskSeal(e.target.value)})} placeholder="LACRE" />
           </div>
           <div className="md:col-span-4 space-y-1">
              <label className={labelClass}>Armador (Agência)</label>
              <input className={inputClass} value={formData.agencia} onChange={e => setFormData({...formData, agencia: e.target.value.toUpperCase()})} placeholder="MSC, MAERSK, ETC" />
           </div>
           <div className="md:col-span-4 space-y-1">
              <label className={labelClass}>Certificado (CVA)</label>
              <input className={inputClass} value={formData.cva} onChange={e => setFormData({...formData, cva: e.target.value.toUpperCase()})} placeholder="Nº CVA" />
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
