
import React, { useState, useRef, useEffect } from 'react';
import { Driver, OperationDefinition, User } from '../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../utils/masks';
import { db } from '../../utils/storage';
import { driverAuthService } from '../../utils/driverAuthService';

interface DriversTabProps {
  drivers: Driver[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ drivers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showPassMap, setShowPassMap] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm: Partial<Driver> = {
    photo: '', name: '', cpf: '', rg: '', cnh: '', cnhPdfUrl: '',
    phone: '', email: '', 
    plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    driverType: 'Externo', status: 'Ativo',
    beneficiaryName: '', beneficiaryPhone: '', beneficiaryEmail: '',
    beneficiaryCnpj: '', paymentPreference: 'PIX',
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: [], hasAccess: true,
    tripsCount: 0
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);

  const loadData = async () => {
    const u = await db.getUsers();
    setUsers(u);
  };

  useEffect(() => {
    loadData();
  }, [drivers]);

  const handleOpenModal = (d?: Driver) => {
    setForm(d ? { ...d } : initialForm);
    setEditingId(d?.id);
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, cnhPdfUrl: reader.result as string }));
      reader.readAsDataURL(file);
    } else if (file) {
      alert("Por favor, selecione um arquivo no formato PDF.");
      e.target.value = '';
    }
  };

  const toggleOperation = (category: string, clientName: string) => {
    const currentOps = [...(form.operations || [])];
    const index = currentOps.findIndex(op => op.category === category && op.client === clientName);
    if (index >= 0) currentOps.splice(index, 1);
    else currentOps.push({ category, client: clientName });
    setForm(prev => ({ ...prev, operations: currentOps }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const drvId = editingId || `drv-${Date.now()}`;
      
      // REGRA: Fallback de beneficiário para os dados do próprio motorista
      const finalForm = {
        ...form,
        beneficiaryName: form.beneficiaryName || form.name,
        beneficiaryPhone: form.beneficiaryPhone || form.phone,
        beneficiaryCnpj: form.beneficiaryCnpj || form.cpf,
        beneficiaryEmail: form.beneficiaryEmail || form.email,
        registrationDate: form.registrationDate || new Date().toISOString(),
        statusLastChangeDate: form.statusLastChangeDate || new Date().toISOString()
      };

      // Sincroniza usuário de acesso
      const { password } = await driverAuthService.syncUserRecord(drvId, finalForm, form.generatedPassword);
      
      await onSaveDriver({ 
        ...finalForm, 
        id: drvId,
        generatedPassword: password 
      }, editingId);
      
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`FALHA AO SALVAR: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (driverId: string) => {
    const newPass = prompt("Digite a nova senha para este motorista:");
    if (newPass && newPass.length >= 4) {
      await driverAuthService.updatePassword(driverId, newPass);
      loadData();
      alert("Senha atualizada com sucesso!");
    }
  };

  const openPdf = (url?: string) => {
    if (!url) return;
    const win = window.open();
    if (win) {
      win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.cpf.includes(searchQuery) ||
    d.plateHorse.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";

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
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl active:scale-95">Novo Cadastro</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Identificação / Beneficiário</th>
                <th className="px-6 py-5 text-blue-600">Acesso Portal (Credenciais)</th>
                <th className="px-6 py-5">Documentação</th>
                <th className="px-6 py-5">Equipamento</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(d => {
                const linkedUser = users.find(u => u.driverId === d.id);
                const isPassVisible = showPassMap[d.id];
                
                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 align-top transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                         <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                           {d.photo ? <img src={d.photo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 italic text-[8px]">3x4</div>}
                         </div>
                         <div>
                            <p className="font-black text-slate-800 uppercase text-[11px] leading-tight">{d.name}</p>
                            <p className="text-[7px] font-black text-slate-400 uppercase mt-1">Benef: {d.beneficiaryName || 'Mesmo do Motorista'}</p>
                            <p className="text-[7px] font-bold text-slate-500 font-mono tracking-tighter">CPF: {d.cpf}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-1.5 min-w-[140px]">
                         <div className="flex justify-between items-center text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                            <span>Login (CPF):</span>
                            <span className="text-slate-700 font-mono">{linkedUser?.username || d.cpf.replace(/\D/g, '')}</span>
                         </div>
                         <div className="flex justify-between items-center text-[8px] font-black text-blue-400 uppercase tracking-tighter">
                            <span>Senha:</span>
                            <div className="flex items-center gap-2">
                               <span className="text-slate-700 font-mono bg-white px-1.5 py-0.5 rounded border border-blue-100">
                                 {isPassVisible ? linkedUser?.password : '••••••••'}
                               </span>
                               <button onClick={() => setShowPassMap(p => ({...p, [d.id]: !p[d.id]}))} className="text-blue-500 hover:text-blue-700">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2.5"/></svg>
                               </button>
                            </div>
                         </div>
                         <button onClick={() => handleUpdatePassword(d.id)} className="w-full mt-2 py-1 bg-white text-blue-600 rounded-lg border border-blue-200 text-[7px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Alterar Senha</button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <p className="text-slate-600 font-bold text-[9px] uppercase">CNH: {d.cnh || '---'}</p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => d.cnhPdfUrl && openPdf(d.cnhPdfUrl)}
                            disabled={!d.cnhPdfUrl}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[8px] font-black uppercase border transition-all ${d.cnhPdfUrl ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-300 grayscale opacity-50 cursor-not-allowed'}`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            {d.cnhPdfUrl ? 'Ver CNH' : 'Sem Anexo'}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 flex flex-col">
                          <span className="text-[7px] font-black text-slate-400 uppercase">Equipamento</span>
                          <p className="text-[10px] font-black text-slate-700 font-mono">{d.plateHorse} / {d.plateTrailer}</p>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => onDeleteDriver(d.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 h-[95vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-700 text-lg uppercase tracking-tight">{editingId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-12 gap-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="col-span-8 space-y-8">
                <div className="flex gap-8 items-start">
                  <div className="relative group flex-shrink-0">
                    <div className="w-32 aspect-[3/4] rounded-[1.5rem] bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-all shadow-inner" onClick={() => fileInputRef.current?.click()}>
                      {form.photo ? <img src={form.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black text-slate-400 uppercase text-center p-2">Anexar<br/>Foto 3x4</span>}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input required className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-800 font-black uppercase text-xl focus:border-blue-500 outline-none shadow-sm transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF</label><input required className={inputClasses} value={form.cpf} onChange={e => setForm(prev => ({...prev, cpf: maskCPF(e.target.value)}))} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">RG</label><input className={inputClasses} value={form.rg} onChange={e => setForm(prev => ({...prev, rg: maskRG(e.target.value)}))} /></div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nº CNH</label>
                        <input className={inputClasses} value={form.cnh} onChange={e => setForm(prev => ({...prev, cnh: e.target.value}))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-blue-600 uppercase ml-1 tracking-widest">Documento CNH (Anexo PDF)</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => pdfInputRef.current?.click()} 
                          className={`flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl border-2 border-dashed transition-all ${form.cnhPdfUrl ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          <span className="text-[10px] font-black uppercase tracking-tight">{form.cnhPdfUrl ? 'CNH Anexada ✓' : 'Clique para anexar CNH (PDF)'}</span>
                        </button>
                        {form.cnhPdfUrl && (
                          <>
                            <button type="button" onClick={() => openPdf(form.cnhPdfUrl)} className="px-4 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                            <button type="button" onClick={() => setForm(prev => ({...prev, cnhPdfUrl: ''}))} className="px-4 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </>
                        )}
                      </div>
                      <input type="file" ref={pdfInputRef} className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">Telefone Principal</label><input required className={inputClasses} value={form.phone} onChange={e => setForm(prev => ({...prev, phone: maskPhone(e.target.value)}))} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">E-mail Operacional (Opcional)</label><input className={`${inputClasses} lowercase`} value={form.email} onChange={e => setForm(prev => ({...prev, email: e.target.value}))} /></div>
                </div>

                <div className="bg-emerald-50/40 p-8 rounded-[2.5rem] border border-emerald-100 space-y-6">
                   <div className="flex items-center justify-between">
                     <div>
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">Dados do Beneficiário</h4>
                        <p className="text-[7px] text-emerald-400 font-bold uppercase mt-1">* Se deixado em branco, o sistema usará os dados do motorista acima.</p>
                     </div>
                     <div className="flex bg-white/60 p-1 rounded-xl border border-emerald-200">
                        {['PIX', 'TED'].map(pref => (
                          <button key={pref} type="button" onClick={() => setForm(prev => ({...prev, paymentPreference: pref as any}))} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${form.paymentPreference === pref ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400 hover:text-emerald-600'}`}>
                            {pref}
                          </button>
                        ))}
                     </div>
                   </div>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">Nome Completo</label><input className={inputClasses} value={form.beneficiaryName} onChange={e => setForm(prev => ({...prev, beneficiaryName: e.target.value.toUpperCase()}))} placeholder={form.name || "NOME DO MOTORISTA"} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">CNPJ / CPF</label><input className={inputClasses} value={form.beneficiaryCnpj} onChange={e => setForm(prev => ({...prev, beneficiaryCnpj: e.target.value.includes('/') ? maskCNPJ(e.target.value) : maskCPF(e.target.value)}))} placeholder={form.cpf || "CPF DO MOTORISTA"} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">Telefone</label><input className={inputClasses} value={form.beneficiaryPhone} onChange={e => setForm(prev => ({...prev, beneficiaryPhone: maskPhone(e.target.value)}))} placeholder={form.phone || "(13) 00000-0000"} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">E-mail</label><input className={`${inputClasses} lowercase`} value={form.beneficiaryEmail} onChange={e => setForm(prev => ({...prev, beneficiaryEmail: e.target.value}))} placeholder={form.email || "motorista@email.com"} /></div>
                      </div>
                   </div>
                </div>

                {/* RESTAURADO: WhatsApp do Grupo */}
                <div className="bg-indigo-50/40 p-8 rounded-[2.5rem] border border-indigo-100 space-y-5">
                   <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">WhatsApp do Grupo</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Nome do Grupo</label><input className={inputClasses} value={form.whatsappGroupName} onChange={e => setForm(prev => ({...prev, whatsappGroupName: e.target.value.toUpperCase()}))} placeholder="EX: FROTA ALS 01" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Link do Grupo</label><input className={inputClasses} value={form.whatsappGroupLink} onChange={e => setForm(prev => ({...prev, whatsappGroupLink: e.target.value}))} placeholder="https://chat.whatsapp.com/..." /></div>
                   </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-5">
                   <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Vínculo de Operações</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {availableOps.map(op => (
                        <div key={op.id} className="space-y-3 bg-white/50 p-4 rounded-3xl border border-slate-100">
                           <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                              <p className="text-[10px] font-black text-slate-800 uppercase">{op.category}</p>
                              <button
                                type="button"
                                onClick={() => toggleOperation(op.category, 'GERAL')}
                                className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border-2 ${
                                  (form.operations || []).some(o => o.category === op.category && o.client === 'GERAL') 
                                  ? 'bg-slate-800 text-white border-slate-800' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-800 hover:text-slate-800'
                                }`}
                              >
                                { (form.operations || []).some(o => o.category === op.category && o.client === 'GERAL') ? '✓ ATIVO' : '+ GERAL' }
                              </button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {op.clients.map(client => {
                                const isSelected = (form.operations || []).some(o => o.category === op.category && o.client === client.name);
                                return (
                                  <button
                                    key={client.name}
                                    type="button"
                                    onClick={() => toggleOperation(op.category, client.name)}
                                    className={`px-3 py-2 rounded-xl text-[9px] font-bold uppercase transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}
                                  >
                                    {client.name}
                                  </button>
                                );
                              })}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-4 shadow-xl">
                   <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Credenciais do Portal</h4>
                   <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-500/30 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-blue-300 uppercase">Usuário (CPF)</label>
                        <div className="px-4 py-3 bg-white/5 rounded-xl text-[11px] font-mono text-white/60 select-all">{form.cpf?.replace(/\D/g, '') || 'Preencha o CPF...'}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-blue-300 uppercase">Senha Personalizada (Opcional)</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-white/5 rounded-xl text-[11px] font-mono text-white outline-none focus:bg-white/10 border border-white/10" 
                          placeholder="Senha padrão automática"
                          value={form.generatedPassword || ''}
                          onChange={e => setForm({...form, generatedPassword: e.target.value})}
                        />
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4">
                   <h4 className="text-[10px] font-black text-slate-700 uppercase">Equipamento</h4>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase">Placa Cavalo</label><input required className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase">Ano Cav.</label><input className={inputClasses} value={form.yearHorse} onChange={e => setForm(prev => ({...prev, yearHorse: e.target.value}))} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Placa Carr.</label><input required className={inputClasses} value={form.plateTrailer} onChange={e => setForm(prev => ({...prev, plateTrailer: maskPlate(e.target.value)}))} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Ano Carr.</label><input className={inputClasses} value={form.yearTrailer} onChange={e => setForm(prev => ({...prev, yearTrailer: e.target.value}))} /></div>
                      </div>
                   </div>
                </div>

                <div className="bg-blue-50/40 p-6 rounded-[2rem] border border-blue-100 space-y-4">
                   <h4 className="text-[10px] font-black text-blue-600 uppercase">Parâmetros</h4>
                   <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Tipo</label><select className={inputClasses} value={form.driverType} onChange={e => setForm(prev => ({...prev, driverType: e.target.value as any}))}><option value="Externo">Externo (Terceiro)</option><option value="Frota">Frota ALS</option><option value="Motoboy">Motoboy</option></select></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Status</label><select className={inputClasses} value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select></div>
                   </div>
                </div>

                <button type="submit" disabled={isSaving} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:bg-slate-400">
                  {isSaving ? 'Salvando...' : 'Finalizar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
