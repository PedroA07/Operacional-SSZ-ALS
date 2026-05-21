import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, User, Devolucao } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DevolucaoVazioTemplate from './DevolucaoVazioTemplate';
import ContainerInput from '../../shared/ContainerInput';
import DriverPlateSelector, { primaryHorse, primaryTrailer } from '../../shared/DriverPlateSelector';
import DriverSwapModal, { DriverSwapResult } from '../drivers/DriverSwapModal';
import { db } from '../../../utils/storage';
import { localDateStr, formFingerprint } from '../../../utils/dateHelpers';
import CustomSelect from '../../shared/CustomSelect';
import DateTimePicker from '../../shared/DateTimePicker';
import { maskCNPJ, maskCPF } from '../../../utils/masks';

interface DevolucaoVazioFormProps {
  user?: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
  devolucao?: Devolucao;
  onSave?: (updated: Devolucao) => Promise<void>;
  /** @deprecated use devolucao + onSave */
  initialFormData?: any;
  /** @deprecated use devolucao + onSave */
  tripId?: string;
  /** @deprecated use devolucao + onSave */
  onAgendamentoSave?: (id: string, dateTime: string) => void;
}

const commonPODs = ['SANTOS', 'PARANAGUÁ', 'ITAGUAÍ', 'RIO DE JANEIRO', 'NAVEGANTES', 'ITAJAÍ', 'MONTEVIDEO', 'BUENOS AIRES'];

const DevolucaoVazioForm: React.FC<DevolucaoVazioFormProps> = ({ user, drivers, customers, ports, onClose, devolucao, onSave, initialFormData, tripId, onAgendamentoSave }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLDivElement>(null);
  const [plateHorse, setPlateHorse] = useState('');
  const [plateTrailer, setPlateTrailer] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const [localSearch, setLocalSearch] = useState(devolucao?.local || '');
  const [showLocalResults, setShowLocalResults] = useState(false);
  const [remetenteSearch, setRemetenteSearch] = useState(
    devolucao?.customer ? (devolucao.customer.legalName || devolucao.customer.name || '') : ''
  );
  const [showRemetenteResults, setShowRemetenteResults] = useState(false);
  const [driverSearch, setDriverSearch] = useState(devolucao?.driver?.name || '');
  const [showDriverResults, setShowDriverResults] = useState(false);
  const [podSearch, setPodSearch] = useState('');
  const [showPodResults, setShowPodResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const localRef = useRef<HTMLDivElement>(null);
  const remetenteRef = useRef<HTMLDivElement>(null);
  const driverRef = useRef<HTMLDivElement>(null);
  
  const [containerTypes, setContainerTypes] = useState<any[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));

    const loadContainerTypes = async () => {
      const types = await db.getContainerTypes();
      setContainerTypes(types);
    };
    loadContainerTypes();

    const handleClickOutside = (e: MouseEvent) => {
      if (podRef.current && !podRef.current.contains(e.target as Node)) setShowPodResults(false);
      if (localRef.current && !localRef.current.contains(e.target as Node)) setShowLocalResults(false);
      if (remetenteRef.current && !remetenteRef.current.contains(e.target as Node)) setShowRemetenteResults(false);
      if (driverRef.current && !driverRef.current.contains(e.target as Node)) setShowDriverResults(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultFormData = {
    date: localDateStr(),
    driverId: '',
    remetenteId: '',
    destinatarioId: '',
    container: '',
    booking: '',
    ship: '',
    agencia: '',
    pod: 'SANTOS',
    qtdContainer: '01',
    tipo: '40HC',
    padrao: 'CARGA GERAL',
    obs: '',
    manualLocal: '',
    agendamentoDateTime: '',
  };
  const initData = devolucao ? {
    date: localDateStr(),
    driverId:          devolucao.driver?.id        || '',
    remetenteId:       devolucao.customer?.id      || '',
    destinatarioId:    '',
    container:         devolucao.container         || '',
    booking:           devolucao.booking            || '',
    ship:              devolucao.ship               || '',
    agencia:           devolucao.agencia            || '',
    pod:               devolucao.pod               || 'SANTOS',
    qtdContainer:      '01',
    tipo:              devolucao.containerType      || '40HC',
    padrao:            devolucao.padrao             || 'CARGA GERAL',
    obs:               devolucao.obs               || '',
    manualLocal:       devolucao.local             || '',
    agendamentoDateTime: devolucao.scheduledDateTime || '',
  } : (initialFormData ?? defaultFormData);

  const [formData, setFormData] = useState<typeof defaultFormData>(initData);

  const handleInputChange = (field: string, value: string) => {
    const val = value.toUpperCase();
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'tipo' && val === '40HR') {
        next.padrao = 'REEFER';
      }
      return next;
    });
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = ports.find(l => l.id === formData.destinatarioId);

  useEffect(() => {
    if (selectedDriver) {
      setPlateHorse(primaryHorse(selectedDriver));
      setPlateTrailer(primaryTrailer(selectedDriver));
    }
  }, [formData.driverId]);

  const effectiveDriver = selectedDriver ? { ...selectedDriver, plateHorse, plateTrailer } : undefined;

  const buildUpdatedDevolucao = (): Devolucao | null => {
    if (!devolucao) return null;
    return {
      ...devolucao,
      container:     formData.container,
      containerType: formData.tipo       || undefined,
      booking:       formData.booking    || undefined,
      ship:          formData.ship       || undefined,
      agencia:       formData.agencia    || undefined,
      pod:           formData.pod        || undefined,
      padrao:        formData.padrao     || undefined,
      local:         formData.manualLocal || undefined,
      localId:       formData.destinatarioId || undefined,
      obs:           formData.obs        || undefined,
      scheduledDateTime: formData.agendamentoDateTime || undefined,
      status: formData.agendamentoDateTime ? 'Agendado' : devolucao.status,
      customer: selectedRemetente ? {
        id:        selectedRemetente.id,
        name:      selectedRemetente.name,
        legalName: selectedRemetente.legalName,
        cnpj:      selectedRemetente.cnpj,
        city:      selectedRemetente.city,
        state:     selectedRemetente.state,
      } : devolucao.customer,
      driver: effectiveDriver ? {
        id:           effectiveDriver.id,
        name:         effectiveDriver.name,
        plateHorse:   effectiveDriver.plateHorse   || undefined,
        plateTrailer: effectiveDriver.plateTrailer || undefined,
        cpf:          effectiveDriver.cpf          || undefined,
      } : devolucao.driver,
      updatedAt: new Date().toISOString(),
    };
  };

  const saveData = async () => {
    if (!devolucao || !onSave) return;
    setIsSaving(true);
    try {
      const updated = buildUpdatedDevolucao();
      if (updated) await onSave(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadPDF = async () => {
    if (!effectiveDriver || !formData.container) {
      alert("Preencha Container e Motorista para prosseguir.");
      return;
    }

    setIsExporting(true);
    try {
      const activeUser = user || currentUser;
      if (activeUser) {
        await db.addNotification(
          activeUser,
          'MINUTA_GENERATED',
          `Devolução de Vazio: ${formData.container}`,
          `Minuta de devolução para o motorista ${effectiveDriver!.name} gerada com sucesso.`,
          { os: formData.container, motorista: effectiveDriver!.name, placa: effectiveDriver!.plateHorse }
        );
      }
      const dataChanged = !initialFormData || formFingerprint(formData) !== formFingerprint(initialFormData);
      if (dataChanged) {
        db.saveFormHistory('DEVOLUCAO_VAZIO', formData, formData.container || formData.booking, activeUser);
      }
      if (tripId && formData.agendamentoDateTime && onAgendamentoSave) {
        onAgendamentoSave(tripId, formData.agendamentoDateTime);
      }
      if (devolucao && onSave) {
        const updated = buildUpdatedDevolucao();
        if (updated) await onSave(updated);
      }

      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      pdf.save(`DEVOLUÇÃO DE VAZIO - ${effectiveDriver!.name} - ${formData.container}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:border-amber-500 outline-none transition-all shadow-sm placeholder:text-slate-300";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelAmberClass = "text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 block";

  const filteredCustomers = customers.filter(c => {
    const q = remetenteSearch.toUpperCase();
    return (c.name && c.name.toUpperCase().includes(q)) ||
      (c.legalName && c.legalName.toUpperCase().includes(q)) ||
      (c.cnpj && c.cnpj.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) ||
      (c.city && c.city.toUpperCase().includes(q));
  });

  const filteredDrivers = drivers.filter(d => {
    const q = driverSearch.toUpperCase();
    return d.name.toUpperCase().includes(q) ||
      (d.cpf && d.cpf.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) ||
      (d.plateHorse && d.plateHorse.toUpperCase().includes(q)) ||
      (d.plateTrailer && d.plateTrailer.toUpperCase().includes(q));
  });

  const filteredPorts = ports.filter(p => {
    const q = localSearch.toUpperCase();
    return (p.name && p.name.toUpperCase().includes(q)) ||
      (p.legalName && p.legalName.toUpperCase().includes(q)) ||
      (p.city && p.city.toUpperCase().includes(q));
  });

  const filteredPODs = commonPODs.filter(p => p.toUpperCase().includes(podSearch.toUpperCase()));

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <DevolucaoVazioTemplate 
            formData={formData} 
            selectedDriver={effectiveDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={selectedDestinatario} 
          />
        </div>
      </div>

      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
        <div className="relative" ref={localRef}>
          <label className={labelAmberClass}>1. Local de Devolução (Depot / Terminal)</label>
          <input
            type="text"
            placeholder="BUSCAR TERMINAL OU PORTO..."
            className={inputClasses}
            value={localSearch}
            onFocus={() => setShowLocalResults(true)}
            onChange={e => {
              const val = e.target.value.toUpperCase();
              setLocalSearch(val);
              setFormData(prev => ({ ...prev, manualLocal: val, destinatarioId: '' }));
            }}
          />
          {showLocalResults && filteredPorts.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto border-t-4 border-amber-500 animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredPorts.map(p => (
                <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 transition-colors" onClick={() => {
                  setLocalSearch(p.name.toUpperCase());
                  setFormData(prev => ({ ...prev, manualLocal: p.name.toUpperCase(), destinatarioId: p.id }));
                  setShowLocalResults(false);
                }}>
                  <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">{p.name}</p>
                  {p.city && <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{p.city}{p.state ? `/${p.state}` : ''}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={remetenteRef}>
          <label className={labelAmberClass}>2. Cliente (Exportador)</label>
          <input type="text" placeholder="BUSCAR CLIENTE..." className={inputClasses} value={remetenteSearch} onFocus={() => setShowRemetenteResults(true)} onChange={e => { setRemetenteSearch(e.target.value.toUpperCase()); setFormData(prev => ({ ...prev, remetenteId: '' })); }} />
          {selectedRemetente && (
            <div className="mt-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-800 uppercase truncate">{selectedRemetente.legalName || selectedRemetente.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedRemetente.cnpj && <span className="text-[8px] font-bold text-slate-500">{maskCNPJ(selectedRemetente.cnpj)}</span>}
                  {selectedRemetente.city && <span className="text-[8px] font-bold text-slate-400 uppercase">{selectedRemetente.city}{selectedRemetente.state ? `/${selectedRemetente.state}` : ''}</span>}
                </div>
              </div>
              <button type="button" onClick={() => { setRemetenteSearch(''); setFormData(prev => ({ ...prev, remetenteId: '' })); }} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          {showRemetenteResults && !selectedRemetente && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto border-t-4 border-amber-500 animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 transition-colors" onClick={() => { setFormData(prev => ({...prev, remetenteId: c.id})); setRemetenteSearch(c.legalName || c.name); setShowRemetenteResults(false); }}>
                  <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">{c.legalName || c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.cnpj && <span className="text-[8px] font-bold text-slate-500">{maskCNPJ(c.cnpj)}</span>}
                    {c.city && <span className="text-[8px] font-bold text-slate-400 uppercase">{c.city}{c.state ? `/${c.state}` : ''}</span>}
                  </div>
                </button>
              )) : (
                <div className="px-4 py-3 text-[9px] text-slate-400 font-bold uppercase">Nenhum cliente encontrado</div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
           <p className={labelClass}>3. Dados do Equipamento</p>
           <div className="space-y-3">
              <div className="space-y-1">
                 <label className={labelClass}>Container</label>
                 <ContainerInput
                   value={formData.container}
                   onChange={(containerValue, carrierName) => setFormData(prev => ({
                     ...prev,
                     container: containerValue,
                     agencia: carrierName !== '' ? carrierName : prev.agencia,
                   }))}
                   className={`${inputClasses} text-lg border-amber-100`}
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className={labelClass}>Tipo</label>
                    <CustomSelect
                       value={formData.tipo}
                       onChange={v => handleInputChange('tipo', v)}
                       options={containerTypes.map(t => ({ value: t.name, label: t.name }))}
                       inputClassName={inputClasses}
                    />
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Padrão</label>
                    <CustomSelect
                       value={formData.padrao}
                       onChange={v => handleInputChange('padrao', v)}
                       options={[
                         { value: 'CARGA GERAL', label: 'CARGA GERAL' },
                         { value: 'CARGO PREMIUM', label: 'CARGO PREMIUM' },
                         { value: 'PADRÃO ALIMENTO', label: 'PADRÃO ALIMENTO' },
                         { value: 'REEFER', label: 'REEFER' },
                         { value: 'PRODUTO QUÍMICO', label: 'PRODUTO QUÍMICO' },
                       ]}
                       inputClassName={inputClasses}
                    />
                 </div>
              </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>4. Dados da Operação</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} /></div>
          </div>
          
          <div className="space-y-1 relative" ref={podRef}>
            <label className={labelClass}>Porto de Descarga (POD)</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="BUSCAR OU DIGITAR POD..." 
                className={`${inputClasses} pr-10`} 
                value={podSearch || formData.pod} 
                onFocus={() => setShowPodResults(true)}
                onChange={e => {
                  const val = e.target.value.toUpperCase();
                  setPodSearch(val);
                  handleInputChange('pod', val);
                }} 
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
              </div>
            </div>
            
            {showPodResults && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-h-52 overflow-y-auto border-t-4 border-amber-500 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 space-y-0.5">
                  {filteredPODs.length > 0 ? filteredPODs.map(p => (
                    <button 
                      key={p} 
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-between group ${formData.pod === p ? 'bg-amber-50 text-amber-600' : 'hover:bg-slate-50 text-slate-600'}`}
                      onClick={() => {
                        handleInputChange('pod', p);
                        setPodSearch(p);
                        setShowPodResults(false);
                      }}
                    >
                      <span>{p}</span>
                    </button>
                  )) : (
                    <div className="p-4 text-center text-[9px] font-bold text-slate-300 uppercase italic">Entrada manual</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1"><label className={labelClass}>Armador / Agência</label><input className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} /></div>
        </div>

        <div className="relative" ref={driverRef}>
          <label className={labelAmberClass}>5. Motorista Transportador</label>
          <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => { setDriverSearch(e.target.value.toUpperCase()); setFormData(prev => ({ ...prev, driverId: '' })); }} />
          {selectedDriver && (
            <div className="mt-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-800 uppercase truncate">{selectedDriver.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {selectedDriver.cpf && <span className="text-[8px] font-bold text-slate-500">{maskCPF(selectedDriver.cpf)}</span>}
                  {plateHorse && <span className="text-[8px] font-bold text-blue-600 uppercase">{plateHorse}</span>}
                  {plateTrailer && <span className="text-[8px] font-bold text-slate-400 uppercase">{plateTrailer}</span>}
                </div>
              </div>
              <button type="button" onClick={() => { setDriverSearch(''); setFormData(prev => ({ ...prev, driverId: '' })); }} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          {showDriverResults && !selectedDriver && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-amber-500">
              {filteredDrivers.length > 0 ? filteredDrivers.map(d => (
                <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50" onClick={() => { setFormData(prev => ({...prev, driverId: d.id})); setDriverSearch(d.name); setShowDriverResults(false); }}>
                  <p className="text-[10px] font-black uppercase text-slate-800">{d.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {d.cpf && <span className="text-[8px] font-bold text-slate-500">{maskCPF(d.cpf)}</span>}
                    {d.plateHorse && <span className="text-[8px] font-bold text-blue-600 uppercase">{d.plateHorse}</span>}
                    {d.plateTrailer && <span className="text-[8px] font-bold text-slate-400 uppercase">{d.plateTrailer}</span>}
                  </div>
                </button>
              )) : (
                <div className="px-4 py-3 text-[9px] text-slate-400 font-bold uppercase">Nenhum motorista encontrado</div>
              )}
            </div>
          )}
        </div>
        <DriverPlateSelector
          driver={selectedDriver}
          plateHorse={plateHorse}
          plateTrailer={plateTrailer}
          onChangePlateHorse={setPlateHorse}
          onChangePlateTrailer={setPlateTrailer}
        />
        {selectedDriver && (
          <button
            type="button"
            onClick={() => setSwapModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Trocar Equipamento
          </button>
        )}
        <DriverSwapModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          driver={selectedDriver || null}
          drivers={drivers}
          currentPlateHorse={plateHorse}
          currentPlateTrailer={plateTrailer}
          onConfirm={(result: DriverSwapResult) => {
            setPlateHorse(result.plateHorse);
            setPlateTrailer(result.plateTrailer);
          }}
        />

        <div className="space-y-1">
          <label className={labelAmberClass}>6. Observações Operacionais</label>
          <textarea
            placeholder="INSTRUÇÕES PARA O MOTORISTA OU DEPÓSITO..."
            className={`${inputClasses} h-28 resize-none py-4 lowercase leading-relaxed`}
            value={formData.obs}
            onChange={e => handleInputChange('obs', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelAmberClass}>7. Data/Hora do Agendamento</label>
          <DateTimePicker
            value={formData.agendamentoDateTime}
            onChange={val => setFormData(prev => ({ ...prev, agendamentoDateTime: val }))}
            placeholder="Selecionar data e hora..."
          />
          <p className="text-[8px] text-slate-400 font-bold">Apenas para controle interno — não aparece no PDF.</p>
        </div>

        {devolucao && onSave && (
          <button disabled={isSaving} onClick={saveData} className="w-full py-4 bg-white border-2 border-amber-400 text-amber-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-50 shadow-sm transition-all active:scale-95">
            {isSaving ? 'SALVANDO...' : 'SALVAR DADOS'}
          </button>
        )}
        <button disabled={isExporting} onClick={downloadPDF} className="w-full py-6 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 shadow-xl transition-all active:scale-95">
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR MINUTA DE DEVOLUÇÃO'}
        </button>
      </div>

      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <DevolucaoVazioTemplate formData={formData} selectedDriver={effectiveDriver} selectedRemetente={selectedRemetente} selectedDestinatario={null} />
        </div>
      </div>
    </div>
  );
};

export default DevolucaoVazioForm;