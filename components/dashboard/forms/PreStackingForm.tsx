
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, Trip } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PreStackingTemplate from './PreStackingTemplate';
import { db } from '../../../utils/storage';
import { maskCNPJ } from '../../../utils/masks';

interface PreStackingFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
  initialOS?: string;
}

// Fix: Moved TerminalCardItem outside and typed as React.FC to allow standard React props like 'key' when mapped in JSX
interface TerminalCardItemProps {
  unit: PreStacking;
  isSelected?: boolean;
  onClick?: () => void;
}

const TerminalCardItem: React.FC<TerminalCardItemProps> = ({ unit, isSelected = false, onClick }) => (
  <div 
    onClick={onClick}
    className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
  >
    <div className="flex-1 min-w-0">
      <p className={`text-[11px] font-black uppercase leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
        {unit.legalName || unit.name}
      </p>
      <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 italic tracking-tighter">
        FANTASIA: {unit.name || '********'}
      </p>
    </div>
    <div className="text-right shrink-0 ml-4">
      <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">
        {unit.city} - {unit.state}
      </p>
    </div>
  </div>
);

const PreStackingForm: React.FC<PreStackingFormProps> = ({ drivers, customers, ports, onClose, initialOS }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [isTerminalDropdownOpen, setIsTerminalDropdownOpen] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [osInput, setOsInput] = useState(initialOS || '');
  const [preStackingList, setPreStackingList] = useState<PreStacking[]>([]);

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

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedRemetente, setSelectedRemetente] = useState<any>(null);
  const [selectedDestinatario, setSelectedDestinatario] = useState<any>(null);

  useEffect(() => {
    const loadUnits = async () => {
      const units = await db.getPreStacking();
      setPreStackingList(units);
    };
    loadUnits();
    if (initialOS) {
      setTimeout(() => handleOSLookup(initialOS), 500);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTerminalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [initialOS]);

  const handleOSLookup = async (manualOS?: string) => {
    const targetOS = manualOS || osInput;
    if (!targetOS) return;
    setIsLoadingTrip(true);
    try {
      const trips = await db.getTrips();
      const trip = trips.find(t => t.os.toUpperCase() === targetOS.toUpperCase());
      
      if (trip) {
        setFormData(prev => ({
          ...prev,
          os: trip.os,
          container: trip.container,
          tipo: trip.containerType || '40HC',
          tara: trip.tara || '',
          seal: trip.seal || '',
          booking: trip.booking || '',
          autColeta: trip.ocFormData?.autColeta || '',
          ship: trip.ship || '',
          driverId: trip.driver.id,
          remetenteId: trip.customer.id
        }));
        
        setSelectedDriver(drivers.find(d => d.id === trip.driver.id));
        setSelectedRemetente(customers.find(c => c.id === trip.customer.id));
      } else {
        if (!manualOS) alert("Viagem não localizada no sistema para esta OS.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTrip(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const selectTerminal = (unit: PreStacking) => {
    setFormData(prev => ({ ...prev, destinatarioId: unit.id }));
    setSelectedDestinatario(unit);
    setIsTerminalDropdownOpen(false);
  };

  const downloadPDF = async () => {
    if (!formData.os || !formData.destinatarioId) {
      alert("Busque uma OS e selecione o Local de Entrega.");
      return;
    }
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`Minuta PreStacking - OS ${formData.os}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block";

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
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

      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50 border-r border-slate-100 custom-scrollbar">
        
        {/* BUSCA POR OS */}
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
           <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block">Identificação da OS</label>
              <div className="flex gap-2">
                <input 
                  className={`${inputClasses} flex-1 border-blue-200 focus:border-blue-600`} 
                  value={osInput} 
                  onChange={e => setOsInput(e.target.value.toUpperCase())} 
                  placeholder="DIGITE A OS..."
                  onKeyDown={e => e.key === 'Enter' && handleOSLookup()}
                />
                <button 
                  onClick={() => handleOSLookup()}
                  disabled={isLoadingTrip}
                  className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg active:scale-90 shrink-0"
                >
                  {isLoadingTrip ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>}
                </button>
              </div>
           </div>
        </div>

        {/* CAMPOS MANUAIS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-5 shadow-sm">
           <div className="space-y-1">
              <label className={labelClass}>Nota Fiscal (Nº ou Qtd)</label>
              <input className={inputClasses} value={formData.nf} onChange={e => handleInputChange('nf', e.target.value)} placeholder="01 UNIDADE" />
           </div>

           <div className="space-y-1">
              <label className={labelClass}>Navio</label>
              <input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} placeholder="EX: MAERSK..." />
           </div>

           {/* SELETOR CUSTOMIZADO (ESTILO IMAGEM REFERÊNCIA) */}
           <div className="space-y-1 relative" ref={dropdownRef}>
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5 block">Local de Entrega (Pre-Stacking)</label>
              
              <button 
                type="button"
                onClick={() => setIsTerminalDropdownOpen(!isTerminalDropdownOpen)}
                className="w-full text-left focus:outline-none"
              >
                {selectedDestinatario ? (
                  <TerminalCardItem unit={selectedDestinatario} isSelected={true} />
                ) : (
                  <div className="w-full px-5 py-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 font-black text-[10px] uppercase flex justify-between items-center hover:border-blue-400 transition-all">
                    Selecionar Terminal de Entrega...
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
                  </div>
                )}
              </button>

              {isTerminalDropdownOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Unidades Disponíveis</p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {preStackingList.map(unit => (
                      <TerminalCardItem 
                        key={unit.id} 
                        unit={unit} 
                        onClick={() => selectTerminal(unit)} 
                      />
                    ))}
                    {preStackingList.length === 0 && (
                      <div className="p-6 text-center text-slate-300 font-bold uppercase italic text-[9px]">Nenhum terminal cadastrado</div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedDestinatario && (
                <div className="mt-2 px-2 flex justify-between items-center">
                   <span className="text-[8px] font-black text-emerald-600 uppercase">CNPJ: {maskCNPJ(selectedDestinatario.cnpj)}</span>
                   <button onClick={() => { setSelectedDestinatario(null); setFormData(p => ({...p, destinatarioId: ''})); }} className="text-[8px] font-black text-red-400 uppercase hover:underline">Trocar Terminal</button>
                </div>
              )}
           </div>
        </div>

        {/* FEEDBACK DE AUTO-FILL */}
        {formData.driverId && (
          <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4 shadow-xl">
             <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-3">Resumo da Viagem Localizada</p>
             <div className="space-y-3">
                <div className="flex justify-between gap-4">
                  <span className="text-[8px] font-bold text-slate-500 uppercase">Motorista:</span>
                  <span className="text-[10px] font-black uppercase truncate text-right">{selectedDriver?.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[8px] font-bold text-slate-500 uppercase">Equipamento:</span>
                  <span className="text-[10px] font-black text-blue-400">{formData.container} [{formData.tipo}]</span>
                </div>
                <div className="flex justify-between gap-4 pt-2 border-t border-white/5">
                  <span className="text-[8px] font-bold text-slate-500 uppercase">Cliente:</span>
                  <span className="text-[10px] font-black uppercase truncate text-right">{selectedRemetente?.name}</span>
                </div>
             </div>
          </div>
        )}

        <button 
          disabled={isExporting || !formData.os} 
          onClick={downloadPDF} 
          className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-2xl transition-all active:scale-95 disabled:opacity-30"
        >
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR MINUTA DE CHEIO'}
        </button>
      </div>

      <div className="flex-1 bg-slate-200 flex justify-center items-start overflow-auto p-12 custom-scrollbar relative">
        <div className="origin-top transform scale-[0.7] xl:scale-[0.85] transition-all duration-500 shadow-2xl rounded-sm overflow-hidden bg-white">
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
