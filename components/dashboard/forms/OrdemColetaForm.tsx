import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, Category, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import OrdemColetaTemplate from './OrdemColetaTemplate';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import DriverPlateSelector, { primaryHorse, primaryTrailer } from '../../shared/DriverPlateSelector';
import DriverSwapModal, { DriverSwapResult } from '../drivers/DriverSwapModal';
import { searchService } from '../../../utils/searchService';
import { maskSeal } from '../../../utils/masks';
import ContainerInput from '../../shared/ContainerInput';
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
  tripId?: string;
}

const OrdemColetaForm: React.FC<OrdemColetaFormProps> = ({ drivers, customers, ports, onClose, initialData, tripId }) => {
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userHasChosenCategory, setUserHasChosenCategory] = useState(false);
  const [containerTypes, setContainerTypes] = useState<any[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  
  const [pendingAction, setPendingAction] = useState<'download' | 'print' | null>(null);
  const [plateHorse, setPlateHorse] = useState('');
  const [plateTrailer, setPlateTrailer] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);

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
    horarioAgendado: new Date().toISOString().slice(0, 16),
    obs: '',
    category: '', 
    displayDate: new Date().toLocaleDateString('pt-BR')
  });

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));

    const loadCats = async () => {
      const c = await db.getCategories();
      setCategories(c);
      
      const types = await db.getContainerTypes();
      setContainerTypes(types);

      const opTypes = await db.getOperationTypes();
      if (opTypes && opTypes.length > 0) {
        setOperationTypes(opTypes);
        if (!initialData) {
          const savedDefault = localStorage.getItem('defaultOperationType');
          if (savedDefault) {
            const found = opTypes.find(t => t.id === savedDefault);
            if (found) setFormData((prev: any) => ({ ...prev, tipoOperacao: found.name }));
          }
        }
      } else {
        setOperationTypes([
          {id: '1', name: 'EXPORTAÇÃO'},
          {id: '2', name: 'IMPORTAÇÃO'},
          {id: '3', name: 'COLETA'},
          {id: '4', name: 'ENTREGA'},
          {id: '5', name: 'CABOTAGEM'}
        ]);
      }
      
      if (initialData?.category) {
        setFormData((prev: any) => ({ ...prev, category: initialData.category.toUpperCase() }));
        setUserHasChosenCategory(true);
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
    const upValue = (field === 'horarioAgendado' || field === 'obs') ? value : value.toUpperCase();
    
    if (field === 'category') {
      setUserHasChosenCategory(true);
    }

    setFormData((prev: any) => {
      let next = { ...prev, [field]: upValue };
      
      // Detecção automática (apenas se o usuário não tiver selecionado manualmente ainda)
      if (field === 'os' && !userHasChosenCategory) {
        const detected = osCategoryService.detectCategoryFromOS(upValue);
        if (detected) {
          next.category = detected.toUpperCase();
        }
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

  useEffect(() => {
    if (selectedDriver) {
      setPlateHorse(primaryHorse(selectedDriver));
      setPlateTrailer(primaryTrailer(selectedDriver));
    }
  }, [formData.driverId]);

  const effectiveDriver = selectedDriver ? { ...selectedDriver, plateHorse, plateTrailer } : undefined;

  const startWorkflow = async (mode: 'download' | 'print') => {
    if (!formData.os || !formData.driverId || !formData.remetenteId) {
      alert("Preencha OS, Motorista e Cliente para prosseguir.");
      return;
    }
    if (!formData.category) {
      alert("Por favor, selecione um vínculo (categoria) para a operação.");
      return;
    }
    setPendingAction(mode);
    await executeWorkflow(tripId);
  };

  const executeWorkflow = async (targetTripId?: string) => {
    if (!currentUser || !effectiveDriver || !selectedRemetente) return;

    setIsExporting(true);

    try {
      await ocRules.processOCWorkflow(
        formData,
        effectiveDriver,
        selectedRemetente,
        currentUser, 
        selectedDestinatario,
        targetTripId || tripId
      );

      window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
      db.saveFormHistory('ORDEM_COLETA', formData, formData.container || formData.os, currentUser);

      generateBarcodes();
      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      
      const canvas = await html2canvas(element, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: "#ffffff",
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0); 
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      const fileName = `OC - ${effectiveDriver!.name} - ${formData.os}`;

      if (pendingAction === 'print') {
        pdf.autoPrint();
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        pdf.save(`${fileName}.pdf`);
      }
      
    } catch (e) { 
      console.error(e); 
      alert("Falha ao processar operação no servidor.");
    } finally { 
      setIsExporting(false); 
      setPendingAction(null);
    }
  };

  const selectClasses = "w-full px-5 py-4 rounded-[1.5rem] border-2 border-slate-50 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm cursor-pointer";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block";
  const labelBlueClass = "text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block";
  const inputClasses = "w-full px-5 py-4 rounded-[1.5rem] border-2 border-slate-50 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300";

  // Preparação consistente das opções
  const availableOptions = Array.from(new Set([
    ...categories.filter(c => !c.parentId).map(c => c.name.toUpperCase()),
    'ALIANÇA',
    'MERCOSUL'
  ])).sort();

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <OrdemColetaTemplate 
            formData={formData} 
            selectedDriver={effectiveDriver}
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={selectedDestinatario} 
          />
        </div>
      </div>


      <div className="w-full lg:min-w-[560px] lg:w-[560px] p-10 overflow-y-auto space-y-8 bg-slate-50 border-r border-slate-100 custom-scrollbar relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm border border-slate-200 transition-colors z-10"
          title="Fechar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>

        <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 shadow-sm space-y-6 mt-4">
           <div className="space-y-1">
              <label className={labelBlueClass}>Identificação da Viagem (OS)</label>
              <input 
                required 
                placeholder="EX: 123ALC1234567A"
                className={`${inputClasses} text-xl border-blue-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10`} 
                value={formData.os} 
                onChange={e => handleInputChange('os', e.target.value)} 
              />
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                 <label className={labelClass}>Tipo de Operação</label>
                 <select className={selectClasses} value={formData.tipoOperacao} onChange={e => handleInputChange('tipoOperacao', e.target.value)}>
                    {operationTypes.map(op => (
                      <option key={op.id} value={op.name}>{op.name}</option>
                    ))}
                 </select>
              </div>
              <div className="space-y-1">
                 <label className={labelClass}>Vínculo Operacional</label>
                 <select 
                   required
                   className={`${selectClasses} ${formData.category ? 'text-blue-600 border-blue-400 ring-2 ring-blue-500/5' : ''}`} 
                   value={formData.category} 
                   onChange={e => handleInputChange('category', e.target.value)}
                 >
                    <option value="">{userHasChosenCategory ? 'SELECIONE VÍNCULO...' : 'AUTO DETECTANDO...'}</option>
                    {availableOptions.map(name => (
                       <option key={name} value={name}>{name}</option>
                    ))}
                 </select>
                 {formData.category && !userHasChosenCategory && (
                    <p className="text-[8px] font-black text-blue-500 uppercase mt-2 ml-1 animate-pulse">✓ Sugestão Automática: {formData.category}</p>
                 )}
              </div>
           </div>
        </div>

        <AutocompleteSearch 
          label="1. Remetente (Cliente)"
          placeholder="Razão, Fantasia, CNPJ ou Cidade..."
          data={customers}
          onSelect={(c) => setFormData({...formData, remetenteId: c.id})}
          mapToAutocomplete={searchService.mapCustomer}
          initialValue={selectedRemetente ? (selectedRemetente.legalName || selectedRemetente.name) : ''}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>}
        />

        <AutocompleteSearch 
          label="2. Destinatário (Local Destino)"
          placeholder="Nome do Porto ou Terminal..."
          data={ports}
          onSelect={(p) => setFormData({...formData, destinatarioId: p.id})}
          mapToAutocomplete={searchService.mapPort}
          initialValue={selectedDestinatario ? (selectedDestinatario.legalName || selectedDestinatario.name) : ''}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>}
        />

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
          <p className={labelClass}>3. Dados do Equipamento</p>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelClass}>Container</label>
              <ContainerInput
                value={formData.container}
                onChange={(containerValue, carrierName) => setFormData((prev: any) => ({
                  ...prev,
                  container: containerValue,
                  agencia: carrierName !== '' ? carrierName : prev.agencia,
                }))}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Tipo Container</label>
              <select className={selectClasses} value={formData.tipo} onChange={e => handleInputChange('tipo', e.target.value)}>
                {containerTypes.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1"><label className={labelClass}>Tara</label><input className={inputClasses} value={formData.tara} onChange={e => handleInputChange('tara', e.target.value)} placeholder="KG" /></div>
            <div className="space-y-1"><label className={labelClass}>Lacre</label><input className={inputClasses} value={formData.seal} onChange={e => handleInputChange('seal', e.target.value)} placeholder="LACRE OFICIAL" /></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1"><label className={labelClass}>Genset (Opcional)</label><input className={inputClasses} value={formData.genset} onChange={e => handleInputChange('genset', e.target.value)} placeholder="Nº GENSET" /></div>
            <div className="space-y-1"><label className={labelClass}>Armador / Agência</label><input className={`${inputClasses} bg-blue-50/30 border-blue-100`} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Padrão de Carga</label>
            <select className={selectClasses} value={formData.padrao} onChange={e => handleInputChange('padrao', e.target.value)}>
              <option value="CARGA GERAL">CARGA GERAL</option>
              <option value="CARGO PREMIUM">CARGO PREMIUM</option>
              <option value="PADRÃO ALIMENTO">PADRÃO ALIMENTO</option>
              <option value="REEFER">REEFER</option>
              <option value="PRODUTO QUÍMICO">PRODUTO QUÍMICO</option>
            </select>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
          <p className={labelClass}>4. Manifesto Marítimo</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} placeholder="NOME DO NAVIO" /></div>
            <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} placeholder="REF / BOOKING" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Autorização Coleta</label><input className={inputClasses} value={formData.autColeta} onChange={e => handleInputChange('autColeta', e.target.value)} placeholder="Nº AUTORIZAÇÃO" /></div>
            <div className="space-y-1"><label className={labelClass}>Embarcador</label><input className={inputClasses} value={formData.embarcador} onChange={e => handleInputChange('embarcador', e.target.value)} placeholder="SHIPPER" /></div>
          </div>
        </div>

        <AutocompleteSearch
          label="5. Motorista Alocado"
          placeholder="Nome, Placa ou CPF..."
          data={drivers}
          onSelect={(d) => setFormData({...formData, driverId: d.id})}
          mapToAutocomplete={searchService.mapDriver}
          initialValue={selectedDriver ? selectedDriver.name : ''}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>}
        />
        <DriverPlateSelector
          driver={selectedDriver}
          plateHorse={plateHorse}
          plateTrailer={plateTrailer}
          onChangePlateHorse={setPlateHorse}
          onChangePlateTrailer={setPlateTrailer}
        />
        {selectedDriver && (
          <button
            type="button"
            onClick={() => setSwapModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Trocar Equipamento
          </button>
        )}
        <DriverSwapModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          driver={selectedDriver || null}
          drivers={drivers}
          currentPlateHorse={plateHorse}
          currentPlateTrailer={plateTrailer}
          onConfirm={(result: DriverSwapResult) => {
            setPlateHorse(result.plateHorse);
            setPlateTrailer(result.plateTrailer);
          }}
        />

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
           <div className="space-y-1">
              <label className={labelBlueClass}>6. Horário Agendado para Coleta</label>
              <input type="datetime-local" className={inputClasses} value={formData.horarioAgendado} onChange={e => handleInputChange('horarioAgendado', e.target.value)} />
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <button disabled={isExporting} onClick={() => startWorkflow('print')} className="py-6 bg-white border-2 border-slate-200 text-slate-700 rounded-[1.8rem] text-[11px] font-black uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" strokeWidth="2.5"/></svg>
             {isExporting ? 'Processando...' : 'Imprimir OC'}
           </button>
           <button disabled={isExporting} onClick={() => startWorkflow('download')} className="py-6 bg-slate-900 text-white rounded-[1.8rem] text-[11px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5"/></svg>
             {isExporting ? 'Gravando...' : 'Baixar PDF'}
           </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-12 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <OrdemColetaTemplate 
            formData={formData} 
            selectedDriver={effectiveDriver}
            selectedRemetente={selectedRemetente} 
            selectedDestinatario={selectedDestinatario} 
          />
        </div>
      </div>
    </div>
  );
};

export default OrdemColetaForm;