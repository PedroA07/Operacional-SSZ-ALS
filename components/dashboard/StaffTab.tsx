
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Staff, User } from '../../types';
import { db } from '../../utils/storage';

interface StaffTabProps {
  staffList: Staff[];
  currentUserRole: string;
  onSaveStaff: (staff: Staff, id?: string) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
}

const StaffTab: React.FC<StaffTabProps> = ({ staffList, currentUserRole, onSaveStaff, onDeleteStaff }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState<Partial<Staff & { password?: string }>>({ 
    name: '', position: '', username: '', role: 'staff', password: '12345678' 
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
  }, [staffList]);

  const existingPositions = useMemo(() => {
    const pos = staffList.map(s => s.position).filter(p => !!p);
    return Array.from(new Set(pos)).sort();
  }, [staffList]);

  const generateUsername = (name: string) => {
    const parts = name.trim().toLowerCase().split(' ');
    if (parts.length < 1) return '';
    const first = parts[0];
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    return last ? `${first}.${last}` : first;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    const staffId = editingId || `stf-${Date.now()}`;
    const staffData = { 
      ...form, 
      id: staffId, 
      username: form.username || generateUsername(form.name || ''),
      registrationDate: form.registrationDate || new Date().toISOString() 
    } as Staff;
    
    try {
      await onSaveStaff(staffData, editingId);
      
      const passToSave = form.password || '12345678';
      const currentUser = users.find(u => u.staffId === staffId);
      
      if (currentUser) {
        await db.saveUser({ ...currentUser, password: passToSave, position: staffData.position, role: staffData.role as any });
      } else {
        await db.saveUser({
          id: `u-${staffId}`,
          username: staffData.username,
          displayName: staffData.name,
          role: staffData.role as any,
          staffId: staffId,
          lastLogin: new Date().toISOString(),
          isFirstLogin: true,
          password: passToSave,
          position: staffData.position
        });
      }
      
      setIsModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar informações do colaborador.");
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

  const togglePasswordVisibility = (staffId: string) => {
    setShowPasswords(prev => ({ ...prev, [staffId]: !prev[staffId] }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Equipe ALS</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão Administrativa do Portal</p>
        </div>
        {currentUserRole === 'admin' && (
          <button 
            onClick={() => { setForm({ role: 'staff', name: '', position: '', username: '', password: '12345678' }); setEditingId(undefined); setIsModalOpen(true); }} 
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
          
          return (
            <div key={s.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest ${s.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                {s.role}
              </div>
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <span className="font-black text-slate-300 italic text-[10px]">3x4</span>}
                 </div>
                 <div>
                    <h4 className="font-black text-slate-800 uppercase text-sm leading-tight">{s.name}</h4>
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter mt-1">{s.position}</p>
                 </div>
              </div>

              <div className="mt-6 space-y-3 pt-6 border-t border-slate-50">
                 <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">Usuário</span>
                    <span className="text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">{s.username}</span>
                 </div>
                 
                 {currentUserRole === 'admin' && (
                   <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Senha Master</span>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-mono text-[10px] font-black">{isPassVisible ? (linkedUser?.password || '---') : '••••••••'}</span>
                        <button 
                          onClick={() => togglePasswordVisibility(s.id)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400"
                        >
                          {isPassVisible ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" strokeWidth="2.5"/></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2.5"/></svg>
                          )}
                        </button>
                      </div>
                   </div>
                 )}
              </div>

              {currentUserRole === 'admin' && (
                <div className="mt-6 flex gap-2">
                   <button onClick={() => handleEdit(s)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all">Editar</button>
                   <button 
                     disabled={isProcessing}
                     onClick={() => onDeleteStaff(s.id)} 
                     className="px-4 py-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                   </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingId ? 'Dados do Perfil' : 'Novo Colaborador'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-5">
                 <div className="flex justify-center mb-6">
                    <div onClick={() => photoRef.current?.click()} className="w-24 h-24 rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-all">
                       {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-slate-400 uppercase text-center p-2 italic">FOTO 3x4</span>}
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
                       <input required className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900 shadow-sm" value={form.name} onChange={e => {
                            const val = e.target.value;
                            setForm({...form, name: val, username: generateUsername(val)});
                         }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cargo</label>
                          <input required list="positions-list" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900 shadow-sm" value={form.position} onChange={e => setForm({...form, position: e.target.value.toUpperCase()})} />
                          <datalist id="positions-list">
                            {existingPositions.map(p => <option key={p} value={p} />)}
                          </datalist>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Permissão</label>
                          <select className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900 shadow-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                             <option value="staff">Colaborador (Comum)</option>
                             <option value="admin">Administrador</option>
                          </select>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-blue-500 uppercase ml-1">Usuário</label>
                          <input readOnly className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-black text-blue-600 outline-none" value={form.username} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-emerald-500 uppercase ml-1">Senha</label>
                          <input 
                            type="text"
                            required
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white font-black outline-none focus:border-emerald-500 text-slate-900 shadow-sm" 
                            value={form.password}
                            onChange={e => setForm({...form, password: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 <div className="pt-6">
                    <button 
                      type="submit" 
                      disabled={isProcessing}
                      className={`w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                    >
                      {isProcessing ? 'Gravando...' : editingId ? 'Salvar Perfil' : 'Criar Colaborador'}
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
