
import React, { useState, useEffect, useRef } from 'react';
import { Staff, User } from '../../../types';
import { db } from '../../../utils/storage';
import { maskPhone } from '../../../utils/masks';
import { fileStorage } from '../../../utils/fileStorage';
import ImageCropperModal from '../../shared/ImageCropperModal';
import PhotoViewerModal from '../../shared/PhotoViewerModal';

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
  
  const [tempPhotoSrc, setTempPhotoSrc] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

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
      const linkedUser = allUsers.find(u => 
        u.staffId === editingStaff.id || 
        u.username.toLowerCase() === editingStaff.username.toLowerCase()
      );
      
      setForm({ 
        ...editingStaff, 
        password: linkedUser?.password || '',
        photo: editingStaff.photo || '',
        emailCorp: editingStaff.emailCorp || '',
        phoneCorp: editingStaff.phoneCorp || '',
        registrationDate: editingStaff.registrationDate?.split('T')[0]
      });
      setIsEditingPassword(false);
    } else {
      setForm({ 
        role: 'staff', name: '', position: '', username: '', password: '12345678', 
        emailCorp: '', phoneCorp: '', status: 'Ativo', photo: '', registrationDate: new Date().toISOString().split('T')[0]
      });
      setIsEditingPassword(true);
    }

    lastInitializedId.current = currentTargetId;
  }, [editingStaff, isOpen, allUsers]);

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempPhotoSrc(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCroppedImage = (croppedBase64: string) => {
    setForm(prev => ({ ...prev, photo: croppedBase64 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const staffId = editingStaff?.id || `stf-${Date.now()}`;
      const staffName = (form.name || '').toUpperCase();
      let finalPhotoUrl = form.photo || '';

      if (finalPhotoUrl.startsWith('data:')) {
        finalPhotoUrl = await fileStorage.uploadStaffPhoto(finalPhotoUrl, staffName);
      }
      
      const staffData: Staff = { 
        id: staffId,
        name: staffName,
        position: (form.position || '').toUpperCase(),
        username: (form.username || '').toLowerCase(),
        role: (form.role as 'admin' | 'staff') || 'staff',
        photo: finalPhotoUrl,
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
    <>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col h-[90vh]">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingStaff ? 'Editar Colaborador' : 'Novo Colaborador ALS'}</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Ficha de Identificação Individual</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 rounded-full transition-all shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="shrink-0 space-y-2 text-center">
                <label className={labelClass}>Foto de Perfil</label>
                <div className="relative group mx-auto w-28 h-28">
                  <div 
                    onClick={() => photoRef.current?.click()} 
                    className="w-full h-full rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all overflow-hidden relative shadow-inner"
                  >
                    {form.photo ? <img src={form.photo} className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2"/></svg>}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] text-white font-black uppercase">Alterar</span>
                    </div>
                  </div>
                </div>
                <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={handlePhotoFileSelect} />
              </div>

              <div className="flex-1 space-y-5">
                <div className="space-y-1">
                  <label className={labelClass}>Nome Completo</label>
                  <input 
                    required 
                    className={inputClasses} 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Admissão</label>
                    <input type="date" required className={inputClasses} value={form.registrationDate} onChange={e => setForm({...form, registrationDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Status</label>
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
                <label className={labelClass}>E-mail Corporativo</label>
                <input type="email" className={inputClasses} value={form.emailCorp} onChange={e => setForm({...form, emailCorp: e.target.value.toLowerCase()})} placeholder="usuario@als.com.br" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1">
                <label className={labelClass}>Telefone Corporativo</label>
                <input 
                  type="text" 
                  className={inputClasses} 
                  value={form.phoneCorp} 
                  onChange={e => setForm({...form, phoneCorp: maskPhone(e.target.value)})} 
                  placeholder="(00) 00000-0000" 
                />
              </div>
            </div>

            <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-6">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Credenciais de Acesso</h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className={labelClass}>Usuário (Login)</label>
                  <input required className={inputClasses} value={form.username} onChange={e => setForm({...form, username: e.target.value.toLowerCase()})} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center pr-1">
                    <label className={labelClass}>Senha</label>
                    {editingStaff && !isEditingPassword && (
                      <button type="button" onClick={() => setIsEditingPassword(true)} className="text-[8px] font-black text-blue-500 uppercase hover:underline">Trocar</button>
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

            <button type="submit" disabled={isProcessing} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sincronizando...
                </>
              ) : editingStaff ? 'Salvar Alterações' : 'Criar Colaborador'}
            </button>
          </form>
        </div>
      </div>

      {/* Modais Auxiliares */}
      {isCropperOpen && tempPhotoSrc && (
        <ImageCropperModal 
          isOpen={isCropperOpen}
          imageSrc={tempPhotoSrc}
          onClose={() => { setIsCropperOpen(false); setTempPhotoSrc(null); }}
          onCrop={handleCroppedImage}
        />
      )}

      {isViewerOpen && form.photo && (
        <PhotoViewerModal 
          isOpen={isViewerOpen}
          url={form.photo}
          title={form.name || 'Visualizar Foto'}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  );
};

export default StaffModal;
