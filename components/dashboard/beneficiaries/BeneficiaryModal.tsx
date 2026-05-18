
import React, { useState, useEffect, useRef } from 'react';
import { Beneficiary, User } from '../../../types';
import { db } from '../../../utils/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (beneficiary: Beneficiary) => Promise<void>;
  editing?: Beneficiary | null;
}

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const maskDoc = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  }
  const c = d.slice(0, 14);
  if (c.length <= 2) return c;
  if (c.length <= 5) return `${c.slice(0, 2)}.${c.slice(2)}`;
  if (c.length <= 8) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5)}`;
  if (c.length <= 12) return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8)}`;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`;
};

const generateCredentials = (b: Partial<Beneficiary>) => {
  const firstName = b.name?.trim().split(' ')[0].toLowerCase() || 'beneficiario';
  const docDigits = (b.cpf || b.cnpj || '').replace(/\D/g, '');
  const username = docDigits.length >= 4 ? docDigits : `${firstName}.${Math.floor(1000 + Math.random() * 9000)}`;
  const password = `${firstName}${docDigits.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`;
  return { username, password };
};

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 outline-none focus:bg-white/15 focus:border-blue-400/50 transition-all';

const BeneficiaryModal: React.FC<Props> = ({ isOpen, onClose, onSave, editing }) => {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<{ username: string; password: string } | null>(null);
  const [form, setForm] = useState<Partial<Beneficiary>>({});
  const initialized = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) { initialized.current = null; return; }
    const key = editing?.id || '__new__';
    if (initialized.current === key) return;
    initialized.current = key;
    setGeneratedCreds(null);
    setToast(null);
    if (editing) {
      setForm({ ...editing });
    } else {
      setForm({ status: 'Ativo', paymentPreference: 'PIX' });
    }
  }, [isOpen, editing]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { showToast('Nome é obrigatório.', 'err'); return; }
    if (!form.phone?.trim()) { showToast('Telefone é obrigatório.', 'err'); return; }
    setSaving(true);
    try {
      const id = editing?.id || `ben-${Date.now()}`;
      const payload: Beneficiary = {
        id,
        name: form.name.trim().toUpperCase(),
        cpf: form.cpf?.trim() || undefined,
        cnpj: form.cnpj?.trim() || undefined,
        phone: form.phone.trim(),
        email: form.email?.trim().toLowerCase() || undefined,
        pixKey: form.pixKey?.trim() || undefined,
        paymentPreference: form.paymentPreference,
        bankName: form.bankName?.trim() || undefined,
        bankAgency: form.bankAgency?.trim() || undefined,
        bankAccount: form.bankAccount?.trim() || undefined,
        status: form.status || 'Ativo',
        registrationDate: form.registrationDate || new Date().toISOString(),
        userId: form.userId,
        observations: form.observations?.trim() || undefined,
      };
      await onSave(payload);
      showToast('Beneficiário salvo com sucesso.');
      setTimeout(onClose, 900);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao salvar.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!form.name?.trim()) { showToast('Preencha o nome antes de criar o login.', 'err'); return; }
    setCreatingLogin(true);
    try {
      const creds = generateCredentials(form);
      const userId = form.userId || `u-ben-${Date.now()}`;
      const userPayload: User = {
        id: userId,
        username: creds.username.toLowerCase(),
        password: creds.password,
        displayName: form.name.trim(),
        role: 'beneficiary',
        lastLogin: new Date().toISOString(),
        status: 'Ativo',
        isFirstLogin: true,
      };
      await db.saveUser(userPayload);
      setForm(f => ({ ...f, userId }));
      setGeneratedCreds(creds);
      showToast('Login criado com sucesso.');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao criar login.', 'err');
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleRevokeLogin = async () => {
    if (!form.userId) return;
    try {
      await db.deleteUser(form.userId);
      setForm(f => ({ ...f, userId: undefined }));
      setGeneratedCreds(null);
      showToast('Acesso revogado.');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao revogar.', 'err');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl bg-slate-900 rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              {editing ? 'Editar Beneficiário' : 'Novo Beneficiário'}
            </h2>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              {editing ? `ID: ${editing.id}` : 'Cadastro de beneficiário independente'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mx-8 mt-5 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border ${toast.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {toast.msg}
          </div>
        )}

        <div className="px-8 py-6 space-y-8">

          {/* I. Identificação */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">
              I. Identificação
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome Completo" className="col-span-2">
                <input className={inputCls} placeholder="NOME DO BENEFICIÁRIO" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="CPF">
                <input className={inputCls} placeholder="000.000.000-00" value={form.cpf || ''} onChange={e => setForm(f => ({ ...f, cpf: maskDoc(e.target.value) }))} maxLength={14} />
              </Field>
              <Field label="CNPJ">
                <input className={inputCls} placeholder="00.000.000/0000-00" value={form.cnpj || ''} onChange={e => setForm(f => ({ ...f, cnpj: maskDoc(e.target.value) }))} maxLength={18} />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input className={inputCls} placeholder="(00) 00000-0000" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))} maxLength={15} />
              </Field>
              <Field label="E-mail">
                <input className={inputCls + ' lowercase'} placeholder="email@exemplo.com" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Status" className="col-span-2">
                <div className="flex gap-3">
                  {(['Ativo', 'Inativo'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all
                        ${form.status === s
                          ? s === 'Ativo' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-red-500/20 border-red-500/40 text-red-400'
                          : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          {/* II. Financeiro */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">
              II. Dados de Pagamento
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tipo de Operação" className="col-span-2">
                <div className="flex gap-3">
                  {(['PIX', 'TED'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, paymentPreference: t }))}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all
                        ${form.paymentPreference === t ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}>
                      {t === 'PIX' ? 'PIX' : 'TED Bancário'}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Chave PIX" className="col-span-2">
                <input className={inputCls} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" value={form.pixKey || ''} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} />
              </Field>
              <Field label="Banco">
                <input className={inputCls} placeholder="Nome do banco" value={form.bankName || ''} onChange={e => setForm(f => ({ ...f, bankName: e.target.value.toUpperCase() }))} />
              </Field>
              <Field label="Agência">
                <input className={inputCls} placeholder="0000" value={form.bankAgency || ''} onChange={e => setForm(f => ({ ...f, bankAgency: e.target.value }))} />
              </Field>
              <Field label="Conta" className="col-span-2">
                <input className={inputCls} placeholder="00000-0" value={form.bankAccount || ''} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} />
              </Field>
            </div>
          </section>

          {/* III. Acesso ao Portal */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">
              III. Acesso ao Portal
            </h3>
            {form.userId ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-wide">Acesso ativo</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Este beneficiário possui login próprio no portal.</p>
                  </div>
                  <button type="button" onClick={handleRevokeLogin} className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-black uppercase hover:bg-red-500/30 transition-all">
                    Revogar
                  </button>
                </div>
                {generatedCreds && (
                  <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/10">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Credenciais geradas — anote agora</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[8px] text-slate-500 uppercase font-black">Usuário</p>
                        <p className="text-[11px] font-mono font-black text-white">{generatedCreds.username}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-500 uppercase font-black">Senha</p>
                        <p className="text-[11px] font-mono font-black text-white">{generatedCreds.password}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
                <p className="text-[9px] text-slate-500 leading-relaxed">Sem acesso ao portal. Clique para gerar um login exclusivo para este beneficiário.</p>
                <button type="button" onClick={handleCreateLogin} disabled={creatingLogin}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
                  {creatingLogin
                    ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>}
                  Criar Login
                </button>
              </div>
            )}
          </section>

          {/* IV. Observações */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">
              IV. Observações
            </h3>
            <Field label="Anotações internas">
              <textarea className={inputCls + ' resize-none'} rows={3} placeholder="Informações adicionais..." value={form.observations || ''} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} />
            </Field>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between gap-4">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50">
            {saving
              ? <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Salvando...</>
              : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>Salvar Beneficiário</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BeneficiaryModal;
