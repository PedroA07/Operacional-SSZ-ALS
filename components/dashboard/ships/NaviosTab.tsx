
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MonitoredShip, ShipStatus, TerminalService } from '../../../types';
import ShipModal from './ShipModal';

interface NaviosTabProps {
  userId: string;
  ships: MonitoredShip[];
  onSave: (s: MonitoredShip) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_COLORS: Record<ShipStatus, { bg: string; text: string; dot: string }> = {
  'GATE ABERTO':   { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'GATE FECHADO':  { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
  'AG. ATRACAÇÃO': { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  'ATRACADO':      { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  'EM TRÂNSITO':   { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  'FINALIZADO':    { bg: 'bg-slate-100',   text: 'text-slate-400',   dot: 'bg-slate-300' },
};

const TERMINAL_URLS: Record<string, string> = {
  'ECOPORTO':      'https://www.ecoporto.com.br',
  'SANTOS BRASIL': 'https://www.santosbrasil.com.br',
  'EMBRAPORT':     'https://www.embraport.com.br',
  'BTP':           'https://www.btp.com.br',
  'DEPOT RECORD':  'https://www.depotrecord.com.br',
};

const ALL_STATUSES: ShipStatus[] = ['GATE ABERTO', 'GATE FECHADO', 'AG. ATRACAÇÃO', 'ATRACADO', 'EM TRÂNSITO', 'FINALIZADO'];

const fmtDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const StatusBadge: React.FC<{ status: ShipStatus }> = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS['EM TRÂNSITO'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
};

const NaviosTab: React.FC<NaviosTabProps> = ({ userId, ships, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoredShip | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipStatus | 'TODOS'>('TODOS');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Terminal status
  const [terminals, setTerminals] = useState<TerminalService[]>(
    Object.entries(TERMINAL_URLS).map(([name, url]) => ({
      id: name.toLowerCase().replace(/\s/g, '_'),
      name, url, status: 'checking',
    }))
  );
  const [isCheckingTerminals, setIsCheckingTerminals] = useState(false);
  const [lastTerminalCheck, setLastTerminalCheck] = useState<string | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkTerminals = useCallback(async () => {
    setIsCheckingTerminals(true);
    try {
      const res = await fetch('/api/terminal-status');
      if (res.ok) {
        const data: TerminalService[] = await res.json();
        setTerminals(data);
        setLastTerminalCheck(new Date().toLocaleTimeString('pt-BR'));
      } else {
        // fallback: mark all as unknown
        setTerminals(t => t.map(x => ({ ...x, status: 'unknown' })));
      }
    } catch {
      setTerminals(t => t.map(x => ({ ...x, status: 'offline' as const })));
    } finally {
      setIsCheckingTerminals(false);
    }
  }, []);

  useEffect(() => {
    checkTerminals();
    const interval = setInterval(checkTerminals, 3 * 60 * 1000); // every 3 min
    return () => clearInterval(interval);
  }, [checkTerminals]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ships.filter(s => {
      const matchQ = !q ||
        s.shipName.toLowerCase().includes(q) ||
        s.voyage.toLowerCase().includes(q) ||
        s.terminal.toLowerCase().includes(q) ||
        (s.linkedTripOs || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'TODOS' || s.status === statusFilter;
      return matchQ && matchStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ships, search, statusFilter]);

  const handleOpen = (s?: MonitoredShip) => {
    setEditing(s || null);
    setIsModalOpen(true);
  };

  const handleSave = async (s: MonitoredShip) => {
    try {
      await onSave(s);
      setIsModalOpen(false);
      showToast('Navio salvo com sucesso.');
    } catch {
      showToast('Erro ao salvar navio.', 'err');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      await onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
      showToast('Navio removido.');
    } catch {
      showToast('Erro ao remover.', 'err');
    } finally {
      setIsDeleting(false);
    }
  };

  const terminalStatusColor = (status: string) => {
    if (status === 'online')   return { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' };
    if (status === 'offline')  return { badge: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500' };
    if (status === 'checking') return { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', dot: 'bg-amber-500 animate-pulse' };
    return { badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-500' };
  };

  const terminalStatusLabel = (status: string) => {
    if (status === 'online')   return 'Online';
    if (status === 'offline')  return 'Offline';
    if (status === 'checking') return 'Verificando';
    return 'Desconhecido';
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest shadow-2xl ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── STATUS DOS TERMINAIS ─────────────────────────────────────── */}
      <section className="bg-slate-900 rounded-[2rem] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Status dos Terminais</h3>
            {lastTerminalCheck && (
              <p className="text-[8px] text-slate-500 font-bold mt-0.5">Última verificação: {lastTerminalCheck}</p>
            )}
          </div>
          <button
            onClick={checkTerminals}
            disabled={isCheckingTerminals}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${isCheckingTerminals ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Atualizar
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {terminals.map(t => {
            const c = terminalStatusColor(t.status);
            return (
              <div key={t.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
                <p className="text-[9px] font-black text-white uppercase tracking-tight leading-tight">{t.name}</p>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] font-black border ${c.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {terminalStatusLabel(t.status)}
                </div>
                {t.responseMs != null && t.status === 'online' && (
                  <p className="text-[7px] text-slate-600 font-bold">{t.responseMs}ms</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── NAVIOS MONITORADOS ───────────────────────────────────────── */}
      <section className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Navios Monitorados</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
              {ships.length} navio{ships.length !== 1 ? 's' : ''} cadastrado{ships.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => handleOpen()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            + Novo Navio
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-56 relative">
            <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar navio, viagem, terminal ou OS..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
          <button
            onClick={() => setStatusFilter('TODOS')}
            className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === 'TODOS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'}`}
          >
            Todos
          </button>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13l1.5 5.5A1 1 0 005.46 20h13.08a1 1 0 00.96-.5L21 13M3 13h18M3 13l2-8h14l2 8M12 3v10"/>
              </svg>
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {search || statusFilter !== 'TODOS' ? 'Nenhum resultado encontrado' : 'Nenhum navio cadastrado'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(ship => (
              <div key={ship.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 uppercase text-[13px] leading-tight truncate">{ship.shipName}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase">{ship.voyage}</span>
                      <span className="px-2 py-0.5 bg-blue-50 rounded-lg text-[9px] font-black text-blue-600 uppercase">{ship.terminal}</span>
                    </div>
                  </div>
                  <StatusBadge status={ship.status} />
                </div>

                {/* Dates */}
                <div className="space-y-1.5 text-[9px]">
                  {ship.eta && (
                    <div className="flex justify-between">
                      <span className="font-black text-slate-400 uppercase">ETA</span>
                      <span className="font-bold text-slate-600">{fmtDate(ship.eta)}</span>
                    </div>
                  )}
                  {ship.etd && (
                    <div className="flex justify-between">
                      <span className="font-black text-slate-400 uppercase">ETD</span>
                      <span className="font-bold text-slate-600">{fmtDate(ship.etd)}</span>
                    </div>
                  )}
                  {ship.ataDate && (
                    <div className="flex justify-between">
                      <span className="font-black text-emerald-600 uppercase">Chegou</span>
                      <span className="font-bold text-emerald-600">{fmtDate(ship.ataDate)}</span>
                    </div>
                  )}
                  {ship.atdDate && (
                    <div className="flex justify-between">
                      <span className="font-black text-blue-600 uppercase">Saiu</span>
                      <span className="font-bold text-blue-600">{fmtDate(ship.atdDate)}</span>
                    </div>
                  )}
                </div>

                {/* OS link */}
                {ship.linkedTripOs && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">OS Vinculada</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase mt-0.5">{ship.linkedTripOs}</p>
                  </div>
                )}

                {/* Notes */}
                {ship.notes && (
                  <p className="mt-2 text-[9px] text-slate-400 font-bold truncate">{ship.notes}</p>
                )}

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpen(ship)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-[8px] font-black uppercase transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(ship.id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[8px] font-black uppercase transition-all"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ShipModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} editing={editing} />

      {/* Confirm delete */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full space-y-5">
            <h3 className="text-[14px] font-black text-slate-800 uppercase">Confirmar remoção</h3>
            <p className="text-[11px] text-slate-500 font-bold">
              Remover o navio{' '}
              <span className="text-slate-800">{ships.find(s => s.id === confirmDeleteId)?.shipName}</span>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all disabled:opacity-50">
                {isDeleting ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NaviosTab;
