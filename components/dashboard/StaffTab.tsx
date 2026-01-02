
import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Staff, User } from '../../types';
import { db } from '../../utils/storage';
import { maskPhone } from '../../utils/masks';

interface StaffTabProps {
  staffList: Staff[];
  currentUser: User;
  onSaveStaff: (staff: Staff, password?: string) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  forceEditStaffId?: string | null;
  onCloseForceEdit?: () => void;
}

const StaffTab = forwardRef<HTMLDivElement, StaffTabProps>(({ 
  staffList, 
  currentUser, 
  onSaveStaff, 
  onDeleteStaff, 
  forceEditStaffId, 
  onCloseForceEdit 
}, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Staff | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  
  const [form, setForm] = useState<Partial<Staff & { password?: string }>>({ 
    name: '', position: '', username: '', role: 'staff', password: '', emailCorp: '', phoneCorp: '', status: 'Ativo', photo: ''
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [showPasswordsList, setShowPasswordsList] = useState<Record<string, boolean>>({});
  const [usernameOptions, setUsernameOptions] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  const existingPositions = Array.from(new Set(staffList.map(s => s.position).filter(Boolean))).sort();

  const loadUsers = async () => {
    const u = await db.getUsers();
    setUsers(u);
  };

  useEffect(() => {
    loadUsers();
  }, [staffList, isModalOpen]);

  useEffect(() => {
    if (forceEditStaffId) {
      const staff = staffList.find(s => s.id === forceEditStaffId);
      if (staff) {
        handleEdit(staff);
        if (onCloseForceEdit) onCloseForceEdit();
      }
    }
  }, [forceEditStaffId, staffList]);

  const isAdmin = currentUser.role === 'admin';
  const canEdit = (staffId: string) => isAdmin || currentUser.staffId === staffId;

  useEffect(() => {
    if (form.name && !editingId) {
      const cleanName = form.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const parts = cleanName.split(/\s+/);
      
      if (parts.length > 1) {
        const first = parts[0];
        const options = parts.slice(1).map(surname => `${first}.${surname}`);
        const uniqueOptions = options.filter(opt => !users.some(u => u.username === opt));
        setUsernameOptions(uniqueOptions);
        if (!uniqueOptions.includes(form.username || '')) {
           setForm(prev => ({ ...prev, username: uniqueOptions[0] || '' }));
        }
      } else {
        setUsernameOptions([]);
        const basicUser = parts[0] || '';
        if (!users.some(u => u.username === basicUser)) {
           setForm(prev => ({ ...prev, username: basicUser }));
        }
      }
    }
  }, [form.name, editingId, users]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const staffId = editingId || `stf-${Date.now()}`;
      const existing = staffList.find(s => s.id === staffId);
      
      const staffData: Staff = { 
        id: staffId,
        name: (form.name || '').toUpperCase(),
        position: (form.position || '').toUpperCase(),
        username: (form.username || '').toLowerCase(),
        role: (form.role as 'admin' | 'staff') || 'staff',
        photo: form.photo || existing?.photo || '',
        registrationDate: existing?.registrationDate || new Date().toISOString(),
        emailCorp: (form.emailCorp || '').toLowerCase(),
        phoneCorp: form.phoneCorp || '',
        status: existing?.status || 'Ativo',
        statusSince: existing?.statusSince || new Date().toISOString()
      };
      
      const passwordToSave = (!editingId || isEditingPassword) ? form.password : undefined;
      
      await onSaveStaff(staffData, passwordToSave);
      setIsModalOpen(false);
      setIsEditingPassword(false);
      setShowPass(false);
      loadUsers();
    } catch (err: any) {
      alert(`FALHA: ${err.message || 'Erro ao salvar.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (s: Staff) => {
    const linkedUser = users.find(u => u.staffId === s.id);
    setForm({ 
      ...s, 
      password: linkedUser?.password || '',
      emailCorp: s.emailCorp || '',
      phoneCorp: s.phoneCorp || '',
      photo: s.photo || ''
    });
    setEditingId(s.id);
    setShowPass(false);
    setIsEditingPassword(false);
    setIsModalOpen(true);
  };

  const confirmDelete = (s: Staff) => {
    setItemToDelete(s);
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (itemToDelete) {
      setIsProcessing(true);
      await onDeleteStaff(itemToDelete.id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      setIsProcessing(false);
    }
  };

  const inputClasses = "w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:border-blue-500 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-400";

  return (
    <div className="space-y-6" ref={ref}>
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Equipe ALS</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Contatos e Acessos</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { 
              setForm({ role: 'staff', name: '', position: '', username: '', password: '12345678', emailCorp: '', phoneCorp: '', status: 'Ativo', photo: '' }); 
              setEditingId(undefined); 
              setIsEditingPassword(true);
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
          const isPassVisible = showPasswordsList[s.id];
          const hasEditRights = canEdit(s.id);
          
          return (
            <div key={s.id} className={`bg-white rounded-[2.5rem] p-8 border ${s.status === 'Inativo' ? 'border-red-100' : 'border-slate-200'} shadow-sm hover:shadow-xl transition-all flex flex-col`}>
              <div className="flex items-center gap-6">
                 <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                        {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <span className="font-black text-slate-300 italic text-[10px]">ALS</span>}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${s.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       {/* Ajustado: Remoção do truncate para exibir nome completo com quebra */}
                       <h4 className="font-black text-slate-800 uppercase text-sm leading-tight break-words">{s.name}</h4>
                       {s.role === 'admin' && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[6px] font-black uppercase shrink-0">Admin</span>}
                    </div>
                    <p className="text-[10px] text-blue-500 font-bold uppercase mt-1">{s.position}</p>
                 </div>
              </div>

              <div className="mt-6 space-y-3 pt-6 border-t border-slate-50 flex-1">
                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Usuário</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg lowercase font-bold">{s.username}</span>
                 </div>

                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Data Admissão</span>
                    <span className="text-slate-700 font-bold">{new Date(s.registrationDate).toLocaleDateString('pt-BR')}</span>
                 </div>
                 
                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Contatos</span>
                    <div className="text-right">
                       <p className="text-[9px] font-bold text-slate-700">{s.phoneCorp || '(13) ---- ----'}</p>
                       <p className="text-[8px] font-bold text-blue-500 lowercase">{s.emailCorp || 'sem e-mail corp.'}</p>
                    </div>
                 </div>

                 {isAdmin && (
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Senha Operacional</span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-mono text-[10px] font-black">
                          {isPassVisible ? (linkedUser?.password || '---') : '••••••••'}
                        </span>
                        <button onClick={() => setShowPasswordsList(prev => ({ ...prev, [s.id]: !prev[s.id] }))} className="p-1 text-slate-300 hover:text-blue-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isPassVisible ? (
                               <path strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            ) : (
                               <g strokeWidth="2.5">
                                 <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                 <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                               </g>
                            )}
                          </svg>
                        </button>
                      </div>
                   </div>
                 )}
              </div>

              {hasEditRights && (
                <div className="mt-6 flex gap-2">
                   <button onClick={() => handleEdit(s)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-all shadow-md">Editar Cadastro</button>
                   {isAdmin && (
                     <button onClick={() => confirmDelete(s)} className="px-4 py-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                     </button>
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE EXCLUSÃO CUSTOMIZADO */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase">Confirmar Exclusão</h3>
                    <p className="text-xs text-slate-400 mt-2">Você está prestes a remover permanentemente:</p>
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                       <p className="text-sm font-black text-slate-700 uppercase">{itemToDelete.name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{itemToDelete.position}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                      onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }}
                      className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      disabled={isProcessing}
                      onClick={executeDelete}
                      className="py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? 'Excluindo...' : 'Sim, Excluir'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingId ? 'Perfil Colaborador' : 'Novo Colaborador'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-400 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                 <div className="flex justify-center mb-4">
                    <div onClick={() => photoRef.current?.click()} className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden">
                       {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <span className="text-[9px] font-black text-slate-400 uppercase text-center">FOTO</span>}
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
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                       <input required className={`${inputClasses} uppercase`} value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Telefone Corp.</label>
                          <input className={inputClasses} value={form.phoneCorp} onChange={e => setForm({...form, phoneCorp: maskPhone(e.target.value)})} placeholder="(13) 99999-9999" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">E-mail Corp.</label>
                          <input className={`${inputClasses} lowercase`} value={form.emailCorp} onChange={e => setForm({...form, emailCorp: e.target.value})} placeholder="nome@als.com.br" />
                       </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
                       <label className="text-[9px] font-black text-blue-600 uppercase ml-1">Usuário de Acesso</label>
                       {!editingId ? (
                         <div className="flex flex-wrap gap-2">
                           {usernameOptions.map(opt => (
                             <button key={opt} type="button" onClick={() => setForm(prev => ({ ...prev, username: opt }))} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${form.username === opt ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-400 border-blue-200'}`}>
                               {opt}
                             </button>
                           ))}
                         </div>
                       ) : (
                         <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-400 lowercase">{form.username}</div>
                       )}
                    </div>
                    
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cargo</label>
                       <input 
                         required 
                         list="positions-list" 
                         className={`${inputClasses} uppercase`} 
                         value={form.position} 
                         onChange={e => setForm({...form, position: e.target.value.toUpperCase()})} 
                         placeholder="DIGITE OU SELECIONE UM CARGO"
                       />
                       <datalist id="positions-list">
                         {existingPositions.map(pos => (
                           <option key={pos} value={pos} />
                         ))}
                       </datalist>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Privilégio de Sistema</label>
                       <select disabled={!isAdmin} className={inputClasses} value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                          <option value="staff">OPERACIONAL COMUM</option>
                          <option value="admin">ADMINISTRADOR MASTER</option>
                       </select>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-emerald-500 uppercase ml-1">Senha de Acesso</label>
                       <div className="flex gap-2">
                          <div className="relative flex-1">
                             <input 
                               type={showPass ? "text" : "password"}
                               required={!editingId || isEditingPassword}
                               disabled={editingId && !isEditingPassword}
                               className={`${inputClasses} pr-12`} 
                               placeholder={editingId && !isEditingPassword ? "••••••••" : "DEFINIR NOVA SENHA"}
                               value={isEditingPassword || !editingId ? form.password : ""}
                               onChange={e => setForm({...form, password: e.target.value})}
                             />
                             <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                {showPass ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeWidth="2.5"/></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/>
                                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2.5"/>
                                  </svg>
                                )}
                             </button>
                          </div>
                          {editingId && isAdmin && (
                            <button 
                              type="button" 
                              onClick={() => { 
                                setIsEditingPassword(!isEditingPassword); 
                                if (!isEditingPassword) setForm({...form, password: ''});
                              }} 
                              className={`px-4 rounded-2xl text-[9px] font-black uppercase transition-all ${isEditingPassword ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white shadow-lg'}`}
                            >
                              {isEditingPassword ? 'Cancelar' : 'Alterar'}
                            </button>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="pt-4">
                    <button type="submit" disabled={isProcessing} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                      {isProcessing ? 'Gravando...' : editingId ? 'Salvar Alterações' : 'Criar Colaborador'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
});

export default StaffTab;
