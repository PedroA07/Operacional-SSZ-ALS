
import React, { useState, useEffect, useRef } from 'react';
import { MonitoredShip, ShipStatus } from '../../../types';
import DateTimePicker from '../../shared/DateTimePicker';
import CustomSelect from '../../shared/CustomSelect';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ship: MonitoredShip) => Promise<void>;
  editing?: MonitoredShip | null;
  terminalOptions?: string[];
}

const STATUSES: ShipStatus[] = ['EM TRÂNSITO', 'AG. ATRACAÇÃO', 'ATRACADO', 'GATE ABERTO', 'GATE FECHADO', 'FINALIZADO'];

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1 block">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-white uppercase placeholder-white/20 outline-none focus:bg-white/15 focus:border-blue-500 transition';

const ShipModal: React.FC<Props> = ({ isOpen, onClose, onSave, editing, terminalOptions = [] }) => {
  const terminals = terminalOptions.length > 0 ? terminalOptions : ['ECOPORTO', 'SANTOS BRASIL', 'EMBRAPORT', 'BTP', 'DEPOT RECORD'];
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const hasInit = useRef<string | null>(null);

  const blank: Partial<MonitoredShip> = {
    shipName: '', voyage: '', terminal: terminals[0] || '', status: 'EM TRÂNSITO',
    eta: '', etd: '', ataDate: '', atdDate: '', linkedTripOs: '', notes: '',
  };
  const [form, setForm] = useState<Partial<MonitoredShip>>(blank);

  useEffect(() => {
    if (!isOpen) { hasInit.current = null; return; }
    const key = editing?.id || 'new';
    if (hasInit.current === key) return;
    setForm(editing ? { ...editing } : blank);
    hasInit.current = key;
  }, [isOpen, editing]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shipName?.trim()) { showToast('Informe o nome do navio.', 'err'); return; }
    if (!form.voyage?.trim())   { showToast('Informe o número da viagem.', 'err'); return; }
    setIsSaving(true);
    try {
      const payload: MonitoredShip = {
        id: editing?.id || `ship-${Date.now()}`,
        shipName:     form.shipName!.toUpperCase().trim(),
        voyage:       form.voyage!.toUpperCase().trim(),
        terminal:     form.terminal || terminals[0] || '',
        status:       form.status as ShipStatus || 'EM TRÂNSITO',
        eta:          form.eta || undefined,
        etd:          form.etd || undefined,
        ataDate:      form.ataDate || undefined,
        atdDate:      form.atdDate || undefined,
        linkedTripOs: form.linkedTripOs?.trim() || undefined,
        notes:        form.notes?.trim() || undefined,
        createdAt:    editing?.createdAt || new Date().toISOString(),
        updatedAt:    new Date().toISOString(),
      };
      await onSave(payload);
      onClose();
    } catch {
      showToast('Erro ao salvar. Tente novamente.', 'err');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest shadow-2xl ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-7 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Monitoramento</p>
            <h2 className="text-[15px] font-black text-white uppercase">
              {editing ? 'Editar Navio' : 'Cadastrar Navio'}
            </h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-7 space-y-6">
          {/* Identificação */}
          <div className="space-y-4">
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">I. Identificação</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome do Navio" className="col-span-2">
                <input className={inputCls} value={form.shipName || ''} onChange={e => setForm(f => ({ ...f, shipName: e.target.value.toUpperCase() }))} placeholder="EX: MSC MELINE" />
              </Field>
              <Field label="Viagem / Voyage">
                <input className={inputCls} value={form.voyage || ''} onChange={e => setForm(f => ({ ...f, voyage: e.target.value.toUpperCase() }))} placeholder="EX: MM620R" />
              </Field>
              <Field label="Terminal">
                <CustomSelect
                  value={form.terminal || terminals[0] || ''}
                  onChange={v => setForm(f => ({ ...f, terminal: v }))}
                  options={terminals.map(t => ({ value: t, label: t }))}
                  inputClassName="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-white outline-none"
                />
              </Field>
            </div>
            <Field label="Situação">
              <CustomSelect
                value={form.status || 'EM TRÂNSITO'}
                onChange={v => setForm(f => ({ ...f, status: v as ShipStatus }))}
                options={STATUSES.map(s => ({ value: s, label: s }))}
                inputClassName="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-white outline-none"
              />
            </Field>
          </div>

          {/* Datas */}
          <div className="space-y-4">
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">II. Datas</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ETA — Previsão de Chegada">
                <DateTimePicker value={form.eta || ''} onChange={v => setForm(f => ({ ...f, eta: v }))} placeholder="Selecionar data e hora" />
              </Field>
              <Field label="ETD — Previsão de Saída">
                <DateTimePicker value={form.etd || ''} onChange={v => setForm(f => ({ ...f, etd: v }))} placeholder="Selecionar data e hora" />
              </Field>
              <Field label="ATA — Chegada Real">
                <DateTimePicker value={form.ataDate || ''} onChange={v => setForm(f => ({ ...f, ataDate: v }))} placeholder="Selecionar data e hora" />
              </Field>
              <Field label="ATD — Saída Real">
                <DateTimePicker value={form.atdDate || ''} onChange={v => setForm(f => ({ ...f, atdDate: v }))} placeholder="Selecionar data e hora" />
              </Field>
            </div>
          </div>

          {/* Vínculos e obs */}
          <div className="space-y-4">
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">III. Vínculos</p>
            <Field label="OS Vinculada (opcional)">
              <input className={inputCls} value={form.linkedTripOs || ''} onChange={e => setForm(f => ({ ...f, linkedTripOs: e.target.value.toUpperCase() }))} placeholder="EX: CF_20260515_31M85" />
            </Field>
            <Field label="Observações">
              <textarea
                rows={3}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-white placeholder-white/20 outline-none focus:bg-white/15 focus:border-blue-500 transition resize-none"
                value={form.notes || ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notas adicionais..."
              />
            </Field>
          </div>
        </form>

        {/* Footer */}
        <div className="p-7 border-t border-white/10 flex gap-4 shrink-0">
          <button type="button" onClick={onClose} className="px-8 py-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isSaving ? 'Salvando...' : 'Salvar Navio'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShipModal;
