
import React, { useState, useEffect } from 'react';
import { LoginCredential } from '../../../types';
import { db } from '../../../utils/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingLogin?: LoginCredential | null;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess, editingLogin }) => {
  const [form, setForm] = useState<Partial<LoginCredential>>({
    siteName: '', url: '', username: '', password: '', additionalFields: []
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingLogin) {
      setForm(editingLogin);
    } else {
      setForm({ siteName: '', url: '', username: '', password: '', additionalFields: [] });
    }
  }, [editingLogin, isOpen]);

  const addField = () => {
    setForm(prev => ({
      ...prev,
      additionalFields: [...(prev.additionalFields || []), { label: '', value: '' }]
    }));
  };

  const removeField = (idx: number) => {
    setForm(prev => ({
      ...prev,
      additionalFields: prev.additionalFields?.filter((_, i) => i !== idx)
    }));
  };

  const updateField = (idx: number, key: 'label' | 'value', val: string) => {
    const fields = [...(form.additionalFields || [])];
    fields[idx][key] = val;
    setForm({ ...form, additionalFields: fields });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.siteName || !form.username || !form.password) {
      alert("Por favor, preencha os campos obrigatórios (Site, Usuário e Senha).");
      return;
    }

    setIsSaving(true);
    const payload = {
      ...form,
      id: editingLogin?.id || `new-${Date.now()}`,
      createdAt: editingLogin?.createdAt || new Date().toISOString()
    } as LoginCredential;

    try {
      const success = await db.saveLogin(payload);
      if (success) {
        onSuccess();
        onClose();
      } else {
        alert("Falha ao salvar no banco de dados. Verifique sua conexão ou permissões.");
      }
    } catch (err) {
      alert("Ocorreu um erro inesperado ao tentar salvar o registro.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-slate-700 font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col h-[90vh]">
        <header className="p-8 border-b bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/logo.jfif" alt="ALS" className="w-full h-full object-contain" />
             </div>
             <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{editingLogin ? 'Editar Acesso' : 'Novo Login Externo'}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Cofre de Senhas Criptografado</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
        </header>

        <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-4">
             <div className="space-y-1">
                <label className={labelClass}>Nome do Sistema / Site</label>
                <input required className={inputClass} value={form.siteName} onChange={e => setForm({...form, siteName: e.target.value.toUpperCase()})} placeholder="Ex: PORTAL LOG-IN" />
             </div>
             <div className="space-y-1">
                <label className={labelClass}>Endereço Web (Link)</label>
                <input className={inputClass} style={{ textTransform: 'none' }} value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
             <div className="space-y-1">
                <label className={labelClass}>Usuário / E-mail</label>
                <input required className={inputClass} style={{ textTransform: 'none' }} value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className={labelClass}>Senha</label>
                <input required className={inputClass} style={{ textTransform: 'none' }} type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
             </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-50">
             <div className="flex justify-between items-center px-1">
                <label className={labelClass}>Informações Adicionais</label>
                <button type="button" onClick={addField} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Adicionar Campo</button>
             </div>
             
             {form.additionalFields?.map((f, idx) => (
               <div key={idx} className="flex gap-3 items-center animate-in slide-in-from-right-2">
                 <input className="w-1/3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase" placeholder="Rótulo (ex: Token)" value={f.label} onChange={e => updateField(idx, 'label', e.target.value)} />
                 <input className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold" placeholder="Valor" value={f.value} onChange={e => updateField(idx, 'value', e.target.value)} />
                 <button type="button" onClick={() => removeField(idx)} className="p-2 text-slate-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="4"/></svg></button>
               </div>
             ))}
          </div>

          <div className="pt-10">
            <button 
              disabled={isSaving}
              type="submit" 
              className="w-full py-6 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Salvando no Cofre...' : 'Registrar Acesso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
