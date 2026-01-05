
import React, { useState, useEffect, useRef } from 'react';
import { Staff, User } from '../../../types';
import { db } from '../../../utils/storage';
import { maskPhone } from '../../../utils/masks';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: Staff, password?: string) => Promise<void>;
  editingStaff?: Staff | null;
  currentUser: User;
  allUsers: User[];
}

const StaffModal: React.FC<StaffModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingStaff, 
  currentUser,
  allUsers 
}) => {
  const [form, setForm] = useState<Partial<Staff & { password?: string }>>({ 
    name: '', position: '', username: '', role: 'staff', password: '', emailCorp: '', phoneCorp: '', status: 'Ativo', photo: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [usernameOptions, setUsernameOptions] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingStaff) {
      const linkedUser = allUsers.find(u => u.staffId === editingStaff.id);
      setForm({ 
        ...editingStaff, 
        password: linkedUser?.password || '',
        photo: editingStaff.photo || ''
      });
      setIsEditingPassword(false);
    } else {
      setForm({ 
        role: 'staff', name: '', position: '', username: '', password: '12345678', 
        emailCorp: '', phoneCorp: '', status: 'Ativo', photo: '' 
      });
      setIsEditingPassword(true);
    }
  }, [editingStaff, isOpen, allUsers]);

  // Inteligência de geração de Username
  useEffect(() => {
    if (form.name && !editingStaff) {
      const cleanName = form.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const parts = cleanName.split(/\s+/);
      
      if (parts.length > 1) {
        const first = parts[0];
        const options = parts.slice(1).map(surname => `${first}.${surname}`);
        const uniqueOptions = options.filter(opt => !allUsers.some(u => u.username === opt));
        setUsernameOptions(uniqueOptions);
        if (uniqueOptions.length > 0 && !uniqueOptions.includes(form.username || '')) {
           setForm(prev => ({ ...prev, username: uniqueOptions[0] }));
        }
      } else {
        setUsernameOptions([]);
        const basicUser = parts[0] || '';
        if (!allUsers.some(u => u.username === basicUser)) {
           setForm(prev => ({ ...prev, username: basicUser }));
        }
      }
    }
  }, [form.name, editingStaff, allUsers]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const staffId = editingStaff?.id || `stf-${Date.now()}`;
      
      const staffData: Staff = { 
        id: staffId,
        name: (form.name || '').toUpperCase(),
        position: (form.position || '').toUpperCase(),
        username: (form.username || '').toLowerCase(),
        role: (form.role as 'admin' | 'staff') || 'staff',
        photo: form.photo || '',
        registrationDate: editingStaff?.registrationDate || new Date().toISOString(),
        emailCorp: (form.emailCorp || '').toLowerCase(),
        phoneCorp: form.phoneCorp || '',
        status: form.status || 'Ativo',
        statusSince: editingStaff?.statusSince || new Date().toISOString()
      };
      
      const passwordToSave = isEditingPassword ? form.password : undefined;
      await onSave(staffData, passwordToSave);
      onClose();
    } catch (err: any) {
      alert(`FALHA: ${err.message || 'Erro ao salvar.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const inputClasses = "w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white font-bold outline-none focus:border-blue-500 text-slate-900 shadow-sm transition-all placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingStaff ? 'Editar Colaborador' : 'Novo Colaborador ALS'}</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Configuração de Acessos e Perfil</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 rounded-full transition-all shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Foto e Nome */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="shrink-0 space-y-2">
              <label className={labelClass}>Foto de Perfil</label>
              <div 
                onClick={() => photoRef.current?.click()}
                className="w-32 h-32 rounded-[2.5rem] bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden group relative"
              >
                {form.photo ? (
                  <img src={form.photo} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-slate-300 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>
                )}
                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 flex items-center justify-center transition-all">
                  <span className="text-[7px] font-black text-white opacity-0 group-hover:opacity-100 uppercase">Alterar</span>
                </div>
              </div>
              <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>

            <div className="flex-1 space-y-5">
              <div className="space-y-1">
                <label className={labelClass}>Nome Completo</label>
                <input required className={inputClasses} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Claudio Silva" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className={labelClass}>Cargo / Função</label>
                    <input required className={inputClasses} value={form.position} onChange={e => setForm({...form, position: e.target.value})} placeholder="Ex: Operacional" />
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Nível de Acesso</label>
                    <select className={inputClasses} value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                       <option value="staff">OPERACIONAL (PADRÃO)</option>
                       <option value="admin">ADMINISTRADOR (DIRETORIA)</option>
                    </select>
                 </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-6">
             <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-3">Credenciais de Acesso ao Portal</h4>
             
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className={labelClass}>Nome de Usuário (Login)</label>
                   <input required className={inputClasses} value={form.username} onChange={e => setForm({...form, username: e.target.value.toLowerCase()})} />
                   {usernameOptions.length > 0 && !editingStaff && (
                     <div className="flex flex-wrap gap-2 mt-2">
                        {usernameOptions.map(opt => (
                          <button key={opt} type="button" onClick={() => setForm({...form, username: opt})} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${form.username === opt ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                            {opt}
                          </button>
                        ))}
                     </div>
                   )}
                </div>

                <div className="space-y-1">
                   <div className="flex justify-between items-center pr-1">
                      <label className={labelClass}>Senha de Acesso</label>
                      {editingStaff && !isEditingPassword && (
                        <button type="button" onClick={() => setIsEditingPassword(true)} className="text-[8px] font-black text-blue-500 uppercase hover:underline">Alterar Senha</button>
                      )}
                   </div>
                   <input 
                    type="text"
                    disabled={!isEditingPassword}
                    required={isEditingPassword}
                    className={`${inputClasses} font-mono`} 
                    value={isEditingPassword ? form.password : '••••••••'} 
                    onChange={e => setForm({...form, password: e.target.value})} 
                   />
                </div>
             </div>
          </div>

          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 space-y-6">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-3">Contatos Corporativos</h4>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className={labelClass}>E-mail ALS</label>
                   <input className={`${inputClasses} lowercase`} value={form.emailCorp} onChange={e => setForm({...form, emailCorp: e.target.value})} placeholder="exemplo@alstransportes.com.br" />
                </div>
                <div className="space-y-1">
                   <label className={labelClass}>WhatsApp Operacional</label>
                   <input className={inputClasses} value={form.phoneCorp} onChange={e => setForm({...form, phoneCorp: maskPhone(e.target.value)})} placeholder="(13) 00000-0000" />
                </div>
             </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : editingStaff ? 'Salvar Alterações' : 'Concluir Cadastro ALS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffModal;
