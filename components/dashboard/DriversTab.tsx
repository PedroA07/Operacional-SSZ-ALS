
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Driver, OperationDefinition, User, Customer } from '../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../utils/masks';
import { db } from '../../utils/storage';
import { fileStorage } from '../../utils/fileStorage';
import { driverAuthService } from '../../utils/driverAuthService';
import { Icons } from '../../constants/icons';
import ListFilters from './shared/ListFilters';

interface DriversTabProps {
  drivers: Driver[];
  customers: Customer[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ drivers, customers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCnhModalOpen, setIsCnhModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [itemToDelete, setItemToDelete] = useState<Driver | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [currentCnhUrl, setCurrentCnhUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isSaving, setIsSaving] = useState(false);

  const [tempCategory, setTempCategory] = useState(availableOps[0]?.category || '');
  const [tempClient, setTempClient] = useState('Geral');

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

  const handleOpenModal = (d?: Driver) => {
    setForm(d ? { ...d, operations: d.operations || [] } : initialForm);
    setEditingId(d?.id);
    setTempCategory(availableOps[0]?.category || '');
    setTempClient('Geral');
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      onDeleteDriver(itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

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
      const drvId = editingId || `drv-${Date.now()}`;
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
      
      await onSaveDriver({ 
        ...updatedForm, 
        id: drvId,
        generatedPassword: password
      }, editingId);
      
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`ERRO: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDrivers = useMemo(() => {
    let result = drivers.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.cpf.includes(searchQuery) ||
      d.plateHorse.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (statusFilter !== 'todos') result = result.filter(d => d.status === statusFilter);
    result.sort((a, b) => sortBy === 'name_asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    return result;
  }, [drivers, searchQuery, sortBy, statusFilter]);

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm disabled:bg-slate-50";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex-1 w-full">
          <ListFilters 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            placeholder="BUSCAR MOTORISTA, CPF OU PLACA..."
          />
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all shadow-xl h-[68px] shrink-0">Novo Motorista</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1400px]">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Identificação / Contato</th>
                <th className="px-6 py-5">Documentação</th>
                <th className="px-6 py-5">Equipamento / Frota</th>
                <th className="px-6 py-5">Tipo / Portal</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border overflow-hidden shrink-0">
                        {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-[8px] text-slate-300">ALS</div>}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 uppercase">{d.name}</p>
                        <p className="text-[9px] text-blue-600 font-bold">{maskPhone(d.phone)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[9px] font-black text-slate-500">CPF: <span className="text-slate-800">{maskCPF(d.cpf)}</span></p>
                    <p className="text-[9px] font-black text-slate-500">CNH: <span className="text-slate-800">{d.cnh || '---'}</span></p>
                    {d.cnhPdfUrl && (
                      <button onClick={() => { setCurrentCnhUrl(d.cnhPdfUrl!); setIsCnhModalOpen(true); }} className="mt-1 flex items-center gap-1.5 text-red-600 font-black text-[8px] uppercase">
                        <Icons.Formularios /> Ver PDF
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-mono">{d.plateHorse}</span>
                       <span className="text-[8px] text-slate-400 font-bold">{d.yearHorse || '---'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono">{d.plateTrailer}</span>
                       <span className="text-[8px] text-slate-400 font-bold">{d.yearTrailer || '---'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase">{d.driverType}</span>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">Portal ID: {d.cpf.replace(/\D/g,'')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="2.5"/></svg></button>
                      <button onClick={() => { setItemToDelete(d); setIsDeleteModalOpen(true); }} className="p-2 text-slate-300 hover:text-red-500"><Icons.Excluir /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[95vh] animate-in zoom-in-95">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg">ALS</div>
                 <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase leading-none">{editingId ? 'Editar Motorista' : 'Novo Registro de Motorista'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Controle de Frota e Vínculos</p>
                 </div>
              </div>
              <button onClick={() => setIsModalOpen(false)}><Icons.Excluir /></button>
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
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] text-[10px] font-black uppercase">Descartar</button>
                 <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                    {isSaving ? 'Gravando Dados...' : 'Salvar Ficha do Motorista'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCnhModalOpen && currentCnhUrl && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/90 flex flex-col p-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-black uppercase text-sm">Visualizar CNH</h3>
            <button onClick={() => setIsCnhModalOpen(false)} className="text-white bg-red-600 px-4 py-2 rounded-xl text-[10px] font-black">Fechar</button>
          </div>
          <iframe src={currentCnhUrl} className="flex-1 rounded-3xl bg-white" />
        </div>
      )}

      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Icons.Excluir />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Excluir Motorista</h3>
                    <p className="text-xs text-slate-400 mt-2">Deseja remover permanentemente este cadastro e todos os seus vínculos?</p>
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                       <p className="text-sm font-black text-slate-700 uppercase leading-tight">{itemToDelete.name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">CPF: {maskCPF(itemToDelete.cpf)}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200">Cancelar</button>
                    <button onClick={executeDelete} className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-red-700">Sim, Excluir</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
