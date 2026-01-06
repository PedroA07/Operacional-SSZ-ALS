
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
      // Recarrega para sincronizar com o banco
      setTimeout(() => window.location.reload(), 300); 
    } else {
      alert("Erro ao salvar alterações. Tente novamente.");
    }
    setIsSaving(false);
  };

  const DataRow = ({ label, value, highlight = false }: { label: string, value?: string, highlight?: boolean }) => (
    <div className="flex flex-col border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-[13px] font-black uppercase ${highlight ? 'text-blue-500' : 'text-slate-100'}`}>
        {value || '---'}
      </span>
    </div>
  );

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizando perfil...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <div className="space-y-8 animate-in fade-in duration-500 px-1">
        
        {/* CABEÇALHO PERFIL */}
        <div className="text-center space-y-4 pt-2">
          <div className="relative inline-block">
              <div 
                onClick={() => isEditing && fileInputRef.current?.click()}
                className={`w-28 h-28 rounded-[2.5rem] bg-slate-900 border border-white/10 mx-auto overflow-hidden shadow-2xl transition-all ${isEditing ? 'ring-4 ring-blue-600 scale-105 cursor-pointer' : ''}`}
              >
                {(isEditing ? editedPhoto : (driver.photo || user.photo)) ? (
                  <img src={isEditing ? editedPhoto : (driver.photo || user.photo)} className="w-full h-full object-cover" alt="Foto" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-blue-500 font-black text-4xl italic">
                    {driver.name[0]}
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
          </div>
          <div>
              <h3 className="text-xl font-black uppercase tracking-tight leading-tight px-4">{driver.name}</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Motorista Oficial ALS Logística</p>
          </div>
        </div>

        {/* DADOS CADASTRAIS (TABELA DRIVERS) */}
        <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl">
          <div className="grid grid-cols-2 gap-6">
            <DataRow label="CPF" value={driver.cpf} />
            <DataRow label="RG" value={driver.rg} />
          </div>

          <DataRow label="Registro CNH" value={driver.cnh} />

          <div className="grid grid-cols-2 gap-6">
            <DataRow label="Placa Cavalo" value={driver.plateHorse} highlight={true} />
            <DataRow label="Ano Modelo" value={driver.yearHorse} />
          </div>

          <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Telefone de Contato</span>
              {isEditing ? (
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-blue-400 outline-none focus:border-blue-500 transition-all"
                  value={editedPhone}
                  onChange={e => setEditedPhone(maskPhone(e.target.value))}
                />
              ) : (
                <span className="text-[14px] font-black text-blue-500 font-mono">{driver.phone || '---'}</span>
              )}
          </div>

          <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">E-mail Cadastrado</span>
              {isEditing ? (
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-blue-500 lowercase transition-all"
                  type="email"
                  value={editedEmail}
                  onChange={e => setEditedEmail(e.target.value)}
                />
              ) : (
                <span className="text-[11px] font-bold text-slate-400 lowercase truncate block">{driver.email || '---'}</span>
              )}
          </div>
          
          <div className="pt-2">
            <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
               <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">ID Registro</span>
               <span className="text-[10px] font-mono text-blue-300/50">{driver.id}</span>
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="space-y-4 px-2">
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsEditing(false)} className="py-5 bg-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
                <button disabled={isSaving} onClick={handleSave} className="py-5 bg-blue-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Confirmar'}
                </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="w-full py-6 bg-white/5 text-white border border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-900 transition-all shadow-lg">
              Editar Perfil
            </button>
          )}

          <div className="pt-6">
            <button 
              onClick={onLogout} 
              className="w-full py-7 bg-red-500/10 text-red-500 border border-red-500/20 rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.2em] active:bg-red-600 active:text-white transition-all shadow-2xl flex items-center justify-center gap-4 group"
            >
              <svg className="w-6 h-6 group-active:scale-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Encerrar Sessão
            </button>
          </div>
        </div>

        <p className="text-[8px] text-slate-700 font-bold uppercase tracking-[0.5em] text-center mt-4 pb-4">
          ALS TRANSPORTES OPERACIONAL V4.0
        </p>
      </div>
    </div>
  );
};

export default ProfileTab;
