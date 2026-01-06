
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DevolucaoVazioTemplate from './DevolucaoVazioTemplate';
import { lookupCarrierByContainer } from '../../../utils/carrierService';
import { db } from '../../../utils/storage';

interface DevolucaoVazioFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
}

const DevolucaoVazioForm: React.FC<DevolucaoVazioFormProps> = ({ drivers, customers, ports, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);
  
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
      if (field === 'container') {
        const carrier = lookupCarrierByContainer(val);
        if (carrier) next.agencia = carrier.name;
      }
      return next;
    });
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = ports.find(l => l.id === formData.destinatarioId);

  const downloadPDF = async () => {
    if (!selectedDriver || !formData.container) {
      alert("Preencha Container e Motorista.");
      return;
    }

    setIsExporting(true);
    try {
      if (currentUser) {
        await db.addNotification(
          currentUser,
          'MINUTA_GENERATED',
          `Devolução de Vazio: ${formData.container}`,
          `Minuta de devolução para o motorista ${selectedDriver.name} gerada.`,
          { os: formData.container, motorista: selectedDriver.name, placa: selectedDriver.plateHorse }
        );
      }

      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      pdf.save(`DEVOLUÇÃO DE VAZIO - ${selectedDriver.name} - ${formData.container}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";
  const labelBlueClass = "text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block";

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <DevolucaoVazioTemplate formData={formData} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />
        </div>
      </div>

      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
        <div className="relative">
          <label className={labelBlueClass}>1. Local da Devolução (Depot / Terminal)</label>
          <input type="text" placeholder="BUSCAR OU MANUAL..." className={inputClasses} value={destinatarioSearch} onFocus={() => setShowDestinatarioResults(true)} onChange={e => { setDestinatarioSearch(e.target.value.toUpperCase()); setFormData(prev => ({ ...prev, manualLocal: e.target.value.toUpperCase(), destinatarioId: '' })); }} />
        </div>

        <div className="relative">
          <label className={labelBlueClass}>2. Cliente (Exportador)</label>
          <input type="text" placeholder="BUSCAR..." className={inputClasses} value={remetenteSearch} onFocus={() => setShowRemetenteResults(true)} onChange={e => setRemetenteSearch(e.target.value.toUpperCase())} />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Container</label><input className={inputClasses} value={formData.container} onChange={e => handleInputChange('container', e.target.value)} /></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Tipo</label><select className={inputClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}><option value="40HC">40HC</option><option value="20DC">20DC</option></select></div>
          </div>
        </div>

        <div className="relative">
          <label className={labelBlueClass}>5. Motorista Transportador</label>
          <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => setDriverSearch(e.target.value.toUpperCase())} />
        </div>

        <button disabled={isExporting} onClick={downloadPDF} className="w-full py-6 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all active:scale-95">
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR MINUTA DE DEVOLUÇÃO'}
        </button>
      </div>

      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <DevolucaoVazioTemplate formData={formData} selectedDriver={selectedDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario} />
        </div>
      </div>
    </div>
  );
};

export default DevolucaoVazioForm;
