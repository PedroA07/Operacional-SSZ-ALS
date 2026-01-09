
import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, Category, Trip, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import OrdemColetaTemplate from './OrdemColetaTemplate';
import { maskSeal } from '../../../utils/masks';
import { lookupCarrierByContainer } from '../../../utils/carrierService';
import { osCategoryService } from '../../../utils/osCategoryService';
import { tripSyncService } from '../../../utils/tripSyncService';
import { ocRules } from '../../../utils/ocRules';
import { db } from '../../../utils/storage';

interface OrdemColetaFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
  initialData?: any; 
}

const OrdemColetaForm: React.FC<OrdemColetaFormProps> = ({ drivers, customers, ports, onClose, initialData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [remetenteSearch, setRemetenteSearch] = useState('');
  const [showRemetenteResults, setShowRemetenteResults] = useState(false);
  const [destinatarioSearch, setDestinatarioSearch] = useState('');
  const [showDestinatarioResults, setShowDestinatarioResults] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);

  const [detectedCategory, setDetectedCategory] = useState<string | null>(null);

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [existingTrip, setExistingTrip] = useState<Trip | null>(null);
  const [pendingAction, setPendingAction] = useState<'download' | 'print' | null>(null);

  const [formData, setFormData] = useState(initialData || {
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

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));

    const loadCats = async () => {
      const c = await db.getCategories();
      setCategories(c);
      
      if (initialData) {
        const d = drivers.find(drv => drv.id === initialData.driverId);
        if (d) setDriverSearch(d.name);
        const cust = customers.find(c => c.id === initialData.remetenteId);
        if (cust) setRemetenteSearch(cust.legalName || cust.name);
        const p = ports.find(pt => pt.id === initialData.destinatarioId);
        if (p) setDestinatarioSearch(p.legalName || p.name);
        
        const detected = osCategoryService.detectCategoryFromOS(initialData.os);
        setDetectedCategory(detected);
      }
    };
    loadCats();
  }, []);

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
      let next = { ...prev, [field]: (field === 'horarioAgendado' || field === 'obs') ? value : upValue };

      if (field === 'os') {
        const detected = osCategoryService.detectCategoryFromOS(upValue);
        setDetectedCategory(detected);
      }

      if (field === 'container') {
        const carrier = lookupCarrierByContainer(upValue);
        next.agencia = carrier ? carrier.name : prev.agencia;
      }

      if (field === 'seal') {
        next.seal = maskSeal(upValue);
      }

      return next;
    });
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = ports.find(p => p.id === formData.destinatarioId);

  const startWorkflow = async (mode: 'download' | 'print') => {
    if (!formData.os || !selectedDriver || !selectedRemetente) {
      alert("Preencha OS, Motorista e Cliente para prosseguir.");
      return;
    }

    setPendingAction(mode);
    const existing = await tripSyncService.findExistingTrip(formData.os);
    
    if (existing) {
      const hasChanges = tripSyncService.hasChanges(existing, formData, selectedDriver.id, selectedRemetente.id);
      if (hasChanges) {
        setExistingTrip(existing);
        setShowSyncModal(true);
      } else {
        await executeWorkflow();
      }
    } else {
      await executeWorkflow();
    }
  };

  const executeWorkflow = async () => {
    if (!currentUser || !selectedDriver || !selectedRemetente) return;
    
    setIsExporting(true);
    setShowSyncModal(false);
    
    try {
      // CHAMA A REGRA DE NEGÓCIO CENTRALIZADA (Cria a viagem em Operações)
      await ocRules.processOCWorkflow(
        formData, 
        selectedDriver, 
        selectedRemetente, 
        currentUser, 
        selectedDestinatario
      );

      // GERAR PDF
      generateBarcodes();
      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      const fileName = `OC - ${selectedDriver.name} - ${formData.os}`;

      if (pendingAction === 'print') {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          win.document.title = fileName;
          win.onload = () => { win.focus(); win.print(); };
        }
      } else {
        pdf.save(`${fileName}.pdf`);
      }
      
    } catch (e) { 
      console.error(e); 
      alert("Falha ao gerar documento.");
    } finally { 
      setIsExporting(false); 
      setPendingAction(null);
    }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelBlueClass = "text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 block";

  const filteredCustomers = customers.filter(c => 
    (c.name && c.name.toUpperCase().includes(remetenteSearch)) || 
    (c.legalName && c.legalName.toUpperCase().includes(remetenteSearch))
  );

  const filteredPorts = ports.filter(p => 
    (p.name && p.name.toUpperCase().includes(destinatarioSearch)) || 
    (p.legalName && p.legalName.toUpperCase().includes(destinatarioSearch))
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
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

      {showSyncModal && existingTrip && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-amber-500 text-white flex items-center gap-6">
                 <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Vincular Alterações ao Painel?</h3>
                    <p className="text-[10px] font-black uppercase opacity-80 mt-1">Os dados desta OC são diferentes da viagem registrada. Deseja atualizar o dashboard?</p>
                 </div>
              </div>
              <div className="p-10 flex gap-4 bg-slate-50 border-t border-slate-100">
                 <button onClick={() => setShowSyncModal(false)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Manter Atual</button>
                 <button onClick={() => executeWorkflow()} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all">Atualizar e Prosseguir</button>
              </div>
           </div>
        </div>
      )}

      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">
        
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
           <div className="space-y-1">
              <label className={labelBlueClass}>Identificação da Viagem (OS)</label>
              <input 
                required 
                placeholder="EX: 123ALC1234567A"
                className={`${inputClasses} text-lg border-blue-200 focus:border-blue-600`} 
                value={formData.os} 
                onChange={e => handleInputChange('os', e.target.value)} 
              />
           </div>

           {detectedCategory && (
             <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500 text-white rounded-2xl animate-in zoom-in-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3"/></svg>
                <div>
                   <p className="text-[8px] font-black uppercase leading-none opacity-80">Categoria Identificada</p>
                   <p className="text-[11px] font-black uppercase tracking-widest">{detectedCategory}</p>
                </div>
             </div>
           )}
        </div>

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
              {filteredCustomers.map(c => (
                <button 
                  key={c.id} 
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 transition-colors" 
                  onClick={() => { 
                    setFormData({...formData, remetenteId: c.id}); 
                    setRemetenteSearch(c.legalName || c.name); 
                    setShowRemetenteResults(false); 
                  }}
                >
                  <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">{c.legalName || c.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className={labelBlueClass}>2. Destinatário (Local Destino)</label>
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
              {filteredPorts.map(p => (
                <button 
                  key={p.id} 
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 transition-colors" 
                  onClick={() => { 
                    setFormData({...formData, destinatarioId: p.id}); 
                    setDestinatarioSearch(p.legalName || p.name); 
                    setShowDestinatarioResults(false); 
                  }}
                >
                  <p className="text-[10px] font-black uppercase text-slate-800 leading-tight">{p.legalName || p.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

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
          <div className="space-y-1">
            <label className={labelClass}>Armador / Agência</label>
            <input className={`${inputClasses} ${formData.agencia ? 'bg-blue-50' : ''}`} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} />
          </div>
        </div>

        <div className="relative">
          <label className={labelBlueClass}>5. Motorista Alocado</label>
          <input type="text" placeholder="BUSCAR MOTORISTA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={e => setDriverSearch(e.target.value.toUpperCase())} />
          {showDriverResults && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
              {drivers.filter(d => d.name.toUpperCase().includes(driverSearch)).map(d => (
                <button key={d.id} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-black uppercase border-b border-slate-50" onClick={() => { setFormData({...formData, driverId: d.id}); setDriverSearch(d.name); setShowDriverResults(false); }}>{d.name}</button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
           <button disabled={isExporting} onClick={() => startWorkflow('print')} className="py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
             Imprimir OC
           </button>
           <button disabled={isExporting} onClick={() => startWorkflow('download')} className="py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2">
             Baixar PDF
           </button>
        </div>
      </div>

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
