import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, Trip, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import PreStackingTemplate from './PreStackingTemplate';
import { db } from '../../../utils/storage';
import { tripSyncService } from '../../../utils/tripSyncService';

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLDivElement>(null);
  
  const [osInput, setOsInput] = useState(initialOS || '');
  const [remetenteSearch, setRemetenteSearch] = useState('');
  const [showRemetenteResults, setShowRemetenteResults] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);
  const [podSearch, setPodSearch] = useState('');
  const [showPodResults, setShowPodResults] = useState(false);

  const [formData, setFormData] = useState({
    os: '', nf: '', container: '', tipo: '40HC', tara: '', seal: '', booking: '', autColeta: '', ship: '', driverId: '', remetenteId: '', destinatarioId: '', padrao: 'CHEIO', obs: '', pod: 'SANTOS', displayDate: new Date().toLocaleDateString('pt-BR'), manualLocal: ''
  });

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedRemetente, setSelectedRemetente] = useState<any>(null);
  const [selectedDestinatario, setSelectedDestinatario] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));
    if (initialOS) handleOSLookup(initialOS);
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
          container: trip.container || '', 
          tipo: trip.containerType || '40HC', 
          tara: trip.tara || '', 
          seal: trip.seal || '', 
          booking: trip.booking || '', 
          autColeta: trip.ocFormData?.autColeta || '', 
          ship: trip.ship || '', 
          driverId: trip.driver.id, 
          remetenteId: trip.customer.id 
        }));
        const drv = drivers.find(d => d.id === trip.driver.id);
        const cust = customers.find(c => c.id === trip.customer.id);
        setSelectedDriver(drv);
        setSelectedRemetente(cust);
        if (drv) setDriverSearch(drv.name);
        if (cust) setRemetenteSearch(cust.legalName || cust.name);
      } else {
        alert("OS não localizada no painel.");
      }
    } catch (e) { console.error(e); } finally { setIsLoadingTrip(false); }
  };

  const handleInputChange = (field: string, value: string) => {
    const val = value.toUpperCase();
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const downloadPDF = async () => {
    if (!formData.os || !formData.container) {
      alert("Busque uma OS válida e preencha os dados do equipamento.");
      return;
    }

    setIsExporting(true);
    try {
      if (currentUser) {
        await db.addNotification(currentUser, 'MINUTA_GENERATED', `Pré-Stacking: ${formData.os}`, `Minuta de carregado gerada com sucesso.`, { os: formData.os, motorista: selectedDriver?.name });
      }

      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`PRÉ-STACKING - ${selectedDriver?.name || 'MOT'} - ${formData.os}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:border-emerald-600 outline-none transition-all shadow-sm placeholder:text-slate-300";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelThemeClass = "text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block";

  const filteredCustomers = customers.filter(c => (c.name || '').toUpperCase().includes(remetenteSearch) || (c.legalName || '').toUpperCase().includes(remetenteSearch));

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <PreStackingTemplate formData={formData} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />
        </div>
      </div>

      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50 border-r border-slate-100 custom-scrollbar">
        <div className="bg-emerald-50 p-6 rounded-[2.2rem] border border-emerald-100 shadow-sm">
           <label className={labelThemeClass}>Busca por Ordem de Serviço</label>
           <div className="flex gap-2">
             <input className={`${inputClasses} border-emerald-200`} value={osInput} onChange={e => setOsInput(e.target.value.toUpperCase())} placeholder="123ALC..." />
             <button onClick={() => handleOSLookup()} className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg active:scale-90 shrink-0">
               {isLoadingTrip ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>}
             </button>
           </div>
        </div>

        <div className="relative">
          <label className={labelThemeClass}>1. Local de Entrega (Manual)</label>
          <input type="text" placeholder="TERMINAL DE DESTINO..." className={inputClasses} value={formData.manualLocal} onChange={e => handleInputChange('manualLocal', e.target.value)} />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
           <p className={labelClass}>2. Dados do Equipamento</p>
           <div className="space-y-3">
              <div className="space-y-1">
                 <label className={labelClass}>Container</label>
                 <input className={`${inputClasses} text-lg border-emerald-100`} value={formData.container} onChange={e => handleInputChange('container', e.target.value)} placeholder="ABCD1234567" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1"><label className={labelClass}>Tipo</label><select className={inputClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}><option value="40HC">40HC</option><option value="40HR">40HR</option><option value="20DC">20DC</option></select></div>
                 <div className="space-y-1"><label className={labelClass}>Tara</label><input className={inputClasses} value={formData.tara} onChange={e => handleInputChange('tara', e.target.value)} placeholder="KG" /></div>
              </div>
              <div className="space-y-1"><label className={labelClass}>Lacre</label><input className={inputClasses} value={formData.seal} onChange={e => handleInputChange('seal', e.target.value)} placeholder="LACRE OFICIAL" /></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>3. Dados da Operação</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Nota Fiscal</label><input className={inputClasses} value={formData.nf} onChange={e => handleInputChange('nf', e.target.value)} /></div>
          </div>
          <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} /></div>
        </div>

        <div className="space-y-1">
          <label className={labelThemeClass}>4. Observações Operacionais</label>
          <textarea placeholder="NOTAS PARA O TERMINAL..." className={`${inputClasses} h-28 resize-none py-4 lowercase leading-relaxed`} value={formData.obs} onChange={e => handleInputChange('obs', e.target.value)} />
        </div>

        <button disabled={isExporting} onClick={downloadPDF} className="w-full py-6 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl transition-all active:scale-95">
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR MINUTA PRÉ-STACKING'}
        </button>
      </div>

      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-12 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <PreStackingTemplate formData={formData} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={null} />
        </div>
      </div>
    </div>
  );
};

export default PreStackingForm;