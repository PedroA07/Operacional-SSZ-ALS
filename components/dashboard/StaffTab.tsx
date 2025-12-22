
import React, { useState, useRef, useEffect } from 'react';
import { Staff, User } from '../../types';
import { db } from '../../utils/storage';
import { maskPhone } from '../../utils/masks';

interface StaffTabProps {
  staffList: Staff[];
  currentUser: User;
  onSaveStaff: (staff: Staff, password?: string) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
}

const StaffTab: React.FC<StaffTabProps> = ({ staffList, currentUser, onSaveStaff, onDeleteStaff }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<Staff & { password?: string }>>({ 
    name: '', position: '', username: '', role: 'staff', password: '12345678', emailCorp: '', phoneCorp: '', status: 'Ativo' 
  });
  const [users, setUsers] = useState<User[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [usernameOptions, setUsernameOptions] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadUsers = async () => {
      const u = await db.getUsers();
      setUsers(u);
    };
    loadUsers();
  }, [staffList, isModalOpen]);

  const isAdmin = currentUser.role === 'admin';
  const canEdit = (staffId: string) => isAdmin || currentUser.staffId === staffId;

  // Lógica de geração de sugestões de usuários baseada nos sobrenomes
  useEffect(() => {
    if (form.name && !editingId) {
      const cleanName = form.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const parts = cleanName.split(/\s+/);
      
      if (parts.length > 1) {
        const first = parts[0];
        // Gera opções pedro.sobrenome1, pedro.sobrenome2, etc.
        const options = parts.slice(1).map(surname => `${first}.${surname}`);
        
        // Filtra opções que já existem na base (para não permitir duplicidade)
        const uniqueOptions = options.filter(opt => !users.some(u => u.username === opt));
        
        setUsernameOptions(uniqueOptions);
        
        // Se a opção atual não estiver na lista de sugestões, reseta
        if (!uniqueOptions.includes(form.username || '')) {
           setForm(prev => ({ ...prev, username: uniqueOptions[0] || '' }));
        }
      } else {
        setUsernameOptions([]);
        const basicUser = parts[0] || '';
        // Só define se não existir
        if (!users.some(u => u.username === basicUser)) {
           setForm(prev => ({ ...prev, username: basicUser }));
        } else {
           setForm(prev => ({ ...prev, username: '' }));
        }
      }
    }
  }, [form.name, editingId, users]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    if (!form.username) {
      alert("ERRO: É necessário selecionar um nome de usuário válido que não esteja em uso.");
      return;
    }

    setIsProcessing(true);
    try {
      const staffId = editingId || `stf-${Date.now()}`;
      const existing = staffList.find(s => s.id === staffId);
      
      const newStatus = isAdmin ? (form.status || 'Ativo') : (existing?.status || 'Ativo');
      const statusSince = (isAdmin && form.status !== existing?.status) ? new Date().toISOString() : (existing?.statusSince || new Date().toISOString());

      const staffData: Staff = { 
        id: staffId,
        name: (form.name || '').toUpperCase(),
        position: (form.position || '').toUpperCase(),
        username: (form.username || '').toLowerCase(), // GARANTE MINÚSCULO NO SALVAMENTO
        role: (form.role as 'admin' | 'staff') || 'staff',
        photo: form.photo,
        registrationDate: form.registrationDate || new Date().toISOString(),
        emailCorp: (form.emailCorp || '').toLowerCase(),
        phoneCorp: form.phoneCorp || '',
        status: newStatus as 'Ativo' | 'Inativo',
        statusSince: statusSince
      };
      
      await onSaveStaff(staffData, form.password);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Erro ao salvar colaborador:", err);
      alert(`FALHA CRÍTICA: ${err.message || 'Verifique se o usuário já existe no banco de dados.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (s: Staff) => {
    const linkedUser = users.find(u => u.staffId === s.id);
    setForm({ ...s, password: linkedUser?.password || '12345678' });
    setEditingId(s.id);
    setIsModalOpen(true);
  };

  const inputClasses = "w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:border-blue-500 text-slate-900 shadow-sm transition-all placeholder:text-slate-300";

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Equipe ALS</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Contatos e Acessos</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { 
              setForm({ role: 'staff', name: '', position: '', username: '', password: '12345678', emailCorp: '', phoneCorp: '', status: 'Ativo' }); 
              setEditingId(undefined); 
              setUsernameOptions([]);
              setIsModalOpen(true); 
            }} 
            className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-95"
          >
            Novo Colaborador
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffList.map(s => {
          const linkedUser = users.find(u => u.staffId === s.id);
          const isPassVisible = showPasswords[s.id];
          const hasEditRights = canEdit(s.id);
          
          return (
            <div key={s.id} className={`bg-white rounded-[2.5rem] p-8 border ${s.status === 'Inativo' ? 'border-red-100 opacity-80' : 'border-slate-200'} shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col`}>
              <div className="absolute top-0 right-0 flex">
                <div className={`px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest ${s.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                  {s.role === 'admin' ? 'Administrador' : 'Comum'}
                </div>
              </div>

              <div className="flex items-center gap-6">
                 <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <span className="font-black text-slate-300 italic text-[10px]">3x4</span>}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${s.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-800 uppercase text-sm leading-tight truncate">{s.name}</h4>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter mt-1">{s.position}</p>
                 </div>
              </div>

              <div className="mt-6 space-y-3 pt-6 border-t border-slate-50 flex-1">
                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Status</span>
                    <div className="text-right">
                       <span className={`font-bold ${s.status === 'Ativo' ? 'text-emerald-600' : 'text-red-500'}`}>{s.status}</span>
                       <p className="text-[7px] text-slate-400 font-bold mt-0.5">Desde: {new Date(s.statusSince).toLocaleDateString('pt-BR')}</p>
                    </div>
                 </div>
                 <div className="flex justify-between items-start text-[9px] font-black uppercase tracking-widest overflow-hidden">
                    <span className="text-slate-400 mt-1 flex-shrink-0 mr-4">E-mail</span>
                    <span className="text-slate-800 lowercase font-bold truncate text-right flex-1 max-w-[140px] break-all">{s.emailCorp || '---'}</span>
                 </div>
                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Usuário</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg lowercase font-bold">{s.username}</span>
                 </div>
                 
                 {isAdmin && (
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Senha Acesso</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-mono text-[10px] font-black">
                          {isPassVisible ? (linkedUser?.password || '---') : '••••••••'}
                        </span>
                        <button 
                          onClick={() => setShowPasswords(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                          className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
                        >
                          {isPassVisible ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeWidth="2.5"/></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943-9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2.5"/></svg>
                          )}
                        </button>
                      </div>
                   </div>
                 )}
              </div>

              {hasEditRights && (
                <div className="mt-6 space-y-2">
                   <div className="flex gap-2">
                     <button onClick={() => handleEdit(s)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-all active:scale-95 shadow-md">Editar Cadastro</button>
                     {isAdmin && (
                       <button onClick={() => onDeleteStaff(s.id)} className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                       </button>
                     )}
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingId ? 'Perfil Colaborador' : 'Novo Colaborador'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-400 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                 <div className="flex justify-center mb-4">
                    <div onClick={() => photoRef.current?.click()} className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-all shadow-inner group">
                       {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <span className="text-[9px] font-black text-slate-400 uppercase text-center p-2 italic leading-tight group-hover:text-blue-500">FOTO<br/>PERFIL</span>}
                    </div>
                    <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => {
                       const f = e.target.files?.[0];
                       if (f) {
                          const reader = new FileReader();
                          reader.onload = () => setForm({...form, photo: reader.result as string});
                          reader.readAsDataURL(f);
                       }
                    }} />
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nome Completo (Caixa Alta)</label>
                       <input 
                        required 
                        className={`${inputClasses} uppercase`} 
                        placeholder="EX: JOÃO SILVA" 
                        value={form.name} 
                        onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} 
                       />
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
                       <label className="text-[9px] font-black text-blue-600 uppercase ml-1 tracking-widest">
                        {editingId ? 'Usuário de Acesso (Imutável)' : 'Selecione o Usuário de Acesso'}
                       </label>
                       
                       {!editingId ? (
                         <>
                           <div className="flex flex-wrap gap-2">
                             {usernameOptions.length > 0 ? usernameOptions.map(opt => (
                               <button
                                 key={opt}
                                 type="button"
                                 onClick={() => setForm(prev => ({ ...prev, username: opt }))}
                                 className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${form.username === opt ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-400 border-blue-200 hover:border-blue-400'}`}
                               >
                                 {opt}
                               </button>
                             )) : (
                               <p className="text-[8px] text-slate-400 font-bold uppercase italic">Digite o nome para gerar opções de usuário...</p>
                             )}
                           </div>
                           {usernameOptions.length > 0 && (
                             <div className="mt-2 p-3 bg-white/60 rounded-xl border border-blue-100 flex items-center gap-3">
                                <span className="text-[10px] font-black text-blue-600 lowercase">{form.username || '---'}</span>
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                             </div>
                           )}
                           <p className="text-[7px] text-blue-400 font-bold uppercase tracking-tighter mt-1">* O sistema já remove opções que já existem no banco de dados.</p>
                         </>
                       ) : (
                         <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-400 lowercase italic">
                            {form.username}
                         </div>
                       )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Cargo / Função</label>
                          <input required className={`${inputClasses} uppercase`} placeholder="EX: OPERACIONAL" value={form.position} onChange={e => setForm({...form, position: e.target.value.toUpperCase()})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Permissão</label>
                          <select 
                            disabled={!isAdmin}
                            className={`${inputClasses} disabled:opacity-50`} 
                            value={form.role} 
                            onChange={e => setForm({...form, role: e.target.value as any})}
                          >
                             <option value="staff">Comum</option>
                             <option value="admin">Administrador</option>
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-blue-500 uppercase ml-1 tracking-widest">E-mail Corp.</label>
                          <input required type="email" className={`${inputClasses} lowercase`} placeholder="email@als.com.br" value={form.emailCorp} onChange={e => setForm({...form, emailCorp: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Status Sistema</label>
                          <select 
                            disabled={!isAdmin}
                            className={`${inputClasses} disabled:opacity-50`} 
                            value={form.status} 
                            onChange={e => setForm({...form, status: e.target.value as any})}
                          >
                             <option value="Ativo">Ativo</option>
                             <option value="Inativo">Inativo</option>
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Telefone Corp.</label>
                          <input required className={inputClasses} value={form.phoneCorp} onChange={e => setForm({...form, phoneCorp: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-emerald-500 uppercase ml-1 tracking-widest">Senha de Acesso</label>
                          <input 
                            type="text"
                            required
                            className={inputClasses} 
                            value={form.password}
                            onChange={e => setForm({...form, password: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={isProcessing}
                      className={`w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                    >
                      {isProcessing && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                      {isProcessing ? 'Gravando...' : editingId ? 'Salvar Alterações' : 'Criar Colaborador'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffTab;
