
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DevolucaoVazioTemplate from './DevolucaoVazioTemplate';
import { lookupCarrierByContainer } from '../../../utils/carrierService';

interface DevolucaoVazioFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  preStacking: PreStacking[];
  onClose: () => void;
}

const commonPODs = ['SANTOS', 'PARANAGUÁ', 'ITAGUAÍ', 'RIO DE JANEIRO', 'NAVEGANTES', 'ITAJAÍ', 'MONTEVIDEO', 'BUENOS AIRES'];

const DevolucaoVazioForm: React.FC<DevolucaoVazioFormProps> = ({ drivers, customers, ports, preStacking, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  
  const [remetenteSearch, setRemetenteSearch] = useState('');
  const [showRemetenteResults, setShowRemetenteResults] = useState(false);
  
  const [destinatarioSearch, setDestinatarioSearch] = useState('');
  const [showDestinatarioResults, setShowDestinatarioResults] = useState(false);

  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    driverId: '',
    remetenteId: '',
    destinatarioId: '',
    container: '',
    tipo: '40HC',
    ship: '',
    agencia: '', 
    pod: 'SANTOS',
    booking: '',
    manualLocal: ''
  });

  const handleInputChange = (field: string, value: string) => {
    const val = value.toUpperCase();
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      
      // Busca armador automático se for container
      if (field === 'container') {
        const carrier = lookupCarrierByContainer(val);
        if (carrier) next.agencia = carrier.name;
      }

      return next;
    });
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  
  // O Local de Devolução pode estar em Ports ou PreStacking
  const allLocals = [...ports, ...preStacking];
  const selectedDestinatario = allLocals.find(l => l.id === formData.destinatarioId);

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
      const containerNum = formData.container || 'VAZIO';
      
      pdf.save(`DEVOLUÇÃO DE VAZIO - ${driverName} - ${containerNum}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelBlueClass = "text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block";

  const filteredCustomers = customers.filter(c => 
    c.name.toUpperCase().includes(remetenteSearch) || 
    (c.legalName && c.legalName.toUpperCase().includes(remetenteSearch))
  );

  const filteredLocals = allLocals.filter(l => 
    l.name.toUpperCase().includes(destinatarioSearch) || 
    (l.legalName && l.legalName.toUpperCase().includes(destinatarioSearch))
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      {/* HIDDEN PREVIEW */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <DevolucaoVazioTemplate 
            formData={formData} 
            selectedDriver={selectedDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={selectedDestinatario} 
          />
        </div>
      </div>

      {/* INPUTS SIDEBAR */}
      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
        
        {/* 1. Local de Devolução */}
        <div className="relative">
          <label className={labelBlueClass}>1. Local da Devolução (Depot / Terminal)</label>
          <input 
            type="text" 
            placeholder="BUSCAR LOCAL OU DIGITE MANUAL..." 
            className={inputClasses} 
            value={destinatarioSearch} 
            onFocus={() => setShowDestinatarioResults(true)}
            onChange={e => {
                setDestinatarioSearch(e.target.value.toUpperCase());
                setFormData(prev => ({ ...prev, manualLocal: e.target.value.toUpperCase(), destinatarioId: '' }));
            }} 
          />
          {showDestinatarioResults && filteredLocals.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
              {filteredLocals.map(l => (
                <button key={l.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-black uppercase border-b border-slate-50" 
                  onClick={() => { 
                    setFormData({...formData, destinatarioId: l.id, manualLocal: ''}); 
                    setDestinatarioSearch(l.name); 
                    setShowDestinatarioResults(false); 
                  }}>
                  {l.name} {l.city ? `(${l.city})` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Cliente */}
        <div className="relative">
          <label className={labelBlueClass}>2. Cliente (Exportador)</label>
          <input 
            type="text" 
            placeholder="BUSCAR CLIENTE..." 
            className={inputClasses} 
            value={remetenteSearch} 
            onFocus={() => setShowRemetenteResults(true)} 
            onChange={e => setRemetenteSearch(e.target.value.toUpperCase())} 
          />
          {showRemetenteResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto border-t-4 border-blue-500">
              {filteredCustomers.map(c => (
                <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50" 
                  onClick={() => { 
                    setFormData({...formData, remetenteId: c.id}); 
                    setRemetenteSearch(c.legalName || c.name); 
                    setShowRemetenteResults(false); 
                  }}>
                  <p className="text-[10px] font-black uppercase text-slate-800">{c.legalName || c.name}</p>
                  {c.legalName && c.name !== c.legalName && (
                    <p className="text-[8px] font-bold text-slate-400 uppercase italic">FANTASIA: {c.name}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Dados do Equipamento */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>3. Dados da Unidade</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Container</label>
              <input className={inputClasses} value={formData.container} onChange={e => handleInputChange('container', e.target.value)} placeholder="ABCD1234567" />
            </div>
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
          <div className="space-y-1">
            <label className={labelClass}>Armador</label>
            <input className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} placeholder="EX: MSC, MAERSK..." />
          </div>
        </div>

        {/* 4. Dados da Operação */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>4. Logística</p>
          <div className="space-y-1">
            <label className={labelClass}>Navio</label>
            <input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>POD</label>
              <input list="pod-suggestions-dev" className={inputClasses} value={formData.pod} onChange={e => handleInputChange('pod', e.target.value)} />
              <datalist id="pod-suggestions-dev">
                {commonPODs.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>BL / Booking</label>
              <input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} />
            </div>
          </div>
        </div>

        {/* 5. Motorista */}
        <div className="relative">
          <label className={labelBlueClass}>5. Motorista Transportador</label>
          <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => setDriverSearch(e.target.value.toUpperCase())} />
          {showDriverResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
              {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => (
                <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-black uppercase border-b border-slate-50" 
                  onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>
                  {d.name} ({d.plateHorse})
                </button>
              ))}
            </div>
          )}
        </div>

        <button disabled={isExporting} onClick={downloadPDF} className="w-full py-6 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all active:scale-95">
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR MINUTA DE DEVOLUÇÃO'}
        </button>
      </div>

      {/* PREVIEW PANEL */}
      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <DevolucaoVazioTemplate 
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

export default DevolucaoVazioForm;
