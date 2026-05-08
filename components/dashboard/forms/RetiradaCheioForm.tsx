import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import RetiradaCheioTemplate from './RetiradaCheioTemplate';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import ContainerInput from '../../shared/ContainerInput';
import DriverPlateSelector, { primaryHorse, primaryTrailer } from '../../shared/DriverPlateSelector';
import DriverSwapModal, { DriverSwapResult } from '../drivers/DriverSwapModal';
import { searchService } from '../../../utils/searchService';
import { db } from '../../../utils/storage';
import { localDateStr } from '../../../utils/dateHelpers';

interface RetiradaCheioFormProps {
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  onClose: () => void;
  initialFormData?: any;
}

const commonPODs = [
  'SANTOS',
  'GUARUJÁ',
  'PARANAGUÁ',
  'ITAGUAÍ',
  'RIO DE JANEIRO',
  'NAVEGANTES',
  'ITAJAÍ',
  'SÃO FRANCISCO DO SUL',
];

const RetiradaCheioForm: React.FC<RetiradaCheioFormProps> = ({ drivers, customers, ports, onClose, initialFormData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [plateHorse, setPlateHorse] = useState('');
  const [plateTrailer, setPlateTrailer] = useState('');
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const [podSearch, setPodSearch] = useState('');
  const [showPodResults, setShowPodResults] = useState(false);
  const podRef = useRef<HTMLDivElement>(null);

  const [containerTypes, setContainerTypes] = useState<any[]>([]);

  const defaultFormData = {
    date: localDateStr(),
    displayDate: new Date().toLocaleDateString('pt-BR'),
    driverId: '',
    clienteId: '',
    terminalId: '',
    container: '',
    tipo: '40HC',
    ship: '',
    agencia: '',
    pod: 'SANTOS',
    booking: '',
    obs: '',
    manualTerminal: '',
  };
  const [formData, setFormData] = useState<typeof defaultFormData>(initialFormData ?? defaultFormData);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));

    db.getContainerTypes().then(types => setContainerTypes(types));

    const handleClickOutside = (e: MouseEvent) => {
      if (podRef.current && !podRef.current.contains(e.target as Node)) {
        setShowPodResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedCliente = customers.find(c => c.id === formData.clienteId);
  const selectedTerminal = ports.find(p => p.id === formData.terminalId);

  useEffect(() => {
    if (selectedDriver) {
      setPlateHorse(primaryHorse(selectedDriver));
      setPlateTrailer(primaryTrailer(selectedDriver));
    }
  }, [formData.driverId]);

  const effectiveDriver = selectedDriver ? { ...selectedDriver, plateHorse, plateTrailer } : undefined;

  const downloadPDF = async () => {
    if (!effectiveDriver || !formData.container) {
      alert('Preencha o Container e selecione o Motorista para continuar.');
      return;
    }
    setIsExporting(true);
    try {
      if (currentUser) {
        await db.addNotification(
          currentUser,
          'RETIRADA_CHEIO_GENERATED',
          `Minuta Emitida: ${formData.container}`,
          `Minuta de retirada de cheio para ${effectiveDriver.name} gerada com sucesso.`,
          { container: formData.container, motorista: effectiveDriver.name, placa: effectiveDriver.plateHorse },
        );
        db.saveFormHistory('RETIRADA_CHEIO', formData, formData.container, currentUser);
      }

      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`RETIRADA CHEIO - ${effectiveDriver!.name} - ${formData.container}.pdf`);
    } catch (e) {
      console.error('Erro ao gerar PDF de Retirada de Cheio:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const inputClasses =
    'w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold uppercase focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-300';
  const labelClass = 'text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';
  const labelIndigoClass = 'text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-1.5 block';

  const filteredPODs = commonPODs.filter(p => p.toUpperCase().includes(podSearch.toUpperCase()));

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <RetiradaCheioTemplate
            formData={formData}
            selectedDriver={effectiveDriver}
            selectedCliente={selectedCliente}
            selectedTerminal={selectedTerminal}
          />
        </div>
      </div>

      {/* PAINEL ESQUERDO */}
      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50/50 border-r border-slate-100 custom-scrollbar">

        <div className="space-y-1">
          <label className={labelIndigoClass}>1. Terminal de Retirada (Manual)</label>
          <input
            type="text"
            placeholder="NOME DO TERMINAL OU DEPÓSITO..."
            className={inputClasses}
            value={formData.manualTerminal}
            onChange={e => handleInputChange('manualTerminal', e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Ou buscar Terminal cadastrado</label>
          <AutocompleteSearch
            label=""
            placeholder="Nome do terminal ou porto..."
            data={ports}
            onSelect={(p: any) => setFormData({ ...formData, terminalId: p.id })}
            mapToAutocomplete={searchService.mapPort}
            initialValue={selectedTerminal ? (selectedTerminal.legalName || selectedTerminal.name) : ''}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>

        <AutocompleteSearch
          label="2. Cliente / Importador"
          placeholder="Razão social, fantasia ou CNPJ..."
          data={customers}
          onSelect={(c: any) => setFormData({ ...formData, clienteId: c.id })}
          mapToAutocomplete={searchService.mapCustomer}
          initialValue={selectedCliente ? (selectedCliente.legalName || selectedCliente.name) : ''}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelIndigoClass}>3. Dados do Equipamento</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Container</label>
              <ContainerInput
                value={formData.container}
                onChange={(containerValue, carrierName) => setFormData(prev => ({
                  ...prev,
                  container: containerValue,
                  agencia: carrierName !== '' ? carrierName : prev.agencia,
                }))}
                className={`${inputClasses} font-mono tracking-widest`}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Tipo</label>
              <select
                className={inputClasses}
                value={formData.tipo}
                onChange={e => handleInputChange('tipo', e.target.value)}
              >
                {containerTypes.length > 0
                  ? containerTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                  : ['40HC', '20DC', '40DC', '40HR', '20OT', '40OT'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Armador (auto-detectado pelo container)</label>
            <input
              className={`${inputClasses} bg-indigo-50/40 border-indigo-100`}
              value={formData.agencia}
              onChange={e => handleInputChange('agencia', e.target.value)}
              placeholder="MAERSK, MSC, CMA CGM..."
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelIndigoClass}>4. Dados da Operação</p>

          <div className="space-y-1">
            <label className={labelClass}>Navio</label>
            <input
              className={inputClasses}
              value={formData.ship}
              onChange={e => handleInputChange('ship', e.target.value)}
              placeholder="NOME DO NAVIO"
            />
          </div>

          <div className="relative" ref={podRef}>
            <label className={labelClass}>POD (Porto de Destino)</label>
            <input
              className={inputClasses}
              value={formData.pod}
              onChange={e => {
                handleInputChange('pod', e.target.value);
                setPodSearch(e.target.value);
                setShowPodResults(true);
              }}
              onFocus={() => setShowPodResults(true)}
              placeholder="SANTOS"
            />
            {showPodResults && filteredPODs.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {filteredPODs.map(pod => (
                  <button
                    key={pod}
                    type="button"
                    className="w-full text-left px-4 py-3 text-xs font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 uppercase tracking-wider transition-colors"
                    onClick={() => {
                      handleInputChange('pod', pod);
                      setPodSearch('');
                      setShowPodResults(false);
                    }}
                  >
                    {pod}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className={labelClass}>BL / Booking</label>
            <input
              className={inputClasses}
              value={formData.booking}
              onChange={e => handleInputChange('booking', e.target.value)}
              placeholder="NÚMERO DO BL OU BOOKING"
            />
          </div>
        </div>

        <AutocompleteSearch
          label="5. Motorista"
          placeholder="Nome ou placa do cavalo..."
          data={drivers}
          onSelect={(d: any) => setFormData({ ...formData, driverId: d.id })}
          mapToAutocomplete={searchService.mapDriver}
          initialValue={selectedDriver ? selectedDriver.name : ''}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
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

        <div className="space-y-1">
          <label className={labelClass}>Observações</label>
          <textarea
            placeholder="INSTRUÇÕES PARA O MOTORISTA OU TERMINAL..."
            className={`${inputClasses} h-28 resize-none py-4 lowercase leading-relaxed`}
            value={formData.obs}
            onChange={e => handleInputChange('obs', e.target.value)}
          />
        </div>

        <button
          disabled={isExporting}
          onClick={downloadPDF}
          className="w-full py-6 bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-800 shadow-xl transition-all active:scale-95 disabled:opacity-60"
        >
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR MINUTA DE RETIRADA CHEIO'}
        </button>
      </div>

      {/* PAINEL DIREITO — PREVIEW */}
      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <RetiradaCheioTemplate
            formData={formData}
            selectedDriver={effectiveDriver}
            selectedCliente={selectedCliente}
            selectedTerminal={selectedTerminal}
          />
        </div>
      </div>
    </div>
  );
};

export default RetiradaCheioForm;
