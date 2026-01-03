
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, Trip } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PreStackingTemplate from './PreStackingTemplate';
import { db } from '../../../utils/storage';

interface PreStackingFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
}

const PreStackingForm: React.FC<PreStackingFormProps> = ({ drivers, customers, ports, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  
  const [osInput, setOsInput] = useState('');
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

  // Carregar unidades de Pre-Stacking do Banco
  useEffect(() => {
    const loadUnits = async () => {
      const units = await db.getPreStacking();
      setPreStackingList(units);
    };
    loadUnits();
  }, []);

  // Lógica de Preenchimento Automático por OS
  const handleOSLookup = async () => {
    if (!osInput) return;
    setIsLoadingTrip(true);
    try {
      const trips = await db.getTrips();
      const trip = trips.find(t => t.os.toUpperCase() === osInput.toUpperCase());
      
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
        
        // Sincronizar objetos completos para o template
        setSelectedDriver(drivers.find(d => d.id === trip.driver.id));
        setSelectedRemetente(customers.find(c => c.id === trip.customer.id));
      } else {
        alert("Viagem não localizada no sistema para esta OS.");
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

  const inputClasses = "w-full px-5 py-4 rounded-2xl border border-slate-100 bg-white/80 text-slate-700 font-bold uppercase focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm backdrop-blur-sm";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block";

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
      {/* TEMPLATE PARA CAPTURA (INVISÍVEL) */}
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

      {/* PAINEL DE EDIÇÃO SOFT PREMIUM */}
      <div className="w-full lg:w-[420px] p-10 overflow-y-auto space-y-8 bg-white/40 backdrop-blur-md border-r border-white shadow-2xl custom-scrollbar z-10">
        
        {/* BUSCA POR OS */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tighter">Identificação</h4>
           </div>
           <div className="relative group">
              <label className={labelClass}>Número da OS (Busca Automática)</label>
              <div className="flex gap-2">
                <input 
                  className={`${inputClasses} flex-1`} 
                  value={osInput} 
                  onChange={e => setOsInput(e.target.value.toUpperCase())} 
                  placeholder="EX: 123ALC..."
                  onKeyDown={e => e.key === 'Enter' && handleOSLookup()}
                />
                <button 
                  onClick={handleOSLookup}
                  disabled={isLoadingTrip}
                  className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg active:scale-90"
                >
                  {isLoadingTrip ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>}
                </button>
              </div>
           </div>
        </div>

        {/* CAMPOS MANUAIS */}
        <div className="space-y-6 pt-4">
           <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-6 bg-emerald-400 rounded-full"></div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tighter">Dados de Emissão</h4>
           </div>

           <div className="space-y-2">
              <label className={labelClass}>Nota Fiscal (Nº ou Quantidade)</label>
              <input 
                className={inputClasses} 
                value={formData.nf} 
                onChange={e => handleInputChange('nf', e.target.value)} 
                placeholder="01 UNIDADE"
              />
           </div>

           <div className="space-y-2">
              <label className={labelClass}>Nome do Navio</label>
              <input 
                className={inputClasses} 
                value={formData.ship} 
                onChange={e => handleInputChange('ship', e.target.value)} 
                placeholder="EX: MAERSK..."
              />
           </div>

           <div className="space-y-2">
              <label className={labelClass}>Local de Entrega (Pré-Stacking)</label>
              <select 
                className={`${inputClasses} cursor-pointer`}
                value={formData.destinatarioId}
                onChange={e => handleUnitChange(e.target.value)}
              >
                <option value="">Selecione o Terminal...</option>
                {preStackingList.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.legalName || unit.name}</option>
                ))}
              </select>
           </div>
        </div>

        {/* FEEDBACK DE AUTO-FILL */}
        {formData.driverId && (
          <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 animate-in fade-in slide-in-from-top-4">
             <p className="text-[9px] font-black text-blue-400 uppercase mb-3 tracking-widest text-center">Dados da Viagem Vinculada</p>
             <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Motorista:</span>
                  <span className="text-[9px] font-black text-slate-700 uppercase truncate ml-4">{selectedDriver?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Container:</span>
                  <span className="text-[9px] font-black text-slate-700">{formData.container} ({formData.tipo})</span>
                </div>
                <div className="flex justify-between border-t border-blue-100 pt-2 mt-2">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Cliente:</span>
                  <span className="text-[9px] font-black text-slate-700 uppercase truncate ml-4">{selectedRemetente?.name}</span>
                </div>
             </div>
          </div>
        )}

        <div className="pt-6">
          <button 
            disabled={isExporting || !formData.os} 
            onClick={downloadPDF} 
            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 shadow-2xl transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-900"
          >
            {isExporting ? 'GERANDO DOCUMENTO...' : 'BAIXAR MINUTA DE CHEIO'}
          </button>
          <p className="text-center text-[8px] text-slate-400 font-bold uppercase mt-4 opacity-50 tracking-widest">ALS Operacional © 2025</p>
        </div>
      </div>

      {/* PREVIEW PANEL */}
      <div className="flex-1 bg-slate-100/50 flex justify-center items-start overflow-auto p-12 custom-scrollbar relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="origin-top transform scale-[0.65] xl:scale-[0.8] transition-all duration-700 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] hover:shadow-[0_80px_120px_-20px_rgba(0,0,0,0.3)] rounded-sm overflow-hidden bg-white">
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
