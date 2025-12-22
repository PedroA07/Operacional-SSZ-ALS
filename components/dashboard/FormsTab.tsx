
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import OrdemColetaTemplate from './forms/OrdemColetaTemplate';
import PreStackingTemplate from './forms/PreStackingTemplate';
import { maskSeal } from '../../utils/masks';
import { findCarrierByPrefix } from '../../constants/carriers';

interface FormsTabProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  initialFormId?: string | null;
}

type FormType = 'ORDEM_COLETA' | 'PRE_STACKING' | 'LIBERACAO_VAZIO' | 'DEVOLUCAO_VAZIO' | 'RETIRADA_CHEIO';

const formConfigs: Record<FormType, { title: string; color: string; description: string }> = {
  ORDEM_COLETA: { title: 'Ordem de Coleta', color: 'bg-blue-600', description: 'Emissão de OC com códigos de barras dinâmicos' },
  PRE_STACKING: { title: 'Pré-Stacking (Minuta Cheio)', color: 'bg-emerald-600', description: 'Minuta para entrega de container cheio no terminal' },
  LIBERACAO_VAZIO: { title: 'Liberação de Vazio', color: 'bg-slate-700', description: 'Documento de autorização de retirada em depósitos' },
  DEVOLUCAO_VAZIO: { title: 'Devolução de Vazio', color: 'bg-amber-600', description: 'Comprovante de entrega de unidade vazia' },
  RETIRADA_CHEIO: { title: 'Retirada de Cheio', color: 'bg-indigo-600', description: 'Ordem para movimentação de container importado' },
};

const FormsTab: React.FC<FormsTabProps> = ({ drivers, customers, ports, initialFormId }) => {
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);
  const [remetenteSearch, setRemetenteSearch] = useState('');
  const [showRemetenteResults, setShowRemetenteResults] = useState(false);
  const [destinatarioSearch, setDestinatarioSearch] = useState('');
  const [showDestinatarioResults, setShowDestinatarioResults] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);
  const driverSelectRef = useRef<HTMLDivElement>(null);
  const remetenteSelectRef = useRef<HTMLDivElement>(null);
  const destinatarioSelectRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    driverId: '',
    remetenteId: '',
    destinatarioId: '',
    os: '',
    container: '',
    tara: '',
    seal: '',
    booking: '',
    ship: '',
    expedidor: '',
    agencia: '',
    tipo: '40HC',
    padrao: 'EXPORTAÇÃO',
    tipoOperacao: 'EXPORTAÇÃO',
    autColeta: '',
    embarcador: '',
    genset: '',
    nf: '',
    horarioAgendado: '',
    obs: ''
  });

  // Reação à navegação da Sidebar
  useEffect(() => {
    if (initialFormId && formConfigs[initialFormId as FormType]) {
      handleOpenForm(initialFormId as FormType);
    }
  }, [initialFormId]);

  const generateBarcodes = (container: string, tara: string, seal: string, suffix: string = '') => {
    if (selectedFormType !== 'ORDEM_COLETA') return;
    const generate = (id: string, value: string) => {
      const el = document.getElementById(id + suffix);
      if (el && value) {
        try {
          JsBarcode(`#${id + suffix}`, value, {
            format: "CODE128", width: 2, height: 25, displayValue: false, margin: 0, background: "transparent"
          });
        } catch (e) { console.warn(e); }
      }
    };
    generate('barcode-container', container);
    generate('barcode-tara', tara);
    generate('barcode-lacre', seal);
  };

  useEffect(() => {
    if (isFormModalOpen && selectedFormType === 'ORDEM_COLETA') {
      const timer = setTimeout(() => generateBarcodes(formData.container, formData.tara, formData.seal), 500);
      return () => clearTimeout(timer);
    }
  }, [formData.container, formData.tara, formData.seal, isFormModalOpen, selectedFormType]);

  const handleInputChange = (field: string, value: string) => {
    const upValue = value.toUpperCase();
    if (field === 'container') {
      const carrier = findCarrierByPrefix(upValue);
      setFormData(prev => ({ ...prev, container: upValue, agencia: carrier ? carrier.name : prev.agencia }));
      return;
    }
    if (field === 'seal') {
      setFormData(prev => ({ ...prev, seal: maskSeal(upValue, formData.agencia) }));
      return;
    }
    setFormData(prev => ({ ...prev, [field]: upValue }));
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = ports.find(p => p.id === formData.destinatarioId);

  const downloadPDF = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    try {
      const element = captureRef.current;
      element.style.display = 'block';
      if (selectedFormType === 'ORDEM_COLETA') generateBarcodes(formData.container, formData.tara, formData.seal);
      await new Promise(r => setTimeout(r, 1000));
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, logging: false, backgroundColor: "#ffffff", windowWidth: 794, width: 794, height: 1123 });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`${selectedFormType === 'ORDEM_COLETA' ? 'OC' : 'MINUTA'} - ${selectedDriver?.name || 'DOC'} - ${formData.os || 'SEM_OS'}.pdf`);
      element.style.display = 'none';
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const handleOpenForm = (type: FormType) => { 
    setSelectedFormType(type); 
    setIsFormModalOpen(true); 
  };
  
  const handleSelectDriver = (driver: Driver) => { setFormData(prev => ({ ...prev, driverId: driver.id })); setDriverSearch(`${driver.name} (${driver.plateHorse})`); setShowDriverResults(false); };
  const handleSelectRemetente = (customer: Customer) => { setFormData(prev => ({ ...prev, remetenteId: customer.id, expedidor: customer.name })); setRemetenteSearch(customer.name); setShowRemetenteResults(false); };
  const handleSelectDestinatario = (port: Port) => { setFormData(prev => ({ ...prev, destinatarioId: port.id })); setDestinatarioSearch(port.name); setShowDestinatarioResults(false); };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          {selectedFormType === 'ORDEM_COLETA' && <OrdemColetaTemplate formData={formData} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
          {selectedFormType === 'PRE_STACKING' && <PreStackingTemplate formData={formData} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-700 uppercase tracking-tight mb-8 text-center">Seleção de Documentos</h2>
        
        <div className="space-y-3">
          {(Object.keys(formConfigs) as FormType[]).map(type => (
            <button 
              key={type} 
              onClick={() => handleOpenForm(type)} 
              className="w-full flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-blue-400 hover:shadow-xl transition-all group text-left"
            >
              <div className={`w-14 h-14 ${formConfigs[type].color} rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic flex-shrink-0`}>
                ALS
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-700 uppercase text-sm">{formConfigs[type].title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{formConfigs[type].description}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isFormModalOpen && selectedFormType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-[98%] xl:max-w-[1700px] rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
            <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${formConfigs[selectedFormType].color} text-white`}>
              <h3 className="font-bold text-lg uppercase tracking-widest">{formConfigs[selectedFormType].title}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full text-white hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="w-full lg:w-[450px] p-6 overflow-y-auto space-y-4 border-r border-slate-100 bg-slate-50/50 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Emissão</label><input type="date" className={inputClasses} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº OS</label><input type="text" className={inputClasses} value={formData.os} onChange={e => handleInputChange('os', e.target.value)} /></div>
                </div>

                <div className="space-y-1 relative" ref={remetenteSelectRef}>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Remetente (Cliente)</label>
                  <input type="text" placeholder="BUSCAR CLIENTE..." className={inputClasses} value={remetenteSearch} onFocus={() => setShowRemetenteResults(true)} onChange={e => { setRemetenteSearch(e.target.value.toUpperCase()); setShowRemetenteResults(true); }} />
                  {showRemetenteResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {customers.filter(c => c.name.toUpperCase().includes(remetenteSearch)).map(c => <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => handleSelectRemetente(c)}>{c.name}</button>)}
                    </div>
                  )}
                </div>

                <div className="space-y-1 relative" ref={destinatarioSelectRef}>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Destinatário (Entrega)</label>
                  <input type="text" placeholder="BUSCAR LOCAL..." className={inputClasses} value={destinatarioSearch} onFocus={() => setShowDestinatarioResults(true)} onChange={e => { setDestinatarioSearch(e.target.value.toUpperCase()); setShowDestinatarioResults(true); }} />
                  {showDestinatarioResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {ports.filter(p => p.name.toUpperCase().includes(destinatarioSearch)).map(p => <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => handleSelectDestinatario(p)}>{p.name}</button>)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">Container</label><input type="text" placeholder="EX: MEDU1234567" className={inputClasses} value={formData.container} onChange={e => handleInputChange('container', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tara</label><input type="text" className={inputClasses} value={formData.tara} onChange={e => handleInputChange('tara', e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lacre</label><input type="text" className={inputClasses} value={formData.seal} onChange={e => handleInputChange('seal', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">{selectedFormType === 'PRE_STACKING' ? 'Nota Fiscal' : 'Genset'}</label><input type="text" className={inputClasses} value={selectedFormType === 'PRE_STACKING' ? formData.nf : formData.genset} onChange={e => handleInputChange(selectedFormType === 'PRE_STACKING' ? 'nf' : 'genset', e.target.value)} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">Navio</label><input type="text" className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} /></div>
                  <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">Booking</label><input type="text" className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} /></div>
                </div>

                <div className="space-y-1 relative" ref={driverSelectRef}>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Motorista</label>
                  <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => { setDriverSearch(e.target.value.toUpperCase()); setShowDriverResults(true); }} />
                  {showDriverResults && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => handleSelectDriver(d)}>{d.name}</button>)}
                    </div>
                  )}
                </div>

                <button disabled={isExporting} onClick={downloadPDF} className={`w-full py-5 rounded-2xl text-white font-black uppercase text-[12px] tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${isExporting ? 'bg-slate-400' : formConfigs[selectedFormType].color + ' hover:scale-[1.02]'}`}>
                  {isExporting ? 'PROCESSANDO...' : 'BAIXAR PDF'}
                </button>
              </div>

              <div className="flex-1 bg-slate-300 flex justify-center overflow-auto items-start p-4 lg:p-10">
                <div className="origin-top transform scale-[0.4] sm:scale-[0.5] md:scale-[0.7] lg:scale-[0.85] shadow-2xl transition-transform bg-white">
                  {selectedFormType === 'ORDEM_COLETA' && <OrdemColetaTemplate formData={formData} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
                  {selectedFormType === 'PRE_STACKING' && <PreStackingTemplate formData={formData} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsTab;
