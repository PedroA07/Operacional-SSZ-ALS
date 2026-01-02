
import React, { useState, useRef, useEffect } from 'react';
import { Driver, OperationDefinition, User } from '../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../utils/masks';
import { db } from '../../utils/storage';
import { driverAuthService } from '../../utils/driverAuthService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DriverProfileTemplate from './forms/DriverProfileTemplate';

interface DriversTabProps {
  drivers: Driver[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ drivers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Driver | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  
  const [visibility, setVisibility] = useState({
    driverInfo: true,
    contacts: true,
    equipment: true,
    type: true,
    beneficiary: true,
    whatsapp: true,
    operations: true,
    portal: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm: Partial<Driver> = {
    photo: '', name: '', cpf: '', rg: '', cnh: '',
    phone: '', email: '', 
    plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    driverType: 'Externo', status: 'Ativo',
    beneficiaryName: '', beneficiaryPhone: '', beneficiaryEmail: '',
    beneficiaryCnpj: '', paymentPreference: 'PIX',
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: [], hasAccess: true
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);

  const loadUsers = async () => {
    const u = await db.getUsers();
    setUsers(u || []);
  };

  useEffect(() => { loadUsers(); }, [drivers, isModalOpen]);

  const handleOpenModal = (d?: Driver) => {
    setForm(d ? { ...d } : initialForm);
    setEditingId(d?.id);
    setIsModalOpen(true);
  };

  const handleOpenPreview = (d: Driver) => {
    setSelectedDriver(d);
    setIsPreviewModalOpen(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const drvId = editingId || `drv-${Date.now()}`;
      
      // Sincroniza usuário e gera senha se for novo
      const { password } = await driverAuthService.syncUserRecord(drvId, form, form.generatedPassword);
      
      await onSaveDriver({ 
        ...form, 
        id: drvId,
        generatedPassword: password 
      }, editingId);
      
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`FALHA AO SALVAR: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (driverId: string) => {
    const newPass = prompt("Definir nova senha operacional:");
    if (newPass && newPass.length >= 4) {
      await driverAuthService.updatePassword(driverId, newPass);
      loadUsers();
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.cpf.includes(searchQuery) ||
    d.plateHorse.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm disabled:bg-slate-50";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1";

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-md">
          <input 
            type="text" 
            placeholder="PESQUISAR MOTORISTA, CPF OU PLACA..." 
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase focus:bg-white focus:border-blue-400 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl active:scale-95">Novo Motorista</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Identificação</th>
                <th className="px-6 py-5">Equipamento (Placa/Ano)</th>
                <th className="px-6 py-5">Contatos / WhatsApp</th>
                <th className="px-6 py-5">Portal (Login / Senha)</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(d => {
                const linkedUser = users.find(u => u.driverId === d.id);
                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 align-middle transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                           {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 italic text-[8px]">ALS</div>}
                         </div>
                         <div>
                            <p className="font-black text-slate-800 uppercase text-[11px] leading-tight">{d.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1">CPF: {d.cpf}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">{d.plateHorse}</span>
                             <span className="text-[9px] font-black text-slate-400">{d.yearHorse || '---'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">{d.plateTrailer}</span>
                             <span className="text-[9px] font-black text-slate-300">{d.yearTrailer || '---'}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-blue-600 font-black text-[10px]">{d.phone}</p>
                       <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase truncate max-w-[120px]">{d.whatsappGroupName || 'Sem Grupo'}</p>
                    </td>
                    <td className="px-6 py-4">
                       <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 space-y-1">
                          <div className="flex justify-between text-[8px] font-black uppercase text-blue-400">
                             <span>Login:</span>
                             <span className="text-slate-800 font-mono">{d.cpf.replace(/\D/g, '')}</span>
                          </div>
                          <div className="flex justify-between text-[8px] font-black uppercase text-blue-400">
                             <span>Senha:</span>
                             <span className="text-emerald-600 font-mono font-black">{linkedUser?.password || d.generatedPassword || '---'}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {d.status}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                      <button onClick={() => handleUpdatePassword(d.id)} className="p-2 text-slate-300 hover:text-emerald-500" title="Definir Senha"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5"/></svg></button>
                      <button onClick={() => handleOpenPreview(d)} className="p-2 text-slate-300 hover:text-blue-600" title="Ficha PDF"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg></button>
                      <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5"/></svg></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 text-lg uppercase">{editingId ? 'Editar Cadastro' : 'Novo Motorista'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              
              {/* SEÇÃO 1: DADOS BÁSICOS */}
              <div className="grid grid-cols-12 gap-8">
                 <div className="col-span-3">
                    <label className={labelClass}>Foto do Motorista</label>
                    <div onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden group">
                       {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : (
                         <>
                           <svg className="w-8 h-8 text-slate-300 mb-2 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>
                           <span className="text-[8px] font-black text-slate-400 uppercase">Anexar Imagem</span>
                         </>
                       )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                 </div>

                 <div className="col-span-9 space-y-5">
                    <div className="space-y-1">
                       <label className={labelClass}>Nome Completo</label>
                       <input required className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-800 font-black uppercase text-xl focus:border-blue-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                       <div className="space-y-1"><label className={labelClass}>CPF</label><input required className={inputClasses} value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} /></div>
                       <div className="space-y-1"><label className={labelClass}>RG</label><input className={inputClasses} value={form.rg} onChange={e => setForm({...form, rg: maskRG(e.target.value)})} /></div>
                       <div className="space-y-1"><label className={labelClass}>Registro CNH</label><input className={inputClasses} value={form.cnh} onChange={e => setForm({...form, cnh: e.target.value.toUpperCase()})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className={labelClass}>Telefone Celular</label><input required className={inputClasses} value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} /></div>
                       <div className="space-y-1"><label className={labelClass}>E-mail</label><input className={`${inputClasses} lowercase`} value={form.email} onChange={e => setForm({...form, email: e.target.value.toLowerCase()})} /></div>
                    </div>
                 </div>
              </div>

              {/* SEÇÃO 2: EQUIPAMENTO (PLACA + ANO) */}
              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
                 <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Informações do Veículo</h4>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="grid grid-cols-3 gap-3">
                       <div className="col-span-2 space-y-1"><label className="text-[8px] font-black uppercase opacity-60">Placa Cavalo</label><input required className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-black uppercase focus:bg-white/20 outline-none" value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black uppercase opacity-60">Ano</label><input className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-black uppercase focus:bg-white/20 outline-none" maxLength={4} value={form.yearHorse} onChange={e => setForm({...form, yearHorse: e.target.value.replace(/\D/g,'')})} placeholder="2024" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       <div className="col-span-2 space-y-1"><label className="text-[8px] font-black uppercase opacity-60">Placa Carreta</label><input required className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-black uppercase focus:bg-white/20 outline-none" value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: maskPlate(e.target.value)})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black uppercase opacity-60">Ano</label><input className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-black uppercase focus:bg-white/20 outline-none" maxLength={4} value={form.yearTrailer} onChange={e => setForm({...form, yearTrailer: e.target.value.replace(/\D/g,'')})} placeholder="2024" /></div>
                    </div>
                 </div>
              </div>

              {/* SEÇÃO 3: FINANCEIRO (BENEFICIÁRIO) */}
              <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-6">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Módulo Financeiro (Beneficiário)</h4>
                    <div className="flex gap-2">
                       <button type="button" onClick={() => setForm({...form, beneficiaryName: form.name, beneficiaryCnpj: form.cpf, beneficiaryPhone: form.phone})} className="text-[8px] font-black text-blue-500 uppercase hover:underline">Copiar dados do motorista</button>
                    </div>
                 </div>
                 <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-3 space-y-1">
                       <label className={labelClass}>Preferência Pagamento</label>
                       <select className={inputClasses} value={form.paymentPreference} onChange={e => setForm({...form, paymentPreference: e.target.value as any})}>
                          <option value="PIX">PIX (INSTANTÂNEO)</option>
                          <option value="TED">TED (TRANSFERÊNCIA)</option>
                       </select>
                    </div>
                    <div className="col-span-6 space-y-1">
                       <label className={labelClass}>Nome Completo Favorecido</label>
                       <input className={inputClasses} value={form.beneficiaryName} onChange={e => setForm({...form, beneficiaryName: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="col-span-3 space-y-1">
                       <label className={labelClass}>CPF / CNPJ Beneficiário</label>
                       <input className={inputClasses} value={form.beneficiaryCnpj} onChange={e => setForm({...form, beneficiaryCnpj: e.target.value})} />
                    </div>
                    <div className="col-span-4 space-y-1">
                       <label className={labelClass}>Telefone para Comprovante</label>
                       <input className={inputClasses} value={form.beneficiaryPhone} onChange={e => setForm({...form, beneficiaryPhone: maskPhone(e.target.value)})} />
                    </div>
                    <div className="col-span-8 space-y-1">
                       <label className={labelClass}>E-mail / Chave PIX</label>
                       <input className={`${inputClasses} lowercase`} value={form.beneficiaryEmail} onChange={e => setForm({...form, beneficiaryEmail: e.target.value})} />
                    </div>
                 </div>
              </div>

              {/* SEÇÃO 4: WHATSAPP E OPERACIONAL */}
              <div className="grid grid-cols-2 gap-8">
                 <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 space-y-5">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Comunicação WhatsApp</h4>
                    <div className="space-y-1"><label className={labelClass}>Nome do Grupo</label><input className={inputClasses} value={form.whatsappGroupName} onChange={e => setForm({...form, whatsappGroupName: e.target.value.toUpperCase()})} placeholder="EX: VOLKSWAGEN - ALS" /></div>
                    <div className="space-y-1"><label className={labelClass}>Link de Convite</label><input className={`${inputClasses} lowercase`} value={form.whatsappGroupLink} onChange={e => setForm({...form, whatsappGroupLink: e.target.value})} placeholder="https://chat.whatsapp.com/..." /></div>
                 </div>
                 <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 space-y-5">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configurações de Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className={labelClass}>Tipo de Vínculo</label><select className={inputClasses} value={form.driverType} onChange={e => setForm({...form, driverType: e.target.value as any})}><option value="Externo">Terceiro / Externo</option><option value="Frota">Frota ALS</option><option value="Motoboy">Motoboy</option></select></div>
                       <div className="space-y-1"><label className={labelClass}>Status Sistema</label><select className={inputClasses} value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}><option value="Ativo">Ativo / Liberado</option><option value="Inativo">Inativo / Bloqueado</option></select></div>
                    </div>
                    <div className="pt-2">
                       <button type="submit" disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50">
                          {isSaving ? 'Gravando Dados...' : 'Finalizar Cadastro'}
                       </button>
                    </div>
                 </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW PDF */}
      {isPreviewModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-xl">
           <div className="bg-white w-full max-w-7xl h-full rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 italic">Visualização de Ficha Cadastral ALS</h3>
                 <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-200 rounded-full hover:bg-red-500 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-200 p-12 flex justify-center">
                 <div className="origin-top transform scale-75 xl:scale-90 shadow-2xl">
                    <DriverProfileTemplate driver={selectedDriver} visibility={visibility} />
                 </div>
              </div>
           </div>
        </div>
      )}

      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase">Confirmar Exclusão</h3>
                    <p className="text-xs text-slate-400 mt-2">Deseja remover permanentemente este motorista?</p>
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                       <p className="text-sm font-black text-slate-700 uppercase">{itemToDelete.name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Placa: {itemToDelete.plateHorse}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={executeDelete} className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-red-700 transition-all">Sim, Excluir</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
