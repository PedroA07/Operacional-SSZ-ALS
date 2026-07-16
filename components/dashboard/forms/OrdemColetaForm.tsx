import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, Category, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import OrdemColetaTemplate from './OrdemColetaTemplate';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import QuickRegisterModal, { QuickRegisterType } from '../../shared/QuickRegisterModal';
import DriverPlateSelector, { primaryHorse, primaryTrailer } from '../../shared/DriverPlateSelector';
import DriverSwapModal, { DriverSwapResult } from '../drivers/DriverSwapModal';
import { searchService } from '../../../utils/searchService';
import { maskSeal } from '../../../utils/masks';
import ContainerInput from '../../shared/ContainerInput';
import CustomSelect from '../../shared/CustomSelect';
import DateTimePicker from '../../shared/DateTimePicker';
import { osCategoryService } from '../../../utils/osCategoryService';
import { tripSyncService } from '../../../utils/tripSyncService';
import { ocRules } from '../../../utils/ocRules';
import { db } from '../../../utils/storage';
import { localDateStr, localDateTimeStr } from '../../../utils/dateHelpers';
import { parseAliancaOsPdf, matchCustomer, matchByName, matchOperationType, normalizeKg, resolveClienteDestino } from '../../../utils/aliancaOsParser';
import { ensureCustomerByCnpj } from '../../../utils/entityAutoRegister';
import { appendPdfToJsPdf } from '../../../utils/pdfMerger';
import { printJsPdf } from '../../../utils/printPdf';

interface OrdemColetaFormProps {
  user?: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
  initialData?: any;
  tripId?: string;
  osPdfUrl?: string;   // PDF da OS já anexado à trip — exibe no preview lateral ao editar
}

const OrdemColetaForm: React.FC<OrdemColetaFormProps> = ({ user, drivers, customers, ports, onClose, initialData, tripId, osPdfUrl }) => {
  const [isExporting, setIsExporting] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userHasChosenCategory, setUserHasChosenCategory] = useState(false);
  const [containerTypes, setContainerTypes] = useState<any[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  const [preStackings, setPreStackings] = useState<any[]>([]);
  
  const [pendingAction, setPendingAction] = useState<'download' | 'print' | null>(null);
  // Importação de OS (Aliança/Mercosul, PDF) — preenche o formulário automaticamente
  const importOsInputRef = useRef<HTMLInputElement>(null);
  const [importingOs, setImportingOs] = useState(false);
  const [importOsNote, setImportOsNote] = useState<string | null>(null);
  // OS importada fica anexada: preview junto à OC e páginas incluídas no PDF final
  const [osFile, setOsFile] = useState<File | null>(null);
  const [osPreviewUrl, setOsPreviewUrl] = useState<string | null>(null);
  const [showOsPreview, setShowOsPreview] = useState(true);
  useEffect(() => () => { if (osPreviewUrl && osPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(osPreviewUrl); }, [osPreviewUrl]);
  // OS já anexada à trip (importada antes): exibe no preview lateral ao abrir/editar a OC
  useEffect(() => {
    const stored = osPdfUrl || initialData?.osPdfUrl;
    if (stored) { setOsPreviewUrl(stored); setShowOsPreview(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osPdfUrl]);
  const [plateHorse, setPlateHorse] = useState('');
  const [plateTrailer, setPlateTrailer] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  // Cadastro na hora (motorista/cliente/porto) sem fechar o formulário
  const [quickAdd, setQuickAdd] = useState<{ type: QuickRegisterType; name: string; onDone: (e: any) => void } | null>(null);
  const [extraDrivers, setExtraDrivers] = useState<Driver[]>([]);
  const [extraCustomers, setExtraCustomers] = useState<Customer[]>([]);
  const [extraPorts, setExtraPorts] = useState<Port[]>([]);

  const [formData, setFormData] = useState(initialData || {
    date: localDateStr(),
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
    tipoOperacao: '',
    autColeta: '',
    embarcador: '',
    horarioAgendado: localDateTimeStr(),
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

      const ps = await db.getPreStacking();
      setPreStackings(ps);

      const opTypes = await db.getOperationTypes();
      if (opTypes && opTypes.length > 0) {
        setOperationTypes(opTypes);
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


  const getCategoryForOpType = (typeName: string) => {
    const op = operationTypes.find((t: any) => t.name === typeName);
    if (!op?.config?.defaultCategoryId) return '';
    const cat = categories.find(c => c.id === op.config.defaultCategoryId);
    return cat?.name?.toUpperCase() || '';
  };

  const handleInputChange = (field: string, value: string) => {
    const upValue = (field === 'horarioAgendado' || field === 'obs') ? value : value.toUpperCase();

    if (field === 'category') {
      setUserHasChosenCategory(true);
    }

    setFormData((prev: any) => {
      let next = { ...prev, [field]: upValue };

      // O Tipo de Operação apenas SUGERE um vínculo quando ainda não há nenhum
      // definido. Nunca sobrescreve o vínculo já identificado pela OS
      // (ALC→Aliança, SP→Mercosul) nem a escolha manual — caso contrário toda
      // operação acabava salva na categoria padrão do tipo (ex.: Aliança),
      // mesmo sendo Mercosul, Indústria ou qualquer outra.
      if (field === 'tipoOperacao' && !userHasChosenCategory && !next.category) {
        const autoCategory = getCategoryForOpType(upValue);
        if (autoCategory) next.category = autoCategory;
      }

      // Detecção automática por padrão de OS (apenas se o usuário não tiver selecionado manualmente ainda).
      // A OS é a identificação autoritativa do vínculo, então pode corrigir uma sugestão do tipo de operação.
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

  // Listas mescladas: props + cadastros feitos na hora (disponíveis de imediato).
  // Deduplica por id — assim que o refresh global traz o item nas props, a cópia local some.
  const allDrivers = [...extraDrivers.filter(e => !drivers.some(d => d.id === e.id)), ...drivers];
  const allCustomers = [...extraCustomers.filter(e => !customers.some(c => c.id === e.id)), ...customers];
  const allPorts = [...extraPorts.filter(e => !ports.some(p => p.id === e.id)), ...ports];

  const selectedDriver = allDrivers.find(d => d.id === formData.driverId);
  const selectedRemetente = allCustomers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario =
    allPorts.find(p => p.id === formData.destinatarioId) ||
    preStackings.find(p => p.id === formData.destinatarioId) ||
    allCustomers.find(c => c.id === formData.destinatarioId) ||
    null;

  const destinatarioOptions = [
    ...allPorts.map(p => ({ ...p, _srcType: 'Porto' })),
    ...preStackings.map(p => ({ ...p, _srcType: 'Pré-Stacking' })),
    ...allCustomers.map(c => ({ ...c, _srcType: 'Cliente' })),
  ];

  const mapDestinatario = (item: any): import('../../../utils/searchService').AutocompleteItem => ({
    ...searchService.mapPort(item),
    subText: `${item._srcType} · ${item.city || ''} - ${item.state || ''}`,
  });

  useEffect(() => {
    if (selectedDriver) {
      setPlateHorse(primaryHorse(selectedDriver));
      setPlateTrailer(primaryTrailer(selectedDriver));
    }
  }, [formData.driverId]);

  const effectiveDriver = selectedDriver ? { ...selectedDriver, plateHorse, plateTrailer } : undefined;

  const handleImportOs = async (file: File | undefined) => {
    if (!file) return;
    setImportingOs(true);
    setImportOsNote(null);
    try {
      const p = await parseAliancaOsPdf(file);
      if (!p || !p.os) {
        setImportOsNote('PDF não reconhecido como OS (Aliança/Mercosul).');
        return;
      }
      // Remetente/destino conforme o tipo da OS: coleta/exportação usa
      // Local Coleta → Entregar Cheio; entrega/importação usa Local Entrega →
      // Entregar Vazio. Sem cadastro, cadastra pelo CNPJ.
      const cd = resolveClienteDestino(p);
      let matchedCustomer: any = matchCustomer(allCustomers, p);
      let autoRegisteredCustomer = false;
      if (!matchedCustomer && cd.clienteCnpj) {
        const ensured = await ensureCustomerByCnpj(allCustomers, cd.clienteCnpj, {
          nome: cd.clienteNome, cnpj: cd.clienteCnpj,
          endereco: cd.clienteEndereco, municipio: cd.clienteMunicipio, uf: cd.clienteUf,
          bairro: cd.clienteBairro, cep: cd.clienteCep,
        });
        if (ensured) {
          matchedCustomer = ensured.customer;
          autoRegisteredCustomer = ensured.created;
          if (ensured.created) setExtraCustomers(prev => [ensured.customer as any, ...prev]);
        }
      }
      const matchedDest = matchByName(destinatarioOptions as any[], cd.destinoNome);
      const matchedTipo = matchByName(containerTypes, p.containerTipo);
      const matchedOpType = matchOperationType(operationTypes, p.tipoOperacao)?.name;
      const detected = osCategoryService.detectCategoryFromOS(p.os);

      setFormData((prev: any) => ({
        ...prev,
        os: p.os,
        booking: p.booking || prev.booking,
        ship: p.ship || prev.ship,
        container: p.container || prev.container,
        tipo: matchedTipo?.name || p.containerTipo || prev.tipo,
        padrao: p.padraoCarga || prev.padrao,
        tipoOperacao: matchedOpType || p.tipoOperacao || prev.tipoOperacao,
        autColeta: p.autColeta || prev.autColeta,
        embarcador: p.embarcador || prev.embarcador,
        agencia: p.armador || prev.agencia,
        horarioAgendado: p.dataColeta || prev.horarioAgendado,
        // Tara da OS não entra na tara do container (só nos pesos de Emissões)
        seal: p.lacre ? maskSeal(p.lacre.toUpperCase()) : prev.seal,
        category: (detected || prev.category || '').toUpperCase(),
        remetenteId: matchedCustomer?.id || prev.remetenteId,
        destinatarioId: matchedDest?.id || prev.destinatarioId,
      }));
      if (detected) setUserHasChosenCategory(true);
      // Mantém a OS anexada: preview ao lado e páginas no PDF final da OC
      setOsFile(file);
      setOsPreviewUrl(URL.createObjectURL(file));
      setShowOsPreview(true);

      const notes: string[] = [`OS ${p.os} importada — confira os campos.`];
      notes.push(`Remetente pelo ${cd.clienteOrigem === 'LOCAL ENTREGA' ? 'Local de Entrega' : 'Local de Coleta'} e destino pelo ${cd.destinoOrigem === 'ENTREGAR VAZIO' ? 'Entregar Vazio' : 'Entregar Cheio'} (tipo ${p.tipoOperacao || '—'}).`);
      if (p.shipFromObs) notes.push(`Navio extraído das Demais Observações (campo trazia: ${p.navioViagemCampo || '—'}).`);
      if (autoRegisteredCustomer) notes.push(`Cliente cadastrado automaticamente pelo CNPJ: ${matchedCustomer.name || matchedCustomer.legalName}.`);
      else if (matchedCustomer) notes.push(`Remetente vinculado: ${matchedCustomer.name || matchedCustomer.legalName}.`);
      else if (cd.clienteNome) notes.push(`Cliente "${cd.clienteNome}" não encontrado no cadastro — selecione ou cadastre.`);
      if (matchedDest) notes.push(`Destino vinculado: ${(matchedDest as any).name}.`);
      if (p.senhaOc) notes.push(`Autorização de Coleta preenchida: ${p.senhaOc}.`);
      if (p.padraoCarga && p.padraoCarga !== 'CARGA GERAL') notes.push(`Padrão de carga: ${p.padraoCarga}.`);
      setImportOsNote(notes.join(' '));
    } catch (err) {
      console.error('Erro ao importar OS:', err);
      setImportOsNote('Erro ao ler o PDF da OS.');
    } finally {
      setImportingOs(false);
      if (importOsInputRef.current) importOsInputRef.current.value = '';
    }
  };

  const startWorkflow = async (mode: 'download' | 'print') => {
    if (!formData.os || !formData.driverId || !formData.remetenteId) {
      alert("Preencha OS, Motorista e Cliente para prosseguir.");
      return;
    }
    if (!formData.tipoOperacao) {
      alert("Selecione o Tipo de Operação antes de prosseguir.");
      return;
    }
    if (!formData.category) {
      alert("Por favor, selecione um vínculo operacional para a operação.");
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
      // Toda emissão é registrada no histórico (rastreabilidade por usuário)
      const activeUser = user || currentUser;
      db.saveOrdemColeta(formData, activeUser);

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

      // Anexa a OS importada ao PDF final — baixa/imprime OC + OS juntas
      if (osFile) {
        try { await appendPdfToJsPdf(pdf, osFile); }
        catch (err) { console.error('Não foi possível anexar a OS ao PDF da OC:', err); }
      }

      const fileName = `OC - ${effectiveDriver!.name} - ${formData.os}`;

      if (pendingAction === 'print') {
        // Abre o diálogo de impressão do navegador (sem baixar o arquivo)
        printJsPdf(pdf, `${fileName}.pdf`);
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
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const labelBlueClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
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


      <div className="w-full lg:min-w-[560px] lg:w-[560px] p-8 overflow-y-auto space-y-6 bg-slate-50 border-r border-slate-100 custom-scrollbar">

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 mt-4">
           <div className="flex items-center justify-between">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preenchimento automático</p>
              {osPreviewUrl && !showOsPreview && (
                <button
                  type="button"
                  onClick={() => setShowOsPreview(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all shadow-sm"
                  title="Mostrar a OS importada ao lado da OC"
                >
                  Ver OS
                </button>
              )}
              <input
                ref={importOsInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => handleImportOs(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => importOsInputRef.current?.click()}
                disabled={importingOs}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                title="Importar OS (Aliança/Mercosul) em PDF — preenche o formulário automaticamente"
              >
                {importingOs ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                )}
                Importar OS
              </button>
           </div>
           {importOsNote && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[10px] font-bold text-indigo-700">
                {importOsNote}
              </div>
           )}
           <div className="space-y-1">
              <label className={labelBlueClass}>Identificação da Viagem (OS)</label>
              <input 
                required 
                placeholder="EX: 123ALC1234567A"
                className={`${inputClasses} text-xl`}
                value={formData.os} 
                onChange={e => handleInputChange('os', e.target.value)} 
              />
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                 <label className={labelClass}>Tipo de Operação</label>
                 <CustomSelect
                    required
                    value={formData.tipoOperacao}
                    onChange={v => handleInputChange('tipoOperacao', v)}
                    placeholder="SELECIONE O TIPO..."
                    options={operationTypes.map(op => ({ value: op.name, label: op.name }))}
                    inputClassName={`${selectClasses} ${!formData.tipoOperacao ? 'border-red-300' : ''}`}
                 />
                 {!formData.tipoOperacao && (
                   <p className="text-[8px] font-black text-red-500 uppercase mt-1 ml-1">Obrigatório</p>
                 )}
              </div>
              <div className="space-y-1">
                 <label className={labelClass}>Vínculo Operacional</label>
                 <CustomSelect
                   required
                   value={formData.category}
                   onChange={v => handleInputChange('category', v)}
                   placeholder={userHasChosenCategory ? 'SELECIONE VÍNCULO...' : 'AUTO DETECTANDO...'}
                   options={availableOptions.map(name => ({ value: name, label: name }))}
                   inputClassName={`${selectClasses} ${formData.category ? 'text-blue-600 border-blue-400 ring-2 ring-blue-500/5' : ''}`}
                 />
                 {formData.category && !userHasChosenCategory && (
                    <p className="text-[8px] font-black text-blue-500 uppercase mt-2 ml-1 animate-pulse">✓ Vínculo detectado: {formData.category}</p>
                 )}
              </div>
           </div>
        </div>

        <AutocompleteSearch
          label="1. Remetente (Cliente)"
          placeholder="Razão, Fantasia, CNPJ ou Cidade..."
          data={allCustomers}
          onSelect={(c) => setFormData({...formData, remetenteId: c.id})}
          mapToAutocomplete={searchService.mapCustomer}
          initialValue={selectedRemetente ? (selectedRemetente.legalName || selectedRemetente.name) : ''}
          onQuickAdd={(name) => setQuickAdd({ type: 'customer', name, onDone: (c) => { setExtraCustomers(prev => [c, ...prev]); setFormData((p: any) => ({ ...p, remetenteId: c.id })); } })}
          quickAddLabel="Cadastrar novo cliente"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>}
        />

        <AutocompleteSearch
          label="2. Destinatário (Local Destino)"
          placeholder="Porto, Pré-Stacking ou Cliente..."
          data={destinatarioOptions}
          onSelect={(p) => setFormData({...formData, destinatarioId: p.id})}
          mapToAutocomplete={mapDestinatario}
          initialValue={selectedDestinatario ? (selectedDestinatario.legalName || selectedDestinatario.name) : ''}
          onQuickAdd={(name) => setQuickAdd({ type: 'port', name, onDone: (p) => { setExtraPorts(prev => [p, ...prev]); setFormData((prev: any) => ({ ...prev, destinatarioId: p.id })); } })}
          quickAddLabel="Cadastrar porto ou pré-stacking"
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
              <CustomSelect
                value={formData.tipo}
                onChange={v => handleInputChange('tipo', v)}
                options={containerTypes.map(t => ({ value: t.name, label: t.name }))}
                inputClassName={selectClasses}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1"><label className={labelClass}>Tara</label><input className={inputClasses} value={formData.tara} onChange={e => handleInputChange('tara', e.target.value)} placeholder="KG" /></div>
            <div className="space-y-1"><label className={labelClass}>Lacre</label><input className={inputClasses} value={formData.seal} onChange={e => handleInputChange('seal', e.target.value)} placeholder="LACRE OFICIAL" /></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1"><label className={labelClass}>Genset (Opcional)</label><input className={inputClasses} value={formData.genset} onChange={e => handleInputChange('genset', e.target.value)} placeholder="Nº GENSET" /></div>
            <div className="space-y-1"><label className={labelClass}>Armador / Agência</label><input className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Padrão de Carga</label>
            <CustomSelect
              value={formData.padrao}
              onChange={v => handleInputChange('padrao', v)}
              options={[
                { value: 'CARGA GERAL', label: 'CARGA GERAL' },
                { value: 'CARGO PREMIUM', label: 'CARGO PREMIUM' },
                { value: 'PADRÃO ALIMENTO', label: 'PADRÃO ALIMENTO' },
                { value: 'REEFER', label: 'REEFER' },
                { value: 'PRODUTO QUÍMICO', label: 'PRODUTO QUÍMICO' },
              ]}
              inputClassName={selectClasses}
            />
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
            <div className="space-y-1">
              <label className={labelClass}>Embarcador</label>
              <input className={inputClasses} value={formData.embarcador} onChange={e => handleInputChange('embarcador', e.target.value)} placeholder="EMBARCADOR / SHIPPER" />
              {selectedRemetente && (selectedRemetente.name || selectedRemetente.legalName) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 ml-1">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest shrink-0">Sugerir:</span>
                  {selectedRemetente.name && (
                    <button type="button"
                      onClick={() => setFormData((p: any) => ({ ...p, embarcador: selectedRemetente.name.toUpperCase() }))}
                      className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg hover:bg-blue-100 transition-all uppercase max-w-[160px] truncate"
                      title={`Fantasia: ${selectedRemetente.name}`}
                    >
                      {selectedRemetente.name}
                    </button>
                  )}
                  {selectedRemetente.legalName && selectedRemetente.legalName !== selectedRemetente.name && (
                    <button type="button"
                      onClick={() => setFormData((p: any) => ({ ...p, embarcador: selectedRemetente.legalName!.toUpperCase() }))}
                      className="text-[8px] font-black text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-all uppercase max-w-[160px] truncate"
                      title={`Razão Social: ${selectedRemetente.legalName}`}
                    >
                      {selectedRemetente.legalName}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <AutocompleteSearch
          label="5. Motorista Alocado"
          placeholder="Nome, Placa ou CPF..."
          data={allDrivers}
          onSelect={(d) => setFormData({...formData, driverId: d.id})}
          mapToAutocomplete={searchService.mapDriver}
          initialValue={selectedDriver ? selectedDriver.name : ''}
          onQuickAdd={(name) => setQuickAdd({ type: 'driver', name, onDone: (d) => { setExtraDrivers(prev => [d, ...prev]); setFormData((p: any) => ({ ...p, driverId: d.id })); } })}
          quickAddLabel="Cadastrar novo motorista"
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
              <DateTimePicker
                value={formData.horarioAgendado || ''}
                onChange={v => handleInputChange('horarioAgendado', v)}
                placeholder="Horário agendado..."
                inputClassName={inputClasses}
              />
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

      <div className="flex-1 bg-slate-200 flex overflow-hidden">
        <div className={`${osPreviewUrl && showOsPreview ? 'w-1/2' : 'flex-1'} flex justify-center overflow-auto p-12 custom-scrollbar`}>
          <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
            <OrdemColetaTemplate
              formData={formData}
              selectedDriver={effectiveDriver}
              selectedRemetente={selectedRemetente}
              selectedDestinatario={selectedDestinatario}
            />
          </div>
        </div>
        {osPreviewUrl && showOsPreview && (
          <div className="w-1/2 border-l border-slate-300 bg-slate-100 flex flex-col">
            <div className="px-4 py-2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-between shrink-0">
              <span>OS importada — sai junto no PDF da OC</span>
              <button
                type="button"
                onClick={() => setShowOsPreview(false)}
                className="text-white/70 hover:text-white text-[9px] font-black uppercase"
                title="Ocultar a OS (continua anexada ao PDF)"
              >
                Ocultar
              </button>
            </div>
            <iframe src={osPreviewUrl} title="OS importada" className="flex-1 w-full" />
          </div>
        )}
      </div>

      {quickAdd && (
        <QuickRegisterModal
          type={quickAdd.type}
          isOpen={true}
          initialName={quickAdd.name}
          accent="#2563eb"
          onClose={() => setQuickAdd(null)}
          onCreated={(entity) => { quickAdd.onDone(entity); setQuickAdd(null); }}
        />
      )}
    </div>
  );
};

export default OrdemColetaForm;