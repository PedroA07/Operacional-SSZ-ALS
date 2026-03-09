
import React, { useState, useRef, useEffect } from 'react';
import { Driver, OperationDefinition, Customer } from '../../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../../utils/masks';
import { fileStorage } from '../../../utils/fileStorage';
import { driverAuthService } from '../../../utils/driverAuthService';
import { Icons } from '../../../constants/icons';

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (driver: Partial<Driver>, id?: string) => Promise<void>;
  editingDriver?: Driver | null;
  availableOps: OperationDefinition[];
}

const DriverModal: React.FC<DriverModalProps> = ({ isOpen, onClose, onSave, editingDriver, availableOps }) => {
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cnhFileInputRef = useRef<HTMLInputElement>(null);

  const initialForm: Partial<Driver> = {
    photo: '', name: '', cpf: '', rg: '', cnh: '',
    phone: '', email: '', 
    plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    driverType: 'Externo', status: 'Ativo',
    beneficiaryName: '', beneficiaryPhone: '', beneficiaryEmail: '',
    beneficiaryCnpj: '', paymentPreference: 'PIX',
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: [], hasAccess: true, cnhPdfUrl: ''
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);
  const [tempCategory, setTempCategory] = useState(availableOps[0]?.category || '');
  const [tempClient, setTempClient] = useState('Geral');

  // REF CRÍTICA: Bloqueia resets vindos de sincronizações externas (props update)
  const hasInitialized = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = null;
      return;
    }

    const currentId = editingDriver?.id || 'new_driver';
    if (hasInitialized.current === currentId) return;

    setForm(editingDriver ? { ...editingDriver, operations: editingDriver.operations || [] } : initialForm);
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

      const updatedForm = { ...form, photo: finalPhoto, cnhPdfUrl: finalCnh };
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
                <h3 className="font-black text-slate-800 text-lg uppercase leading-none">{editingDriver ? 'Editar Motorista' : 'Novo Registro de Motorista'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Controle de Frota e Vínculos</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Icons.Excluir /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1 bg-[#fcfdfe]">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-3 space-y-6">
              <div className="space-y-1">
                <label className={labelClass}>Foto de Perfil</label>
                <div onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] rounded-[2rem] bg-slate-100 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden group shadow-inner">
                  {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <div className="text-center p-4"><p className="text-[8px] font-black text-slate-400 uppercase">Anexar Foto</p></div>}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>CNH PDF (Digitalizada)</label>
                <div onClick={() => cnhFileInputRef.current?.click()} className="py-4 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all group">
                   <span className="text-[8px] font-black text-slate-400 uppercase group-hover:text-blue-600">{form.cnhPdfUrl ? 'PDF Anexado ✓' : 'Subir Arquivo PDF'}</span>
                </div>
                <input type="file" ref={cnhFileInputRef} className="hidden" accept="application/pdf" onChange={handleCnhUpload} />
              </div>

              <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4">
                <label className={labelClass}>Vínculo & Status</label>
                <select className={inputClasses} value={form.driverType} onChange={e => setForm({...form, driverType: e.target.value as any})}>
                  <option value="Externo">EXTERNO / TERCEIRO</option>
                  <option value="Frota">FROTA ALS</option>
                  <option value="Motoboy">MOTOBOY</option>
                </select>
                <select className={inputClasses} value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                  <option value="Ativo">SISTEMA ATIVO</option>
                  <option value="Inativo">SISTEMA INATIVO</option>
                </select>
              </div>
            </div>

            <div className="col-span-9 space-y-8">
              {/* DADOS PESSOAIS */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">I. Dados de Identificação</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Nome Completo</label>
                    <input required className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>E-mail de Contato</label>
                    <input className={inputClasses} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value.toLowerCase()})} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-1"><label className={labelClass}>CPF</label><input required className={inputClasses} value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} /></div>
                  <div className="space-y-1"><label className={labelClass}>RG</label><input className={inputClasses} value={form.rg} onChange={e => setForm({...form, rg: maskRG(e.target.value)})} /></div>
                  <div className="space-y-1"><label className={labelClass}>Registro CNH</label><input className={inputClasses} value={form.cnh} onChange={e => setForm({...form, cnh: e.target.value.toUpperCase()})} /></div>
                  <div className="space-y-1"><label className={labelClass}>Celular / Whatsapp</label><input required className={inputClasses} value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} /></div>
                </div>
              </div>

              {/* EQUIPAMENTO */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">II. Detalhes da Frota</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 space-y-1">
                    <label className={labelClass}>Placa Cavalo</label>
                    <input required className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className={labelClass}>Ano Cavalo</label>
                    <input className={inputClasses} placeholder="20XX" value={form.yearHorse} onChange={e => setForm({...form, yearHorse: e.target.value})} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className={labelClass}>Placa Carreta</label>
                    <input required className={inputClasses} value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: maskPlate(e.target.value)})} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className={labelClass}>Ano Carreta</label>
                    <input className={inputClasses} placeholder="20XX" value={form.yearTrailer} onChange={e => setForm({...form, yearTrailer: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* FINANCEIRO */}
              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">III. Dados do Favorecido (Pagamentos)</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1"><label className="text-[8px] opacity-40 uppercase font-black ml-1">Nome do Beneficiário</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold uppercase outline-none focus:bg-white/20" value={form.beneficiaryName} onChange={e => setForm({...form, beneficiaryName: e.target.value.toUpperCase()})} /></div>
                  <div className="space-y-1"><label className="text-[8px] opacity-40 uppercase font-black ml-1">Documento Chave (CPF/CNPJ)</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white/20" value={form.beneficiaryCnpj} onChange={e => setForm({...form, beneficiaryCnpj: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                   <div className="space-y-1">
                      <label className="text-[8px] opacity-40 uppercase font-black ml-1">Tipo de Operação</label>
                      <select className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none" value={form.paymentPreference} onChange={e => setForm({...form, paymentPreference: e.target.value as any})}>
                        <option value="PIX">PIX</option>
                        <option value="TED">TED BANCÁRIO</option>
                      </select>
                   </div>
                   <div className="space-y-1"><label className="text-[8px] opacity-40 uppercase font-black ml-1">Celular Benef.</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none" value={form.beneficiaryPhone} onChange={e => setForm({...form, beneficiaryPhone: maskPhone(e.target.value)})} /></div>
                   <div className="space-y-1"><label className="text-[8px] opacity-40 uppercase font-black ml-1">E-mail Benef.</label><input className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none lowercase" value={form.beneficiaryEmail} onChange={e => setForm({...form, beneficiaryEmail: e.target.value})} /></div>
                </div>
              </div>

              {/* VÍNCULOS OPERACIONAIS */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">IV. Grupos & Vínculos Operacionais</h4>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className={labelClass}>Nome Grupo Whatsapp</label><input className={inputClasses} value={form.whatsappGroupName} onChange={e => setForm({...form, whatsappGroupName: e.target.value.toUpperCase()})} /></div>
                   <div className="space-y-1"><label className={labelClass}>Link Convite Grupo</label><input className={inputClasses} placeholder="https://chat.whatsapp.com/..." value={form.whatsappGroupLink} onChange={e => setForm({...form, whatsappGroupLink: e.target.value})} /></div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2.2rem] border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Habilitar em Categorias Específicas</p>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1">
                      <label className={labelClass}>Categoria</label>
                      <select className="w-48 px-4 py-2.5 rounded-xl border border-slate-200 text-[10px] font-bold" value={tempCategory} onChange={e => setTempCategory(e.target.value)}>
                        {availableOps.map(op => <option key={op.id} value={op.category}>{op.category.toUpperCase()}</option>)}
                      </select>
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
