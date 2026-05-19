
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MonitoredShip, ShipStatus, TerminalService, ShipTerminalConfig } from '../../../types';
import { db } from '../../../utils/storage';
import ShipModal from './ShipModal';

interface NaviosTabProps {
  userId: string;
  ships: MonitoredShip[];
  onSave: (s: MonitoredShip) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_COLORS: Record<ShipStatus, string> = {
  'GATE ABERTO':   'bg-emerald-100 text-emerald-700 border-emerald-200',
  'GATE FECHADO':  'bg-red-100 text-red-700 border-red-200',
  'AG. ATRACAÇÃO': 'bg-amber-100 text-amber-700 border-amber-200',
  'ATRACADO':      'bg-blue-100 text-blue-700 border-blue-200',
  'EM TRÂNSITO':   'bg-slate-100 text-slate-600 border-slate-200',
  'FINALIZADO':    'bg-slate-100 text-slate-400 border-slate-200',
};

const STATUS_DOT: Record<ShipStatus, string> = {
  'GATE ABERTO':   'bg-emerald-500',
  'GATE FECHADO':  'bg-red-500',
  'AG. ATRACAÇÃO': 'bg-amber-500',
  'ATRACADO':      'bg-blue-500',
  'EM TRÂNSITO':   'bg-slate-400',
  'FINALIZADO':    'bg-slate-300',
};

const ALL_STATUSES: ShipStatus[] = [
  'GATE ABERTO', 'GATE FECHADO', 'AG. ATRACAÇÃO', 'ATRACADO', 'EM TRÂNSITO', 'FINALIZADO',
];

const formatDateTime = (iso?: string): string => {
  if (!iso) return '';
  const [datePart, timePart] = iso.split('T');
  if (!datePart) return '';
  const [y, mo, d] = datePart.split('-');
  const timeStr = timePart ? ` ${timePart.slice(0, 5)}` : '';
  return `${d}/${mo}/${y}${timeStr}`;
};

// ── Terminal Status Card ────────────────────────────────────────────────────

const TerminalCard: React.FC<{ t: TerminalService }> = ({ t }) => {
  const badgeCls =
    t.status === 'online'   ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    t.status === 'offline'  ? 'bg-red-100 text-red-700 border-red-200' :
    t.status === 'checking' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              'bg-slate-100 text-slate-500 border-slate-200';
  const dotCls =
    t.status === 'online'   ? 'bg-emerald-500' :
    t.status === 'offline'  ? 'bg-red-500' :
    t.status === 'checking' ? 'bg-amber-500 animate-pulse' :
                              'bg-slate-400';
  const label =
    t.status === 'online'   ? 'ONLINE' :
    t.status === 'offline'  ? 'OFFLINE' :
    t.status === 'checking' ? 'VERIFICANDO' : 'DESCONHECIDO';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest truncate">{t.name}</p>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0 ${badgeCls}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[8px] font-bold text-slate-400 uppercase">
        {t.responseMs !== undefined && <span>{t.responseMs} ms</span>}
        {t.lastCheck ? (
          <span>Verificado: {new Date(t.lastCheck).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        ) : (
          <span>Aguardando...</span>
        )}
      </div>
    </div>
  );
};

// ── Ship Card ────────────────────────────────────────────────────────────────

const ShipCard: React.FC<{
  ship: MonitoredShip;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ ship, onEdit, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 relative group transition-shadow hover:shadow-md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      )}

      <div>
        <h3 className="text-[13px] font-black text-slate-900 uppercase leading-tight pr-16">{ship.shipName}</h3>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[8px] font-black text-slate-500 uppercase tracking-widest">
            {ship.voyage}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[8px] font-black text-blue-600 uppercase tracking-widest">
            {ship.terminal}
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${STATUS_COLORS[ship.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[ship.status]}`} />
            {ship.status}
          </span>
        </div>
      </div>

      {(ship.eta || ship.etd) && (
        <div className="flex items-center gap-4 text-[8px] font-black text-slate-500 uppercase">
          {ship.eta && (
            <span className="flex items-center gap-1">
              <span className="text-slate-400">ETA:</span>
              <span className="text-slate-700">{formatDateTime(ship.eta)}</span>
            </span>
          )}
          {ship.etd && (
            <span className="flex items-center gap-1">
              <span className="text-slate-400">ETD:</span>
              <span className="text-slate-700">{formatDateTime(ship.etd)}</span>
            </span>
          )}
        </div>
      )}

      {(ship.ataDate || ship.atdDate) && (
        <div className="flex items-center gap-4 text-[8px] font-black uppercase">
          {ship.ataDate && (
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="text-slate-400">Chegou:</span>
              {formatDateTime(ship.ataDate)}
            </span>
          )}
          {ship.atdDate && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="text-slate-400">Saiu:</span>
              {formatDateTime(ship.atdDate)}
            </span>
          )}
        </div>
      )}

      {ship.linkedTripOs && (
        <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase">
          <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <span className="text-blue-500">{ship.linkedTripOs}</span>
        </div>
      )}

      {ship.notes && (
        <p className="text-[9px] text-slate-400 leading-relaxed line-clamp-2 border-t border-slate-50 pt-2.5">
          {ship.notes}
        </p>
      )}
    </div>
  );
};

// ── Terminal Config Modal ────────────────────────────────────────────────────

const TerminalConfigModal: React.FC<{
  configs: ShipTerminalConfig[];
  onClose: () => void;
  onSaved: (configs: ShipTerminalConfig[]) => void;
}> = ({ configs, onClose, onSaved }) => {
  const [list, setList] = useState<ShipTerminalConfig[]>(configs);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleActive = async (cfg: ShipTerminalConfig) => {
    const updated = { ...cfg, active: !cfg.active };
    setSaving(true);
    const ok = await db.saveShipTerminalConfig(updated);
    setSaving(false);
    if (ok) {
      const next = list.map(c => c.id === cfg.id ? updated : c);
      setList(next);
      onSaved(next);
    } else {
      showToast('Erro ao atualizar terminal.', 'err');
    }
  };

  const handleSaveEdit = async (cfg: ShipTerminalConfig, name: string, url: string) => {
    const trimmedName = name.trim().toUpperCase();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) { showToast('Preencha nome e URL.', 'err'); return; }
    const updated = { ...cfg, name: trimmedName, url: trimmedUrl };
    setSaving(true);
    const ok = await db.saveShipTerminalConfig(updated);
    setSaving(false);
    if (ok) {
      const next = list.map(c => c.id === cfg.id ? updated : c);
      setList(next);
      onSaved(next);
      setEditingId(null);
    } else {
      showToast('Erro ao salvar.', 'err');
    }
  };

  const handleAdd = async () => {
    const trimmedName = newName.trim().toUpperCase();
    const trimmedUrl = newUrl.trim();
    if (!trimmedName || !trimmedUrl) { showToast('Preencha nome e URL.', 'err'); return; }
    const cfg: ShipTerminalConfig = {
      id: `terminal-${Date.now()}`,
      name: trimmedName,
      url: trimmedUrl,
      active: true,
      sortOrder: list.length + 1,
    };
    setSaving(true);
    const ok = await db.saveShipTerminalConfig(cfg);
    setSaving(false);
    if (ok) {
      const next = [...list, cfg];
      setList(next);
      onSaved(next);
      setNewName('');
      setNewUrl('');
      setAddMode(false);
    } else {
      showToast('Erro ao adicionar terminal.', 'err');
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    const ok = await db.deleteShipTerminalConfig(id);
    setSaving(false);
    if (ok) {
      const next = list.filter(c => c.id !== id);
      setList(next);
      onSaved(next);
    } else {
      showToast('Erro ao remover terminal.', 'err');
    }
  };

  const inputCls = 'bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white uppercase placeholder-white/20 outline-none focus:bg-white/15 focus:border-blue-500 transition';

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest shadow-2xl ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Configuração Global</p>
            <h2 className="text-[13px] font-black text-white uppercase">Terminais</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {list.length === 0 && (
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center py-4">Nenhum terminal cadastrado.</p>
          )}
          {list.map(cfg => {
            const isEditing = editingId === cfg.id;
            return (
              <TerminalRow
                key={cfg.id}
                cfg={cfg}
                isEditing={isEditing}
                saving={saving}
                onToggleActive={() => handleToggleActive(cfg)}
                onStartEdit={() => setEditingId(cfg.id)}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={(name, url) => handleSaveEdit(cfg, name, url)}
                onDelete={() => handleDelete(cfg.id)}
                inputCls={inputCls}
              />
            );
          })}

          {/* Add new */}
          {addMode ? (
            <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/10">
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Novo Terminal</p>
              <input
                className={`w-full ${inputCls}`}
                placeholder="NOME DO TERMINAL"
                value={newName}
                onChange={e => setNewName(e.target.value.toUpperCase())}
              />
              <input
                className={`w-full ${inputCls} normal-case`}
                placeholder="https://www.site.com.br"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAddMode(false); setNewName(''); setNewUrl(''); }}
                  className="flex-1 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddMode(true)}
              className="w-full py-3 border border-dashed border-white/20 text-slate-400 rounded-2xl text-[8px] font-black uppercase tracking-widest hover:border-blue-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
              </svg>
              Novo Terminal
            </button>
          )}
        </div>

        <div className="p-6 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Terminal Row inside config modal ────────────────────────────────────────

const TerminalRow: React.FC<{
  cfg: ShipTerminalConfig;
  isEditing: boolean;
  saving: boolean;
  onToggleActive: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (name: string, url: string) => void;
  onDelete: () => void;
  inputCls: string;
}> = ({ cfg, isEditing, saving, onToggleActive, onStartEdit, onCancelEdit, onSaveEdit, onDelete, inputCls }) => {
  const [editName, setEditName] = useState(cfg.name);
  const [editUrl, setEditUrl] = useState(cfg.url);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (isEditing) { setEditName(cfg.name); setEditUrl(cfg.url); }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-blue-500/30">
        <input
          className={`w-full ${inputCls}`}
          value={editName}
          onChange={e => setEditName(e.target.value.toUpperCase())}
          placeholder="NOME DO TERMINAL"
        />
        <input
          className={`w-full ${inputCls} normal-case`}
          value={editUrl}
          onChange={e => setEditUrl(e.target.value)}
          placeholder="https://..."
        />
        <div className="flex gap-2">
          <button type="button" onClick={onCancelEdit} className="flex-1 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancelar</button>
          <button type="button" onClick={() => onSaveEdit(editName, editUrl)} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50">Salvar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-2xl px-4 py-3 flex items-center gap-3 group">
      {/* Active toggle */}
      <button
        type="button"
        onClick={onToggleActive}
        disabled={saving}
        className={`w-8 h-5 rounded-full transition-all shrink-0 relative ${cfg.active ? 'bg-emerald-500' : 'bg-white/10'}`}
        title={cfg.active ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${cfg.active ? 'left-3.5' : 'left-0.5'}`} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{cfg.name}</p>
        <p className="text-[8px] font-bold text-slate-500 truncate">{cfg.url}</p>
      </div>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onStartEdit} className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        {confirmDel ? (
          <>
            <button type="button" onClick={() => setConfirmDel(false)} className="px-2 py-1 rounded-lg bg-white/5 text-slate-400 text-[7px] font-black uppercase hover:bg-white/10 transition-all">Não</button>
            <button type="button" onClick={onDelete} disabled={saving} className="px-2 py-1 rounded-lg bg-red-600 text-white text-[7px] font-black uppercase hover:bg-red-700 transition-all disabled:opacity-50">Sim</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDel(true)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Tab ─────────────────────────────────────────────────────────────────

const NaviosTab: React.FC<NaviosTabProps> = ({ userId, ships, onSave, onDelete }) => {
  const [terminalConfigs, setTerminalConfigs] = useState<ShipTerminalConfig[]>([]);
  const [terminalConfigsLoaded, setTerminalConfigsLoaded] = useState(false);
  const [terminals, setTerminals] = useState<TerminalService[]>([]);
  const [terminalChecking, setTerminalChecking] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoredShip | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipStatus | 'TODOS'>('TODOS');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const intervalRef = React.useRef<number | undefined>(undefined);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load terminal configs from DB on mount
  useEffect(() => {
    db.getShipTerminalConfigs().then(cfgs => {
      setTerminalConfigs(cfgs);
      setTerminalConfigsLoaded(true);
    });
  }, []);

  const activeTerminalNames = useMemo(
    () => terminalConfigs.filter(c => c.active).map(c => c.name),
    [terminalConfigs]
  );

  const fetchTerminalStatus = useCallback(async (configs: ShipTerminalConfig[]) => {
    setTerminalChecking(true);
    const active = configs.filter(c => c.active);

    // Optimistically mark as checking
    if (active.length > 0) {
      setTerminals(active.map(c => ({ id: c.id, name: c.name, url: c.url, status: 'checking' })));
    } else {
      setTerminals([]);
      setTerminalChecking(false);
      return;
    }

    try {
      const res = await fetch('/api/terminal-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminals: active.map(c => ({ id: c.id, name: c.name, url: c.url })) }),
      });
      if (res.ok) {
        const data: TerminalService[] = await res.json();
        setTerminals(data);
      } else {
        setTerminals(prev => prev.map(t => ({ ...t, status: 'offline' as const, lastCheck: new Date().toISOString() })));
      }
    } catch {
      setTerminals(prev => prev.map(t => ({ ...t, status: 'offline' as const, lastCheck: new Date().toISOString() })));
    } finally {
      setTerminalChecking(false);
    }
  }, []);

  // Once configs are loaded, start polling
  useEffect(() => {
    if (!terminalConfigsLoaded) return;
    fetchTerminalStatus(terminalConfigs);
    if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => fetchTerminalStatus(terminalConfigs), 3 * 60 * 1000);
    return () => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
    };
  }, [terminalConfigsLoaded, terminalConfigs, fetchTerminalStatus]);

  const filteredShips = useMemo(() => {
    const q = search.toLowerCase();
    return ships.filter(s => {
      const matchSearch =
        s.shipName.toLowerCase().includes(q) ||
        s.voyage.toLowerCase().includes(q) ||
        s.terminal.toLowerCase().includes(q) ||
        (s.linkedTripOs || '').toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'TODOS' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [ships, search, statusFilter]);

  const handleOpen = (ship?: MonitoredShip) => {
    setEditing(ship || null);
    setModalOpen(true);
  };

  const handleSave = async (s: MonitoredShip) => {
    try {
      await onSave(s);
      showToast('Navio salvo com sucesso.');
    } catch {
      showToast('Erro ao salvar o navio.', 'err');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
      showToast('Navio removido.');
    } catch {
      showToast('Erro ao remover navio.', 'err');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfigsSaved = (updated: ShipTerminalConfig[]) => {
    setTerminalConfigs(updated);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Navios Monitorados</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Controle de embarcações e terminais
          </p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Novo Navio
        </button>
      </div>

      {/* Inline toast */}
      {toast && (
        <div className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
          toast.type === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Terminal Status ── */}
      <div className="bg-slate-900 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Monitoramento</p>
            <h2 className="text-[11px] font-black text-white uppercase tracking-wider">Status dos Terminais</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
              title="Configurar terminais"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Configurar
            </button>
            <button
              onClick={() => fetchTerminalStatus(terminalConfigs)}
              disabled={terminalChecking}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {terminalChecking ? (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              )}
              Atualizar
            </button>
          </div>
        </div>

        {!terminalConfigsLoaded ? (
          <div className="flex items-center justify-center py-6">
            <svg className="w-4 h-4 animate-spin text-blue-400 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Carregando terminais...</p>
          </div>
        ) : terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nenhum terminal ativo.</p>
            <button
              onClick={() => setShowConfigModal(true)}
              className="text-[8px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
            >
              Configurar terminais
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {terminals.map(t => (
              <TerminalCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>

      {/* ── Ships Section ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="w-3.5 h-3.5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar navio, viagem, terminal..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('TODOS')}
            className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
              statusFilter === 'TODOS'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            Todos ({ships.length})
          </button>
          {ALL_STATUSES.map(s => {
            const count = ships.filter(sh => sh.status === s).length;
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>

        {/* Cards grid */}
        {filteredShips.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-16 flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 13l1.5 5.5A1 1 0 005.46 20h13.08a1 1 0 00.96-.5L21 13M3 13h18M3 13l2-8h14l2 8M12 3v10"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {search || statusFilter !== 'TODOS' ? 'Nenhum navio encontrado' : 'Nenhum navio cadastrado'}
              </p>
              <p className="text-[9px] text-slate-300 mt-1">
                {search || statusFilter !== 'TODOS'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Clique em "Novo Navio" para começar o monitoramento.'}
              </p>
            </div>
            {!search && statusFilter === 'TODOS' && (
              <button
                onClick={() => handleOpen()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Novo Navio
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShips.map(ship => (
              <ShipCard
                key={ship.id}
                ship={ship}
                onEdit={() => handleOpen(ship)}
                onDelete={() => setConfirmDeleteId(ship.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirm overlay ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl border border-white/5 p-8 max-w-sm w-full space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-black text-white uppercase tracking-widest">Remover Navio</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Esta acao nao pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ship Modal */}
      <ShipModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editing={editing}
        terminalOptions={activeTerminalNames}
      />

      {/* Terminal Config Modal */}
      {showConfigModal && (
        <TerminalConfigModal
          configs={terminalConfigs}
          onClose={() => setShowConfigModal(false)}
          onSaved={handleConfigsSaved}
        />
      )}
    </div>
  );
};

export default NaviosTab;
