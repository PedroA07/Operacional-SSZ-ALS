
import React, { useState } from 'react';
import { User, NotificationPreference } from '../../../types';
import { db } from '../../../utils/storage';

interface NotificationSettingsProps {
  user: User;
  onUpdate?: (prefs: NotificationPreference) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ user, onUpdate }) => {
  // Estado local para garantir que o toggle funcione visualmente na hora
  const [localPrefs, setLocalPrefs] = useState<NotificationPreference>(user.notificationPrefs || {
    newTrip: true,
    statusUpdate: true,
    paymentLiberated: true,
    systemChanges: true,
    newRegistrations: true
  });

  const toggle = async (key: keyof NotificationPreference) => {
    const nextPrefs = { ...localPrefs, [key]: !localPrefs[key] };
    
    // Atualiza interface imediatamente
    setLocalPrefs(nextPrefs);
    
    // Sincroniza com o banco
    const updatedUser = { ...user, notificationPrefs: nextPrefs };
    await db.saveUser(updatedUser);
    
    // Notifica o pai se necessário
    if (onUpdate) onUpdate(nextPrefs);
  };

  const SettingRow = ({ label, description, icon, isChecked, onToggle }: any) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{label}</p>
          <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">{description}</p>
        </div>
      </div>
      <button 
        type="button"
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-all relative outline-none focus:ring-2 focus:ring-blue-500/20 ${isChecked ? 'bg-blue-600' : 'bg-slate-300'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isChecked ? 'left-6' : 'left-1'}`}></div>
      </button>
    </div>
  );

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <SettingRow 
        label="Novas Viagens" 
        description="Alertas de OS cadastradas"
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>}
        isChecked={localPrefs.newTrip}
        onToggle={() => toggle('newTrip')}
      />
      <SettingRow 
        label="Eventos & Status" 
        description="Atualizações de motoristas e OC"
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
        isChecked={localPrefs.statusUpdate}
        onToggle={() => toggle('statusUpdate')}
      />
      <SettingRow 
        label="Financeiro" 
        description="Liberações de adiantamento e saldo"
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        isChecked={localPrefs.paymentLiberated}
        onToggle={() => toggle('paymentLiberated')}
      />
      <SettingRow 
        label="Cadastros" 
        description="Novos motoristas e clientes"
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>}
        isChecked={localPrefs.newRegistrations}
        onToggle={() => toggle('newRegistrations')}
      />
    </div>
  );
};

export default NotificationSettings;
