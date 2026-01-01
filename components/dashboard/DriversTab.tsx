
import React, { useState, useRef } from 'react';
import { Driver, OperationDefinition, DriverOperation } from '../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../utils/masks';
import { db } from '../../utils/storage';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm: Partial<Driver> = {
    photo: '', name: '', cpf: '', rg: '', cnh: '', 
    phone: '', email: '', 
    plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    driverType: 'Externo', status: 'Ativo',
    beneficiaryName: '', beneficiaryPhone: '', beneficiaryEmail: '',
    beneficiaryCnpj: '', paymentPreference: 'PIX',
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: [], hasAccess: false,
    tripsCount: 0
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);

  const handleCreateAccess = (driver: Partial<Driver>) => {
    const cleanCPF = driver.cpf?.replace(/\D/g, '') || '';
    const firstName = driver.name?.trim().split(' ')[0].toLowerCase() || 'als';
    return { username: cleanCPF, password: `${firstName}${cleanCPF.slice(-4)}` };
  };

  const handleOpenModal = (d?: Driver) => {
    setForm(d ? { ...d } : initialForm);
    setEditingId(d?.id);
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleOperation = (category: string, clientName: string) => {
    const currentOps = [...(form.operations || [])];
    const index = currentOps.findIndex(op => op.category === category && op.client === clientName);
    if (index >= 0) currentOps.splice(index, 1);
    else currentOps.push({ category, client: clientName });
    // Fix: Explicitly handle state update for nested array
    setForm(prev => ({ ...prev, operations: currentOps }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const drvId = editingId || `drv-${Date.now()}`;
      const access = handleCreateAccess(form);
      const statusDate = form.statusLastChangeDate || new Date().toISOString();
      const registrationDate = form.registrationDate || new Date().toISOString();

      if (form.hasAccess) {
        await db.saveUser({
          id: `u-${drvId}`,
          username: access.username,
          displayName: form.name!,
          role: form.driverType === 'Motoboy' ? 'motoboy' : 'driver',
          driverId: drvId,
          lastLogin: new Date().toISOString(),
          position: form.driverType === 'Motoboy' ? 'Motoboy' : 'Motorista',
          password: access.password,
          photo: form.photo
        });
      }

      await onSaveDriver({ 
        ...form, 
        id: drvId,
        registrationDate,
        statusLastChangeDate: statusDate,
        generatedPassword: form.hasAccess ? access.password : undefined 
      }, editingId);
      
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      alert(`FALHA AO SALVAR: ${err.message || "Erro desconhecido. Verifique se a tabela 'drivers' foi criada no Supabase."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.cpf.includes(searchQuery) ||
    d.plateHorse.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm disabled:opacity-50";

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
        
        <div className="flex gap-2">
          <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl active:scale-95">Novo Cadastro</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Identificação / Beneficiário</th>
                <th className="px-6 py-5">Documentação</th>
                <th className="px-6 py-5">Contatos</th>
                <th className="px-6 py-5">Equipamento</th>
                <th className="px-6 py-5">Vínculo</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 align-top transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex gap-4">
                       <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex-shrink-0 shadow-inner">
                         {d.photo ? <img src={d.photo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 italic text-[8px]">3x4</div>}
                       </div>
                       <div className="space-y-3">
                         <div>
                            <p className="font-black text-slate-800 uppercase text-[11px] leading-tight">{d.name}</p>
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">{d.driverType}</span>
                         </div>
                         {d.beneficiaryName && (
                           <div className="pl-3 border-l-2 border-emerald-200 py-1 bg-emerald-50/30 pr-4 rounded-r-xl">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-[7px] font-black text-emerald-600 uppercase">Beneficiário:</p>
                                <span className={`px-1.5 py-0.5 rounded text-[6px] font-black uppercase ${d.paymentPreference === 'PIX' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                  {d.paymentPreference || 'PIX'}
                                </span>
                              </div>
                              <p className="text-[9px] font-black text-slate-700 uppercase leading-none">{d.beneficiaryName}</p>
                              <div className="mt-1.5 space-y-0.5">
                                {d.beneficiaryCnpj && <p className="text-[8px] font-black text-slate-400 whitespace-nowrap">CNPJ: {d.beneficiaryCnpj}</p>}
                                <p className="text-[8px] font-bold text-slate-500 whitespace-nowrap">{d.beneficiaryPhone}</p>
                                {d.beneficiaryEmail && <p className="text-[8px] text-blue-500 font-bold lowercase italic">{d.beneficiaryEmail}</p>}
                              </div>
                           </div>
                         )}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] font-black text-slate-300 w-6 uppercase">CPF</span>
                        <span className="text-[10px] font-black text-slate-600 font-mono tracking-tighter">{d.cpf}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] font-black text-slate-300 w-6 uppercase">RG</span>
                        <span className="text-[10px] font-black text-slate-600 font-mono tracking-tighter">{d.rg}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] font-black text-slate-300 w-6 uppercase">CNH</span>
                        <span className="text-[10px] font-black text-slate-600 font-mono tracking-tighter">{d.cnh}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-3 min-w-[150px]">
                      <div>
                        <p className="text-blue-600 font-black text-[10px] leading-none mb-1 whitespace-nowrap">{d.phone}</p>
                        <p className="text-slate-600 font-bold text-[8.5px] lowercase truncate max-w-[140px] border-l-2 border-slate-200 pl-2">{d.email || 'sem e-mail'}</p>
                      </div>
                      {d.whatsappGroupLink && (
                        <a href={d.whatsappGroupLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-[7px] font-black uppercase hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap">
                          WhatsApp Grupo
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2 min-w-[150px]">
                       <div className="bg-blue-50/50 px-2.5 py-2 rounded-xl border border-blue-100 flex items-center justify-between whitespace-nowrap">
                          <span className="text-[7px] font-black text-blue-400 uppercase">Cavalo</span>
                          <p className="text-[10px] font-black text-blue-800 font-mono">{d.plateHorse} <span className="text-[8px] font-sans opacity-40">({d.yearHorse})</span></p>
                       </div>
                       <div className="bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200 flex items-center justify-between whitespace-nowrap">
                          <span className="text-[7px] font-black text-slate-400 uppercase">Carreta</span>
                          <p className="text-[10px] font-black text-slate-600 font-mono">{d.plateTrailer} <span className="text-[8px] font-sans opacity-40">({d.yearTrailer})</span></p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {d.operations && d.operations.length > 0 ? d.operations.map((op, idx) => (
                        <div key={idx} className={`px-2 py-1 rounded border whitespace-nowrap ${op.client === 'GERAL' ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100 shadow-sm'}`}>
                          <p className={`text-[6px] font-black uppercase leading-none ${op.client === 'GERAL' ? 'text-blue-400' : 'text-blue-500'}`}>{op.category}</p>
                          <p className={`text-[8px] font-bold uppercase leading-tight mt-0.5 ${op.client === 'GERAL' ? 'text-white' : 'text-slate-700'}`}>{op.client}</p>
                        </div>
                      )) : <span className="text-[8px] font-bold text-slate-300 italic uppercase">Sem vínculo</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5 whitespace-nowrap">
                      <div className="flex">
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {d.status}
                        </span>
                      </div>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                        Desde: <span className="text-slate-700">{d.statusLastChangeDate ? new Date(d.statusLastChangeDate).toLocaleDateString('pt-BR') : '--/--/----'}</span>
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-0.5 whitespace-nowrap">
                    <button onClick={() => handleOpenModal(d)} className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onClick={() => onDeleteDriver(d.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </td>
                </tr>
              ))}
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
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CNH</label><input className={inputClasses} value={form.cnh} onChange={e => setForm(prev => ({...prev, cnh: e.target.value}))} /></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">Telefone Principal</label><input required className={inputClasses} value={form.phone} onChange={e => setForm(prev => ({...prev, phone: maskPhone(e.target.value)}))} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">E-mail Operacional (Opcional)</label><input className={`${inputClasses} lowercase`} value={form.email} onChange={e => setForm(prev => ({...prev, email: e.target.value}))} /></div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 space-y-5">
                   <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">Vínculo de Operações</h4>
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
                                { (form.operations || []).some(o => o.category === op.category && o.client === 'GERAL') ? '✓ CATEGORIA ATIVA' : '+ GERAL' }
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
                                    className={`px-3 py-2 rounded-xl text-[9px] font-bold uppercase transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'}`}
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

                <div className="bg-emerald-50/40 p-8 rounded-[2.5rem] border border-emerald-100 space-y-6">
                   <div className="flex items-center justify-between">
                     <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">Dados do Beneficiário</h4>
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
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">Nome Completo</label><input className={inputClasses} value={form.beneficiaryName} onChange={e => setForm(prev => ({...prev, beneficiaryName: e.target.value}))} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">CNPJ (Se houver)</label><input className={inputClasses} value={form.beneficiaryCnpj} onChange={e => setForm(prev => ({...prev, beneficiaryCnpj: maskCNPJ(e.target.value)}))} placeholder="00.000.000/0000-00" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">Telefone</label><input className={inputClasses} value={form.beneficiaryPhone} onChange={e => setForm(prev => ({...prev, beneficiaryPhone: maskPhone(e.target.value)}))} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">E-mail</label><input className={`${inputClasses} lowercase`} value={form.beneficiaryEmail} onChange={e => setForm(prev => ({...prev, beneficiaryEmail: e.target.value}))} /></div>
                      </div>
                   </div>
                </div>

                <div className="bg-indigo-50/40 p-8 rounded-[2.5rem] border border-indigo-100 space-y-5">
                   <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">WhatsApp do Grupo</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Nome do Grupo</label><input className={inputClasses} value={form.whatsappGroupName} onChange={e => setForm(prev => ({...prev, whatsappGroupName: e.target.value}))} placeholder="EX: FROTA ALS 01" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Link do Grupo</label><input className={inputClasses} value={form.whatsappGroupLink} onChange={e => setForm(prev => ({...prev, whatsappGroupLink: e.target.value}))} placeholder="https://chat.whatsapp.com/..." /></div>
                   </div>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-4 shadow-xl">
                   <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Acesso ao Portal</h4>
                   <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                      <span className="text-[9px] font-black uppercase">Liberar Login?</span>
                      <button type="button" onClick={() => setForm(prev => ({...prev, hasAccess: !prev.hasAccess}))} className={`w-12 h-7 rounded-full p-1 transition-all ${form.hasAccess ? 'bg-blue-600' : 'bg-white/10'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-md ${form.hasAccess ? 'translate-x-5' : ''}`}></div>
                      </button>
                   </div>
                   {form.hasAccess && form.name && form.cpf && (
                     <div className="bg-blue-600/20 p-5 rounded-2xl border border-blue-500/30">
                        <p className="text-[9px] font-black text-blue-400 uppercase mb-3 border-b border-blue-400/20 pb-2">Credenciais:</p>
                        <div className="space-y-2 text-[10px]">
                           <div className="flex justify-between">
                              <span className="opacity-60">Usuário (CPF):</span>
                              <span className="font-mono font-black">{form.cpf.replace(/\D/g, '')}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="opacity-60">Senha:</span>
                              <span className="font-mono font-black">{form.name.trim().split(' ')[0].toLowerCase()}{form.cpf.replace(/\D/g, '').slice(-4)}</span>
                           </div>
                        </div>
                     </div>
                   )}
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
                  {isSaving ? 'Salvando...' : 'Salvar Registro'}
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
