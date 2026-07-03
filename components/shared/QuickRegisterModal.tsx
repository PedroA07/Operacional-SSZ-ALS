import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Driver, Customer, Port, PreStacking, AuthorizedPerson } from '../../types';
import { db } from '../../utils/storage';
import { maskCEP, maskCNPJ, maskCPF, maskRG, maskPhone, maskPlate } from '../../utils/masks';

export type QuickRegisterType = 'driver' | 'customer' | 'port' | 'preStacking' | 'authorizedPerson';

interface QuickRegisterModalProps {
  type: QuickRegisterType;
  isOpen: boolean;
  onClose: () => void;
  /** Recebe a entidade recém-criada (já com id) para seleção imediata no formulário. */
  onCreated: (entity: any) => void;
  /** Texto digitado na busca — usado como sugestão de nome. */
  initialName?: string;
  /** Cor de destaque (hex) do formulário que abriu o modal. */
  accent?: string;
}

const TYPE_META: Record<QuickRegisterType, { title: string; subtitle: string; idPrefix: string }> = {
  driver:           { title: 'Novo Motorista',        subtitle: 'Cadastro rápido de motorista',            idPrefix: 'drv' },
  customer:         { title: 'Novo Cliente',          subtitle: 'Cadastro rápido de cliente',              idPrefix: 'cust' },
  port:             { title: 'Novo Porto / Terminal', subtitle: 'Cadastro rápido de terminal',             idPrefix: 'prt' },
  preStacking:      { title: 'Novo Pré-Stacking',     subtitle: 'Cadastro rápido de unidade',              idPrefix: 'ps' },
  authorizedPerson: { title: 'Nova Pessoa Autorizada',subtitle: 'Cadastro rápido de responsável',          idPrefix: 'ap' },
};

const genId = (prefix: string) =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`);

const QuickRegisterModal: React.FC<QuickRegisterModalProps> = ({ type, isOpen, onClose, onCreated, initialName = '', accent = '#2563eb' }) => {
  const meta = TYPE_META[type];
  const isJuridical = type === 'customer' || type === 'port' || type === 'preStacking';

  const [form, setForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [error, setError] = useState('');
  const lastSearchedCnpj = useRef<string>('');

  // Inicializa o formulário sempre que o modal abre
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    lastSearchedCnpj.current = '';
    const nameHint = (initialName || '').toUpperCase();
    if (type === 'driver') {
      setForm({ name: nameHint, cpf: '', cnh: '', phone: '', plateHorse: '', plateTrailer: '', driverType: 'Externo', status: 'Ativo' });
    } else if (type === 'authorizedPerson') {
      setForm({ name: nameHint, cpf: '', rg: '', veiculo: '' });
    } else {
      setForm({ name: nameHint, legalName: '', cnpj: '', zipCode: '', address: '', neighborhood: '', city: '', state: '' });
    }
  }, [isOpen, type, initialName]);

  // Busca automática por CEP (entidades jurídicas)
  useEffect(() => {
    if (!isOpen || !isJuridical) return;
    const cep = (form.zipCode || '').replace(/\D/g, '');
    if (cep.length === 8) handleCepLookup(cep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.zipCode]);

  // Busca automática por CNPJ (entidades jurídicas)
  useEffect(() => {
    if (!isOpen || !isJuridical) return;
    const cnpj = (form.cnpj || '').replace(/\D/g, '');
    if (cnpj.length === 14) {
      if (lastSearchedCnpj.current === cnpj) return;
      handleCnpjLookup(cnpj);
    } else if (cnpj.length < 14) {
      lastSearchedCnpj.current = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cnpj]);

  const handleCepLookup = async (cep: string) => {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      if (res.ok) {
        const data = await res.json();
        setForm((prev: any) => ({
          ...prev,
          address: (data.street || prev.address || '').toUpperCase(),
          neighborhood: (data.neighborhood || prev.neighborhood || '').toUpperCase(),
          city: (data.city || prev.city || '').toUpperCase(),
          state: (data.state || prev.state || '').toUpperCase(),
        }));
      }
    } catch { /* silencioso — preenchimento manual */ }
  };

  const handleCnpjLookup = async (cnpjInput?: string) => {
    const target = (cnpjInput || form.cnpj || '').replace(/\D/g, '');
    if (target.length !== 14) return;
    lastSearchedCnpj.current = target;
    setIsCnpjLoading(true);
    try {
      const res = await fetch(`https://minhareceita.org/${target}`);
      if (res.ok) {
        const data = await res.json();
        setForm((prev: any) => ({
          ...prev,
          name: (data.nome_fantasia || data.razao_social || prev.name || '').toUpperCase(),
          legalName: (data.razao_social || prev.legalName || '').toUpperCase(),
          address: `${data.logradouro || ''}${data.numero ? ', ' + data.numero : ''}`.trim().toUpperCase() || prev.address,
          neighborhood: (data.bairro || prev.neighborhood || '').toUpperCase(),
          city: (data.municipio || prev.city || '').toUpperCase(),
          state: (data.uf || prev.state || '').toUpperCase(),
          zipCode: data.cep ? maskCEP(data.cep) : prev.zipCode,
        }));
      }
    } catch { /* silencioso */ } finally {
      setIsCnpjLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError('');

    if (!form.name || !form.name.trim()) {
      setError('Informe o nome.');
      return;
    }

    setIsSaving(true);
    try {
      const id = genId(meta.idPrefix);
      let ok = false;
      let entity: any = null;

      if (type === 'driver') {
        entity = {
          id,
          name: form.name.trim().toUpperCase(),
          cpf: (form.cpf || '').trim(),
          rg: '',
          cnh: (form.cnh || '').trim().toUpperCase(),
          phone: (form.phone || '').trim(),
          email: '',
          plateHorse: (form.plateHorse || '').trim().toUpperCase(),
          plateTrailer: (form.plateTrailer || '').trim().toUpperCase(),
          yearHorse: '',
          yearTrailer: '',
          platesHorse: form.plateHorse ? [{ id: `ph-${id}`, plate: form.plateHorse.trim().toUpperCase(), year: '', isPrimary: true }] : [],
          platesTrailer: form.plateTrailer ? [{ id: `pt-${id}`, plate: form.plateTrailer.trim().toUpperCase(), year: '', isPrimary: true }] : [],
          driverType: form.driverType || 'Externo',
          status: 'Ativo',
          operations: [],
          registrationDate: new Date().toISOString(),
        } as Driver;
        ok = await db.saveDriver(entity as Driver);
      } else if (type === 'authorizedPerson') {
        entity = {
          id,
          name: form.name.trim().toUpperCase(),
          cpf: form.cpf?.trim() || undefined,
          rg: form.rg?.trim() || undefined,
          veiculo: form.veiculo?.trim().toUpperCase() || undefined,
          createdAt: new Date().toISOString(),
        } as AuthorizedPerson;
        ok = await db.saveAuthorizedPerson(entity as AuthorizedPerson);
      } else {
        const base: Partial<Customer & Port & PreStacking> = {
          id,
          name: form.name.trim().toUpperCase(),
          legalName: (form.legalName || form.name).trim().toUpperCase(),
          cnpj: form.cnpj || '',
          address: (form.address || '').toUpperCase(),
          neighborhood: (form.neighborhood || '').toUpperCase(),
          city: (form.city || '').toUpperCase(),
          state: (form.state || '').toUpperCase(),
          zipCode: form.zipCode || '',
          registrationDate: new Date().toISOString().split('T')[0],
        };
        if (type === 'customer') { (base as Customer).operations = []; entity = base; ok = await db.saveCustomer(base); }
        else if (type === 'port') { entity = base; ok = await db.savePort(base); }
        else { entity = base; ok = await db.savePreStacking(base); }
      }

      if (!ok) {
        setError('Falha ao salvar. Verifique os dados e tente novamente.');
        return;
      }

      // Atualiza o restante do app (Dashboard recarrega as listas)
      window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
      onCreated(entity);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const inputClasses =
    'w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 text-[12px] font-bold uppercase focus:bg-white outline-none transition-all placeholder:text-slate-300';
  const labelClass = 'text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';
  const focusStyle = { outlineColor: accent } as React.CSSProperties;

  return createPortal(
    <div className="fixed inset-0 z-[9600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-7 py-5 flex items-center justify-between shrink-0" style={{ backgroundColor: accent }}>
          <div>
            <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Cadastro na Hora</p>
            <h3 className="font-black text-white text-sm uppercase tracking-widest">{meta.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-4 overflow-y-auto custom-scrollbar bg-white">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{meta.subtitle}</p>

          {/* ── CLIENTE / PORTO / PRÉ-STACKING ── */}
          {isJuridical && (
            <>
              <div className="space-y-1">
                <label className={labelClass}>CNPJ</label>
                <div className="relative">
                  <input
                    className={`${inputClasses} pr-14`}
                    style={focusStyle}
                    value={form.cnpj || ''}
                    onChange={e => setForm((f: any) => ({ ...f, cnpj: maskCNPJ(e.target.value) }))}
                    placeholder="00.000.000/0000-00"
                  />
                  <button
                    type="button"
                    onClick={() => handleCnpjLookup()}
                    disabled={isCnpjLoading}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-90 disabled:opacity-50"
                    style={{ backgroundColor: accent }}
                    title="Consultar CNPJ"
                  >
                    {isCnpjLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5" /></svg>
                    )}
                  </button>
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">Digite os 14 dígitos para buscar automaticamente.</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Razão Social</label>
                  <input className={inputClasses} style={focusStyle} value={form.legalName || ''} onChange={e => setForm((f: any) => ({ ...f, legalName: e.target.value.toUpperCase() }))} placeholder="RAZÃO SOCIAL" />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Nome Fantasia <span className="text-red-500">*</span></label>
                  <input required className={inputClasses} style={focusStyle} value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="NOME FANTASIA" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>CEP</label>
                  <input className={inputClasses} style={focusStyle} value={form.zipCode || ''} onChange={e => setForm((f: any) => ({ ...f, zipCode: maskCEP(e.target.value) }))} placeholder="00000-000" />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Cidade</label>
                  <input className={inputClasses} style={focusStyle} value={form.city || ''} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value.toUpperCase() }))} placeholder="CIDADE" />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_80px] gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Logradouro</label>
                  <input className={inputClasses} style={focusStyle} value={form.address || ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value.toUpperCase() }))} placeholder="RUA, AVENIDA, Nº" />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>UF</label>
                  <input className={inputClasses} style={focusStyle} value={form.state || ''} maxLength={2} onChange={e => setForm((f: any) => ({ ...f, state: e.target.value.toUpperCase() }))} placeholder="UF" />
                </div>
              </div>
            </>
          )}

          {/* ── MOTORISTA ── */}
          {type === 'driver' && (
            <>
              <div className="space-y-1">
                <label className={labelClass}>Nome Completo <span className="text-red-500">*</span></label>
                <input required className={inputClasses} style={focusStyle} value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="NOME DO MOTORISTA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>CPF</label>
                  <input className={inputClasses} style={focusStyle} value={form.cpf || ''} onChange={e => setForm((f: any) => ({ ...f, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Registro CNH</label>
                  <input className={inputClasses} style={focusStyle} value={form.cnh || ''} onChange={e => setForm((f: any) => ({ ...f, cnh: e.target.value.toUpperCase() }))} placeholder="Nº DA CNH" />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Celular / Whatsapp</label>
                <input className={inputClasses} style={focusStyle} value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Placa Cavalo</label>
                  <input className={`${inputClasses} font-mono tracking-widest`} style={focusStyle} value={form.plateHorse || ''} onChange={e => setForm((f: any) => ({ ...f, plateHorse: maskPlate(e.target.value) }))} placeholder="ABC-1234" />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Placa Carreta</label>
                  <input className={`${inputClasses} font-mono tracking-widest`} style={focusStyle} value={form.plateTrailer || ''} onChange={e => setForm((f: any) => ({ ...f, plateTrailer: maskPlate(e.target.value) }))} placeholder="ABC-1234" />
                </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase italic">Ficha completa depois em Motoristas.</p>
            </>
          )}

          {/* ── PESSOA AUTORIZADA ── */}
          {type === 'authorizedPerson' && (
            <>
              <div className="space-y-1">
                <label className={labelClass}>Nome Completo <span className="text-red-500">*</span></label>
                <input required className={inputClasses} style={focusStyle} value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="NOME DO RESPONSÁVEL" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>CPF</label>
                  <input className={inputClasses} style={focusStyle} value={form.cpf || ''} onChange={e => setForm((f: any) => ({ ...f, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>RG</label>
                  <input className={inputClasses} style={focusStyle} value={form.rg || ''} onChange={e => setForm((f: any) => ({ ...f, rg: maskRG(e.target.value) }))} placeholder="00.000.000-0" />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Veículo (Placa)</label>
                <input className={`${inputClasses} font-mono tracking-widest`} style={focusStyle} value={form.veiculo || ''} onChange={e => setForm((f: any) => ({ ...f, veiculo: maskPlate(e.target.value) }))} placeholder="ABC1D23" />
              </div>
            </>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold uppercase tracking-wide">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.name?.trim()}
              className="flex-1 py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {isSaving ? 'Salvando...' : 'Cadastrar e Selecionar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default QuickRegisterModal;
