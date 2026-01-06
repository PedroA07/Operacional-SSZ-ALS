
import React, { useState, useRef, useEffect } from 'react';
import { User, Driver } from '../../../types';
import { maskPhone, maskCPF } from '../../../utils/masks';
import { driverService } from '../../../utils/driverService';

interface ProfileTabProps {
  user: User;
  driver: Driver | null;
  onLogout: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, driver, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editedPhoto, setEditedPhoto] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedEmail, setEditedEmail] = useState('');

  useEffect(() => {
    if (driver) {
      setEditedPhoto(driver.photo || '');
      setEditedPhone(driver.phone || '');
      setEditedEmail(driver.email || '');
    }
  }, [driver]);
  
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
      setTimeout(() => window.location.reload(), 300); 
    } else {
      alert("Falha ao atualizar dados.");
    }
    setIsSaving(false);
  };

  const DataField = ({ label, value, highlight = false, mono = false }: any) => (
    <div className="flex flex-col border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</span>
      <span className={`text-[13px] font-black uppercase ${highlight ? 'text-blue-500' : 'text-slate-100'} ${mono ? 'font-mono' : ''}`}>
        {value || '---'}
      </span>
    </div>
  );

  if (!driver) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-600 font-black text-[10px] uppercase">
      Puxando ficha cadastral...
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-40">
      
      {/* CABEÇALHO DA FICHA */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
            <div 
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={`w-32 h-32 rounded-[2.8rem] bg-slate-900 border border-white/10 mx-auto overflow-hidden shadow-2xl transition-all ${isEditing ? 'ring-4 ring-blue-600 scale-105 cursor-pointer' : 'ring-4 ring-white/5'}`}
            >
              {(isEditing ? editedPhoto : (driver.photo || user.photo)) ? (
                <img src={isEditing ? editedPhoto : (driver.photo || user.photo)} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-500 font-black text-4xl italic">
                  {driver.name[0]}
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2.5"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
        </div>
        <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white px-6 leading-tight">{driver.name}</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Motorista Oficial ALS</p>
        </div>
      </div>

      {/* DADOS CADASTRAIS (ESTILO RH/CADASTRO) */}
      <div className="bg-slate-900/60 rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-8">
           <DataField label="CPF" value={driver.cpf} mono />
           <DataField label="RG" value={driver.rg} mono />
        </div>

        <DataField label="Documento CNH" value={driver.cnh} mono />

        <div className="grid grid-cols-2 gap-8">
           <DataField label="Cavalo" value={driver.plateHorse} highlight mono />
           <DataField label="Ano Modelo" value={driver.yearHorse} mono />
        </div>

        <div className="pt-2 space-y-4 border-t border-white/5">
            <div className="space-y-1">
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block mb-1">Telefone Celular</span>
                {isEditing ? (
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-blue-400 outline-none focus:border-blue-500 transition-all"
                    value={editedPhone}
                    onChange={e => setEditedPhone(maskPhone(e.target.value))}
                  />
                ) : (
                  <span className="text-[15px] font-black text-white font-mono">{driver.phone || '---'}</span>
                )}
            </div>

            <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">E-mail Cadastrado</span>
                {isEditing ? (
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-blue-500 lowercase transition-all"
                    type="email"
                    value={editedEmail}
                    onChange={e => setEditedEmail(e.target.value)}
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-400 lowercase block truncate">{driver.email || '---'}</span>
                )}
            </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="space-y-4 px-1">
        {isEditing ? (
          <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsEditing(false)} className="py-5 bg-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
              <button disabled={isSaving} onClick={handleSave} className="py-5 bg-blue-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirmar'}
              </button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className="w-full py-6 bg-white/5 text-white border border-white/10 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-900 transition-all shadow-lg">
            Editar Meus Contatos
          </button>
        )}

        <div className="pt-10">
          <button 
            onClick={onLogout} 
            className="w-full py-7 bg-red-600 text-white rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.2em] active:bg-red-700 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4 group"
          >
            <svg className="w-6 h-6 group-active:scale-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Encerrar Sessão ALS
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
