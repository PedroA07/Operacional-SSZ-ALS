
import React, { useState, useRef, useEffect } from 'react';
import { User, Driver } from '../../../types';
import { maskPhone, maskCPF, maskRG, maskPlate } from '../../../utils/masks';
import { driverService } from '../../../utils/driverService';

interface ProfileTabProps {
  user: User;
  driver: Driver | null;
  onLogout: () => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, driver, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({
    photo: '', phone: '', email: '', cpf: '', rg: '', cnh: '',
    plateHorse: '', plateTrailer: '', yearHorse: '', yearTrailer: ''
  });

  useEffect(() => {
    if (driver) {
      setEditForm({
        photo: driver.photo || '',
        phone: driver.phone || '',
        email: driver.email || '',
        cpf: driver.cpf || '',
        rg: driver.rg || '',
        cnh: driver.cnh || '',
        plateHorse: driver.plateHorse || '',
        plateTrailer: driver.plateTrailer || '',
        yearHorse: driver.yearHorse || '',
        yearTrailer: driver.yearTrailer || ''
      });
    }
  }, [driver]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditForm(prev => ({ ...prev, photo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!driver) return;
    setIsSaving(true);
    const success = await driverService.updateProfile(driver.id, editForm);
    if (success) {
      setIsEditing(false);
      setTimeout(() => window.location.reload(), 300); 
    } else {
      alert("Falha ao salvar dados. Tente novamente.");
    }
    setIsSaving(false);
  };

  const DataField = ({ label, value, highlight = false, mono = false, editing = false, onChange = () => {}, type = "text", mask = (v:string) => v }: any) => (
    <div className="flex flex-col border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</span>
      {editing ? (
        <input 
          type={type}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-blue-400 outline-none focus:border-blue-500 transition-all uppercase"
          value={value}
          onChange={e => onChange(mask(e.target.value))}
        />
      ) : (
        <span className={`text-[13px] font-black uppercase ${highlight ? 'text-blue-500' : 'text-slate-100'} ${mono ? 'font-mono' : ''}`}>
          {value || '---'}
        </span>
      )}
    </div>
  );

  if (!driver) return <div className="py-20 text-center text-[10px] font-black text-slate-500 uppercase">Sincronizando ficha...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-40">
      
      <div className="text-center space-y-4">
        <div className="relative inline-block">
            <div 
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={`w-32 h-32 rounded-[2.8rem] bg-slate-900 border border-white/10 mx-auto overflow-hidden shadow-2xl transition-all ${isEditing ? 'ring-4 ring-blue-600 scale-105' : 'ring-4 ring-white/5'}`}
            >
              {(isEditing ? editForm.photo : (driver.photo || user.photo)) ? (
                <img src={isEditing ? editForm.photo : (driver.photo || user.photo)} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-blue-500 font-black text-4xl italic">{driver.name[0]}</div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
        </div>
        <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white px-6 leading-tight">{driver.name}</h3>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Dossiê Operacional ALS</p>
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-8">
           <DataField label="CPF" value={isEditing ? editForm.cpf : driver.cpf} mono editing={isEditing} mask={maskCPF} onChange={(v:string) => setEditForm({...editForm, cpf: v})} />
           <DataField label="RG" value={isEditing ? editForm.rg : driver.rg} mono editing={isEditing} mask={maskRG} onChange={(v:string) => setEditForm({...editForm, rg: v})} />
        </div>

        <DataField label="Documento CNH" value={isEditing ? editForm.cnh : driver.cnh} mono editing={isEditing} onChange={(v:string) => setEditForm({...editForm, cnh: v})} />

        {/* FOCO NAS PLACAS CONFORME SOLICITADO */}
        <div className="grid grid-cols-2 gap-8">
           <DataField label="Placa Cavalo" value={isEditing ? editForm.plateHorse : driver.plateHorse} highlight mono editing={isEditing} mask={maskPlate} onChange={(v:string) => setEditForm({...editForm, plateHorse: v})} />
           <DataField label="Placa Carreta" value={isEditing ? editForm.plateTrailer : driver.plateTrailer} highlight mono editing={isEditing} mask={maskPlate} onChange={(v:string) => setEditForm({...editForm, plateTrailer: v})} />
        </div>

        <div className="pt-2 space-y-4 border-t border-white/5">
            <div className="space-y-1">
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block mb-1">Celular</span>
                {isEditing ? (
                  <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-blue-400 outline-none" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: maskPhone(e.target.value)})} />
                ) : (
                  <span className="text-[15px] font-black text-white font-mono">{driver.phone || '---'}</span>
                )}
            </div>
            <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">E-mail</span>
                {isEditing ? (
                  <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none lowercase" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                ) : (
                  <span className="text-xs font-bold text-slate-400 lowercase block truncate">{driver.email || '---'}</span>
                )}
            </div>
        </div>
      </div>

      <div className="space-y-4 px-1">
        {isEditing ? (
          <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsEditing(false)} className="py-5 bg-slate-800 text-slate-400 rounded-3xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
              <button disabled={isSaving} onClick={handleSave} className="py-5 bg-blue-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center">
                {isSaving ? 'Salvando...' : 'Confirmar'}
              </button>
          </div>
        ) : (
          <button onClick={() => setIsEditing(true)} className="w-full py-6 bg-white/5 text-white border border-white/10 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest active:bg-white active:text-slate-900 transition-all shadow-lg">
            Editar Todos os Dados
          </button>
        )}
        <div className="pt-10">
          <button onClick={onLogout} className="w-full py-7 bg-red-600 text-white rounded-[2.5rem] text-[12px] font-black uppercase tracking-[0.2em] active:bg-red-700 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-4">
            Encerrar Sessão
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
