import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, Trip, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import PreStackingTemplate from './PreStackingTemplate';
import { db } from '../../../utils/storage';
import { maskCNPJ, maskCEP } from '../../../utils/masks';
import { tripSyncService } from '../../../utils/tripSyncService';

interface PreStackingFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
  initialOS?: string;
}

const TerminalCardItem: React.FC<any> = ({ unit, isSelected = false, onClick }) => (
  <button 
    type="button"
    onClick={onClick} 
    className={`w-full p-5 rounded-[1.8rem] border-2 transition-all text-left flex items-center justify-between group cursor-pointer mb-2 ${
      isSelected 
      ? 'bg-emerald-50 border-emerald-500 shadow-md ring-4 ring-emerald-500/5' 
      : 'bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50'
    }`}
  >
    <div className="flex-1 min-w-0">
      <p className={`text-[11px] font-black uppercase leading-tight ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
        {unit.legalName || unit.name}
      </p>
      {unit.legalName && unit.name !== unit.legalName && (
        <p className="text-[8px] font-bold text-emerald-400 uppercase mt-1 italic tracking-widest">
          FAN: {unit.name}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
         <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
         <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
           {unit.city} - {unit.state}
         </p>
      </div>
    </div>
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-500'}`}>
       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5" />
       </svg>
    </div>
  </button>
);

const PreStackingForm: React.FC<PreStackingFormProps> = ({ drivers, customers, ports, onClose, initialOS }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [isTerminalDropdownOpen, setIsTerminalDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [osInput, setOsInput] = useState(initialOS || '');
  const [preStackingList, setPreStackingList] = useState<PreStacking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
    displayDate: new Date().toLocaleDateString('pt-BR'),
    schedulingDate: '',
    schedulingTime: ''
  });

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedRemetente, setSelectedRemetente] = useState<any>(null);
  const [selectedDestinatario, setSelectedDestinatario] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));

    const loadUnits = async () => {
      const [units, pList] = await Promise.all([db.getPreStacking(), db.getPorts()]);
      setPreStackingList([...units, ...pList]);
    };
    loadUnits();
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
        setSelectedDriver(drivers.find(d => d.id === trip.driver.id));
        setSelectedRemetente(customers.find(c => c.id === trip.customer.id));
      } else {
        alert("OS não localizada no painel. Verifique o número digitado.");
      }
    } catch (e) {
      console.error(e);
    } finally { 
      setIsLoadingTrip(false); 
    }
  };

  const generateBarcodes = () => {
    const generate = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el && value) {
        try {
          JsBarcode(`#${id}`, value, { 
            format: "CODE128", 
            width: 2, 
            height: 25, 
            displayValue: false, 
            margin: 0, 
            background: "transparent" 
          });
        } catch (e) { }
      }
    };
    if (formData.container) generate('ps-barcode-container', formData.container);
    if (formData.tara) generate('ps-barcode-tara', formData.tara);
    if (formData.seal) generate('ps-barcode-lacre', formData.seal);
  };

  const startWorkflow = async (mode: 'download' | 'print') => {
    if (!formData.os || !formData.destinatarioId) {
      alert("Busque uma OS e selecione o Local de Entrega.");
      return;
    }
    setPendingAction(mode);
    
    const existing = await tripSyncService.findExistingTrip(formData.os);
    if (existing && tripSyncService.hasChanges(existing, formData, selectedDriver?.id, selectedRemetente?.id)) {
        setExistingTrip(existing);
        setShowSyncModal(true);
    } else {
        await executeWorkflow(existing?.id || null);
    }
  };

  const executeWorkflow = async (existingId: string | null) => {
    setIsExporting(true);
    setShowSyncModal(false);

    try {
      setTimeout(generateBarcodes, 100);

      if (currentUser) {
        await db.addNotification(currentUser, 'MINUTA_GENERATED', `Minuta Pre-Stacking: ${formData.os}`, `Minuta de carregado gerada para ${selectedDriver?.name}.`, { os: formData.os, motorista: selectedDriver?.name, placa: selectedDriver?.plateHorse });
      }

      if (selectedDriver && selectedRemetente) {
         const schedulingDateTime = formData.schedulingDate && formData.schedulingTime 
           ? `${formData.schedulingDate}T${formData.schedulingTime}:00` 
           : undefined;
         const tripData = tripSyncService.mapOCtoTrip(
           { ...formData, schedulingDate: schedulingDateTime }, 
           selectedDriver, 
           selectedRemetente, 
           'Pre-Stacking', 
           selectedDestinatario
         );
         await tripSyncService.sync(tripData, existingId || undefined);
      }

      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) throw new Error("Referência de captura não encontrada");

      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: "#ffffff",
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      const fileName = `Minuta PreStacking - ${selectedDriver?.name || 'MOTORISTA'} - ${formData.os}.pdf`;
      
      if (pendingAction === 'print') {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          win.document.title = fileName;
          win.onload = () => {
             win.focus();
             win.print();
          };
        }
      } else {
        pdf.save(fileName);
      }
    } catch (e) {
      console.error("Erro na geração do documento:", e);
      alert("Falha ao gerar documento digital. Tente novamente.");
    } finally { 
      setIsExporting(false); 
      setPendingAction(null); 
    }
  };

  const labelClass = "text-[10px] font-black text-emerald-600 uppercase tracking-widest block";
  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-white font-bold uppercase focus:border-emerald-500 outline-none transition-all shadow-sm placeholder:text-slate-300";

  const filteredUnits = preStackingList.filter(u => 
    (u.legalName || u.name || '').toUpperCase().includes(searchTerm.toUpperCase())
  );

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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-amber-500 text-white flex items-center gap-6">
                 <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Vincular Alterações?</h3>
                    <p className="text-[10px] font-black uppercase opacity-80 mt-1">Os dados digitados são diferentes da programação existente. Deseja atualizar o painel?</p>
                 </div>
              </div>
              <div className="p-10 flex gap-4 bg-slate-50 border-t border-slate-100">
                 <button onClick={() => setShowSyncModal(false)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
                 <button onClick={() => executeWorkflow(existingTrip.id)} className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all">Sincronizar e Prosseguir</button>
              </div>
           </div>
        </div>
      )}

      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50 border-r border-slate-100 custom-scrollbar shrink-0">
        
        <div className="bg-emerald-50 p-6 rounded-[2.2rem] border border-emerald-100 shadow-sm space-y-4">
           <div className="space-y-1">
              <label className={labelClass}>Busca por Ordem de Serviço</label>
              <div className="flex gap-2">
                <input 
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-white font-bold uppercase focus:border-emerald-500 outline-none transition-all shadow-sm" 
                  value={osInput} 
                  onChange={e => setOsInput(e.target.value.toUpperCase())} 
                  placeholder="EX: 123ALC..." 
                  onKeyDown={e => e.key === 'Enter' && handleOSLookup()} 
                />
                <button 
                  onClick={() => handleOSLookup()} 
                  className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg active:scale-90 shrink-0 transition-transform"
                >
                  {isLoadingTrip ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>
                  )}
                </button>
              </div>
           </div>
        </div>

        <div className="space-y-4 bg-white p-6 rounded-[2.2rem] border border-slate-200 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Data Agendamento (Opcional)</label>
              <input 
                type="date" 
                className={inputClass} 
                value={formData.schedulingDate} 
                onChange={e => setFormData({...formData, schedulingDate: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Hora Agendamento (Opcional)</label>
              <input 
                type="time" 
                className={inputClass} 
                value={formData.schedulingTime} 
                onChange={e => setFormData({...formData, schedulingTime: e.target.value})} 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Navio / Embarcação</label>
            <input className={inputClass} value={formData.ship} onChange={e => setFormData({...formData, ship: e.target.value.toUpperCase()})} placeholder="NOME DO NAVIO" />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Nota Fiscal (Número ou Qtd)</label>
            <input className={inputClass} value={formData.nf} onChange={e => setFormData({...formData, nf: e.target.value.toUpperCase()})} placeholder="Nº NF OU QUANTIDADE" />
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 ml-1 block">Local de Entrega (Pre-Stacking)</label>
            
            <button 
              type="button" 
              onClick={() => setIsTerminalDropdownOpen(!isTerminalDropdownOpen)} 
              className="w-full text-left"
            >
              {selectedDestinatario ? (
                <TerminalCardItem unit={selectedDestinatario} isSelected={true} />
              ) : (
                <div className="w-full px-6 py-6 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white text-slate-400 font-black text-[11px] uppercase flex justify-between items-center hover:border-emerald-400 hover:bg-emerald-50/20 transition-all group">
                  <span className="group-hover:text-emerald-500">Selecionar Terminal de Entrega...</span>
                  <svg className="w-5 h-5 group-hover:text-emerald-500 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>

            {isTerminalDropdownOpen && (
              <div className="absolute z-[100] w-full mt-2 bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-2">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <input 
                    type="text" 
                    placeholder="BUSCAR LOCALIDADE..." 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[10px] font-bold uppercase outline-none focus:border-emerald-400"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-3 space-y-1">
                  {filteredUnits.length > 0 ? filteredUnits.map(unit => (
                    <TerminalCardItem 
                      key={unit.id} 
                      unit={unit} 
                      onClick={() => { 
                        setSelectedDestinatario(unit); 
                        setFormData({...formData, destinatarioId: unit.id}); 
                        setIsTerminalDropdownOpen(false); 
                      }} 
                    />
                  )) : (
                    <div className="py-10 text-center text-slate-300 text-[10px] font-bold uppercase italic">Nenhum terminal encontrado</div>
                  )}
                </div>
              </div>
            )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4">
           <button 
             disabled={isExporting || !formData.os} 
             onClick={() => startWorkflow('print')} 
             className="py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-50 transition-all flex items-center justify-center gap-3 active:scale-95"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4"/></svg>
             Imprimir
           </button>
           <button 
             disabled={isExporting || !formData.os} 
             onClick={() => startWorkflow('download')} 
             className="py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-700 shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
             Baixar PDF
           </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 flex justify-center items-start overflow-auto p-12 custom-scrollbar relative">
        <div className="origin-top transform scale-[0.7] xl:scale-[0.85] shadow-[0_40px_100px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden bg-white">
          <PreStackingTemplate 
            formData={formData} 
            selectedDriver={selectedDriver} 
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={selectedDestinatario} 
          />
        </div>
        
        {isExporting && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-6">
             <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
             <div className="text-center">
                <p className="text-sm font-black uppercase tracking-widest">Processando Documento HD</p>
                <p className="text-[10px] text-emerald-200 uppercase mt-2 animate-pulse">Renderizando layout em alta definição...</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreStackingForm;