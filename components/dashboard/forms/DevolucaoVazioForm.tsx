import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DevolucaoVazioTemplate from './DevolucaoVazioTemplate';
import ContainerInput from '../../shared/ContainerInput';
import DriverPlateSelector, { primaryHorse, primaryTrailer } from '../../shared/DriverPlateSelector';
import DriverSwapModal, { DriverSwapResult } from '../drivers/DriverSwapModal';
import { db } from '../../../utils/storage';

interface DevolucaoVazioFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
  initialFormData?: any;
}

const commonPODs = ['SANTOS', 'PARANAGUÁ', 'ITAGUAÍ', 'RIO DE JANEIRO', 'NAVEGANTES', 'ITAJAÍ', 'MONTEVIDEO', 'BUENOS AIRES'];

const DevolucaoVazioForm: React.FC<DevolucaoVazioFormProps> = ({ drivers, customers, ports, onClose, initialFormData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLDivElement>(null);
  const [plateHorse, setPlateHorse] = useState('');
  const [plateTrailer, setPlateTrailer] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);

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

    const handleClickOutside = (e: MouseEvent) => {
      if (podRef.current && !podRef.current.contains(e.target as Node)) {
        setShowPodResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultFormData = {
    date: new Date().toISOString().split('T')[0],
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
  const selectedDestinatario = ports.find(l => l.id === formData.destinatarioId);

  useEffect(() => {
    if (selectedDriver) {
      setPlateHorse(primaryHorse(selectedDriver));
      setPlateTrailer(primaryTrailer(selectedDriver));
    }
  }, [formData.driverId]);

  const effectiveDriver = selectedDriver ? { ...selectedDriver, plateHorse, plateTrailer } : undefined;

  const downloadPDF = async () => {
    if (!effectiveDriver || !formData.container) {
      alert("Preencha Container e Motorista para prosseguir.");
      return;
    }

    setIsExporting(true);
    try {
      if (currentUser) {
        await db.addNotification(
          currentUser,
          'MINUTA_GENERATED',
          `Devolução de Vazio: ${formData.container}`,
          `Minuta de devolução para o motorista ${effectiveDriver!.name} gerada com sucesso.`,
          { os: formData.container, motorista: effectiveDriver!.name, placa: effectiveDriver!.plateHorse }
        );
        db.saveFormHistory('DEVOLUCAO_VAZIO', formData, formData.container || formData.booking, currentUser);
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

  const filteredCustomers = customers.filter(c => 
    (c.name && c.name.toUpperCase().includes(remetenteSearch)) || 
    (c.legalName && c.legalName.toUpperCase().includes(remetenteSearch))
  );

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
        <div className="space-y-1">
          <label className={labelAmberClass}>1. Local de Devolução (Depot / Terminal)</label>
          <input type="text" placeholder="BUSCAR OU MANUAL..." className={inputClasses} value={formData.manualLocal} onChange={e => handleInputChange('manualLocal', e.target.value)} />
        </div>

        <div className="relative">
          <label className={labelAmberClass}>2. Cliente (Exportador)</label>
          <input type="text" placeholder="BUSCAR CLIENTE..." className={inputClasses} value={remetenteSearch} onFocus={() => setShowRemetenteResults(true)} onChange={e => setRemetenteSearch(e.target.value.toUpperCase())} />
          {showRemetenteResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto border-t-4 border-amber-500 animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredCustomers.map(c => (
                <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-slate-50 transition-colors" onClick={() => { setFormData({...formData, remetenteId: c.id}); setRemetenteSearch(c.legalName || c.name); setShowRemetenteResults(false); }}>
                  <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">{c.legalName || c.name}</p>
                </button>
              ))}
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
                    <select className={inputClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}>
                       {containerTypes.map(t => (
                         <option key={t.id} value={t.name}>{t.name}</option>
                       ))}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Padrão</label>
                    <select className={inputClasses} value={formData.padrao} onChange={e => handleInputChange('padrao', e.target.value)}>
                       <option value="CARGA GERAL">CARGA GERAL</option>
                       <option value="CARGO PREMIUM">CARGO PREMIUM</option>
                       <option value="PADRÃO ALIMENTO">PADRÃO ALIMENTO</option>
                       <option value="REEFER">REEFER</option>
                       <option value="PRODUTO QUÍMICO">PRODUTO QUÍMICO</option>
                    </select>
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

        <div className="relative">
          <label className={labelAmberClass}>5. Motorista Transportador</label>
          <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => setDriverSearch(e.target.value.toUpperCase())} />
          {showDriverResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-amber-500">
              {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => (
                <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-amber-50 text-[10px] font-black uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>{d.name} ({d.plateHorse})</button>
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
          drivers={drivers}
          currentDriverId={formData.driverId}
          onConfirm={(result: DriverSwapResult) => {
            setFormData((prev: any) => ({ ...prev, driverId: result.driver.id }));
            setDriverSearch(result.driver.name);
            setPlateHorse(result.selectedHorse?.plate || primaryHorse(result.driver));
            setPlateTrailer(result.selectedTrailer?.plate || primaryTrailer(result.driver));
            setSwapModalOpen(false);
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