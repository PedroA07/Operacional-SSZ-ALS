import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import LiberacaoVazioTemplate from './LiberacaoVazioTemplate';
import DriverPlateSelector, { primaryHorse, primaryTrailer } from '../../shared/DriverPlateSelector';
import DriverSwapModal, { DriverSwapResult } from '../drivers/DriverSwapModal';
import { db } from '../../../utils/storage';
import { localDateStr, formFingerprint } from '../../../utils/dateHelpers';
import CustomSelect from '../../shared/CustomSelect';

interface LiberacaoVazioFormProps {
  user?: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  preStacking?: PreStacking[];
  onClose: () => void;
  initialFormData?: any;
}

const commonPODs = ['SANTOS', 'PARANAGUÁ', 'ITAGUAÍ', 'RIO DE JANEIRO', 'NAVEGANTES', 'ITAJAÍ', 'MONTEVIDEO', 'BUENOS AIRES'];

const LiberacaoVazioForm: React.FC<LiberacaoVazioFormProps> = ({ user, drivers, customers, ports, preStacking = [], onClose, initialFormData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLDivElement>(null);
  const [plateHorse, setPlateHorse] = useState('');
  const [plateTrailer, setPlateTrailer] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const [localSearch, setLocalSearch] = useState('');
  const [showLocalResults, setShowLocalResults] = useState(false);
  const localRef = useRef<HTMLDivElement>(null);
  const [remetenteSearch, setRemetenteSearch] = useState('');
  const [showRemetenteResults, setShowRemetenteResults] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);
  const [podSearch, setPodSearch] = useState('');
  const [showPodResults, setShowPodResults] = useState(false);

  const [containerTypes, setContainerTypes] = useState<any[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));

    const loadContainerTypes = async () => {
      const types = await db.getContainerTypes();
      setContainerTypes(types);
    };
    loadContainerTypes();

    if (initialFormData?.manualLocal) setLocalSearch(initialFormData.manualLocal);

    const handleClickOutside = (e: MouseEvent) => {
      if (podRef.current && !podRef.current.contains(e.target as Node)) {
        setShowPodResults(false);
      }
      if (localRef.current && !localRef.current.contains(e.target as Node)) {
        setShowLocalResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultFormData = {
    date: localDateStr(),
    driverId: '',
    remetenteId: '',
    destinatarioId: '',
    booking: '',
    ship: '',
    agencia: '',
    pod: '',
    qtdContainer: '01',
    tipo: '40HC',
    padrao: 'CARGA GERAL',
    obs: '',
    manualLocal: ''
  };
  const [formData, setFormData] = useState<typeof defaultFormData>(initialFormData ?? defaultFormData);

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

  useEffect(() => {
    if (selectedDriver) {
      setPlateHorse(primaryHorse(selectedDriver));
      setPlateTrailer(primaryTrailer(selectedDriver));
    }
  }, [formData.driverId]);

  const effectiveDriver = selectedDriver ? { ...selectedDriver, plateHorse, plateTrailer } : undefined;

  const downloadPDF = async () => {
    if (!effectiveDriver || !formData.booking) {
      alert("Preencha Booking e Motorista.");
      return;
    }

    setIsExporting(true);
    try {
      const activeUser = user || currentUser;
      if (activeUser) {
        await db.addNotification(
          activeUser,
          'LIBERACAO_GENERATED',
          `Liberação Emitida: ${formData.booking}`,
          `Documento de liberação de vazio para ${effectiveDriver.name} gerado com sucesso.`,
          { os: formData.booking, motorista: effectiveDriver.name, placa: effectiveDriver.plateHorse }
        );
      }
      const dataChanged = !initialFormData || formFingerprint(formData) !== formFingerprint(initialFormData);
      if (dataChanged) {
        db.saveFormHistory('LIBERACAO_VAZIO', formData, formData.booking, activeUser);
      }

      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      pdf.save(`LIBERAÇÃO DE VAZIO - ${effectiveDriver.name} - ${formData.booking}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:border-slate-500 outline-none transition-all shadow-sm placeholder:text-slate-300";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelSlateClass = "text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1.5 block";

  const allLocations = [
    ...ports.map(p => ({ id: `port-${p.id}`, label: p.name, sub: p.legalName || p.city || '', type: 'PORTO' as const })),
    ...preStacking.map(p => ({ id: `ps-${p.id}`, label: p.name, sub: p.legalName || p.city || '', type: 'PRÉ-STACKING' as const })),
  ];
  const filteredLocations = localSearch.length === 0
    ? allLocations
    : allLocations.filter(l =>
        l.label.toUpperCase().includes(localSearch.toUpperCase()) ||
        l.sub.toUpperCase().includes(localSearch.toUpperCase())
      );

  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toUpperCase().includes(remetenteSearch)) ||
    (c.legalName && c.legalName.toUpperCase().includes(remetenteSearch))
  );

  const filteredPODs = commonPODs.filter(p => p.toUpperCase().includes(podSearch.toUpperCase()));

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <LiberacaoVazioTemplate 
            formData={formData} 
            selectedDriver={effectiveDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={null} 
          />
        </div>
      </div>

      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
        <div className="relative" ref={localRef}>
          <label className={labelSlateClass}>1. Local de Retirada</label>
          <div className="relative">
            <input
              type="text"
              placeholder="BUSCAR PORTO OU PRÉ-STACKING..."
              className={`${inputClasses} pr-10`}
              value={localSearch}
              onFocus={() => setShowLocalResults(true)}
              onChange={e => {
                const val = e.target.value.toUpperCase();
                setLocalSearch(val);
                handleInputChange('manualLocal', val);
              }}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
            </div>
          </div>
          {showLocalResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto border-t-4 border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredLocations.length === 0 ? (
                <div className="p-4 text-center text-[9px] font-bold text-slate-300 uppercase italic">Nenhum local encontrado — entrada manual</div>
              ) : filteredLocations.map(loc => (
                <button
                  key={loc.id}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors flex items-center justify-between gap-2"
                  onClick={() => {
                    setLocalSearch(loc.label);
                    handleInputChange('manualLocal', loc.label);
                    setShowLocalResults(false);
                  }}
                >
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">{loc.label}</p>
                    {loc.sub && <p className="text-[8px] text-slate-400 font-bold uppercase leading-tight">{loc.sub}</p>}
                  </div>
                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${loc.type === 'PORTO' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-700'}`}>{loc.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className={labelSlateClass}>2. Cliente (Exportador)</label>
          <input type="text" placeholder="BUSCAR..." className={inputClasses} value={remetenteSearch} onFocus={() => setShowRemetenteResults(true)} onChange={e => setRemetenteSearch(e.target.value.toUpperCase())} />
          {showRemetenteResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto border-t-4 border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredCustomers.map(c => (
                <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors" onClick={() => { setFormData({...formData, remetenteId: c.id}); setRemetenteSearch(c.legalName || c.name); setShowRemetenteResults(false); }}>
                  <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">{c.legalName || c.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
           <p className={labelClass}>3. Dados do Equipamento</p>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className={labelClass}>Quantidade</label>
                 <input className={inputClasses} value={formData.qtdContainer} onChange={e => handleInputChange('qtdContainer', e.target.value)} placeholder="01" />
              </div>
              <div className="space-y-1">
                 <label className={labelClass}>Tipo</label>
                 <CustomSelect
                    value={formData.tipo}
                    onChange={v => handleInputChange('tipo', v)}
                    options={containerTypes.map(t => ({ value: t.name, label: t.name }))}
                    inputClassName={inputClasses}
                 />
              </div>
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

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>4. Dados da Operação</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} /></div>
          </div>
          <div className="space-y-1"><label className={labelClass}>Armador</label><input className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} /></div>
          
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
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-h-52 overflow-y-auto border-t-4 border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 space-y-0.5">
                  {filteredPODs.length > 0 ? filteredPODs.map(p => (
                    <button 
                      key={p} 
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-between group ${formData.pod === p ? 'bg-slate-50 text-slate-700' : 'hover:bg-slate-50 text-slate-600'}`}
                      onClick={() => {
                        handleInputChange('pod', p);
                        setPodSearch(p);
                        setShowPodResults(false);
                      }}
                    >
                      <span>{p}</span>
                      {formData.pod === p && <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>}
                    </button>
                  )) : (
                    <div className="p-4 text-center text-[9px] font-bold text-slate-300 uppercase italic">Porto não listado (entrada manual)</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <label className={labelSlateClass}>5. Motorista Autorizado</label>
          <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => setDriverSearch(e.target.value.toUpperCase())} />
          {showDriverResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-slate-700">
              {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => (
                <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors" onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>
                  <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">{d.name} ({d.plateHorse})</p>
                </button>
              ))}
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
          <label className={labelSlateClass}>6. Observações Adicionais</label>
          <textarea 
            placeholder="INSTRUÇÕES PARA O MOTORISTA OU DEPÓSITO..." 
            className={`${inputClasses} h-28 resize-none py-4 lowercase leading-relaxed`} 
            value={formData.obs} 
            onChange={e => handleInputChange('obs', e.target.value)} 
          />
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 ml-1">* Este texto aparecerá no rodapé da liberação.</p>
        </div>

        <button disabled={isExporting} onClick={downloadPDF} className="w-full py-6 bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-95">
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR LIBERAÇÃO DE VAZIO'}
        </button>
      </div>

      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <LiberacaoVazioTemplate formData={formData} selectedDriver={effectiveDriver} selectedRemetente={selectedRemetente} selectedDestinatario={null} />
        </div>
      </div>
    </div>
  );
};

export default LiberacaoVazioForm;