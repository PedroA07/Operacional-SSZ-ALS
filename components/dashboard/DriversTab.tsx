
import React, { useState, useRef } from 'react';
import { Driver, OperationDefinition } from '../../types';
import { maskPhone, maskPlate, maskCPF, maskRG } from '../../utils/masks';

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
    whatsappGroupName: '', whatsappGroupLink: '',
    operations: []
  };

  const [form, setForm] = useState<Partial<Driver>>(initialForm);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDriver(form, editingId);
    setIsModalOpen(false);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.cpf.includes(searchQuery) ||
    d.plateHorse.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all shadow-sm";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex-1 relative max-w-md">
          <input 
            type="text" 
            placeholder="PESQUISAR POR NOME, CPF OU PLACA..." 
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase focus:bg-white focus:border-blue-400 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <button onClick={() => handleOpenModal()} className="px-6 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-lg active:scale-95">Novo Cadastro</button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-5">Motorista / Beneficiário</th>
                <th className="px-6 py-5">Documentos / Contato</th>
                <th className="px-6 py-5">Conjunto (Cavalo/Carreta)</th>
                <th className="px-6 py-5">Status / WhatsApp</th>
                <th className="px-6 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 align-top">
                  <td className="px-6 py-4">
                    <div className="flex gap-4">
                       <div className="w-16 aspect-[3/4] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 shadow-inner">
                         {d.photo ? <img src={d.photo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 italic text-[10px]">3x4</div>}
                       </div>
                       <div>
                         <p className="font-black text-slate-700 uppercase text-sm leading-tight">{d.name}</p>
                         <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{d.driverType}</p>
                         
                         <div className="mt-4 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50 shadow-sm">
                           <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Beneficiário:</p>
                           <p className="text-[10px] font-black text-slate-600 uppercase leading-none">{d.beneficiaryName || 'NÃO INFORMADO'}</p>
                         </div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                      <div className="grid grid-cols-1 gap-1">
                        <p className="font-bold text-slate-600 text-[10px]">CPF: {d.cpf}</p>
                        <p className="text-slate-500 text-[9px]">RG: {d.rg} | CNH: {d.cnh}</p>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5">
                        <p className="text-blue-500 font-black text-[11px]">{d.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                       <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 font-mono">{d.plateHorse} <span className="text-slate-400 ml-1">({d.yearHorse})</span></p>
                       </div>
                       <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <p className="text-[10px] font-black text-slate-600 font-mono">{d.plateTrailer} <span className="text-slate-400 ml-1">({d.yearTrailer})</span></p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-3">
                      <div>
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{d.status}</span>
                      </div>
                      {d.whatsappGroupName && (
                        <a href={d.whatsappGroupLink} target="_blank" className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-emerald-700 transition-all shadow-md active:scale-95">
                          {d.whatsappGroupName}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleOpenModal(d)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onClick={() => onDeleteDriver(d.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </td>
                </tr>
              ))}
              {filteredDrivers.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-300 font-bold uppercase italic text-[10px] tracking-widest">Nenhum motorista encontrado com os critérios de busca.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 h-[90vh] flex flex-col">
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
                      <input required className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-800 font-black uppercase text-xl focus:border-blue-500 outline-none shadow-sm transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF</label><input required className={inputClasses} value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">RG</label><input required className={inputClasses} value={form.rg} onChange={e => setForm({...form, rg: maskRG(e.target.value)})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CNH</label><input required className={inputClasses} value={form.cnh} onChange={e => setForm({...form, cnh: e.target.value})} /></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">Telefone Principal</label><input required className={inputClasses} value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} /></div>
                   <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase ml-1">E-mail Operacional</label><input required className={`${inputClasses} lowercase`} value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                </div>

                <div className="bg-emerald-50/40 p-8 rounded-[2.5rem] border border-emerald-100 space-y-5">
                   <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">Beneficiário</h4>
                   <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">Nome Completo do Beneficiário</label><input className={inputClasses} value={form.beneficiaryName} onChange={e => setForm({...form, beneficiaryName: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">Telefone</label><input className={inputClasses} value={form.beneficiaryPhone} onChange={e => setForm({...form, beneficiaryPhone: maskPhone(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-emerald-400 uppercase ml-1">E-mail</label><input className={`${inputClasses} lowercase`} value={form.beneficiaryEmail} onChange={e => setForm({...form, beneficiaryEmail: e.target.value})} /></div>
                      </div>
                   </div>
                </div>

                <div className="bg-indigo-50/40 p-8 rounded-[2.5rem] border border-indigo-100 space-y-5">
                   <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">WhatsApp do Grupo</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Nome do Grupo</label><input className={inputClasses} value={form.whatsappGroupName} onChange={e => setForm({...form, whatsappGroupName: e.target.value})} placeholder="EX: FROTA ALS 01" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Link do Grupo</label><input className={inputClasses} value={form.whatsappGroupLink} onChange={e => setForm({...form, whatsappGroupLink: e.target.value})} placeholder="https://chat.whatsapp.com/..." /></div>
                   </div>
                </div>
              </div>

              <div className="col-span-4 space-y-6">
                <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 space-y-4">
                   <h4 className="text-[10px] font-black text-slate-700 uppercase">Equipamento</h4>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase">Placa Cavalo</label><input required className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: maskPlate(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-blue-400 uppercase">Ano Cav.</label><input required className={inputClasses} value={form.yearHorse} onChange={e => setForm({...form, yearHorse: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Placa Carr.</label><input required className={inputClasses} value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: maskPlate(e.target.value)})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Ano Carr.</label><input required className={inputClasses} value={form.yearTrailer} onChange={e => setForm({...form, yearTrailer: e.target.value})} /></div>
                      </div>
                   </div>
                </div>

                <div className="bg-blue-50/40 p-6 rounded-[2.5rem] border border-blue-100 space-y-4">
                   <h4 className="text-[10px] font-black text-blue-600 uppercase">Parâmetros</h4>
                   <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Tipo</label><select className={inputClasses} value={form.driverType} onChange={e => setForm({...form, driverType: e.target.value as any})}><option value="Externo">Externo (Terceiro)</option><option value="Frota">Frota ALS</option></select></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Status</label><select className={inputClasses} value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select></div>
                   </div>
                </div>

                <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  Salvar Registro
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
