
import React, { useState } from 'react';
import { User, NotificationPreference } from '../../../types';
import { db } from '../../../utils/storage';

interface NotificationSettingsProps {
  user: User;
  onUpdate?: (prefs: NotificationPreference) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ user, onUpdate }) => {
  const [localPrefs, setLocalPrefs] = useState<NotificationPreference>(() => {
    return user.notificationPrefs || {
      newTrip: true,
      statusUpdate: true,
      paymentLiberated: true,
      systemChanges: true,
      newRegistrations: true
    };
  });

  const toggle = async (key: keyof NotificationPreference) => {
    const nextPrefs = { ...localPrefs, [key]: !localPrefs[key] };
    setLocalPrefs(nextPrefs);
    
    const updatedUser = { ...user, notificationPrefs: nextPrefs };
    
    // Sincroniza Banco
    await db.saveUser(updatedUser);
    
    // Sincroniza Sessão Ativa (Evita reset no refresh)
    const sessionStr = sessionStorage.getItem('als_active_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      session.notificationPrefs = nextPrefs;
      sessionStorage.setItem('als_active_session', JSON.stringify(session));
    }
    
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
      <SettingRow
        label="Sistema & Exclusões"
        description="Alterações no sistema e registros removidos"
        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
        isChecked={localPrefs.systemChanges}
        onToggle={() => toggle('systemChanges')}
      />
    </div>
  );
};

export default NotificationSettings;
