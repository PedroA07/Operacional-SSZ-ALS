
import React, { useState, useRef } from 'react';
import { User, Driver } from '../../../types';
import { maskPhone } from '../../../utils/masks';
import { driverService } from '../../../utils/driverService';

interface ProfileTabProps {
  user: User;
  driver: Driver | null;
  onLogout: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, driver, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPhoto, setEditedPhoto] = useState(driver?.photo || '');
  const [editedPhone, setEditedPhone] = useState(driver?.phone || '');
  const [editedEmail, setEditedEmail] = useState(driver?.email || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditedPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!driver) return;
    setIsSaving(true);
    
    const success = await driverService.updateProfile(driver.id, {
      photo: editedPhoto,
      phone: editedPhone,
      email: editedEmail
    });

    if (success) {
      setIsEditing(false);
      // Forçamos um pequeno delay para que o motorista sinta que salvou
      setTimeout(() => window.location.reload(), 500); 
    } else {
      alert("Erro ao salvar alterações. Tente novamente.");
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 px-1">
      {/* HEADER DO PERFIL */}
      <div className="text-center space-y-4 pt-4">
         <div className="relative inline-block group">
            <div 
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={`w-28 h-28 rounded-[2.2rem] bg-slate-900 border border-white/10 mx-auto overflow-hidden shadow-2xl transition-all ${isEditing ? 'ring-4 ring-blue-500 cursor-pointer scale-105' : ''}`}
            >
               {(editedPhoto || user.photo) ? (
                 <img src={editedPhoto || user.photo} className="w-full h-full object-cover" alt="" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-blue-400 font-black text-4xl">
                   {(user.displayName || user.username)[0]}
                 </div>
               )}
               {isEditing && (
                 <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center backdrop-blur-[2px]">
                   <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2.5"/>
                     <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/>
                   </svg>
                 </div>
               )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            
            {!isEditing && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-[#020617] flex items-center justify-center">
                 <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            )}
         </div>
         
         <div>
            <h3 className="text-2xl font-black uppercase tracking-tight leading-tight px-4">{user.displayName}</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              {user.role === 'motoboy' ? 'Motoboy Parceiro' : 'Motorista ALS Logística'}
            </p>
         </div>
      </div>

      {/* BLOCO DE DADOS */}
      <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-xl">
         <div className="flex justify-between border-b border-white/5 pb-5">
            <span className="text-[10px] font-black text-slate-500 uppercase">CPF</span>
            <span className="text-[11px] font-bold text-white font-mono">{driver?.cpf || '---'}</span>
         </div>

         {/* TELEFONE */}
         <div className="flex flex-col border-b border-white/5 pb-5 gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase">Telefone de Contato</span>
            {isEditing ? (
              <input 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-400 outline-none focus:border-blue-500"
                value={editedPhone}
                onChange={e => setEditedPhone(maskPhone(e.target.value))}
              />
            ) : (
              <span className="text-[11px] font-black text-blue-500 font-mono uppercase">{driver?.phone || '---'}</span>
            )}
         </div>

         {/* EMAIL */}
         <div className="flex flex-col border-b border-white/5 pb-5 gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase">E-mail Pessoal</span>
            {isEditing ? (
              <input 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-blue-500 lowercase"
                type="email"
                value={editedEmail}
                onChange={e => setEditedEmail(e.target.value)}
              />
            ) : (
              <span className="text-[11px] font-black text-slate-400 font-mono lowercase truncate">{driver?.email || '---'}</span>
            )}
         </div>

         <div className="flex justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase">Status do Perfil</span>
            <span className="text-[11px] font-black text-emerald-500 uppercase">✓ Autenticado</span>
         </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="space-y-4 px-2">
         {isEditing ? (
           <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="py-5 bg-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button 
                disabled={isSaving}
                onClick={handleSave}
                className="py-5 bg-blue-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar Dados'}
              </button>
           </div>
         ) : (
           <button 
            onClick={() => setIsEditing(true)}
            className="w-full py-5 bg-slate-100/5 text-white border border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-900 transition-all"
           >
             Editar Perfil ALS
           </button>
         )}

         <button 
          onClick={onLogout} 
          className="w-full py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-red-500 active:text-white transition-all shadow-lg flex items-center justify-center gap-3"
         >
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
           </svg>
           Encerrar Sessão
         </button>
      </div>
    </div>
  );
};

export default ProfileTab;
