
import React, { useState, useRef, useEffect } from 'react';
import { Driver, PlateEntry, OperationDefinition, Customer } from '../../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../../utils/masks';
import { fileStorage } from '../../../utils/fileStorage';
import { driverAuthService } from '../../../utils/driverAuthService';
import { Icons } from '../../../constants/icons';
import CustomSelect from '../../shared/CustomSelect';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (driver: Partial<Driver>, id?: string) => Promise<void>;
  editingDriver?: Driver | null;
  availableOps: OperationDefinition[];
}

// ─── Gerenciador de placas ────────────────────────────────────────────────────
interface PlateManagerProps {
  label: string;
  entries: PlateEntry[];
  onChange: (entries: PlateEntry[]) => void;
}

const PlateManager: React.FC<PlateManagerProps> = ({ label, entries, onChange }) => {
  const [newPlate, setNewPlate] = useState('');
  const [newYear, setNewYear] = useState('');

  const addPlate = () => {
    const plate = newPlate.trim().toUpperCase();
    if (!plate) return;
    if (entries.some(e => e.plate === plate)) return;
    const isFirst = entries.length === 0;
    const next: PlateEntry[] = [
      ...entries,
      { id: `pl-${Date.now()}`, plate, year: newYear.trim(), isPrimary: isFirst }
    ];
    onChange(next);
    setNewPlate('');
    setNewYear('');
  };

  const removePlate = (id: string) => {
    const filtered = entries.filter(e => e.id !== id);
    // se removeu a principal, promove a primeira restante
    if (filtered.length > 0 && !filtered.some(e => e.isPrimary)) {
      filtered[0] = { ...filtered[0], isPrimary: true };
    }
    onChange(filtered);
  };

  const setPrimary = (id: string) => {
    onChange(entries.map(e => ({ ...e, isPrimary: e.id === id })));
  };

  const inputCls = "px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all text-[11px]";

  return (
    <div className="space-y-3">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>

      {/* Lista de placas cadastradas */}
      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-[10px] text-slate-300 italic px-1">Nenhuma placa cadastrada</p>
        )}
        {entries.map(entry => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
              entry.isPrimary
                ? 'bg-blue-50 border-blue-200 shadow-sm'
                : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex-1 min-w-0">
              <span className="font-mono font-black text-slate-800 text-sm uppercase">{entry.plate}</span>
              {entry.year && (
                <span className="ml-2 text-[10px] font-bold text-slate-400">{entry.year}</span>
              )}
            </div>

            {entry.isPrimary ? (
              <span className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shrink-0">
                Principal
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setPrimary(entry.id)}
                className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-wider hover:bg-blue-100 hover:text-blue-600 transition-all shrink-0"
              >
                Definir Principal
              </button>
            )}

            <button
              type="button"
              onClick={() => removePlate(entry.id)}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeWidth="3" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Linha de adição */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Nova Placa</label>
          <input
            className={`${inputCls} w-full`}
            placeholder="ABC-1234"
            value={newPlate}
            onChange={e => setNewPlate(maskPlate(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPlate())}
          />
        </div>
        <div className="w-24 space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Ano</label>
          <input
            className={`${inputCls} w-full`}
            placeholder="20XX"
            value={newYear}
            onChange={e => setNewYear(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPlate())}
            maxLength={4}
          />
        </div>
        <button
          type="button"
          onClick={addPlate}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow hover:bg-blue-700 active:scale-95 transition-all shrink-0"
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSave, editingDriver, availableOps }) => {
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cnhFileInputRef = useRef<HTMLInputElement>(null);

  const initialForm: Partial<Driver> = {
    photo: '', name: '', cpf: '', rg: '', cnh: '',
    phone: '', email: '',
    plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    platesHorse: [], platesTrailer: [],
    driverType: 'Externo', status: 'Ativo',
    beneficiaryName: '', beneficiaryPhone: '', beneficiaryEmail: '',
    beneficiaryCnpj: '', paymentPreference: 'PIX',
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: [], hasAccess: true, cnhPdfUrl: ''
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);
  const [tempCategory, setTempCategory] = useState(availableOps[0]?.category || '');
  const [tempClient, setTempClient] = useState('Geral');

  const hasInitialized = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = null;
      return;
    }

    const currentId = editingDriver?.id || 'new_driver';
    if (hasInitialized.current === currentId) return;

    if (editingDriver) {
      // Garante que os arrays existam (compatibilidade com dados antigos)
      const platesHorse: PlateEntry[] = editingDriver.platesHorse && editingDriver.platesHorse.length > 0
        ? editingDriver.platesHorse
        : editingDriver.plateHorse
          ? [{ id: `ph-${editingDriver.id}`, plate: editingDriver.plateHorse, year: editingDriver.yearHorse || '', isPrimary: true }]
          : [];

      const platesTrailer: PlateEntry[] = editingDriver.platesTrailer && editingDriver.platesTrailer.length > 0
        ? editingDriver.platesTrailer
        : editingDriver.plateTrailer
          ? [{ id: `pt-${editingDriver.id}`, plate: editingDriver.plateTrailer, year: editingDriver.yearTrailer || '', isPrimary: true }]
          : [];

      setForm({ ...editingDriver, operations: editingDriver.operations || [], platesHorse, platesTrailer });
    } else {
      setForm(initialForm);
    }

    setTempCategory(availableOps[0]?.category || '');
    setTempClient('Geral');
    hasInitialized.current = currentId;
  }, [isOpen, editingDriver]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleCnhUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, cnhPdfUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const addOperation = () => {
    if (!tempCategory || !tempClient) return;
    const exists = form.operations?.some(op => op.category === tempCategory && op.client === tempClient);
    if (exists) return;
    setForm(prev => ({
      ...prev,
      operations: [...(prev.operations || []), { category: tempCategory, client: tempClient }]
    }));
  };

  const removeOperation = (idx: number) => {
    setForm(prev => ({
      ...prev,
      operations: prev.operations?.filter((_, i) => i !== idx)
    }));
  };

  const handlePlatesHorseChange = (entries: PlateEntry[]) => {
    const primary = entries.find(e => e.isPrimary) || entries[0];
    setForm(prev => ({
      ...prev,
      platesHorse: entries,
      plateHorse: primary?.plate || '',
      yearHorse: primary?.year || ''
    }));
  };

  const handlePlatesTrailerChange = (entries: PlateEntry[]) => {
    const primary = entries.find(e => e.isPrimary) || entries[0];
    setForm(prev => ({
      ...prev,
      platesTrailer: entries,
      plateTrailer: primary?.plate || '',
      yearTrailer: primary?.year || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const drvId = editingDriver?.id || `drv-${Date.now()}`;
      let finalPhoto = form.photo || '';
      let finalCnh = form.cnhPdfUrl || '';

      if (finalPhoto.startsWith('data:')) {
        finalPhoto = await fileStorage.uploadDriverProfile(finalPhoto, drvId);
      }
      if (finalCnh.startsWith('data:')) {
        finalCnh = await fileStorage.uploadDriverCNH(finalCnh, drvId);
      }

      const updatedForm = {
        ...form,
        photo: finalPhoto,
        cnhPdfUrl: finalCnh,
        registrationDate: form.registrationDate || editingDriver?.registrationDate || new Date().toISOString(),
        statusLastChangeDate: form.statusLastChangeDate || editingDriver?.statusLastChangeDate || new Date().toISOString()
      };
      const { password } = await driverAuthService.syncUserRecord(drvId, updatedForm, form.generatedPassword);

      await onSave({
        ...updatedForm,
        id: drvId,
        generatedPassword: password
      }, editingDriver?.id);

      onClose();
    } catch (err: any) {
      alert(`ERRO: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm disabled:bg-slate-50";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[95vh] animate-in zoom-in-95">
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg uppercase leading-none">
                {editingDriver ? 'Editar Motorista' : 'Novo Registro de Motorista'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Controle de Frota e Vínculos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Icons.Excluir /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1 bg-[#fcfdfe]">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-3 space-y-6">
              {/* Foto */}
              <div className="space-y-1">
                <label className={labelClass}>Foto de Perfil</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[3/4] rounded-[2rem] bg-slate-100 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden group shadow-inner"
                >
                  {form.photo
                    ? <img src={form.photo} className="w-full h-full object-cover" />
                    : <div className="text-center p-4"><p className="text-[8px] font-black text-slate-400 uppercase">Anexar Foto</p></div>}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              {/* CNH PDF */}
              <div className="space-y-1">
                <label className={labelClass}>CNH PDF (Digitalizada)</label>
                <div
                  onClick={() => cnhFileInputRef.current?.click()}
                  className="py-4 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group"
                >
                  <span className="text-[8px] font-black text-slate-400 uppercase group-hover:text-blue-600">
                    {form.cnhPdfUrl ? 'PDF Anexado ✓' : 'Subir Arquivo PDF'}
                  </span>
                </div>
                <input type="file" ref={cnhFileInputRef} className="hidden" accept="application/pdf" onChange={handleCnhUpload} />
              </div>

              {/* Vínculo & Status */}
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                <label className={labelClass}>Vínculo & Status</label>
                <CustomSelect
                  value={form.driverType || ''}
                  onChange={v => setForm({ ...form, driverType: v as any })}
                  options={[
                    { value: 'Externo', label: 'EXTERNO / TERCEIRO' },
                    { value: 'Frota', label: 'FROTA ALS' },
                    { value: 'Motoboy', label: 'MOTOBOY' },
                  ]}
                  inputClassName={inputClasses}
                />
                <CustomSelect
                  value={form.status || ''}
                  onChange={v => setForm({ ...form, status: v as any, statusLastChangeDate: new Date().toISOString() })}
                  options={[
                    { value: 'Ativo', label: 'SISTEMA ATIVO' },
                    { value: 'Inativo', label: 'SISTEMA INATIVO' },
                  ]}
                  inputClassName={inputClasses}
                />
              </div>
            </div>

            <div className="col-span-9 space-y-8">
              {/* I. DADOS DE IDENTIFICAÇÃO */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">I. Dados de Identificação</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Nome Completo</label>
                    <input required className={inputClasses} value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>E-mail de Contato</label>
                    <input className={inputClasses} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value.toLowerCase() })} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1"><label className={labelClass}>CPF</label><input required className={inputClasses} value={form.cpf} onChange={e => setForm({ ...form, cpf: maskCPF(e.target.value) })} /></div>
                  <div className="space-y-1"><label className={labelClass}>RG</label><input className={inputClasses} value={form.rg} onChange={e => setForm({ ...form, rg: maskRG(e.target.value) })} /></div>
                  <div className="space-y-1"><label className={labelClass}>Registro CNH</label><input className={inputClasses} value={form.cnh} onChange={e => setForm({ ...form, cnh: e.target.value.toUpperCase() })} /></div>
                  <div className="space-y-1"><label className={labelClass}>Celular / Whatsapp</label><input required className={inputClasses} value={form.phone} onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })} /></div>
                </div>
              </div>

              {/* II. DETALHES DA FROTA — múltiplas placas */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">II. Detalhes da Frota</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                    <PlateManager
                      label="Placas de Cavalo (Trator)"
                      entries={form.platesHorse || []}
                      onChange={handlePlatesHorseChange}
                    />
                  </div>
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                    <PlateManager
                      label="Placas de Carreta (Reboque)"
                      entries={form.platesTrailer || []}
                      onChange={handlePlatesTrailerChange}
                    />
                  </div>
                </div>
              </div>

              {/* III. FINANCEIRO */}
              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">III. Dados do Favorecido (Pagamentos)</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[8px] opacity-40 uppercase font-black ml-1">Nome do Beneficiário</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold uppercase outline-none focus:bg-white/20" value={form.beneficiaryName} onChange={e => setForm({ ...form, beneficiaryName: e.target.value.toUpperCase() })} /></div>
                  <div className="space-y-1"><label className="text-[8px] opacity-40 uppercase font-black ml-1">Documento Chave (CPF/CNPJ)</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white/20" value={form.beneficiaryCnpj} onChange={e => setForm({ ...form, beneficiaryCnpj: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[8px] opacity-40 uppercase font-black ml-1">Tipo de Operação</label>
                    <CustomSelect
                      value={form.paymentPreference || ''}
                      onChange={v => setForm({ ...form, paymentPreference: v as any })}
                      options={[
                        { value: 'PIX', label: 'PIX' },
                        { value: 'TED', label: 'TED BANCÁRIO' },
                      ]}
                      inputClassName="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-1"><label className="text-[8px] opacity-40 uppercase font-black ml-1">Celular Benef.</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none" value={form.beneficiaryPhone} onChange={e => setForm({ ...form, beneficiaryPhone: maskPhone(e.target.value) })} /></div>
                  <div className="space-y-1"><label className="text-[8px] opacity-40 uppercase font-black ml-1">E-mail Benef.</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none lowercase" value={form.beneficiaryEmail} onChange={e => setForm({ ...form, beneficiaryEmail: e.target.value })} /></div>
                </div>
              </div>

              {/* IV. GRUPOS & VÍNCULOS */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">IV. Grupos & Vínculos Operacionais</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className={labelClass}>Nome Grupo Whatsapp</label><input className={inputClasses} value={form.whatsappGroupName} onChange={e => setForm({ ...form, whatsappGroupName: e.target.value.toUpperCase() })} /></div>
                  <div className="space-y-1"><label className={labelClass}>Link Convite Grupo</label><input className={inputClasses} placeholder="https://chat.whatsapp.com/..." value={form.whatsappGroupLink} onChange={e => setForm({ ...form, whatsappGroupLink: e.target.value })} /></div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2.2rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Habilitar em Categorias Específicas</p>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                      <label className={labelClass}>Categoria</label>
                      <CustomSelect
                        value={tempCategory}
                        onChange={v => setTempCategory(v)}
                        options={availableOps.map(op => ({ value: op.category, label: op.category.toUpperCase() }))}
                        inputClassName="w-48 px-4 py-2.5 rounded-xl border border-slate-200 text-[10px] font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Cliente Vinculado</label>
                      <input className="w-48 px-4 py-2.5 rounded-xl border border-slate-200 text-[10px] font-bold uppercase" value={tempClient} onChange={e => setTempClient(e.target.value)} />
                    </div>
                    <button type="button" onClick={addOperation} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md active:scale-95">Vincular</button>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {form.operations?.map((op, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-100 text-blue-600 rounded-xl text-[9px] font-black group">
                        <span className="uppercase">{op.category} › {op.client}</span>
                        <button type="button" onClick={() => removeOperation(idx)} className="text-slate-300 hover:text-red-500"><Icons.Excluir /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-10 border-t">
            <button type="button" onClick={onClose} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] text-[10px] font-black uppercase">Descartar</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
              {isSaving ? 'Gravando Dados...' : 'Salvar Ficha do Motorista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DriverModal;
