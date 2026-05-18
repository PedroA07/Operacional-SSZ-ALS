
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MonitoredShip, ShipStatus, TerminalService } from '../../../types';
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

// ── Terminal Status Section ──────────────────────────────────────────────────

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
        {t.responseMs !== undefined && (
          <span>{t.responseMs} ms</span>
        )}
        {t.lastCheck && (
          <span>Verificado: {new Date(t.lastCheck).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        )}
        {!t.lastCheck && (
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
      {/* Actions overlay */}
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

      {/* Ship name */}
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

      {/* Dates */}
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

// ── Main Tab ─────────────────────────────────────────────────────────────────

const NaviosTab: React.FC<NaviosTabProps> = ({ userId, ships, onSave, onDelete }) => {
  const [terminals, setTerminals] = useState<TerminalService[]>([]);
  const [terminalChecking, setTerminalChecking] = useState(false);
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

  const fetchTerminalStatus = useCallback(async () => {
    setTerminalChecking(true);
    // Optimistically mark all as checking
    setTerminals(prev => {
      const base: TerminalService[] = prev.length
        ? prev.map(t => ({ ...t, status: 'checking' as const }))
        : [
            { id: 'ecoporto',      name: 'ECOPORTO',      url: 'https://www.ecoporto.com.br',       status: 'checking' },
            { id: 'santos_brasil', name: 'SANTOS BRASIL',  url: 'https://www.santosbrasil.com.br',   status: 'checking' },
            { id: 'embraport',     name: 'EMBRAPORT',      url: 'https://www.embraport.com.br',      status: 'checking' },
            { id: 'btp',           name: 'BTP',            url: 'https://www.btp.com.br',            status: 'checking' },
            { id: 'depot_record',  name: 'DEPOT RECORD',   url: 'https://www.depotrecord.com.br',    status: 'checking' },
          ];
      return base;
    });
    try {
      const res = await fetch('/api/terminal-status');
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

  useEffect(() => {
    fetchTerminalStatus();
    intervalRef.current = window.setInterval(fetchTerminalStatus, 3 * 60 * 1000);
    return () => {
      if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
    };
  }, [fetchTerminalStatus]);

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
          <button
            onClick={fetchTerminalStatus}
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

        {terminals.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <svg className="w-4 h-4 animate-spin text-blue-400 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Verificando terminais...</p>
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
        {/* Search + filters */}
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
      />
    </div>
  );
};

export default NaviosTab;
