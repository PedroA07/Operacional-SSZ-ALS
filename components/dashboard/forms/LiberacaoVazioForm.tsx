
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import LiberacaoVazioTemplate from './LiberacaoVazioTemplate';

interface LiberacaoVazioFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
}

const commonPODs = ['SANTOS', 'PARANAGUÁ', 'ITAGUAÍ', 'RIO DE JANEIRO', 'NAVEGANTES', 'ITAJAÍ', 'MONTEVIDEO', 'BUENOS AIRES'];

const LiberacaoVazioForm: React.FC<LiberacaoVazioFormProps> = ({ drivers, customers, ports, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  
  const [remetenteSearch, setRemetenteSearch] = useState('');
  const [showRemetenteResults, setShowRemetenteResults] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
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
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = null; // Removida seleção de porto cadastrado

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      const driverName = selectedDriver?.name || 'MOTORISTA';
      const locationName = formData.manualLocal || 'NÃO INFORMADO';
      
      pdf.save(`LIBERAÇÃO DE VAZIO - ${driverName} - ${locationName}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelBlueClass = "text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block";

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      {/* HIDDEN PREVIEW */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <LiberacaoVazioTemplate 
            formData={formData} 
            selectedDriver={selectedDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={null} 
          />
        </div>
      </div>

      {/* INPUTS SIDEBAR */}
      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
        
        {/* 1. Local de Retirada - APENAS INSERÇÃO MANUAL */}
        <div className="space-y-1">
          <label className={labelBlueClass}>1. Local de Retirada (Terminais não cadastrados)</label>
          <input 
            type="text" 
            placeholder="DIGITE O NOME DO TERMINAL / DEPÓSITO..." 
            className={inputClasses} 
            value={formData.manualLocal} 
            onChange={e => handleInputChange('manualLocal', e.target.value)} 
          />
          <p className="text-[8px] font-bold text-slate-400 uppercase italic px-1">Este campo é de preenchimento manual direto.</p>
        </div>

        {/* 2. Cliente */}
        <div className="relative">
          <label className={labelBlueClass}>2. Cliente (Exportador)</label>
          <input type="text" placeholder="BUSCAR CLIENTE..." className={inputClasses} value={remetenteSearch} onFocus={() => setShowRemetenteResults(true)} onChange={e => setRemetenteSearch(e.target.value.toUpperCase())} />
          {showRemetenteResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
              {customers.filter(c => c.name.toUpperCase().includes(remetenteSearch)).map(c => (
                <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-black uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, remetenteId: c.id}); setRemetenteSearch(c.name); setShowRemetenteResults(false); }}>{c.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Dados da Liberação */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>3. Dados da Operação</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} /></div>
          </div>
          
          <div className="space-y-1"><label className={labelClass}>Armador</label><input className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} /></div>

          <div className="space-y-1">
            <label className={labelClass}>POD (Porto de Descarga)</label>
            <input 
              list="pod-suggestions" 
              className={inputClasses} 
              value={formData.pod} 
              onChange={e => handleInputChange('pod', e.target.value)} 
              placeholder="DIGITE OU SELECIONE..."
            />
            <datalist id="pod-suggestions">
              {commonPODs.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
        </div>

        {/* 4. Equipamento */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>4. Detalhes do Equipamento</p>
          <div className="space-y-1">
            <label className={labelClass}>Qtd. Container</label>
            <select className={inputClasses} value={formData.qtdContainer} onChange={e => setFormData({...formData, qtdContainer: e.target.value})}>
              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map(q => <option key={q} value={q}>{q} CONTAINER</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Tipo</label>
              <select className={inputClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}>
                <option value="40HC">40HC</option>
                <option value="40HR">40HR</option>
                <option value="40DC">40DC</option>
                <option value="20DC">20DC</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Padrão</label>
              <select className={inputClasses} value={formData.padrao} onChange={e => handleInputChange('padrao', e.target.value)}>
                <option value="CARGA GERAL">CARGA GERAL</option>
                <option value="CARGO PREMIUM">CARGO PREMIUM</option>
                <option value="PADRÃO ALIMENTO">PADRÃO ALIMENTO</option>
                <option value="REEFER">REEFER</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. Motorista */}
        <div className="relative">
          <label className={labelBlueClass}>5. Motorista Autorizado</label>
          <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => setDriverSearch(e.target.value.toUpperCase())} />
          {showDriverResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
              {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => (
                <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-black uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>{d.name} ({d.plateHorse})</button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Observações</label>
          <textarea className={`${inputClasses} h-28 resize-none py-4`} value={formData.obs} onChange={e => handleInputChange('obs', e.target.value)} placeholder="INFORMAÇÕES ADICIONAIS PARA O DEPÓSITO..." />
        </div>

        <button disabled={isExporting} onClick={downloadPDF} className="w-full py-6 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all active:scale-95">
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR LIBERAÇÃO DE VAZIO'}
        </button>
      </div>

      {/* PREVIEW PANEL */}
      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <LiberacaoVazioTemplate 
            formData={formData} 
            selectedDriver={selectedDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={null} 
          />
        </div>
      </div>
    </div>
  );
};

export default LiberacaoVazioForm;
