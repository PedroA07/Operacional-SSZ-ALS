
import React, { useState, useRef } from 'react';
import { Driver, OperationDefinition, User } from '../../types';
import { maskPhone, maskPlate, maskCPF, maskRG, maskCNPJ } from '../../utils/masks';
import { db } from '../../utils/storage';

interface DriversTabProps {
  drivers: Driver[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => void;
  onDeleteDriver: (id: string) => void;
  availableOps: OperationDefinition[];
}

const DriversTab: React.FC<DriversTabProps> = ({ drivers, onSaveDriver, onDeleteDriver, availableOps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const initialForm: Partial<Driver> = {
    photo: '', name: '', cpf: '', rg: '', cnh: '', 
    phone: '', email: '', 
    plateHorse: '', yearHorse: '', plateTrailer: '', yearTrailer: '',
    driverType: 'Externo', status: 'Ativo',
    beneficiaryName: '', beneficiaryPhone: '', beneficiaryEmail: '',
    beneficiaryCnpj: '', paymentPreference: 'PIX',
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: [], hasAccess: false
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);

  const handleCreateAccess = (driver: Partial<Driver>) => {
    const cleanCPF = String(driver.cpf).replace(/\D/g, '');
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
    if (index >= 0) {
      currentOps.splice(index, 1);
    } else {
      currentOps.push({ category, client: clientName });
    }
    setForm({ ...form, operations: currentOps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const drvId = editingId || `drv-${Date.now()}`;
    const access = handleCreateAccess(form);
    const statusDate = form.statusLastChangeDate || new Date().toISOString();

    if (form.hasAccess) {
      const accessUser: User = {
        id: `u-${drvId}`,
        username: String(access.username),
        displayName: String(form.name),
        role: 'driver',
        driverId: String(drvId),
        lastLogin: new Date().toISOString(),
        isFirstLogin: editingId ? false : true,
        position: 'Motorista'
      };
      await db.saveUser(accessUser);
    }

    onSaveDriver({ 
      ...form, 
      id: drvId,
      statusLastChangeDate: statusDate,
      generatedPassword: form.hasAccess ? access.password : undefined 
    }, editingId);
    
    setIsModalOpen(false);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(d.cpf).includes(searchQuery) ||
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
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl">Novo Cadastro</button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Identificação / Beneficiário</th>
                <th className="px-6 py-5">Documentação</th>
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
                       <div>
                          <p className="font-black text-slate-800 uppercase text-[11px] leading-tight">{d.name}</p>
                          <p className="text-[7px] font-black text-blue-500 uppercase mt-1">{d.phone}</p>
                          {d.beneficiaryName && <p className="text-[7px] text-emerald-600 font-bold uppercase mt-1">Benef: {d.beneficiaryName}</p>}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 font-mono">
                      <p className="text-[10px] font-black text-slate-600 tracking-tighter">CPF: {maskCPF(String(d.cpf))}</p>
                      <p className="text-[9px] text-slate-400">CNH: {d.cnh}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 font-mono">
                       <p className="text-[10px] font-black text-blue-800 uppercase">{d.plateHorse}</p>
                       <p className="text-[9px] text-slate-400 uppercase">{d.plateTrailer}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {d.operations?.map((op, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-[6px] font-black uppercase text-slate-500 rounded border border-slate-200">{op.client}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onClick={() => onDeleteDriver(d.id)} className="p-2 text-slate-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-700 text-lg uppercase tracking-tight">{editingId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-10">
              {/* SEÇÃO 1: IDENTIFICAÇÃO */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-3">1. Identificação Pessoal</h4>
                <div className="flex gap-10 items-start">
                   <div className="relative flex-shrink-0">
                      <div onClick={() => fileInputRef.current?.click()} className="w-32 h-40 rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-all shadow-inner">
                        {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <span className="text-[9px] font-black text-slate-400 uppercase text-center p-4">FOTO 3x4</span>}
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                   </div>
                   <div className="flex-1 grid grid-cols-2 gap-6">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                        <input required className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                      </div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF</label><input required className={inputClasses} value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">RG</label><input required className={inputClasses} value={form.rg} onChange={e => setForm({...form, rg: maskRG(e.target.value)})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CNH</label><input required className={inputClasses} value={form.cnh} onChange={e => setForm({...form, cnh: e.target.value})} /></div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tipo Vínculo</label>
                        <select className={inputClasses} value={form.driverType} onChange={e => setForm({...form, driverType: e.target.value as any})}>
                          <option value="Externo">Externo (Terceiro)</option>
                          <option value="Frota">Frota ALS</option>
                        </select>
                      </div>
                   </div>
                </div>
              </div>

              {/* SEÇÃO 2: EQUIPAMENTO */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-3">2. Equipamento / Veículo</h4>
                <div className="grid grid-cols-4 gap-6 bg-slate-50 p-8 rounded-[2.5rem]">
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Placa Cavalo</label><input required className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Ano Cavalo</label><input required className={inputClasses} value={form.yearHorse} onChange={e => setForm({...form, yearHorse: e.target.value})} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Placa Carreta</label><input required className={inputClasses} value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: maskPlate(e.target.value)})} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-1">Ano Carreta</label><input required className={inputClasses} value={form.yearTrailer} onChange={e => setForm({...form, yearTrailer: e.target.value})} /></div>
                </div>
              </div>

              {/* SEÇÃO 3: FINANCEIRO E BENEFICIÁRIO */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-3">3. Dados de Pagamento / Beneficiário</h4>
                <div className="grid grid-cols-3 gap-6">
                   <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome do Beneficiário</label><input className={inputClasses} value={form.beneficiaryName} onChange={e => setForm({...form, beneficiaryName: e.target.value})} /></div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Preferência</label>
                      <select className={inputClasses} value={form.paymentPreference} onChange={e => setForm({...form, paymentPreference: e.target.value as any})}>
                        <option value="PIX">PIX</option>
                        <option value="TED">Transferência (TED)</option>
                      </select>
                   </div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Telefone Benef.</label><input className={inputClasses} value={form.beneficiaryPhone} onChange={e => setForm({...form, beneficiaryPhone: maskPhone(e.target.value)})} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">E-mail Benef.</label><input className={inputClasses} value={form.beneficiaryEmail} onChange={e => setForm({...form, beneficiaryEmail: e.target.value})} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF/CNPJ Benef.</label><input className={inputClasses} value={form.beneficiaryCnpj} onChange={e => setForm({...form, beneficiaryCnpj: e.target.value})} /></div>
                </div>
              </div>

              {/* SEÇÃO 4: VÍNCULOS OPERACIONAIS */}
              <div className="space-y-6">
                <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] border-l-4 border-blue-600 pl-3">4. Vínculos de Operação</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {availableOps.map(op => (
                     <div key={op.id} className="space-y-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">{op.category}</p>
                        <div className="flex flex-col gap-1">
                           {op.clients.map(client => {
                             const isActive = form.operations?.some(o => o.category === op.category && o.client === client.name);
                             return (
                               <button 
                                 key={client.name} 
                                 type="button" 
                                 onClick={() => toggleOperation(op.category, client.name)}
                                 className={`px-3 py-2 text-[8px] font-black uppercase rounded-lg border text-left transition-all ${isActive ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}
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

              {/* SEÇÃO 5: ACESSO AO SISTEMA */}
              <div className="bg-slate-900 p-8 rounded-[2.5rem] flex items-center justify-between text-white shadow-2xl">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl">📱</div>
                    <div>
                       <h4 className="text-sm font-black uppercase tracking-widest">Liberar Portal do Motorista?</h4>
                       <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Gera acesso automático usando o CPF como login e senha padrão.</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setForm({...form, hasAccess: !form.hasAccess})} className={`w-20 h-10 rounded-full p-1.5 transition-all flex items-center ${form.hasAccess ? 'bg-blue-500 justify-end' : 'bg-white/10 justify-start'}`}>
                    <div className="w-7 h-7 bg-white rounded-full shadow-lg"></div>
                 </button>
              </div>

              <div className="pt-8 border-t border-slate-100 flex gap-6">
                 <button type="submit" className="flex-1 py-6 bg-blue-600 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">Salvar Registro Completo</button>
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-12 py-6 bg-slate-100 text-slate-400 rounded-[2rem] text-[12px] font-black uppercase hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
