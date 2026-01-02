
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import OrdemColetaTemplate from './forms/OrdemColetaTemplate';
import PreStackingTemplate from './forms/PreStackingTemplate';
import LiberacaoVazioTemplate from './forms/LiberacaoVazioTemplate';
import { maskSeal } from '../../utils/masks';
import { lookupCarrierByContainer } from '../../utils/carrierService';

interface FormsTabProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  initialFormId?: string | null;
}

type FormType = 'ORDEM_COLETA' | 'PRE_STACKING' | 'LIBERACAO_VAZIO' | 'DEVOLUCAO_VAZIO' | 'RETIRADA_CHEIO';

const formConfigs: Record<FormType, { title: string; color: string; description: string }> = {
  ORDEM_COLETA: { title: 'Ordem de Coleta', color: 'bg-blue-600', description: 'Emissão de OC com campos editáveis e barcodes' },
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
  const [emissionDate] = useState(new Date().toLocaleDateString('pt-BR'));

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
    agencia: '', 
    tipo: '40HC',
    qtd: '01',
    padrao: 'CARGA GERAL',
    tipoOperacao: 'EXPORTAÇÃO',
    autColeta: '',
    embarcador: '',
    genset: '',
    nf: '',
    horarioAgendado: '',
    obs: '',
    pod: ''
  });

  useEffect(() => {
    if (initialFormId && formConfigs[initialFormId as FormType]) {
      setSelectedFormType(initialFormId as FormType);
      setIsFormModalOpen(true);
    }
  }, [initialFormId]);

  const generateBarcodes = (container: string, tara: string, seal: string) => {
    if (selectedFormType !== 'ORDEM_COLETA') return;
    const generate = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el && value) {
        try {
          JsBarcode(`#${id}`, value, { format: "CODE128", width: 2, height: 25, displayValue: false, margin: 0, background: "transparent" });
        } catch (e) { }
      }
    };
    generate('barcode-container', container);
    generate('barcode-tara', tara);
    generate('barcode-lacre', seal);
  };

  useEffect(() => {
    if (isFormModalOpen && selectedFormType === 'ORDEM_COLETA') {
      setTimeout(() => generateBarcodes(formData.container, formData.tara, formData.seal), 500);
    }
  }, [formData, isFormModalOpen, selectedFormType]);

  const handleInputChange = (field: string, value: string) => {
    const upValue = value.toUpperCase();
    if (field === 'container') {
      const carrier = lookupCarrierByContainer(upValue);
      setFormData(prev => ({ 
        ...prev, 
        container: upValue, 
        agencia: carrier ? carrier.name : prev.agencia 
      }));
    } else if (field === 'seal') {
      setFormData(prev => ({ ...prev, seal: maskSeal(upValue) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: upValue }));
    }
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = ports.find(p => p.id === formData.destinatarioId);

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      if (selectedFormType === 'ORDEM_COLETA') generateBarcodes(formData.container, formData.tara, formData.seal);
      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      const driverName = selectedDriver?.name || 'MOTORISTA';
      const osNum = formData.os || 'SEM_OS';
      
      const fileName = selectedFormType === 'ORDEM_COLETA' 
        ? `OC-${driverName} - ${osNum}.pdf` 
        : selectedFormType === 'LIBERACAO_VAZIO' ? `LIB-VAZIO-${driverName}.pdf` : `MINUTA-${driverName} - ${osNum}.pdf`;
        
      pdf.save(fileName);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";

  const filteredRemetentes = customers.filter(c => 
    (c.legalName || '').toUpperCase().includes(remetenteSearch) || 
    c.name.toUpperCase().includes(remetenteSearch) ||
    c.city.toUpperCase().includes(remetenteSearch) ||
    c.cnpj.includes(remetenteSearch)
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          {selectedFormType === 'ORDEM_COLETA' && <OrdemColetaTemplate formData={{...formData, displayDate: emissionDate}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
          {selectedFormType === 'PRE_STACKING' && <PreStackingTemplate formData={{...formData, displayDate: emissionDate}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
          {selectedFormType === 'LIBERACAO_VAZIO' && <LiberacaoVazioTemplate formData={{...formData}} manualPortName={destinatarioSearch} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 text-center">Central de Emissões Operacionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(formConfigs) as FormType[]).map(type => (
            <button key={type} onClick={() => { setSelectedFormType(type); setIsFormModalOpen(true); }} className="flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:border-blue-500 hover:shadow-xl transition-all group text-left">
              <div className={`w-14 h-14 ${formConfigs[type].color} rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg`}>ALS</div>
              <div className="flex-1">
                <h3 className="font-black text-slate-700 uppercase text-xs">{formConfigs[type].title}</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">{formConfigs[type].description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isFormModalOpen && selectedFormType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
            <div className={`p-6 ${formConfigs[selectedFormType].color} text-white flex justify-between items-center`}>
              <h3 className="font-black text-sm uppercase tracking-widest">{formConfigs[selectedFormType].title}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-5 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
                
                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Cliente / Solicitante</label>
                  <input 
                    type="text" 
                    placeholder="BUSCAR CLIENTE..." 
                    className={inputClasses} 
                    value={remetenteSearch} 
                    onFocus={() => setShowRemetenteResults(true)} 
                    onChange={e => { setRemetenteSearch(e.target.value.toUpperCase()); setShowRemetenteResults(true); }} 
                  />
                  {showRemetenteResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      {filteredRemetentes.map(c => (
                        <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, remetenteId: c.id}); setRemetenteSearch(c.name); setShowRemetenteResults(false); }}>{c.name}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Depósito / Porto (Local Retirada)</label>
                  <input 
                    type="text" 
                    placeholder="BUSCAR OU DIGITAR TERMINAL..." 
                    className={inputClasses} 
                    value={destinatarioSearch} 
                    onFocus={() => setShowDestinatarioResults(true)} 
                    onChange={e => { setDestinatarioSearch(e.target.value.toUpperCase()); setShowDestinatarioResults(true); }} 
                  />
                  {showDestinatarioResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      {ports.filter(p => p.name.toUpperCase().includes(destinatarioSearch)).map(p => (
                        <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, destinatarioId: p.id}); setDestinatarioSearch(p.name); setShowDestinatarioResults(false); }}>{p.name}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Booking</label>
                      <input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">POD (Destino)</label>
                      <input className={inputClasses} value={formData.pod} onChange={e => handleInputChange('pod', e.target.value)} placeholder="EX: SANTOS" />
                   </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Navio</label>
                  <input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Armador</label>
                  <input className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Qtd</label>
                    <select className={inputClasses} value={formData.qtd} onChange={e => handleInputChange('qtd', e.target.value)}>
                      {['01','02','03','04','05'].map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tipo Equip.</label>
                    <select className={inputClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}>
                      <option value="40HC">40HC</option>
                      <option value="20DC">20DC</option>
                      <option value="40DC">40DC</option>
                      <option value="40HR">40HR</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Carga</label>
                    <select className={inputClasses} value={formData.padrao} onChange={e => handleInputChange('padrao', e.target.value)}>
                      <option value="CARGA GERAL">CARGA GERAL</option>
                      <option value="REEFER">REEFER</option>
                      <option value="IMO">IMO</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Motorista</label>
                  <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => { setDriverSearch(e.target.value.toUpperCase()); setShowDriverResults(true); }} />
                  {showDriverResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>{d.name}</button>)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Observações</label>
                  <textarea className={`${inputClasses} h-20 resize-none font-bold`} value={formData.obs} onChange={e => handleInputChange('obs', e.target.value)} placeholder="VISTORIA SERÁ FEITO PELO MOTORISTA" />
                </div>

                <button disabled={isExporting} onClick={downloadPDF} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all">
                  {isExporting ? 'GERANDO...' : 'BAIXAR DOCUMENTO'}
                </button>
              </div>

              <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
                <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
                  {selectedFormType === 'ORDEM_COLETA' && <OrdemColetaTemplate formData={{...formData, displayDate: emissionDate}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
                  {selectedFormType === 'PRE_STACKING' && <PreStackingTemplate formData={{...formData, displayDate: emissionDate}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
                  {selectedFormType === 'LIBERACAO_VAZIO' && <LiberacaoVazioTemplate formData={{...formData}} manualPortName={destinatarioSearch} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
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
