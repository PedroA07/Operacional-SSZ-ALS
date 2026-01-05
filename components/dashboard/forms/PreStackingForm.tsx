
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, Trip } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PreStackingTemplate from './PreStackingTemplate';
import { db } from '../../../utils/storage';
import { maskCNPJ } from '../../../utils/masks';
import { tripSyncService } from '../../../utils/tripSyncService';

interface PreStackingFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
  initialOS?: string;
}

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

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [existingTrip, setExistingTrip] = useState<Trip | null>(null);
  const [pendingAction, setPendingAction] = useState<'download' | 'print' | null>(null);

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

  const startWorkflow = async (mode: 'download' | 'print') => {
    if (!formData.os || !formData.destinatarioId) {
      alert("Busque uma OS e selecione o Local de Entrega.");
      return;
    }

    setPendingAction(mode);
    const existing = await tripSyncService.findExistingTrip(formData.os);
    if (existing) {
      setExistingTrip(existing);
      setShowSyncModal(true);
    } else {
      await executeWorkflow(null);
    }
  };

  const executeWorkflow = async (existingId: string | null) => {
    setIsExporting(true);
    setShowSyncModal(false);

    try {
      // Sincroniza com o Painel antes de imprimir/baixar
      if (selectedDriver && selectedRemetente) {
         const tripData = tripSyncService.mapOCtoTrip(formData, selectedDriver, selectedRemetente, 'Geral', selectedDestinatario);
         await tripSyncService.sync(tripData, existingId || undefined);
      }

      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      if (pendingAction === 'print') {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          win.onload = () => { win.focus(); win.print(); };
        }
      } else {
        pdf.save(`Minuta PreStacking - OS ${formData.os}.pdf`);
      }
    } catch (e) { console.error(e); } finally { setIsExporting(false); setPendingAction(null); }
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

      {showSyncModal && existingTrip && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-amber-500 text-white flex items-center gap-6">
                 <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">OS Já Existente no Painel</h3>
                    <p className="text-[10px] font-black uppercase opacity-80 mt-1">Deseja atualizar os dados da programação antes de emitir a minuta?</p>
                 </div>
              </div>
              <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                 <button onClick={() => setShowSyncModal(false)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all">Cancelar</button>
                 <button onClick={() => executeWorkflow(existingTrip.id)} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all">Atualizar e {pendingAction === 'print' ? 'Imprimir' : 'Baixar'}</button>
              </div>
           </div>
        </div>
      )}

      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50 border-r border-slate-100 custom-scrollbar">
        
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

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-5 shadow-sm">
           <div className="space-y-1">
              <label className={labelClass}>Nota Fiscal (Nº ou Qtd)</label>
              <input className={inputClasses} value={formData.nf} onChange={e => handleInputChange('nf', e.target.value)} placeholder="01 UNIDADE" />
           </div>

           <div className="space-y-1">
              <label className={labelClass}>Navio</label>
              <input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} placeholder="EX: MAERSK..." />
           </div>

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
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {preStackingList.map(unit => (
                      <TerminalCardItem 
                        key={unit.id} 
                        unit={unit} 
                        onClick={() => selectTerminal(unit)} 
                      />
                    ))}
                  </div>
                </div>
              )}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <button disabled={isExporting} onClick={() => startWorkflow('print')} className="py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4"/></svg>
             Imprimir
           </button>
           <button disabled={isExporting} onClick={() => startWorkflow('download')} className="py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
             Baixar PDF
           </button>
        </div>
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
