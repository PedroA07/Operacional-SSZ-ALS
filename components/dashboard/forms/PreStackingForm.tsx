
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

const PreStackingForm: React.FC<PreStackingFormProps> = ({ drivers, customers, ports, onClose, initialOS }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  
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

  const handleUnitChange = (id: string) => {
    const unit = preStackingList.find(p => p.id === id);
    setFormData(prev => ({ ...prev, destinatarioId: id }));
    setSelectedDestinatario(unit);
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

           <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5 block">Local de Entrega (Pre-Stacking)</label>
              <div className="relative group">
                <select 
                  className={`${inputClasses} cursor-pointer h-[58px] py-0 appearance-none pr-10`}
                  value={formData.destinatarioId}
                  onChange={e => handleUnitChange(e.target.value)}
                >
                  <option value="">Selecione o Terminal...</option>
                  {preStackingList.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} | {unit.legalName?.substring(0, 20)}... | {unit.city}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
                </div>
              </div>

              {selectedDestinatario && (
                <div className="mt-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                   <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                         <p className="text-[10px] font-black text-emerald-900 uppercase leading-tight">{selectedDestinatario.legalName}</p>
                         <p className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5 italic">Fantasia: {selectedDestinatario.name}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[7px] font-black uppercase">Selecionado</span>
                   </div>
                   <div className="flex justify-between mt-3 pt-3 border-t border-emerald-200/50">
                      <span className="text-[8px] font-black text-emerald-700">CNPJ: {maskCNPJ(selectedDestinatario.cnpj)}</span>
                      <span className="text-[8px] font-black text-emerald-500 uppercase">{selectedDestinatario.city} - {selectedDestinatario.state}</span>
                   </div>
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
