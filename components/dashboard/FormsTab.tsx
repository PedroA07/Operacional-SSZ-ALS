
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import OrdemColetaTemplate from './forms/OrdemColetaTemplate';
import PreStackingTemplate from './forms/PreStackingTemplate';
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

  // Mantém a data de emissão como a data do momento da criação (hoje)
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
    padrao: 'CARGA GERAL',
    tipoOperacao: 'EXPORTAÇÃO',
    autColeta: '',
    embarcador: '',
    genset: '',
    nf: '',
    horarioAgendado: '',
    obs: ''
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
      setFormData(prev => ({ ...prev, seal: maskSeal(upValue, formData.agencia) }));
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
      pdf.save(`${selectedFormType === 'ORDEM_COLETA' ? 'OC' : 'MINUTA'}-${formData.os}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";
  
  // Classe específica para inputs de data que não podem ter uppercase para não quebrar o calendário nativo
  const dateInputClasses = "w-full px-4 py-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-black focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-md cursor-pointer";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          {selectedFormType === 'ORDEM_COLETA' && (
            <OrdemColetaTemplate 
              formData={{...formData, displayDate: emissionDate}} 
              selectedDriver={selectedDriver} 
              selectedRemetente={selectedRemetente} 
              selectedDestinatario={selectedDestinatario} 
            />
          )}
          {selectedFormType === 'PRE_STACKING' && <PreStackingTemplate formData={{...formData, displayDate: emissionDate}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Emissão (Automática)</label>
                    <div className="px-4 py-3 bg-slate-200 rounded-xl text-slate-500 font-black text-xs border border-slate-300">
                      {emissionDate}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº OS</label>
                    <input type="text" className={inputClasses} value={formData.os} onChange={e => handleInputChange('os', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Remetente (Cliente)</label>
                  <input type="text" placeholder="BUSCAR CLIENTE..." className={inputClasses} value={remetenteSearch} onFocus={() => setShowRemetenteResults(true)} onChange={e => { setRemetenteSearch(e.target.value.toUpperCase()); setShowRemetenteResults(true); }} />
                  {showRemetenteResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {customers.filter(c => c.name.toUpperCase().includes(remetenteSearch)).map(c => <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, remetenteId: c.id}); setRemetenteSearch(c.name); setShowRemetenteResults(false); }}>{c.name}</button>)}
                    </div>
                  )}
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Destinatário (Terminal)</label>
                  <input type="text" placeholder="BUSCAR PORTO..." className={inputClasses} value={destinatarioSearch} onFocus={() => setShowDestinatarioResults(true)} onChange={e => { setDestinatarioSearch(e.target.value.toUpperCase()); setShowDestinatarioResults(true); }} />
                  {showDestinatarioResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {ports.filter(p => p.name.toUpperCase().includes(destinatarioSearch)).map(p => <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, destinatarioId: p.id}); setDestinatarioSearch(p.name); setShowDestinatarioResults(false); }}>{p.name}</button>)}
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">1. Container</label>
                    <input type="text" placeholder="EX: MAEU1234567" className={inputClasses} value={formData.container} onChange={e => handleInputChange('container', e.target.value)} />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">2. Armador (Preenchimento Automático)</label>
                    <input type="text" placeholder="SERÁ PREENCHIDO PELO CONTAINER" className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">3. Tara</label>
                      <input type="text" className={inputClasses} value={formData.tara} onChange={e => handleInputChange('tara', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">4. Lacre</label>
                      <input type="text" className={inputClasses} value={formData.seal} onChange={e => handleInputChange('seal', e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">5. Genset</label>
                    <input type="text" className={inputClasses} value={formData.genset} onChange={e => handleInputChange('genset', e.target.value)} />
                  </div>
                </div>

                {/* BLOCO REORGANIZADO CONFORME SOLICITAÇÃO */}
                <div className="grid grid-cols-1 gap-3 pt-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Equip.</label>
                    <select className={inputClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}>
                      <option value="40HC">40HC</option>
                      <option value="40HR">40HR</option>
                      <option value="40DC">40DC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Padrão</label>
                    <select className={inputClasses} value={formData.padrao} onChange={e => handleInputChange('padrao', e.target.value)}>
                      <option value="CARGA GERAL">CARGA GERAL</option>
                      <option value="CARGO PREMIUM">CARGO PREMIUM</option>
                      <option value="PADRÃO ALIMENTO">PADRÃO ALIMENTO</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Operação</label>
                    <select className={inputClasses} value={formData.tipoOperacao} onChange={e => handleInputChange('tipoOperacao', e.target.value)}>
                      <option value="EXPORTAÇÃO">EXPORTAÇÃO</option>
                      <option value="COLETA">COLETA</option>
                      <option value="ENTREGA">ENTREGA</option>
                      <option value="IMPORTAÇÃO">IMPORTAÇÃO</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Navio</label>
                    <input type="text" className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Booking</label>
                    <input type="text" placeholder="DIGITE O BOOKING..." className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Motorista Autorizado</label>
                  <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => { setDriverSearch(e.target.value.toUpperCase()); setShowDriverResults(true); }} />
                  {showDriverResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>{d.name}</button>)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aut. Coleta / CVA</label>
                  <input type="text" className={inputClasses} value={formData.autColeta} onChange={e => handleInputChange('autColeta', e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Embarcador</label>
                  <input type="text" className={inputClasses} value={formData.embarcador} onChange={e => handleInputChange('embarcador', e.target.value)} placeholder="NOME DO EMBARCADOR" />
                </div>

                <div className="bg-blue-600/5 p-8 rounded-[2.5rem] border-2 border-blue-100/50 space-y-3 shadow-xl shadow-blue-500/5 transition-all hover:border-blue-300 calendar-container-focus">
                  <label className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Agendamento de Coleta
                  </label>
                  <input 
                    type="datetime-local" 
                    className={dateInputClasses} 
                    value={formData.horarioAgendado} 
                    onChange={e => setFormData({...formData, horarioAgendado: e.target.value})} 
                    onClick={(e) => {
                      // @ts-ignore - Alguns navegadores precisam desse trigger para abrir o calendário nativo
                      if (e.target.showPicker) e.target.showPicker();
                    }}
                  />
                  <p className="text-[8px] text-blue-400 font-bold uppercase tracking-tight text-center mt-2 italic">Clique no ícone de calendário para selecionar</p>
                </div>

                <button disabled={isExporting} onClick={downloadPDF} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all active:scale-95">
                  {isExporting ? 'PROCESSANDO PDF...' : 'BAIXAR DOCUMENTO'}
                </button>
              </div>

              <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
                <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
                  {selectedFormType === 'ORDEM_COLETA' && (
                    <OrdemColetaTemplate 
                      formData={{...formData, displayDate: emissionDate}} 
                      selectedDriver={selectedDriver} 
                      selectedRemetente={selectedRemetente} 
                      selectedDestinatario={selectedDestinatario} 
                    />
                  )}
                  {selectedFormType === 'PRE_STACKING' && <PreStackingTemplate formData={{...formData, displayDate: emissionDate}} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />}
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
