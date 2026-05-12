import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../../utils/storage';
import { BotGroup, Driver } from '../../../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<BotGroup['type'], string> = {
  driver:   'Motorista',
  internal: 'Interno',
  admin:    'Admin',
};

const TYPE_COLORS: Record<BotGroup['type'], string> = {
  driver:   'bg-blue-100 text-blue-700 border-blue-200',
  internal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  admin:    'bg-violet-100 text-violet-700 border-violet-200',
};

// ─── component ────────────────────────────────────────────────────────────────

const BotGroupsManager: React.FC = () => {
  const [groups,  setGroups]  = useState<BotGroup[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null); // jid being saved
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  // Edição em linha: mapa jid → rascunho
  const [drafts, setDrafts] = useState<
    Record<string, { type: BotGroup['type']; driverId: string; active: boolean }>
  >({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [gs, ds] = await Promise.all([db.getBotGroups(), db.getDrivers()]);
    setGroups(gs);
    setDrivers(ds.filter(d => d.status === 'Ativo'));
    // Inicializa rascunhos com os valores atuais
    const init: typeof drafts = {};
    gs.forEach(g => {
      init[g.jid] = {
        type:     g.type,
        driverId: g.driverId || '',
        active:   g.active,
      };
    });
    setDrafts(init);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patchDraft = (jid: string, patch: Partial<typeof drafts[string]>) => {
    setDrafts(prev => ({
      ...prev,
      [jid]: { ...prev[jid], ...patch },
    }));
  };

  const handleSave = async (group: BotGroup) => {
    const draft = drafts[group.jid];
    if (!draft) return;

    // Se tipo = driver mas não escolheu motorista, bloqueia
    if (draft.type === 'driver' && !draft.driverId) {
      showToast('Selecione um motorista para este grupo.', false);
      return;
    }

    const selectedDriver = drivers.find(d => d.id === draft.driverId);

    setSaving(group.jid);
    const ok = await db.saveBotGroup({
      jid:        group.jid,
      name:       group.name,
      type:       draft.type,
      driverId:   draft.type === 'driver' ? (draft.driverId || null) : null,
      driverName: draft.type === 'driver' ? (selectedDriver?.name || null) : null,
      active:     draft.active,
    });
    setSaving(null);

    if (ok) {
      showToast('Grupo atualizado com sucesso!');
      load();
    } else {
      showToast('Erro ao salvar. Tente novamente.', false);
    }
  };

  const handleDelete = async (group: BotGroup) => {
    if (!window.confirm(`Remover o grupo "${group.name}" do sistema?`)) return;
    const ok = await db.deleteBotGroup(group.jid);
    if (ok) { showToast('Grupo removido.'); load(); }
    else     showToast('Erro ao remover.', false);
  };

  // ── pending vs active ──────────────────────────────────────────────────────
  const pending = groups.filter(g => !g.active);
  const active  = groups.filter(g =>  g.active);

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
            <span className="text-2xl">💬</span> Grupos do WhatsApp
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Grupos detectados pelo ALS BOT — vincule a motoristas e ative
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2.5" strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${
          toast.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{toast.ok ? '✅' : '❌'}</span> {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <svg className="w-8 h-8 animate-spin mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Carregando grupos...
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-4">📵</div>
          <p className="font-black uppercase text-sm tracking-widest">Nenhum grupo detectado</p>
          <p className="text-xs mt-2">Adicione o ALS BOT a um grupo do WhatsApp para ele aparecer aqui.</p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Pendentes ─────────────────────────────────────────────────────── */}
          {pending.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                  Pendentes de configuração ({pending.length})
                </p>
              </div>
              {pending.map(g => (
                <GroupRow
                  key={g.jid}
                  group={g}
                  draft={drafts[g.jid] ?? { type: g.type, driverId: g.driverId || '', active: g.active }}
                  drivers={drivers}
                  saving={saving === g.jid}
                  onPatch={patch => patchDraft(g.jid, patch)}
                  onSave={() => handleSave(g)}
                  onDelete={() => handleDelete(g)}
                  isPending
                />
              ))}
            </div>
          )}

          {/* ── Ativos ────────────────────────────────────────────────────────── */}
          {active.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  Ativos ({active.length})
                </p>
              </div>
              {active.map(g => (
                <GroupRow
                  key={g.jid}
                  group={g}
                  draft={drafts[g.jid] ?? { type: g.type, driverId: g.driverId || '', active: g.active }}
                  drivers={drivers}
                  saving={saving === g.jid}
                  onPatch={patch => patchDraft(g.jid, patch)}
                  onSave={() => handleSave(g)}
                  onDelete={() => handleDelete(g)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── GroupRow ─────────────────────────────────────────────────────────────────

interface GroupRowProps {
  group:     BotGroup;
  draft:     { type: BotGroup['type']; driverId: string; active: boolean };
  drivers:   Driver[];
  saving:    boolean;
  isPending?: boolean;
  onPatch:   (patch: Partial<GroupRowProps['draft']>) => void;
  onSave:    () => void;
  onDelete:  () => void;
}

const GroupRow: React.FC<GroupRowProps> = ({
  group, draft, drivers, saving, isPending, onPatch, onSave, onDelete,
}) => {
  const isDirty =
    draft.type     !== group.type ||
    draft.driverId !== (group.driverId || '') ||
    draft.active   !== group.active;

  return (
    <div className={`rounded-2xl border p-6 transition-all ${
      isPending
        ? 'border-amber-200 bg-amber-50/40'
        : 'border-slate-200 bg-slate-50/50'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="text-sm font-black text-slate-800 truncate">{group.name}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${TYPE_COLORS[group.type]}`}>
              {TYPE_LABELS[group.type]}
            </span>
            {group.driverName && (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                🚛 {group.driverName}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-mono truncate">{group.jid}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Tipo */}
          <select
            value={draft.type}
            onChange={e => onPatch({ type: e.target.value as BotGroup['type'], driverId: '' })}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="driver">Motorista</option>
            <option value="internal">Interno</option>
            <option value="admin">Admin</option>
          </select>

          {/* Motorista (só aparece se tipo = driver) */}
          {draft.type === 'driver' && (
            <select
              value={draft.driverId}
              onChange={e => onPatch({ driverId: e.target.value })}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
            >
              <option value="">Selecionar motorista…</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          {/* Ativo toggle */}
          <button
            onClick={() => onPatch({ active: !draft.active })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all ${
              draft.active
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${draft.active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            {draft.active ? 'Ativo' : 'Inativo'}
          </button>

          {/* Salvar */}
          <button
            onClick={onSave}
            disabled={saving || !isDirty}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
              isDirty && !saving
                ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? '...' : 'Salvar'}
          </button>

          {/* Excluir */}
          <button
            onClick={onDelete}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-200 transition-all"
            title="Remover grupo do sistema"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2.5" strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotGroupsManager;
