import React, { useState, useEffect, useRef } from 'react';
import { Trip, Driver, Customer, Category, TripStatus, OperationType } from '../../../types';
import { db } from '../../../utils/storage';
import CustomSelect from '../../shared/CustomSelect';
import DateTimePicker from '../../shared/DateTimePicker';
import QuickRegisterModal, { QuickRegisterType } from '../../shared/QuickRegisterModal';
import { parseAliancaOsPdf, matchCustomer, matchTipoViagem, matchOperationType, normalizeKg, resolveClienteDestino } from '../../../utils/aliancaOsParser';
import { ensureCustomerByCnpj } from '../../../utils/entityAutoRegister';
import { osCategoryService } from '../../../utils/osCategoryService';
import { fileStorage } from '../../../utils/fileStorage';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  drivers: Driver[];
  customers: Customer[];
  categories: Category[];
}

const NewTripModal: React.FC<NewTripModalProps> = ({ isOpen, onClose, onSuccess, drivers, customers, categories }) => {
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);

  const getDefaultType = (types: OperationType[]) => {
    const saved = localStorage.getItem('defaultOperationType');
    if (saved) {
      const found = types.find(t => t.id === saved);
      if (found) return found.name;
    }
    return types[0]?.name || 'EXPORTAÇÃO';
  };

  const getCategoryForType = (typeName: string, types: OperationType[]) => {
    const op = types.find(t => t.name === typeName);
    if (!op?.config?.defaultCategoryId) return '';
    const cat = categories.find(c => c.id === op.config!.defaultCategoryId);
    return cat?.name || '';
  };

  const [form, setForm] = useState<Partial<Trip>>({
    os: '', booking: '', ship: '', dateTime: '', type: 'EXPORTAÇÃO', status: 'Pendente',
    category: '', subCategory: '', container: '', tara: '', seal: '', cva: ''
  });

  // Importação de OS (Aliança/Mercosul, PDF) — preenche os campos automaticamente
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  // Preview da OS importada ao lado do formulário enquanto preenche
  const [osPreviewUrl, setOsPreviewUrl] = useState<string | null>(null);
  const [showOsPreview, setShowOsPreview] = useState(true);
  // PDF original da OS — anexado à trip para visualização posterior (editar OC)
  const [osFile, setOsFile] = useState<File | null>(null);
  useEffect(() => () => { if (osPreviewUrl) URL.revokeObjectURL(osPreviewUrl); }, [osPreviewUrl]);

  // Cadastro na hora (motorista/cliente) sem fechar a programação
  const [quickAdd, setQuickAdd] = useState<{ type: QuickRegisterType; name: string; onDone: (e: any) => void } | null>(null);
  const [extraDrivers, setExtraDrivers] = useState<Driver[]>([]);
  const [extraCustomers, setExtraCustomers] = useState<Customer[]>([]);
  const allDrivers = [...extraDrivers.filter(e => !drivers.some(d => d.id === e.id)), ...drivers];
  const allCustomers = [...extraCustomers.filter(e => !customers.some(c => c.id === e.id)), ...customers];

  useEffect(() => {
    db.getOperationTypes().then(types => {
      if (types && types.length > 0) {
        setOperationTypes(types);
        const defType = getDefaultType(types);
        const defCategory = getCategoryForType(defType, types);
        setForm(prev => ({ ...prev, type: defType, category: prev.category || defCategory }));
      }
    });
  }, []);

  const handleImportOs = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportNote(null);
    try {
      const p = await parseAliancaOsPdf(file);
      if (!p || !p.os) {
        setImportNote('PDF não reconhecido como OS (Aliança/Mercosul).');
        return;
      }
      // Cliente conforme o tipo: coleta/exportação = Local Coleta;
      // entrega/importação = Local Entrega. Sem cadastro, cadastra pelo CNPJ.
      const cd = resolveClienteDestino(p);
      let matched: any = matchCustomer(allCustomers, p);
      let autoRegistered = false;
      if (!matched && cd.clienteCnpj) {
        const ensured = await ensureCustomerByCnpj(allCustomers, cd.clienteCnpj, {
          nome: cd.clienteNome, cnpj: cd.clienteCnpj,
          endereco: cd.clienteEndereco, municipio: cd.clienteMunicipio, uf: cd.clienteUf,
          bairro: cd.clienteBairro, cep: cd.clienteCep,
        });
        if (ensured) {
          matched = ensured.customer;
          autoRegistered = ensured.created;
          if (ensured.created) setExtraCustomers(prev => [ensured.customer as any, ...prev]);
        }
      }
      const detectedCategory = osCategoryService.detectCategoryFromOS(p.os);
      const matchedType = matchOperationType(operationTypes, p.tipoOperacao)?.name;
      let tipoViagemId: string | undefined;
      try {
        const tvs = await db.getColetaTiposViagem();
        tipoViagemId = matchTipoViagem(tvs || [], p.docReferencia)?.id;
      } catch { /* tipos de viagem indisponíveis — segue sem */ }
      setForm(prev => ({
        ...prev,
        os: p.os || prev.os,
        booking: p.booking || prev.booking,
        ship: p.ship || prev.ship,
        dateTime: p.dataColeta || prev.dateTime,
        type: matchedType || p.tipoOperacao || prev.type,
        category: detectedCategory || prev.category,
        container: p.container || prev.container,
        containerType: p.containerTipo || prev.containerType,
        // Tara da OS não entra na tara do container (só nos pesos de Emissões)
        pesoCarga: normalizeKg(p.pesoCarga) || prev.pesoCarga,
        seal: p.lacre || prev.seal,
        autColeta: p.autColeta || prev.autColeta,
        embarcador: p.embarcador || prev.embarcador,
        agencia: p.armador || prev.agencia,
        coletaTipoViagem: tipoViagemId || prev.coletaTipoViagem,
        customer: matched
          ? { id: matched.id, name: matched.name, legalName: matched.legalName, cnpj: matched.cnpj, city: matched.city, state: matched.state }
          : prev.customer,
        osImportData: p,
      } as any));
      // Preview do PDF da OS ao lado do formulário (o useEffect revoga a URL anterior)
      setOsPreviewUrl(URL.createObjectURL(file));
      setOsFile(file);
      setShowOsPreview(true);
      const notes: string[] = [`OS ${p.os} importada — confira os campos.`];
      notes.push(`Cliente preenchido pelo ${cd.clienteOrigem === 'LOCAL ENTREGA' ? 'Local de Entrega' : 'Local de Coleta'} (tipo ${p.tipoOperacao || '—'}).`);
      if (p.shipFromObs) notes.push(`Navio extraído das Demais Observações (campo trazia: ${p.navioViagemCampo || '—'}).`);
      if (autoRegistered) notes.push(`Cliente cadastrado automaticamente pelo CNPJ: ${matched.name || matched.legalName}.`);
      else if (!matched && cd.clienteNome) notes.push(`Cliente "${cd.clienteNome}" não encontrado no cadastro — selecione ou cadastre.`);
      if (p.senhaOc) notes.push(`Autorização de Coleta: ${p.senhaOc}.`);
      setImportNote(notes.join(' '));
    } catch (err) {
      console.error('Erro ao importar OS:', err);
      setImportNote('Erro ao ler o PDF da OS.');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tripId = `trip-${Date.now()}`;
    const now = new Date().toISOString();

    // Anexa o PDF original da OS à trip (visualização posterior ao editar a OC)
    let osPdfUrl = (form as any).osPdfUrl || '';
    if (osFile) {
      try { osPdfUrl = await fileStorage.uploadTripDoc(osFile, form.os || tripId, 'os'); }
      catch (err) { console.error('Falha ao anexar o PDF da OS:', err); }
    }

    await db.saveTrip({
      ...form,
      id: tripId,
      osPdfUrl,
      isLate: false,
      documents: [],
      advancePayment: { status: 'BLOQUEADO' },
      balancePayment: { status: 'AGUARDANDO_DOCS' },
      // REGRA: Status Pendente com horário da criação
      statusHistory: [{ status: 'Pendente' as TripStatus, dateTime: now, createdAt: now }]
    } as any);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";
  const labelBlueClass = "text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300";
  const selectClass = "w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`bg-white w-full rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 h-[92vh] flex flex-col transition-all ${osPreviewUrl && showOsPreview ? 'max-w-[110rem]' : 'max-w-4xl'}`}>
        {/* Header */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Nova Programação</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registro de viagem operacional</p>
          </div>
          <div className="flex items-center gap-3">
            {osPreviewUrl && (
              <button
                type="button"
                onClick={() => setShowOsPreview(v => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${showOsPreview ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'}`}
                title="Mostrar/ocultar a OS importada ao lado do formulário"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                {showOsPreview ? 'Ocultar OS' : 'Ver OS'}
              </button>
            )}
            <input
              ref={importInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => handleImportOs(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
              title="Importar OS (Aliança/Mercosul) em PDF — preenche os campos automaticamente"
            >
              {importing ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              )}
              Importar OS
            </button>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 rounded-full transition-all shadow-sm active:scale-90">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
        {osPreviewUrl && showOsPreview && (
          <div className="w-1/2 border-r border-slate-200 bg-slate-100 flex flex-col shrink-0">
            <div className="px-4 py-2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest shrink-0">
              OS importada (PDF)
            </div>
            <iframe src={osPreviewUrl} title="OS importada" className="flex-1 w-full" />
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {importNote && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[10px] font-bold text-indigo-700">
              {importNote}
            </div>
          )}
          {/* Row 0: Tipo de Programação */}
          <div>
            <label className={labelClass}>Tipo de Programação</label>
            <CustomSelect
              required
              value={form.type || ''}
              onChange={v => {
                const autoCategory = getCategoryForType(v, operationTypes);
                // Só preenche o vínculo pelo tipo quando ainda está vazio — nunca
                // sobrescreve uma categoria já escolhida, senão ela voltava para a
                // categoria padrão do tipo (ex.: Aliança) ao trocar o tipo.
                setForm(prev => ({ ...prev, type: v, category: prev.category || autoCategory || '' }));
              }}
              placeholder="Selecione..."
              options={
                operationTypes.length > 0
                  ? operationTypes.map(t => ({ value: t.name, label: t.name }))
                  : [
                      { value: 'EXPORTAÇÃO', label: 'EXPORTAÇÃO' },
                      { value: 'IMPORTAÇÃO', label: 'IMPORTAÇÃO' },
                      { value: 'COLETA', label: 'COLETA' },
                      { value: 'ENTREGA', label: 'ENTREGA' },
                      { value: 'CABOTAGEM', label: 'CABOTAGEM' },
                    ]
              }
              inputClassName={selectClass}
            />
          </div>

          {/* Row 1: Vínculo / Sub-vínculo */}
          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <label className={labelClass}>
                Vínculo Operacional
                {form.category && getCategoryForType(form.type || '', operationTypes) === form.category && (
                  <span className="ml-2 text-[8px] text-blue-400 normal-case font-bold animate-pulse">✓ automático</span>
                )}
              </label>
              <CustomSelect
                required
                value={form.category || ''}
                onChange={v => setForm({...form, category: v})}
                placeholder="Selecione..."
                options={categories.filter(c => !c.parentId).map(c => ({ value: c.name, label: c.name }))}
                inputClassName={selectClass}
              />
            </div>
            <div className="relative">
              <label className={labelClass}>Sub-vínculo</label>
              <CustomSelect
                value={form.subCategory || ''}
                onChange={v => setForm({...form, subCategory: v})}
                placeholder="Nenhuma"
                options={categories.filter(c => c.parentId && categories.find(p => p.id === c.parentId)?.name === form.category).map(c => ({ value: c.name, label: c.name }))}
                inputClassName={selectClass}
              />
            </div>
          </div>

          {/* Row 2: OS / Date */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Nº OS</label>
              <input required className={inputClass} value={form.os} onChange={e => setForm({...form, os: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Data/Hora Programação</label>
              <DateTimePicker
                required
                value={form.dateTime || ''}
                onChange={v => setForm({...form, dateTime: v})}
                placeholder="Data/Hora Programação..."
                inputClassName="w-full px-4 py-3.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold focus:border-blue-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 3: Customer (Full Width) */}
          <div className="relative">
            <div className="flex items-center justify-between">
              <label className={labelBlueClass}>Cliente</label>
              <button
                type="button"
                onClick={() => setQuickAdd({ type: 'customer', name: '', onDone: (c) => {
                  setExtraCustomers(prev => [c, ...prev]);
                  setForm(f => ({ ...f, customer: { id: c.id, name: c.name, legalName: c.legalName, cnpj: c.cnpj, city: c.city, state: c.state } }));
                } })}
                className="flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 mb-1.5 mr-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                Cadastrar
              </button>
            </div>
            <CustomSelect
              required
              value={form.customer?.id || ''}
              onChange={v => {
                const c = allCustomers.find(cust => cust.id === v);
                if (c) setForm({...form, customer: { id: c.id, name: c.name, legalName: c.legalName, cnpj: c.cnpj, city: c.city, state: c.state }});
              }}
              placeholder="Selecione o cliente..."
              options={allCustomers.map(c => ({ value: c.id, label: c.name }))}
              inputClassName={selectClass}
            />
          </div>

          {/* Row 4: Container / CVA */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Container</label>
              <input required className={inputClass} value={form.container} onChange={e => setForm({...form, container: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>CVA (Certificado)</label>
              <input className={inputClass} value={form.cva} onChange={e => setForm({...form, cva: e.target.value.toUpperCase()})} />
            </div>
          </div>

          {/* Row 5: Tara / Lacre */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Tara</label>
              <input className={inputClass} value={form.tara} onChange={e => setForm({...form, tara: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Lacre</label>
              <input className={inputClass} value={form.seal} onChange={e => setForm({...form, seal: e.target.value.toUpperCase()})} />
            </div>
          </div>

          {/* Row 6: Driver (Full Width) */}
          <div className="relative">
            <div className="flex items-center justify-between">
              <label className={labelBlueClass}>Motorista</label>
              <button
                type="button"
                onClick={() => setQuickAdd({ type: 'driver', name: '', onDone: (d) => {
                  setExtraDrivers(prev => [d, ...prev]);
                  setForm(f => ({ ...f, driver: { id: d.id, name: d.name, plateHorse: d.plateHorse, plateTrailer: d.plateTrailer, status: 'Pronto', cpf: d.cpf, phone: d.phone } }));
                } })}
                className="flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 mb-1.5 mr-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                Cadastrar
              </button>
            </div>
            <CustomSelect
              required
              value={form.driver?.id || ''}
              onChange={v => {
                const d = allDrivers.find(drv => drv.id === v);
                if (d) setForm({...form, driver: { id: d.id, name: d.name, plateHorse: d.plateHorse, plateTrailer: d.plateTrailer, status: 'Pronto', cpf: d.cpf, phone: d.phone }});
              }}
              placeholder="Selecione o motorista..."
              options={allDrivers.map(d => ({ value: d.id, label: `${d.name} (${d.plateHorse})` }))}
              inputClassName={selectClass}
            />
          </div>

          {/* Row 7: Ship / Booking */}
          <div className="grid grid-cols-2 gap-6 pb-6">
            <div>
              <label className={labelClass}>Navio</label>
              <input className={inputClass} value={form.ship} onChange={e => setForm({...form, ship: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className={labelClass}>Booking</label>
              <input className={inputClass} value={form.booking} onChange={e => setForm({...form, booking: e.target.value.toUpperCase()})} />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-[0.98]">
            Salvar Programação
          </button>
        </form>
        </div>
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

export default NewTripModal;