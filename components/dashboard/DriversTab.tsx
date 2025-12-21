
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
    if (index >= 0) currentOps.splice(index, 1);
    else currentOps.push({ category, client: clientName });
    setForm({ ...form, operations: currentOps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const drvId = editingId || `drv-${Date.now()}`;
    const access = handleCreateAccess(form);
    const statusDate = form.statusLastChangeDate || new Date().toISOString();

    // Sincroniza acesso de usuário se liberado
    if (form.hasAccess) {
      const accessUser: User = {
        id: `u-${drvId}`,
        username: String(access.username),
        displayName: String(form.name),
        role: 'driver',
        driverId: String(drvId),
        lastLogin: new Date().toISOString(),
        isFirstLogin: editingId ? false : true, // Se for novo, força troca de senha
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
        <button onClick={() => handleOpenModal()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-xl active:scale-95">Novo Cadastro</button>
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
                              <p className="text-[7px] font-black text-emerald-600 uppercase">Beneficiário: <span className="text-slate-500">{d.paymentPreference}</span></p>
                              <p className="text-[9px] font-black text-slate-700 uppercase leading-none">{d.beneficiaryName}</p>
                           </div>
                         )}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] font-black text-slate-300 w-6 uppercase">CPF</span>
                        <span className="text-[10px] font-black text-slate-600 font-mono tracking-tighter">{maskCPF(String(d.cpf))}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                        <p className="text-blue-600 font-black text-[10px]">{d.phone}</p>
                        <p className="text-slate-400 font-bold text-[8px] lowercase truncate max-w-[120px]">{d.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                       <div className="bg-blue-50/50 px-2 py-1.5 rounded-lg border border-blue-100">
                          <p className="text-[9px] font-black text-blue-800 font-mono">{d.plateHorse}</p>
                       </div>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-700 text-lg uppercase tracking-tight">{editingId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-12 gap-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="col-span-8 space-y-8">
                <div className="flex gap-8 items-start">
                  <div className="relative group flex-shrink-0">
                    <div className="w-32 aspect-[3/4] rounded-[1.5rem] bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-all shadow-inner" onClick={() => fileInputRef.current?.click()}>
                      {form.photo ? <img src={form.photo} className="w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black text-slate-400 uppercase text-center p-2">FOTO<br/>3x4</span>}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input required className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-800 font-black uppercase text-xl focus:border-blue-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF (Login)</label><input required className={inputClasses} value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">RG</label><input required className={inputClasses} value={form.rg} onChange={e => setForm({...form, rg: maskRG(e.target.value)})} /></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">Telefone Principal</label><input required className={inputClasses} value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">E-mail</label><input required className={`${inputClasses} lowercase`} value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between shadow-xl">
                   <div>
                      <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Liberar Acesso ao Portal?</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">O motorista poderá baixar PDFs e atualizar status</p>
                   </div>
                   <button type="button" onClick={() => setForm({...form, hasAccess: !form.hasAccess})} className={`w-14 h-8 rounded-full p-1 transition-all ${form.hasAccess ? 'bg-blue-600' : 'bg-white/10'}`}>
                      <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-md ${form.hasAccess ? 'translate-x-6' : ''}`}></div>
                   </button>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                 <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4">
                   <h4 className="text-[10px] font-black text-slate-700 uppercase">Equipamento</h4>
                   <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase">Placa Cavalo</label><input required className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Placa Carreta</label><input required className={inputClasses} value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: maskPlate(e.target.value)})} /></div>
                   </div>
                </div>
                <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-900 transition-all">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
