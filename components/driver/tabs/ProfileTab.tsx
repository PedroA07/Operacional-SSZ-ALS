
import React, { useState, useRef, useEffect } from 'react';
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
  
  // Estados para edição (somente campos permitidos)
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
      alert("Erro ao atualizar cadastro. Tente novamente.");
    }
    setIsSaving(false);
  };

  const InfoCard = ({ label, value, highlight = false, mono = false }: any) => (
    <div className="flex flex-col border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-[13px] font-black uppercase ${highlight ? 'text-blue-500' : 'text-slate-100'} ${mono ? 'font-mono' : ''}`}>
        {value || '---'}
      </span>
    </div>
  );

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Puxando dados da tabela...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* HEADER DE PERFIL */}
      <div className="text-center space-y-4">
        <div className="relative inline-block group">
            <div 
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={`w-32 h-32 rounded-[3rem] bg-slate-900 border border-white/10 mx-auto overflow-hidden shadow-2xl transition-all ${isEditing ? 'ring-4 ring-blue-600 scale-105 cursor-pointer' : ''}`}
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
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{driver.name}</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">ID Registro: {driver.id}</p>
        </div>
      </div>

      {/* BLOCO DE DADOS CADASTRAIS (ESTILO OPERAÇÕES) */}
      <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl">
        <div className="grid grid-cols-2 gap-8">
           <InfoCard label="CPF" value={driver.cpf} mono />
           <InfoCard label="RG" value={driver.rg} mono />
        </div>

        <InfoCard label="Documento CNH" value={driver.cnh} mono />

        <div className="grid grid-cols-2 gap-8">
           <InfoCard label="Placa Cavalo" value={driver.plateHorse} highlight mono />
           <InfoCard label="Ano Veículo" value={driver.yearHorse} mono />
        </div>

        {/* CAMPOS EDITÁVEIS */}
        <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="space-y-1">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Telefone Celular</span>
                {isEditing ? (
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-blue-400 outline-none focus:border-blue-500"
                    value={editedPhone}
                    onChange={e => setEditedPhone(maskPhone(e.target.value))}
                  />
                ) : (
                  <span className="text-[16px] font-black text-white font-mono tracking-tight">{driver.phone || '---'}</span>
                )}
            </div>

            <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">E-mail para Contato</span>
                {isEditing ? (
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-blue-500 lowercase"
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
          <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsEditing(false)} className="py-5 bg-slate-800 text-slate-400 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
              <button disabled={isSaving} onClick={handleSave} className="py-5 bg-blue-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirmar'}
              </button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className="w-full py-6 bg-white/5 text-white border border-white/10 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-900 transition-all shadow-lg">
            Editar Meus Dados
          </button>
        )}

        <div className="pt-6">
          <button 
            onClick={onLogout} 
            className="w-full py-7 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] active:bg-red-600 active:text-white transition-all shadow-2xl flex items-center justify-center gap-4 group"
          >
            <svg className="w-6 h-6 group-active:scale-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Encerrar Sessão ALS
          </button>
        </div>
      </div>

      <p className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.5em] text-center mt-4">
        ALS TRANSPORTES OPERACIONAL V4.0
      </p>
    </div>
  );
};

export default ProfileTab;
