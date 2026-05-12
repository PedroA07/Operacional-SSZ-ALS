import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../../utils/storage';
import { BotAutomation } from '../../../types';

// ─── constants ────────────────────────────────────────────────────────────────

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TYPE_META = {
  scheduled:      { label: 'Agendado',             emoji: '🕐', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  status_trigger: { label: 'Gatilho de status',    emoji: '⚡', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  reminder_before:{ label: 'Lembrete antes',       emoji: '⏰', color: 'bg-violet-100 text-violet-700 border-violet-200' },
};

const TARGET_META = {
  driver:   { label: 'Motorista da viagem', emoji: '🚛' },
  internals:{ label: 'Grupos internos',     emoji: '🏢' },
  all:      { label: 'Todos',               emoji: '📢' },
  specific: { label: 'Grupo específico',    emoji: '📍' },
};

const VARIABLES = [
  { v: '{{motorista}}', desc: 'nome do motorista' },
  { v: '{{os}}',        desc: 'número da OS' },
  { v: '{{status}}',    desc: 'status atual' },
  { v: '{{container}}', desc: 'container' },
  { v: '{{horario}}',   desc: 'horário agendado' },
  { v: '{{cliente}}',   desc: 'cliente' },
  { v: '{{data}}',      desc: 'data de hoje' },
  { v: '{{total}}',     desc: 'total de programações' },
  { v: '{{resumo_viagens}}', desc: 'lista de viagens' },
  { v: '{{resumo_status}}',  desc: 'contagem por status' },
];

const STANDARD_STATUSES = [
  'Pendente','Retirada de vazio','Retirada do cheio','Em viagem',
  'Chegou no cliente','Pegou NF','Saiu do cliente','Chegou no destino',
  'Devolução do cheio','Viagem concluída','Viagem cancelada',
];

// ─── blank form ───────────────────────────────────────────────────────────────

const blankForm = (): Partial<BotAutomation> => ({
  name: '',
  type: 'scheduled',
  isActive: true,
  scheduleTime: '07:00',
  scheduleDays: [1, 2, 3, 4, 5, 6],
  triggerStatus: '',
  delayMinutes: 0,
  reminderMinutes: 60,
  target: 'internals',
  targetJid: '',
  messageTemplate: '',
});

// ─── component ────────────────────────────────────────────────────────────────

const BotAutomationsManager: React.FC = () => {
  const [automations, setAutomations] = useState<BotAutomation[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState(false);
  const [form,        setForm]        = useState<Partial<BotAutomation>>(blankForm());
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setAutomations(await db.getBotAutomations());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patchForm = (patch: Partial<BotAutomation>) =>
    setForm(prev => ({ ...prev, ...patch }));

  const openNew = () => {
    setForm(blankForm());
    setEditing(true);
  };

  const openEdit = (a: BotAutomation) => {
    setForm({ ...a });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { showToast('Dê um nome à automação.', false); return; }
    if (!form.messageTemplate?.trim()) { showToast('O template de mensagem não pode estar vazio.', false); return; }
    if (form.type === 'scheduled' && !form.scheduleTime) { showToast('Informe o horário.', false); return; }
    if (form.type === 'status_trigger' && !form.triggerStatus) { showToast('Selecione um status gatilho.', false); return; }
    if (form.type === 'reminder_before' && (!form.reminderMinutes || form.reminderMinutes <= 0)) {
      showToast('Informe os minutos do lembrete.', false); return;
    }

    setSaving(true);
    const ok = await db.saveBotAutomation(form);
    setSaving(false);

    if (ok) {
      showToast(form.id ? 'Automação atualizada!' : 'Automação criada!');
      setEditing(false);
      load();
    } else {
      showToast('Erro ao salvar. Tente novamente.', false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Excluir automação "${name}"?`)) return;
    const ok = await db.deleteBotAutomation(id);
    if (ok) { showToast('Automação excluída.'); load(); }
    else     showToast('Erro ao excluir.', false);
  };

  const handleToggle = async (a: BotAutomation) => {
    await db.saveBotAutomation({ ...a, isActive: !a.isActive });
    load();
  };

  const toggleDay = (day: number) => {
    const days = form.scheduleDays || [];
    patchForm({
      scheduleDays: days.includes(day)
        ? days.filter(d => d !== day)
        : [...days, day].sort(),
    });
  };

  const insertVar = (v: string) => {
    patchForm({ messageTemplate: (form.messageTemplate || '') + v });
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            🤖 Automações do Bot WhatsApp
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Configure mensagens agendadas, gatilhos de status e lembretes enviados automaticamente pelo bot.
          </p>
        </div>
        {!editing && (
          <button onClick={openNew}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition-all">
            + Nova Automação
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`px-5 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 ${
          toast.ok ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                   : 'bg-red-500/15 text-red-400 border border-red-500/30'
        }`}>
          {toast.ok ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Form */}
      {editing && (
        <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center">
            <h4 className="text-white font-black uppercase text-sm">
              {form.id ? '✏️ Editar Automação' : '➕ Nova Automação'}
            </h4>
            <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-white text-xl leading-none">✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Coluna esquerda */}
            <div className="space-y-4">

              {/* Nome */}
              <div>
                <Label>Nome da automação</Label>
                <input
                  value={form.name || ''}
                  onChange={e => patchForm({ name: e.target.value })}
                  placeholder="ex: Bom dia motoristas"
                  className={inputCls}
                />
              </div>

              {/* Tipo */}
              <div>
                <Label>Tipo</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['scheduled', 'status_trigger', 'reminder_before'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => patchForm({ type: t })}
                      className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase transition-all text-center ${
                        form.type === t
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {TYPE_META[t].emoji} {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos condicionais por tipo */}
              {form.type === 'scheduled' && (
                <>
                  <div>
                    <Label>Horário do envio</Label>
                    <input
                      type="time"
                      value={form.scheduleTime || '07:00'}
                      onChange={e => patchForm({ scheduleTime: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label>Dias da semana</Label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => toggleDay(i)}
                          className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all border ${
                            (form.scheduleDays || []).includes(i)
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {form.type === 'status_trigger' && (
                <>
                  <div>
                    <Label>Status gatilho</Label>
                    <select value={form.triggerStatus || ''} onChange={e => patchForm({ triggerStatus: e.target.value })} className={inputCls}>
                      <option value="">Selecionar status...</option>
                      {STANDARD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Atraso após o status (minutos)</Label>
                    <input
                      type="number"
                      min={0}
                      value={form.delayMinutes ?? 0}
                      onChange={e => patchForm({ delayMinutes: Number(e.target.value) })}
                      className={inputCls}
                    />
                    <p className="text-[10px] text-slate-600 mt-1">0 = envio imediato quando o status muda</p>
                  </div>
                </>
              )}

              {form.type === 'reminder_before' && (
                <div>
                  <Label>Minutos antes da programação</Label>
                  <input
                    type="number"
                    min={5}
                    value={form.reminderMinutes ?? 60}
                    onChange={e => patchForm({ reminderMinutes: Number(e.target.value) })}
                    className={inputCls}
                  />
                  <p className="text-[10px] text-slate-600 mt-1">Ex: 60 = avisa 1 hora antes do horário agendado</p>
                </div>
              )}

              {/* Destino */}
              <div>
                <Label>Destino</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['driver', 'internals', 'all', 'specific'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => patchForm({ target: t })}
                      className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase transition-all text-left ${
                        form.target === t
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {TARGET_META[t].emoji} {TARGET_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {form.target === 'specific' && (
                <div>
                  <Label>JID do grupo específico</Label>
                  <input
                    value={form.targetJid || ''}
                    onChange={e => patchForm({ targetJid: e.target.value })}
                    placeholder="ex: 5511999990000-1234567890@g.us"
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            {/* Coluna direita — template */}
            <div className="space-y-4">
              <div className="flex flex-col h-full">
                <Label>Template da mensagem</Label>
                <textarea
                  value={form.messageTemplate || ''}
                  onChange={e => patchForm({ messageTemplate: e.target.value })}
                  rows={10}
                  placeholder="Escreva a mensagem aqui. Use as variáveis abaixo para personalizar..."
                  className={`${inputCls} resize-none font-mono text-[11px] leading-relaxed flex-1`}
                />
                <div className="mt-3">
                  <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-2">Inserir variável</p>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map(({ v, desc }) => (
                      <button
                        key={v}
                        onClick={() => insertVar(v)}
                        title={desc}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-slate-400 hover:text-white rounded-lg text-[10px] font-mono transition-all"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-slate-600 mt-2 leading-relaxed">
                    Use <code className="text-slate-500">\n</code> para quebra de linha.
                    Suporta *negrito* e _itálico_ do WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          {form.messageTemplate && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-2">Preview</p>
              <pre className="text-slate-300 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                {form.messageTemplate}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button onClick={() => setEditing(false)}
              className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-black uppercase transition-all">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all">
              {saving ? 'Salvando...' : (form.id ? '💾 Salvar alterações' : '✅ Criar automação')}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Carregando automações...</div>
      ) : automations.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🤖</p>
          <p className="text-slate-400 font-black uppercase text-sm">Nenhuma automação configurada</p>
          <p className="text-slate-600 text-xs mt-1">Clique em "Nova Automação" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map(a => {
            const tm = TYPE_META[a.type];
            const tg = TARGET_META[a.target];
            return (
              <div
                key={a.id}
                className={`bg-slate-900/40 border rounded-xl p-4 transition-all hover:border-slate-600 ${
                  a.isActive ? 'border-slate-800' : 'border-slate-800/40 opacity-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Toggle ativo */}
                  <button onClick={() => handleToggle(a)}
                    className={`mt-0.5 w-10 h-6 rounded-full transition-all flex-shrink-0 relative ${
                      a.isActive ? 'bg-green-600' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      a.isActive ? 'left-5' : 'left-1'
                    }`} />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-black text-sm">{a.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${tm.color}`}>
                        {tm.emoji} {tm.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                        {tg.emoji} {tg.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {a.type === 'scheduled' && (
                        `${a.scheduleTime} — ${(a.scheduleDays || []).map(d => DAYS[d]).join(', ')}`
                      )}
                      {a.type === 'status_trigger' && (
                        `Gatilho: "${a.triggerStatus}"${a.delayMinutes ? ` (+${a.delayMinutes} min)` : ' (imediato)'}`
                      )}
                      {a.type === 'reminder_before' && (
                        `${a.reminderMinutes} min antes da programação`
                      )}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1 truncate font-mono">{a.messageTemplate?.slice(0, 80)}…</p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(a)}
                      className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all text-xs">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(a.id, a.name)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all text-xs">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600';

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
    {children}
  </label>
);

export default BotAutomationsManager;
