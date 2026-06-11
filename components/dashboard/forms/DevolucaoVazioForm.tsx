import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, User, Devolucao } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DevolucaoVazioTemplate from './DevolucaoVazioTemplate';
import ContainerInput from '../../shared/ContainerInput';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import DriverPlateSelector, { primaryHorse, primaryTrailer } from '../../shared/DriverPlateSelector';
import DriverSwapModal, { DriverSwapResult } from '../drivers/DriverSwapModal';
import { db } from '../../../utils/storage';
import { localDateStr } from '../../../utils/dateHelpers';
import CustomSelect from '../../shared/CustomSelect';
import DateTimePicker from '../../shared/DateTimePicker';
import { searchService } from '../../../utils/searchService';

interface DevolucaoVazioFormProps {
  user?: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  preStackings?: PreStacking[];
  onClose: () => void;
  devolucao?: Devolucao;
  onSave?: (updated: Devolucao) => Promise<void>;
  /** @deprecated use devolucao + onSave */
  initialFormData?: any;
  /** @deprecated use devolucao + onSave */
  tripId?: string;
  /** @deprecated use devolucao + onSave */
  onAgendamentoSave?: (id: string, dateTime: string) => void;
}

const commonPODs = ['SANTOS', 'PARANAGUÁ', 'ITAGUAÍ', 'RIO DE JANEIRO', 'NAVEGANTES', 'ITAJAÍ', 'MONTEVIDEO', 'BUENOS AIRES'];

const DevolucaoVazioForm: React.FC<DevolucaoVazioFormProps> = ({ user, drivers, customers, ports, preStackings = [], onClose, devolucao, onSave, initialFormData, tripId, onAgendamentoSave }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const podRef = useRef<HTMLDivElement>(null);
  const [plateHorse, setPlateHorse] = useState('');
  const [plateTrailer, setPlateTrailer] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [podSearch, setPodSearch] = useState('');
  const [showPodResults, setShowPodResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [containerTypes, setContainerTypes] = useState<any[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));
    const loadContainerTypes = async () => {
      const types = await db.getContainerTypes();
      setContainerTypes(types);
    };
    loadContainerTypes();
    const handleClickOutside = (e: MouseEvent) => {
      if (podRef.current && !podRef.current.contains(e.target as Node)) setShowPodResults(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultFormData = {
    date: localDateStr(),
    driverId: '',
    remetenteId: '',
    destinatarioId: '',
    container: '',
    booking: '',
    ship: '',
    agencia: '',
    pod: 'SANTOS',
    qtdContainer: '01',
    tipo: '40HC',
    padrao: 'CARGA GERAL',
    obs: '',
    manualLocal: '',
    agendamentoDateTime: '',
  };

  const initData = devolucao ? {
    date: localDateStr(),
    driverId:            devolucao.driver?.id        || '',
    remetenteId:         devolucao.customer?.id      || '',
    destinatarioId:      '',
    container:           devolucao.container         || '',
    booking:             devolucao.booking           || '',
    ship:                devolucao.ship              || '',
    agencia:             devolucao.agencia           || '',
    pod:                 devolucao.pod               || 'SANTOS',
    qtdContainer:        '01',
    tipo:                devolucao.containerType     || '40HC',
    padrao:              devolucao.padrao            || 'CARGA GERAL',
    obs:                 devolucao.obs               || '',
    manualLocal:         devolucao.local             || '',
    agendamentoDateTime: devolucao.scheduledDateTime || '',
  } : (initialFormData ?? defaultFormData);

  const [formData, setFormData] = useState<typeof defaultFormData>(initData);

  const handleInputChange = (field: string, value: string) => {
    const val = value.toUpperCase();
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'tipo' && val === '40HR') next.padrao = 'REEFER';
      return next;
    });
  };

  const allLocais = [...ports, ...preStackings];
  const selectedDriver       = drivers.find(d => d.id === formData.driverId);
  const selectedRemetente    = customers.find(c => c.id === formData.remetenteId);
  const selectedDestinatario = allLocais.find(l => l.id === formData.destinatarioId) ?? null;

  useEffect(() => {
    if (selectedDriver) {
      setPlateHorse(primaryHorse(selectedDriver));
      setPlateTrailer(primaryTrailer(selectedDriver));
    }
  }, [formData.driverId]);

  const effectiveDriver = selectedDriver ? { ...selectedDriver, plateHorse, plateTrailer } : undefined;

  const buildUpdatedDevolucao = (): Devolucao | null => {
    if (!devolucao) return null;
    return {
      ...devolucao,
      container:         formData.container,
      containerType:     formData.tipo              || undefined,
      booking:           formData.booking           || undefined,
      ship:              formData.ship              || undefined,
      agencia:           formData.agencia           || undefined,
      pod:               formData.pod               || undefined,
      padrao:            formData.padrao            || undefined,
      local:             formData.manualLocal       || undefined,
      localId:           formData.destinatarioId    || undefined,
      obs:               formData.obs               || undefined,
      scheduledDateTime: formData.agendamentoDateTime || undefined,
      status: formData.agendamentoDateTime ? 'Agendado' : devolucao.status,
      customer: selectedRemetente ? {
        id:        selectedRemetente.id,
        name:      selectedRemetente.name,
        legalName: selectedRemetente.legalName,
        cnpj:      selectedRemetente.cnpj,
        city:      selectedRemetente.city,
        state:     selectedRemetente.state,
      } : devolucao.customer,
      driver: effectiveDriver ? {
        id:           effectiveDriver.id,
        name:         effectiveDriver.name,
        plateHorse:   effectiveDriver.plateHorse   || undefined,
        plateTrailer: effectiveDriver.plateTrailer || undefined,
        cpf:          effectiveDriver.cpf          || undefined,
      } : devolucao.driver,
      userName: (user || currentUser)?.displayName || devolucao.userName,
      userId:   (user || currentUser)?.id           || devolucao.userId,
      updatedAt: new Date().toISOString(),
    };
  };

  const saveData = async () => {
    if (!devolucao || !onSave) return;
    setIsSaving(true);
    try {
      const updated = buildUpdatedDevolucao();
      if (updated) await onSave(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadPDF = async () => {
    if (!effectiveDriver || !formData.container) {
      alert("Preencha Container e Motorista para prosseguir.");
      return;
    }
    setIsExporting(true);
    try {
      const activeUser = user || currentUser;
      if (activeUser) {
        await db.addNotification(
          activeUser,
          'MINUTA_GENERATED',
          `Devolução de Vazio: ${formData.container}`,
          `Minuta de devolução para o motorista ${effectiveDriver!.name} gerada com sucesso.`,
          { os: formData.container, motorista: effectiveDriver!.name, placa: effectiveDriver!.plateHorse }
        );
      }
      if (devolucao && onSave) {
        const updated = buildUpdatedDevolucao();
        if (updated) await onSave(updated);
      } else {
        // Fire-and-forget: registro não deve bloquear a geração do PDF
        try {
          const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          db.saveDevolucao({
            id: newId,
            os: '',
            container: formData.container,
            containerType: formData.tipo || undefined,
            booking: formData.booking || undefined,
            ship: formData.ship || undefined,
            agencia: formData.agencia || undefined,
            pod: formData.pod || undefined,
            padrao: formData.padrao || undefined,
            local: formData.manualLocal || selectedDestinatario?.name || undefined,
            localId: formData.destinatarioId || undefined,
            customer: selectedRemetente ? { id: selectedRemetente.id, name: selectedRemetente.name, legalName: selectedRemetente.legalName, cnpj: selectedRemetente.cnpj, city: selectedRemetente.city, state: selectedRemetente.state } : undefined,
            driver: effectiveDriver ? { id: effectiveDriver.id, name: effectiveDriver.name, plateHorse: effectiveDriver.plateHorse, plateTrailer: effectiveDriver.plateTrailer, cpf: (effectiveDriver as any).cpf } : undefined,
            obs: formData.obs || undefined,
            status: 'Pendente',
            createdAt: new Date().toISOString(),
            userName: activeUser?.displayName || undefined,
            userId:   activeUser?.id           || undefined,
          }).catch(e => console.error('[saveDevolucao standalone]', e));
        } catch (e) { console.error('[saveDevolucao standalone]', e); }
      }
      if (tripId && formData.agendamentoDateTime && onAgendamentoSave) {
        onAgendamentoSave(tripId, formData.agendamentoDateTime);
      }
      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`DEVOLUÇÃO DE VAZIO - ${effectiveDriver!.name} - ${formData.container}.pdf`);
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const inputClasses  = "w-full px-5 py-4 rounded-[1.5rem] border-2 border-slate-50 bg-white text-slate-700 font-bold uppercase focus:border-amber-500 outline-none transition-all shadow-sm placeholder:text-slate-300";
  const selectClasses = "w-full px-5 py-4 rounded-[1.5rem] border-2 border-slate-50 bg-white text-slate-700 font-bold uppercase focus:border-amber-500 outline-none transition-all shadow-sm cursor-pointer";
  const labelClass      = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block";
  const labelAmberClass = "text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 block";

  const filteredPODs = commonPODs.filter(p => p.toUpperCase().includes(podSearch.toUpperCase()));

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <DevolucaoVazioTemplate
            formData={formData}
            selectedDriver={effectiveDriver}
            selectedRemetente={selectedRemetente}
            selectedDestinatario={selectedDestinatario ?? null}
          />
        </div>
      </div>

      <div className="w-full lg:min-w-[560px] lg:w-[560px] p-8 overflow-y-auto space-y-6 bg-slate-50 border-r border-slate-100 custom-scrollbar">

        <AutocompleteSearch
          label="1. Local de Devolução (Depot / Terminal)"
          placeholder="Nome do Porto ou Pré-Stacking..."
          data={allLocais}
          onSelect={(p) => setFormData(prev => ({ ...prev, manualLocal: (p.legalName || p.name).toUpperCase(), destinatarioId: p.id }))}
          mapToAutocomplete={searchService.mapPort}
          initialValue={formData.manualLocal}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>}
        />

        <AutocompleteSearch
          label="2. Cliente (Exportador)"
          placeholder="Razão, Fantasia, CNPJ ou Cidade..."
          data={customers}
          onSelect={(c) => setFormData(prev => ({ ...prev, remetenteId: c.id }))}
          mapToAutocomplete={searchService.mapCustomer}
          initialValue={selectedRemetente ? (selectedRemetente.legalName || selectedRemetente.name) : ''}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>}
        />

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
          <p className={labelClass}>3. Dados do Equipamento</p>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className={labelClass}>Container</label>
              <ContainerInput
                value={formData.container}
                onChange={(containerValue, carrierName) => setFormData(prev => ({
                  ...prev,
                  container: containerValue,
                  agencia: carrierName !== '' ? carrierName : prev.agencia,
                }))}
                className={`${inputClasses} text-lg border-amber-100`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelClass}>Tipo</label>
                <CustomSelect
                  value={formData.tipo}
                  onChange={v => handleInputChange('tipo', v)}
                  options={containerTypes.map(t => ({ value: t.name, label: t.name }))}
                  inputClassName={selectClasses}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Padrão</label>
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
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
          <p className={labelClass}>4. Dados da Operação</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className={labelClass}>Booking</label><input className={inputClasses} value={formData.booking} onChange={e => handleInputChange('booking', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Navio</label><input className={inputClasses} value={formData.ship} onChange={e => handleInputChange('ship', e.target.value)} /></div>
          </div>
          <div className="space-y-1 relative" ref={podRef}>
            <label className={labelClass}>Porto de Descarga (POD)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="BUSCAR OU DIGITAR POD..."
                className={`${inputClasses} pr-10`}
                value={podSearch || formData.pod}
                onFocus={() => setShowPodResults(true)}
                onChange={e => { const val = e.target.value.toUpperCase(); setPodSearch(val); handleInputChange('pod', val); }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
              </div>
            </div>
            {showPodResults && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-h-52 overflow-y-auto border-t-4 border-amber-500 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 space-y-0.5">
                  {filteredPODs.map(p => (
                    <button key={p} className={`w-full text-left px-4 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${formData.pod === p ? 'bg-amber-50 text-amber-600' : 'hover:bg-slate-50 text-slate-600'}`} onClick={() => { handleInputChange('pod', p); setPodSearch(p); setShowPodResults(false); }}>
                      {p}
                    </button>
                  ))}
                  {filteredPODs.length === 0 && <div className="p-4 text-center text-[9px] font-bold text-slate-300 uppercase italic">Entrada manual</div>}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1"><label className={labelClass}>Armador / Agência</label><input className={inputClasses} value={formData.agencia} onChange={e => handleInputChange('agencia', e.target.value)} /></div>
        </div>

        <AutocompleteSearch
          label="5. Motorista Transportador"
          placeholder="Nome, Placa ou CPF..."
          data={drivers}
          onSelect={(d) => setFormData(prev => ({ ...prev, driverId: d.id }))}
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
          <button type="button" onClick={() => setSwapModalOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-[10px] font-black uppercase tracking-widest">
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
          onConfirm={(result: DriverSwapResult) => { setPlateHorse(result.plateHorse); setPlateTrailer(result.plateTrailer); }}
        />

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm">
          <div className="space-y-1">
            <label className={labelAmberClass}>6. Observações Operacionais</label>
            <textarea
              placeholder="INSTRUÇÕES PARA O MOTORISTA OU DEPÓSITO..."
              className={`${inputClasses} h-28 resize-none lowercase leading-relaxed`}
              value={formData.obs}
              onChange={e => handleInputChange('obs', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className={labelAmberClass}>7. Data/Hora do Agendamento</label>
            <DateTimePicker
              value={formData.agendamentoDateTime}
              onChange={val => setFormData(prev => ({ ...prev, agendamentoDateTime: val }))}
              placeholder="Selecionar data e hora..."
              inputClassName={inputClasses}
            />
            <p className="text-[8px] text-slate-400 font-bold mt-1">Apenas para controle interno — não aparece no PDF.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {devolucao && onSave && (
            <button disabled={isSaving} onClick={saveData} className="py-6 bg-white border-2 border-slate-200 text-slate-700 rounded-[1.8rem] text-[11px] font-black uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-sm">
              {isSaving ? 'Processando...' : 'Salvar Dados'}
            </button>
          )}
          <button disabled={isExporting} onClick={downloadPDF} className={`py-6 bg-slate-900 text-white rounded-[1.8rem] text-[11px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${devolucao && onSave ? '' : 'col-span-2'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2.5"/></svg>
            {isExporting ? 'Gerando PDF...' : 'Baixar Minuta'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-12 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <DevolucaoVazioTemplate formData={formData} selectedDriver={effectiveDriver} selectedRemetente={selectedRemetente} selectedDestinatario={selectedDestinatario ?? null} />
        </div>
      </div>
    </div>
  );
};

export default DevolucaoVazioForm;
