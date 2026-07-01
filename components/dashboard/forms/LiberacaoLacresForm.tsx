import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, User } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import LiberacaoLacresTemplate from './LiberacaoLacresTemplate';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import ContainerInput from '../../shared/ContainerInput';
import DriverPlateSelector, { primaryHorse, primaryTrailer } from '../../shared/DriverPlateSelector';
import { searchService } from '../../../utils/searchService';
import { db } from '../../../utils/storage';
import { localDateStr, formFingerprint } from '../../../utils/dateHelpers';
import { maskCPF, maskRG } from '../../../utils/masks';

interface LiberacaoLacresFormProps {
  user?: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  preStackings?: PreStacking[];
  onClose: () => void;
  initialFormData?: any;
}

const LiberacaoLacresForm: React.FC<LiberacaoLacresFormProps> = ({ user, drivers, customers, ports, preStackings = [], onClose, initialFormData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [plateHorse, setPlateHorse] = useState('');
  const [plateTrailer, setPlateTrailer] = useState('');

  const defaultFormData = {
    date: localDateStr(),
    displayDate: new Date().toLocaleDateString('pt-BR'),
    armador: '',
    transportadora: 'ALS TRANSPORTES',
    quantidade: '01',
    localRetirada: '',
    localId: '',
    obs: 'RETIRADA DE LACRE APROVADO PELO AVANTIDA.',
    booking: '',
    container: '',
    driverId: '',
    cpf: '',
    rg: '',
    veiculo: '',
  };
  const [formData, setFormData] = useState<typeof defaultFormData>(initialFormData ?? defaultFormData);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const allLocais = [...ports, ...preStackings];
  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const selectedLocal = allLocais.find(l => l.id === formData.localId) ?? null;

  useEffect(() => {
    if (selectedDriver) {
      const horse = primaryHorse(selectedDriver);
      setPlateHorse(horse);
      setPlateTrailer(primaryTrailer(selectedDriver));
      setFormData(prev => ({
        ...prev,
        cpf: prev.cpf || selectedDriver.cpf || '',
        rg: prev.rg || selectedDriver.rg || '',
        veiculo: horse || prev.veiculo,
      }));
    }
  }, [formData.driverId]);

  // Mantém o campo "VEÍCULO" alinhado à placa do cavalo escolhida no seletor
  useEffect(() => {
    if (plateHorse) setFormData(prev => ({ ...prev, veiculo: plateHorse }));
  }, [plateHorse]);

  const effectiveDriver = selectedDriver
    ? { ...selectedDriver, plateHorse, plateTrailer, cpf: formData.cpf || selectedDriver.cpf, rg: formData.rg || selectedDriver.rg }
    : undefined;

  const downloadPDF = async () => {
    if (!effectiveDriver) {
      alert('Selecione o Motorista responsável para continuar.');
      return;
    }
    if (!formData.container && !formData.booking) {
      alert('Preencha o Container ou o Booking para continuar.');
      return;
    }
    setIsExporting(true);
    try {
      const activeUser = user || currentUser;
      if (activeUser) {
        await db.addNotification(
          activeUser,
          'LIBERACAO_LACRES_GENERATED',
          `Liberação de Lacres: ${formData.container || formData.booking}`,
          `Memorando de liberação de lacres para ${effectiveDriver.name} gerado com sucesso.`,
          { container: formData.container, booking: formData.booking, motorista: effectiveDriver.name, placa: effectiveDriver.plateHorse },
        );
      }
      // Salva histórico: sempre se for novo; só se editado se vier do histórico
      const dataChanged = !initialFormData || formFingerprint(formData) !== formFingerprint(initialFormData);
      if (dataChanged) {
        db.saveLiberacaoLacres(
          {
            ...formData,
            motorista: effectiveDriver.name,
            veiculo: effectiveDriver.plateHorse || formData.veiculo,
            cpf: effectiveDriver.cpf,
            rg: effectiveDriver.rg,
            localRetirada: selectedLocal?.legalName || selectedLocal?.name || formData.localRetirada,
          },
          activeUser,
        );
      }

      await new Promise(r => setTimeout(r, 800));
      const element = captureRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save(`LIBERAÇÃO DE LACRES - ${effectiveDriver.name} - ${formData.container || formData.booking}.pdf`);
    } catch (e) {
      console.error('Erro ao gerar PDF de Liberação de Lacres:', e);
    } finally {
      setIsExporting(false);
    }
  };

  const inputClasses =
    'w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 text-[11px] font-bold uppercase focus:border-rose-500 focus:bg-white outline-none transition-all placeholder:text-slate-300';
  const labelClass = 'text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={captureRef}>
          <LiberacaoLacresTemplate formData={formData} selectedDriver={effectiveDriver} selectedLocal={selectedLocal} />
        </div>
      </div>

      {/* PAINEL ESQUERDO */}
      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50 border-r border-slate-100 custom-scrollbar">

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>1. Dados da Liberação</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Armador</label>
              <input
                className={inputClasses}
                value={formData.armador}
                onChange={e => handleInputChange('armador', e.target.value)}
                placeholder="HAPAG LLOYD, MAERSK..."
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Transportadora</label>
              <input
                className={inputClasses}
                value={formData.transportadora}
                onChange={e => handleInputChange('transportadora', e.target.value)}
                placeholder="ALS TRANSPORTES"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Quantidade de Lacres</label>
            <input
              className={inputClasses}
              value={formData.quantidade}
              onChange={e => handleInputChange('quantidade', e.target.value)}
              placeholder="01"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>2. Local de Retirada (Manual)</label>
          <input
            type="text"
            placeholder="TRANSTEC WORLD, DEPÓSITO..."
            className={inputClasses}
            value={formData.localRetirada}
            onChange={e => setFormData(prev => ({ ...prev, localRetirada: e.target.value.toUpperCase(), localId: '' }))}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Ou buscar Terminal / Depósito cadastrado</label>
          <AutocompleteSearch
            label=""
            placeholder="Nome do terminal, porto ou depósito..."
            data={allLocais}
            onSelect={(p: any) => setFormData(prev => ({ ...prev, localId: p.id, localRetirada: (p.legalName || p.name).toUpperCase() }))}
            mapToAutocomplete={searchService.mapPort}
            initialValue={selectedLocal ? (selectedLocal.legalName || selectedLocal.name) : ''}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>3. Dados da Operação</p>
          <div className="space-y-1">
            <label className={labelClass}>Booking</label>
            <input
              className={inputClasses}
              value={formData.booking}
              onChange={e => handleInputChange('booking', e.target.value)}
              placeholder="NÚMERO DO BOOKING"
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Container</label>
            <ContainerInput
              value={formData.container}
              onChange={(containerValue, carrierName) => setFormData(prev => ({
                ...prev,
                container: containerValue,
                armador: carrierName !== '' ? carrierName : prev.armador,
              }))}
              className={`${inputClasses} font-mono tracking-widest`}
            />
          </div>
        </div>

        <AutocompleteSearch
          label="4. Motorista Responsável"
          placeholder="Nome, placa ou CPF..."
          data={drivers}
          onSelect={(d: any) => setFormData(prev => ({ ...prev, driverId: d.id }))}
          mapToAutocomplete={searchService.mapDriver}
          initialValue={selectedDriver ? selectedDriver.name : ''}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        {selectedDriver && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
            <p className={labelClass}>Dados do Responsável</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelClass}>CPF</label>
                <input
                  className={inputClasses}
                  value={formData.cpf}
                  onChange={e => setFormData(prev => ({ ...prev, cpf: maskCPF(e.target.value) }))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>RG</label>
                <input
                  className={inputClasses}
                  value={formData.rg}
                  onChange={e => setFormData(prev => ({ ...prev, rg: maskRG(e.target.value) }))}
                  placeholder="00.000.000-0"
                />
              </div>
            </div>
            <DriverPlateSelector
              driver={selectedDriver}
              plateHorse={plateHorse}
              plateTrailer={plateTrailer}
              onChangePlateHorse={setPlateHorse}
              onChangePlateTrailer={setPlateTrailer}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className={labelClass}>5. Observações</label>
          <textarea
            placeholder="RETIRADA DE LACRE APROVADO PELO AVANTIDA..."
            className={`${inputClasses} h-24 resize-none py-4 leading-relaxed`}
            value={formData.obs}
            onChange={e => handleInputChange('obs', e.target.value)}
          />
        </div>

        <button
          disabled={isExporting}
          onClick={downloadPDF}
          className="w-full py-6 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 shadow-xl transition-all active:scale-95 disabled:opacity-60"
        >
          {isExporting ? 'GERANDO PDF...' : 'BAIXAR MEMORANDO DE LACRES'}
        </button>
      </div>

      {/* PAINEL DIREITO — PREVIEW */}
      <div className="flex-1 bg-slate-200 flex justify-center overflow-auto p-10 custom-scrollbar">
        <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
          <LiberacaoLacresTemplate formData={formData} selectedDriver={effectiveDriver} selectedLocal={selectedLocal} />
        </div>
      </div>
    </div>
  );
};

export default LiberacaoLacresForm;
