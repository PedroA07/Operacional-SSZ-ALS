
import React, { useState, useEffect, useRef } from 'react';
import { Staff, User } from '../../../types';
import { db } from '../../../utils/storage';
import { maskPhone } from '../../../utils/masks';
import { imageCompressor } from '../../../utils/imageCompressor';
import { usernameGenerator } from '../../../utils/usernameGenerator';
import { fileStorage } from '../../../utils/fileStorage';

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
    name: '', position: '', username: '', role: 'staff', password: '', emailCorp: '', phoneCorp: '', status: 'Ativo', photo: '', registrationDate: new Date().toISOString().split('T')[0]
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  
  const lastInitializedId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      lastInitializedId.current = undefined;
      return;
    }

    const currentTargetId = editingStaff?.id || 'new';
    if (lastInitializedId.current === currentTargetId) return;

    if (editingStaff) {
      const linkedUser = allUsers.find(u => u.staffId === editingStaff.id);
      setForm({ 
        ...editingStaff, 
        password: linkedUser?.password || '',
        photo: editingStaff.photo || '',
        emailCorp: editingStaff.emailCorp || '',
        phoneCorp: editingStaff.phoneCorp || '',
        registrationDate: editingStaff.registrationDate?.split('T')[0]
      });
      setIsEditingPassword(false);
      setSuggestions([]);
    } else {
      setForm({ 
        role: 'staff', name: '', position: '', username: '', password: '12345678', 
        emailCorp: '', phoneCorp: '', status: 'Ativo', photo: '', registrationDate: new Date().toISOString().split('T')[0]
      });
      setIsEditingPassword(true);
      setSuggestions([]);
    }

    lastInitializedId.current = currentTargetId;
  }, [editingStaff, isOpen, allUsers]);

  const handleNameChange = (val: string) => {
    const name = val.toUpperCase();
    setForm(prev => ({ ...prev, name }));
    if (!editingStaff) {
      const newsug = usernameGenerator.generateSuggestions(val);
      setSuggestions(newsug);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await imageCompressor.compress(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.7
        });
        setForm(prev => ({ ...prev, photo: compressed }));
      } catch (err) {
        alert("Erro ao processar imagem de perfil.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const staffId = editingStaff?.id || `stf-${Date.now()}`;
      let finalPhotoUrl = form.photo || '';

      // MUDANÇA CRÍTICA: Se a foto for um Base64 novo, faz o upload para o R2
      if (finalPhotoUrl.startsWith('data:')) {
        try {
          finalPhotoUrl = await fileStorage.uploadStaffPhoto(finalPhotoUrl, staffId);
        } catch (uploadErr) {
          console.error("Erro no upload da foto para R2:", uploadErr);
          // Fallback silencioso ou aviso (aqui mantemos o processo, mas o R2 é mandatório para produção)
          throw new Error("Não foi possível salvar a foto no servidor R2. Verifique sua conexão.");
        }
      }
      
      const staffData: Staff = { 
        id: staffId,
        name: (form.name || '').toUpperCase(),
        position: (form.position || '').toUpperCase(),
        username: (form.username || '').toLowerCase(),
        role: (form.role as 'admin' | 'staff') || 'staff',
        photo: finalPhotoUrl, // Agora é a URL do R2
        registrationDate: form.registrationDate ? new Date(form.registrationDate).toISOString() : new Date().toISOString(),
        emailCorp: (form.emailCorp || '').toLowerCase(),
        phoneCorp: form.phoneCorp || '',
        status: (form.status as 'Ativo' | 'Inativo') || 'Ativo',
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
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Gestão de Perfil e Acessos (Storage R2)</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 rounded-full transition-all shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="shrink-0 space-y-2 text-center">
              <label className={labelClass}>Foto de Perfil</label>
              <div onClick={() => photoRef.current?.click()} className="w-24 h-24 rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden relative group mx-auto shadow-inner">
                {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2"/></svg>}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[8px] text-white font-black uppercase">Trocar</span>
                </div>
              </div>
              <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </div>

            <div className="flex-1 space-y-5">
              <div className="space-y-1">
                <label className={labelClass}>Nome Completo</label>
                <input required className={inputClasses} value={form.name} onChange={e => handleNameChange(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className={labelClass}>Data de Admissão</label>
                    <input type="date" required className={inputClasses} value={form.registrationDate} onChange={e => setForm({...form, registrationDate: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Status Colaborador</label>
                    <select className={inputClasses} value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                       <option value="Ativo">ATIVO / LIBERADO</option>
                       <option value="Inativo">INATIVO / BLOQUEADO</option>
                    </select>
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-1">
                <label className={labelClass}>Cargo / Função</label>
                <input required className={inputClasses} value={form.position} onChange={e => setForm({...form, position: e.target.value.toUpperCase()})} />
             </div>
             <div className="space-y-1">
                <label className={labelClass}>Nível de Acesso</label>
                <select className={inputClasses} value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                   <option value="staff">OPERACIONAL (PADRÃO)</option>
                   <option value="admin">ADMINISTRADOR (DIRETORIA)</option>
                </select>
             </div>
          </div>

          <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-6">
             <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Acesso ao Portal</h4>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                   <div className="space-y-1">
                      <label className={labelClass}>Usuário (Login)</label>
                      <input required className={inputClasses} value={form.username} onChange={e => setForm({...form, username: e.target.value.toLowerCase()})} />
                   </div>
                   {!editingStaff && suggestions.length > 0 && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                        <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest ml-1">Sugestões baseadas no nome:</p>
                        <div className="flex flex-wrap gap-1.5">
                           {suggestions.map(sug => (
                             <button 
                               key={sug}
                               type="button"
                               onClick={() => setForm(prev => ({ ...prev, username: sug }))}
                               className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${form.username === sug ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'}`}
                             >
                               {sug}
                             </button>
                           ))}
                        </div>
                     </div>
                   )}
                </div>

                <div className="space-y-1">
                   <div className="flex justify-between items-center pr-1">
                      <label className={labelClass}>Senha</label>
                      {editingStaff && !isEditingPassword && <button type="button" onClick={() => setIsEditingPassword(true)} className="text-[8px] font-black text-blue-500 uppercase">Alterar</button>}
                   </div>
                   <input type="text" disabled={!isEditingPassword} required={isEditingPassword} className={`${inputClasses} font-mono`} value={isEditingPassword ? form.password : '••••••••'} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
             </div>
          </div>

          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 space-y-6">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contatos ALS</h4>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className={labelClass}>E-mail Corporativo</label>
                   <input className={`${inputClasses} lowercase`} value={form.emailCorp} onChange={e => setForm({...form, emailCorp: e.target.value.toLowerCase()})} />
                </div>
                <div className="space-y-1">
                   <label className={labelClass}>WhatsApp</label>
                   <input className={inputClasses} value={form.phoneCorp} onChange={e => setForm({...form, phoneCorp: maskPhone(e.target.value)})} />
                </div>
             </div>
          </div>

          <button type="submit" disabled={isProcessing} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
             {isProcessing ? (
               <>
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 Sincronizando Dados...
               </>
             ) : editingStaff ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffModal;
