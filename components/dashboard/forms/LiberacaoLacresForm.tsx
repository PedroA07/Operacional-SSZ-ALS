import React, { useState, useRef, useEffect } from 'react';
import { Driver, Customer, Port, PreStacking, User, AuthorizedPerson } from '../../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import LiberacaoLacresTemplate from './LiberacaoLacresTemplate';
import AutocompleteSearch from '../../shared/AutocompleteSearch';
import QuickRegisterModal, { QuickRegisterType } from '../../shared/QuickRegisterModal';
import ContainerInput from '../../shared/ContainerInput';
import { AutocompleteItem, searchService } from '../../../utils/searchService';
import { db } from '../../../utils/storage';
import { localDateStr, formFingerprint } from '../../../utils/dateHelpers';
import { maskCPF, maskRG, maskPlate } from '../../../utils/masks';

interface LiberacaoLacresFormProps {
  user?: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  preStackings?: PreStacking[];
  onClose: () => void;
  initialFormData?: any;
}

// Mapeia uma pessoa autorizada para o formato do autocomplete
const mapAuthorizedPerson = (p: AuthorizedPerson): AutocompleteItem => ({
  id: p.id,
  type: 'STAFF',
  mainText: p.name,
  subText: p.veiculo ? `VEÍCULO: ${p.veiculo}` : undefined,
  document: p.cpf,
  location: p.rg ? `RG: ${p.rg}` : undefined,
  originalData: p,
});

const LiberacaoLacresForm: React.FC<LiberacaoLacresFormProps> = ({ user, customers, ports, preStackings = [], onClose, initialFormData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>([]);

  // Cadastro na hora sem fechar o formulário
  const [quickAdd, setQuickAdd] = useState<{ type: QuickRegisterType; name: string; onDone: (e: any) => void } | null>(null);
  const [extraPorts, setExtraPorts] = useState<Port[]>([]);

  const defaultFormData = {
    date: localDateStr(),
    displayDate: new Date().toLocaleDateString('pt-BR'),
    armador: '',
    transportadora: 'ALS TRANSPORTES',
    quantidade: '01',
    localRetirada: '',
    localId: '',
    obs: '',
    porUnidade: false,
    booking: '',
    container: '',
    authorizedId: '',
    motorista: '',
    cpf: '',
    rg: '',
    veiculo: '',
  };
  const OBS_SUGGESTIONS = [
    'RETIRADA DE LACRE APROVADA PELO AVANTIDA.',
    'RETIRADA DE LACRE APROVADA POR E-MAIL.',
  ];
  const [formData, setFormData] = useState<typeof defaultFormData>(initialFormData ?? defaultFormData);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) setCurrentUser(JSON.parse(saved));
    db.getAuthorizedPersons().then(setAuthorizedPersons).catch(() => {});
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const allLocais = [...extraPorts.filter(e => !ports.some(p => p.id === e.id)), ...ports, ...preStackings];
  const selectedLocal = allLocais.find(l => l.id === formData.localId) ?? null;
  const selectedPerson = authorizedPersons.find(p => p.id === formData.authorizedId) ?? null;

  const handleSelectPerson = (p: AuthorizedPerson) => {
    setFormData(prev => ({
      ...prev,
      authorizedId: p.id,
      motorista: (p.name || '').toUpperCase(),
      cpf: p.cpf || prev.cpf,
      rg: p.rg || prev.rg,
      veiculo: (p.veiculo || prev.veiculo || '').toUpperCase(),
    }));
  };

  const downloadPDF = async () => {
    if (!formData.motorista?.trim()) {
      alert('Informe o responsável (Pessoa Autorizada) para continuar.');
      return;
    }
    if (formData.porUnidade && !formData.container && !formData.booking) {
      alert('Preencha o Container ou o Booking, ou desmarque "Vincular Booking / Container".');
      return;
    }
    setIsExporting(true);
    try {
      const activeUser = user || currentUser;
      const localNome = selectedLocal?.legalName || selectedLocal?.name || formData.localRetirada;
      // Quando não vinculado a uma unidade, não carrega booking/container
      const booking = formData.porUnidade ? formData.booking : '';
      const container = formData.porUnidade ? formData.container : '';
      const referencia = container || booking || localNome || formData.motorista;
      if (activeUser) {
        await db.addNotification(
          activeUser,
          'LIBERACAO_LACRES_GENERATED',
          `Liberação de Lacres: ${referencia}`,
          `Memorando de liberação de lacres para ${formData.motorista} gerado com sucesso.`,
          { container, booking, motorista: formData.motorista, veiculo: formData.veiculo },
        );
      }
      // Salva histórico: sempre se for novo; só se editado se vier do histórico
      const dataChanged = !initialFormData || formFingerprint(formData) !== formFingerprint(initialFormData);
      if (dataChanged) {
        db.saveLiberacaoLacres(
          {
            ...formData,
            booking,
            container,
            localRetirada: localNome,
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
      pdf.save(`LIBERAÇÃO DE LACRES - ${formData.motorista} - ${referencia}.pdf`);
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
          <LiberacaoLacresTemplate formData={formData} selectedDriver={undefined} selectedLocal={selectedLocal} />
        </div>
      </div>

      {/* PAINEL ESQUERDO */}
      <div className="w-full lg:w-[480px] p-8 overflow-y-auto space-y-6 bg-slate-50 border-r border-slate-100 custom-scrollbar">

        {/* Seletor de unidade — controla exibição de Booking/Container */}
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, porUnidade: !prev.porUnidade }))}
          className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
            formData.porUnidade ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${formData.porUnidade ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-tight">Vincular Booking / Container</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{formData.porUnidade ? 'Campos de unidade ativos' : 'Ative para informar a unidade'}</p>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-all shrink-0 ${formData.porUnidade ? 'bg-rose-600 justify-end' : 'bg-slate-300 justify-start'}`}>
            <div className="w-5 h-5 rounded-full bg-white shadow" />
          </div>
        </button>

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
          <label className={labelClass}>2. Local de Retirada (Terminal / Depósito)</label>
          <AutocompleteSearch
            label=""
            placeholder="Nome do terminal, porto ou depósito..."
            data={allLocais}
            onSelect={(p: any) => setFormData(prev => ({ ...prev, localId: p.id, localRetirada: (p.legalName || p.name).toUpperCase() }))}
            mapToAutocomplete={searchService.mapPort}
            initialValue={selectedLocal ? (selectedLocal.legalName || selectedLocal.name) : (formData.localRetirada || '')}
            onQuickAdd={(name) => setQuickAdd({ type: 'port', name, onDone: (p) => { setExtraPorts(prev => [p, ...prev]); setFormData(prev => ({ ...prev, localId: p.id, localRetirada: (p.legalName || p.name).toUpperCase() })); } })}
            quickAddLabel="Cadastrar novo porto / terminal"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>

        {formData.porUnidade && (
          <div className="bg-white p-6 rounded-3xl border-2 border-rose-100 space-y-4 shadow-sm">
            <p className={labelClass}>3. Dados da Unidade</p>
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
        )}

        <div className="space-y-2">
          <AutocompleteSearch
            label="4. Pessoa Autorizada (Responsável)"
            placeholder="Buscar pessoa autorizada por nome, CPF ou placa..."
            data={authorizedPersons}
            onSelect={(p: any) => handleSelectPerson(p)}
            mapToAutocomplete={mapAuthorizedPerson}
            initialValue={selectedPerson ? selectedPerson.name : (formData.motorista || '')}
            onQuickAdd={(name) => setQuickAdd({ type: 'authorizedPerson', name, onDone: (p) => { setAuthorizedPersons(prev => [p, ...prev]); handleSelectPerson(p); } })}
            quickAddLabel="Cadastrar nova pessoa autorizada"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">
            Cadastre pessoas em Motoristas → Pessoas Autorizadas. Você também pode preencher manualmente abaixo.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
          <p className={labelClass}>Dados do Responsável</p>
          <div className="space-y-1">
            <label className={labelClass}>Nome</label>
            <input
              className={inputClasses}
              value={formData.motorista}
              onChange={e => setFormData(prev => ({ ...prev, motorista: e.target.value.toUpperCase(), authorizedId: '' }))}
              placeholder="NOME DO RESPONSÁVEL"
            />
          </div>
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
          <div className="space-y-1">
            <label className={labelClass}>Veículo (Placa)</label>
            <input
              className={`${inputClasses} font-mono tracking-widest`}
              value={formData.veiculo}
              onChange={e => setFormData(prev => ({ ...prev, veiculo: maskPlate(e.target.value) }))}
              placeholder="ABC1D23"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>5. Observações (opcional)</label>
          <textarea
            placeholder="EX.: RETIRADA DE LACRE APROVADA PELO AVANTIDA..."
            className={`${inputClasses} h-24 resize-none py-4 leading-relaxed`}
            value={formData.obs}
            onChange={e => handleInputChange('obs', e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest self-center">Sugestões:</span>
            {OBS_SUGGESTIONS.map(sug => (
              <button
                key={sug}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, obs: sug }))}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wide border transition-all active:scale-95 ${
                  formData.obs === sug
                    ? 'bg-rose-600 border-rose-600 text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600'
                }`}
              >
                {sug}
              </button>
            ))}
          </div>
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
          <LiberacaoLacresTemplate formData={formData} selectedDriver={undefined} selectedLocal={selectedLocal} />
        </div>
      </div>

      {quickAdd && (
        <QuickRegisterModal
          type={quickAdd.type}
          isOpen={true}
          initialName={quickAdd.name}
          accent="#e11d48"
          onClose={() => setQuickAdd(null)}
          onCreated={(entity) => { quickAdd.onDone(entity); setQuickAdd(null); }}
        />
      )}
    </div>
  );
};

export default LiberacaoLacresForm;
