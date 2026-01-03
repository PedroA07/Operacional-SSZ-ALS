
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PreStackingTemplate from './PreStackingTemplate';

interface PreStackingFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
}

const PreStackingForm: React.FC<PreStackingFormProps> = ({ drivers, customers, ports, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  
  const [remetenteSearch, setRemetenteSearch] = useState('');
  const [showRemetenteResults, setShowRemetenteResults] = useState(false);
  const [destinatarioSearch, setDestinatarioSearch] = useState('');
  const [showDestinatarioResults, setShowDestinatarioResults] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);

  const [formData, setFormData] = useState({
    os: '',
    nf: '',
    container: '',
    tipo: '40HC',
    tara: '',
    seal: '',
    booking: '',
    autColeta: '',
    ship: '',
    driverId: '',
    remetenteId: '',
    destinatarioId: '',
    displayDate: new Date().toLocaleDateString('pt-BR')
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = ports.find(p => p.id === formData.destinatarioId);

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
      const osNum = formData.os || 'SEM_OS';
      pdf.save(`Minuta Pre-Stacking - ${driverName} - ${osNum}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelBlueClass = "text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      {/* HIDDEN PREVIEW FOR CAPTURE */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <PreStackingTemplate 
            formData={formData} 
            selectedDriver={selectedDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={selectedDestinatario} 
          />
        </div>
      </div>

      {/* INPUTS SIDEBAR */}
      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
        
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelBlueClass}>Nº OS</label>
                <input required className={inputClasses} value={formData.os} onChange={e => handleInputChange('os', e.target.value)} placeholder="00000A" />
              </div>
              <div className="space-y-1">
                <label className={labelBlueClass}>Nota Fiscal</label>
                <input required className={inputClasses} value={formData.nf} onChange={e => handleInputChange('nf', e.target.value)} placeholder="NF-E" />
              </div>
           </div>
        </div>

        <div className="relative">
          <label className={labelBlueClass}>Cliente (Carregamento)</label>
          <input 
            type="text" 
            placeholder="BUSCAR CLIENTE..." 
            className={inputClasses} 
            value={remetenteSearch} 
            onFocus={() => setShowRemetenteResults(true)} 
            onChange={e => setRemetenteSearch(e.target.value.toUpperCase())} 
          />
          {showRemetenteResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
              {customers.filter(c => (c.legalName || c.name).toUpperCase().includes(remetenteSearch)).map(c => (
                <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50" onClick={() => { setFormData({...formData, remetenteId: c.id}); setRemetenteSearch(c.legalName || c.name); setShowRemetenteResults(false); }}>
                   <p className="text-[10px] font-black uppercase text-slate-800">{c.legalName || c.name}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase italic">CNPJ: {c.cnpj}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className={labelBlueClass}>Local de Entrega (Terminal)</label>
          <input 
            type="text" 
            placeholder="BUSCAR TERMINAL..." 
            className={inputClasses} 
            value={destinatarioSearch} 
            onFocus={() => setShowDestinatarioResults(true)} 
            onChange={e => setDestinatarioSearch(e.target.value.toUpperCase())} 
          />
          {showDestinatarioResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
              {ports.filter(p => (p.legalName || p.name).toUpperCase().includes(destinatarioSearch)).map(p => (
                <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50" onClick={() => { setFormData({...formData, destinatarioId: p.id}); setDestinatarioSearch(p.legalName || p.name); setShowDestinatarioResults(false); }}>
                   <p className="text-[10px] font-black uppercase text-slate-800">{p.legalName || p.name}</p>
                   <p className="text-[8px] font-bold text-slate-400 uppercase italic">{p.city} - {p.state}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>Dados do Equipamento</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Container</label><input className={inputClasses} value={formData.container} onChange={e => handleInputChange('container', e.target.value)} /></div>
            <div className="space-y-1">
              <label className={labelClass}>Tipo</label>
              <select className={inputClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}>
                <option value="40HC">40HC</option>
                <option value="40HR">40HR</option>
                <option value="40DC">40DC</option>
                <option value="20DC">20DC</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Tara</label><input className={inputClasses} value={formData.tara} onChange={e => handleInputChange('tara', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Lacre</label><input className={inputClasses} value={formData.seal} onChange={e => handleInputChange('seal', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Aut. Coleta</label><input className={inputClasses} value={formData.autColeta} onChange={e => handleInputChange('autColeta', e.target.value)} /></div>
          </div>
        </div>

        <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
           <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} /></div>
           <div className="relative">
              <label className={labelBlueClass}>Motorista</label>
              <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => setDriverSearch(e.target.value.toUpperCase())} />
              {showDriverResults && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
                  {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => (
                    <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-black uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>{d.name} ({d.plateHorse})</button>
                  ))}
                </div>
              )}
           </div>
        </div>

        <button disabled={isExporting} onClick={downloadPDF} className="w-full py-6 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl transition-all active:scale-95">
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR MINUTA PRE-STACKING'}
        </button>
      </div>

      {/* PREVIEW PANEL */}
      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <PreStackingTemplate 
            formData={formData} 
            selectedDriver={selectedDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={selectedDestinatario} 
          />
        </div>
      </div>
    </div>
  );
};

export default PreStackingForm;
