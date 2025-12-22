
import React, { useState, useRef, useEffect } from 'react';
import { Staff, User } from '../../types';
import { db } from '../../utils/storage';

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    const staffId = editingId || `stf-${Date.now()}`;
    
    const existing = staffList.find(s => s.id === staffId);
    const newStatus = isAdmin ? (form.status || 'Ativo') : (existing?.status || 'Ativo');
    const statusSince = (isAdmin && form.status !== existing?.status) ? new Date().toISOString() : (existing?.statusSince || new Date().toISOString());

    const staffData: Staff = { 
      id: staffId,
      name: form.name || '',
      position: form.position || '',
      username: form.username || '',
      role: (form.role as 'admin' | 'staff') || 'staff',
      photo: form.photo,
      registrationDate: form.registrationDate || new Date().toISOString(),
      emailCorp: form.emailCorp,
      phoneCorp: form.phoneCorp,
      status: newStatus as 'Ativo' | 'Inativo',
      statusSince: statusSince
    };
    
    try {
      await onSaveStaff(staffData, form.password);
      setIsModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar informações.");
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Equipe ALS</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Contatos e Acessos</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setForm({ role: 'staff', name: '', position: '', username: '', password: '12345678', emailCorp: '', phoneCorp: '', status: 'Ativo' }); setEditingId(undefined); setIsModalOpen(true); }} 
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
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingId ? 'Editar Perfil' : 'Novo Colaborador'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-4">
                 <div className="flex justify-center mb-4">
                    <div onClick={() => photoRef.current?.click()} className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-all shadow-inner">
                       {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <span className="text-[9px] font-black text-slate-400 uppercase text-center p-2 italic leading-tight">FOTO<br/>PERFIL</span>}
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
                       <input required className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900 shadow-sm" value={form.name} onChange={e => {
                            const val = e.target.value;
                            const parts = val.trim().toLowerCase().split(' ');
                            const user = parts.length > 1 ? `${parts[0]}.${parts[parts.length-1]}` : parts[0];
                            setForm({...form, name: val, username: user});
                         }} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cargo</label>
                          <input required className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900" value={form.position} onChange={e => setForm({...form, position: e.target.value.toUpperCase()})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Permissão</label>
                          <select 
                            disabled={!isAdmin}
                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900 shadow-sm disabled:opacity-50" 
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
                          <label className="text-[9px] font-black text-blue-500 uppercase ml-1">E-mail Corp.</label>
                          <input required type="email" className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold lowercase outline-none focus:border-blue-500 text-slate-900" value={form.emailCorp} onChange={e => setForm({...form, emailCorp: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status Sistema</label>
                          <select 
                            disabled={!isAdmin}
                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900 shadow-sm disabled:opacity-50" 
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
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Telefone Corp.</label>
                          <input required className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:border-blue-500 text-slate-900 shadow-sm" value={form.phoneCorp} onChange={e => setForm({...form, phoneCorp: e.target.value})} placeholder="(00) 00000-0000" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-emerald-500 uppercase ml-1">Senha de Acesso</label>
                          <input 
                            type="text"
                            required
                            className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-black outline-none focus:border-emerald-500 text-slate-900" 
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
                      className={`w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                    >
                      {isProcessing ? 'Gravando...' : editingId ? 'Atualizar Meu Perfil' : 'Cadastrar Colaborador'}
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
