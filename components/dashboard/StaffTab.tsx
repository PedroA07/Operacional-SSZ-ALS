
import React, { useState, useRef, useMemo } from 'react';
import { Staff } from '../../types';
import { db } from '../../utils/storage';

interface StaffTabProps {
  staffList: Staff[];
  onSaveStaff: (staff: Partial<Staff>, id?: string) => void;
  onDeleteStaff: (id: string) => void;
}

const StaffTab: React.FC<StaffTabProps> = ({ staffList, onSaveStaff, onDeleteStaff }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<Partial<Staff>>({ name: '', position: '', username: '', role: 'staff' });
  const photoRef = useRef<HTMLInputElement>(null);

  // Armazena cargos únicos existentes para sugerir no datalist
  const existingPositions = useMemo(() => {
    const pos = staffList.map(s => s.position).filter(p => !!p);
    return Array.from(new Set(pos)).sort();
  }, [staffList]);

  const handleCreateUser = (name: string) => {
    const parts = name.trim().toLowerCase().split(' ');
    if (parts.length < 2) return parts[0] || '';
    // Formato: nome.ultimoSobrenome
    return `${parts[0]}.${parts[parts.length - 1]}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const staffId = editingId || `stf-${Date.now()}`;
    const staffData = { ...form, id: staffId, registrationDate: form.registrationDate || new Date().toISOString() } as Staff;
    
    // Salva o cadastro do colaborador
    onSaveStaff(staffData, editingId);
    
    // Se for um novo cadastro, cria o acesso de usuário correspondente
    if (!editingId) {
      await db.saveUser({
        id: `u-${staffId}`,
        username: form.username!,
        displayName: form.name!,
        role: form.role as any,
        staffId: staffId,
        lastLogin: new Date().toISOString(),
        isFirstLogin: true,
        position: form.position,
        avatar: form.photo,
        password: '12345678' // Senha padrão inicial
      });
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deseja realmente apagar o colaborador ${name} e remover seu acesso ao sistema?`)) {
      onDeleteStaff(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Equipe ALS</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Colaboradores e Administradores</p>
        </div>
        <button onClick={() => { setForm({ role: 'staff', name: '', position: '', username: '' }); setEditingId(undefined); setIsModalOpen(true); }} className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">Novo Colaborador</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {staffList.map(s => (
          <div key={s.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[8px] font-black uppercase tracking-widest ${s.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              {s.role}
            </div>
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                  {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-300 italic text-[10px]">3x4</div>}
               </div>
               <div>
                  <h4 className="font-black text-slate-800 uppercase text-sm leading-tight">{s.name}</h4>
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter mt-1">{s.position}</p>
               </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
               <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">User: <span className="text-slate-800">{s.username}</span></div>
               <div className="flex gap-2">
                 <button onClick={() => { setForm(s); setEditingId(s.id); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors" title="Editar">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5"/></svg>
                 </button>
                 <button onClick={() => handleDelete(s.id, s.name)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Apagar">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg>
                 </button>
               </div>
            </div>
          </div>
        ))}
        {staffList.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">Nenhum colaborador cadastrado.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingId ? 'Editar Perfil' : 'Cadastrar Colaborador'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-6">
                 <div className="flex justify-center mb-6">
                    <div onClick={() => photoRef.current?.click()} className="w-24 h-24 rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-all">
                       {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-slate-400 uppercase text-center p-2">FOTO 3x4</span>}
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
                       <input 
                         required 
                         className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900 placeholder-slate-300" 
                         value={form.name} 
                         placeholder="DIGITE O NOME..."
                         onChange={e => {
                            const val = e.target.value;
                            setForm({...form, name: val, username: handleCreateUser(val)});
                         }} 
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cargo</label>
                          <input 
                            required 
                            list="positions-list"
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900 placeholder-slate-300" 
                            value={form.position} 
                            placeholder="EX: ANALISTA..."
                            onChange={e => setForm({...form, position: e.target.value.toUpperCase()})} 
                          />
                          <datalist id="positions-list">
                            {existingPositions.map(p => <option key={p} value={p} />)}
                          </datalist>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Permissão</label>
                          <select className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white font-bold uppercase outline-none focus:border-blue-500 text-slate-900" value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                             <option value="staff">Staff Geral</option>
                             <option value="admin">Administrador</option>
                          </select>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-blue-500 uppercase ml-1">Usuário de Acesso (Gerado automaticamente)</label>
                       <input readOnly className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-black text-blue-600 outline-none" value={form.username} />
                    </div>
                 </div>

                 <div className="pt-4 space-y-3">
                    <p className="text-[8px] font-bold text-slate-400 uppercase italic text-center">Senha inicial padrão: 12345678 (Será trocada no 1º acesso)</p>
                    <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">Salvar Cadastro</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffTab;
