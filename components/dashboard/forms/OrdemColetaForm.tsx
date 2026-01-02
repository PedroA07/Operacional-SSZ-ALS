
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import OrdemColetaTemplate from './OrdemColetaTemplate';
import { maskSeal } from '../../../utils/masks';
import { lookupCarrierByContainer } from '../../../utils/carrierService';

interface OrdemColetaFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
}

const OrdemColetaForm: React.FC<OrdemColetaFormProps> = ({ drivers, customers, ports, onClose }) => {
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
    os: '',
    container: '',
    tara: '',
    seal: '',
    genset: '',
    booking: '',
    ship: '',
    agencia: '', 
    tipo: '40HC',
    padrao: 'CARGA GERAL',
    tipoOperacao: 'EXPORTAÇÃO',
    autColeta: '',
    embarcador: '',
    horarioAgendado: '',
    obs: '',
    displayDate: new Date().toLocaleDateString('pt-BR')
  });

  const generateBarcodes = () => {
    const generate = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el && value) {
        try {
          JsBarcode(`#${id}`, value, { format: "CODE128", width: 2, height: 25, displayValue: false, margin: 0, background: "transparent" });
        } catch (e) { }
      }
    };
    generate('barcode-container', formData.container);
    generate('barcode-tara', formData.tara);
    generate('barcode-lacre', formData.seal);
  };

  useEffect(() => {
    setTimeout(generateBarcodes, 500);
  }, [formData]);

  const handleInputChange = (field: string, value: string) => {
    const upValue = value.toUpperCase();
    
    setFormData(prev => {
      let next = { ...prev, [field]: upValue };

      // Se for container, busca armador
      if (field === 'container') {
        const carrier = lookupCarrierByContainer(upValue);
        next.agencia = carrier ? carrier.name : prev.agencia;
      }

      // Se for lacre, aplica máscara
      if (field === 'seal') {
        next.seal = maskSeal(upValue);
      }

      // REGRA: Se tipo for 40HR, muda padrão para REEFER
      if (field === 'tipo' && upValue === '40HR') {
        next.padrao = 'REEFER';
      }

      return next;
    });
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = ports.find(p => p.id === formData.destinatarioId);

  const downloadPDF = async () => {
    setIsExporting(true);
    try {
      generateBarcodes();
      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      const driverName = selectedDriver?.name || 'MOTORISTA';
      const osNum = formData.os || 'SEM_OS';
      
      pdf.save(`OC - ${driverName} - ${osNum}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelBlueClass = "text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block";

  // Filtros avançados para Cliente e Destinatário
  const filteredCustomers = customers.filter(c => 
    c.name.toUpperCase().includes(remetenteSearch) || 
    (c.legalName && c.legalName.toUpperCase().includes(remetenteSearch))
  );

  const filteredPorts = ports.filter(p => 
    p.name.toUpperCase().includes(destinatarioSearch) || 
    (p.legalName && p.legalName.toUpperCase().includes(destinatarioSearch))
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      {/* OC HIDDEN PREVIEW FOR PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <OrdemColetaTemplate 
            formData={formData} 
            selectedDriver={selectedDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={selectedDestinatario} 
          />
        </div>
      </div>

      {/* INPUTS SIDEBAR */}
      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
        
        {/* 1. Remetente */}
        <div className="relative">
          <label className={labelBlueClass}>1. Remetente (Cliente)</label>
          <input 
            type="text" 
            placeholder="BUSCAR RAZÃO OU FANTASIA..." 
            className={inputClasses} 
            value={remetenteSearch} 
            onFocus={() => setShowRemetenteResults(true)} 
            onChange={e => setRemetenteSearch(e.target.value.toUpperCase())} 
          />
          {showRemetenteResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto border-t-4 border-blue-500">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(c => (
                  <button 
                    key={c.id} 
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 transition-colors" 
                    onClick={() => { 
                      setFormData({...formData, remetenteId: c.id}); 
                      setRemetenteSearch(c.legalName || c.name); 
                      setShowRemetenteResults(false); 
                    }}
                  >
                    <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">
                      {c.legalName || c.name}
                    </p>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase italic">
                        {c.legalName && c.name !== c.legalName ? `FANTASIA: ${c.name}` : ''}
                      </p>
                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">
                        {c.city} - {c.state}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-[9px] font-bold text-slate-400 uppercase italic">Nenhum cliente localizado</div>
              )}
            </div>
          )}
        </div>

        {/* 2. Destinatário */}
        <div className="relative">
          <label className={labelBlueClass}>2. Destinatário (Terminal/Porto)</label>
          <input 
            type="text" 
            placeholder="BUSCAR DESTINO..." 
            className={inputClasses} 
            value={destinatarioSearch} 
            onFocus={() => setShowDestinatarioResults(true)} 
            onChange={e => setDestinatarioSearch(e.target.value.toUpperCase())} 
          />
          {showDestinatarioResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto border-t-4 border-blue-500">
              {filteredPorts.length > 0 ? (
                filteredPorts.map(p => (
                  <button 
                    key={p.id} 
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 transition-colors" 
                    onClick={() => { 
                      setFormData({...formData, destinatarioId: p.id}); 
                      setDestinatarioSearch(p.legalName || p.name); 
                      setShowDestinatarioResults(false); 
                    }}
                  >
                    <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">
                      {p.legalName || p.name}
                    </p>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase italic">
                        {p.legalName && p.name !== p.legalName ? `FANTASIA: ${p.name}` : ''}
                      </p>
                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">
                        {p.city} - {p.state}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-[9px] font-bold text-slate-400 uppercase italic">Nenhum destino localizado</div>
              )}
            </div>
          )}
        </div>

        {/* 3. Dados do Container */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>3. Dados do Equipamento</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Container</label><input className={inputClasses} value={formData.container} onChange={e => handleInputChange('container', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Genset</label><input className={inputClasses} value={formData.genset} onChange={e => handleInputChange('genset', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Tara</label><input className={inputClasses} value={formData.tara} onChange={e => handleInputChange('tara', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Lacre</label><input className={inputClasses} value={formData.seal} onChange={e => handleInputChange('seal', e.target.value)} /></div>
          </div>
          <div className="space-y-1"><label className={labelClass}>Armador</label><input className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Tipo</label>
              <select className={inputClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}>
                <option value="40HC">40HC</option>
                <option value="40HR">40HR</option>
                <option value="40DC">40DC</option>
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
          <div className="space-y-1"><label className={labelClass}>Tipo Operação</label><input className={inputClasses} value={formData.tipoOperacao} onChange={e => handleInputChange('tipoOperacao', e.target.value)} /></div>
        </div>

        {/* 4. Logística */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} /></div>
          <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} /></div>
        </div>

        {/* 5. Motorista */}
        <div className="relative">
          <label className={labelBlueClass}>5. Motorista</label>
          <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => setDriverSearch(e.target.value.toUpperCase())} />
          {showDriverResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
              {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => (
                <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-black uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>{d.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* 6. Dados Finais */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Nº Ordem de Serviço</label><input className={inputClasses} value={formData.os} onChange={e => handleInputChange('os', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Aut. de Coleta</label><input className={inputClasses} value={formData.autColeta} onChange={e => handleInputChange('autColeta', e.target.value)} /></div>
          </div>
          <div className="space-y-1"><label className={labelClass}>Embarcador</label><input className={inputClasses} value={formData.embarcador} onChange={e => handleInputChange('embarcador', e.target.value)} /></div>
          <div className="space-y-1">
            <label className={labelClass}>Horário Agendado</label>
            <input type="datetime-local" className={inputClasses} value={formData.horarioAgendado} onChange={e => handleInputChange('horarioAgendado', e.target.value)} />
          </div>
        </div>

        <button disabled={isExporting} onClick={downloadPDF} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all active:scale-95">
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR ORDEM DE COLETA'}
        </button>
      </div>

      {/* PREVIEW PANEL */}
      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <OrdemColetaTemplate 
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

export default OrdemColetaForm;
