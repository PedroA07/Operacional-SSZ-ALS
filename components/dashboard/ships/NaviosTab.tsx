import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip, Ship, ShipStatus, ShipStatusEntry, TerminalVessel } from '../../../types';
import { db, supabase } from '../../../utils/storage';

interface NaviosTabProps { user: User; trips: Trip[]; }

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ShipStatus, { label: string; bg: string; text: string; border: string; dot: string; count_bg: string }> = {
  'NOVO':             { label: 'Novo',           bg: 'bg-slate-500/20',  text: 'text-slate-300',  border: 'border-slate-500/30',  dot: 'bg-slate-400',   count_bg: 'bg-slate-700' },
  'NÃO ENCONTRADO':  { label: 'Não Encontrado', bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400',  count_bg: 'bg-orange-800/60' },
  'SEM PREVISÃO':    { label: 'Sem Previsão',   bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30', dot: 'bg-yellow-400',  count_bg: 'bg-yellow-800/60' },
  'AG. ATRACAÇÃO':   { label: 'Ag. Atracação',  bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400',  count_bg: 'bg-purple-800/60' },
  'ATRACADO':        { label: 'Atracado',        bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/30',   dot: 'bg-blue-400',    count_bg: 'bg-blue-800/60' },
  'GATE ABERTO':     { label: 'Gate Aberto',     bg: 'bg-green-500/20',  text: 'text-green-300',  border: 'border-green-500/30',  dot: 'bg-green-400',   count_bg: 'bg-green-800/60' },
  'GATE FECHADO':    { label: 'Gate Fechado',    bg: 'bg-red-500/20',    text: 'text-red-300',    border: 'border-red-500/30',    dot: 'bg-red-400',     count_bg: 'bg-red-800/60' },
  'GATE ENCERRADO':  { label: 'Gate Encerrado',  bg: 'bg-pink-500/20',   text: 'text-pink-300',   border: 'border-pink-500/30',   dot: 'bg-pink-400',    count_bg: 'bg-pink-800/60' },
  'DESATRACADO':     { label: 'Desatracado',     bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   border: 'border-cyan-500/30',   dot: 'bg-cyan-400',    count_bg: 'bg-cyan-800/60' },
  'FINALIZADO':      { label: 'Finalizado',      bg: 'bg-slate-600/20',  text: 'text-slate-400',  border: 'border-slate-600/30',  dot: 'bg-slate-500',   count_bg: 'bg-slate-700' },
  'EM TRÂNSITO':     { label: 'Em Trânsito',     bg: 'bg-blue-400/20',   text: 'text-blue-300',   border: 'border-blue-400/30',   dot: 'bg-blue-400',    count_bg: 'bg-blue-800/60' },
  'FUNDEADO':        { label: 'Fundeado',        bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/30',  dot: 'bg-amber-400',   count_bg: 'bg-amber-800/60' },
  'AGUARDANDO JANELA':{ label: 'Ag. Janela',     bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30', dot: 'bg-violet-400',  count_bg: 'bg-violet-800/60' },
  'SAÍDO':           { label: 'Saído',           bg: 'bg-slate-500/20',  text: 'text-slate-400',  border: 'border-slate-500/30',  dot: 'bg-slate-500',   count_bg: 'bg-slate-700' },
};

const PANEL_STATUSES: ShipStatus[] = ['NOVO','NÃO ENCONTRADO','SEM PREVISÃO','GATE FECHADO','GATE ABERTO','GATE ENCERRADO','AG. ATRACAÇÃO','ATRACADO','DESATRACADO'];
const ALL_STATUSES: ShipStatus[] = Object.keys(STATUS_CONFIG) as ShipStatus[];
const TERMINALS = ['BTP', 'ECOPORTO', 'SANTOS BRASIL', 'EMBRAPORT', 'OUTRO'];

const TERMINAL_LINKS: Record<string, string> = {
  ECOPORTO: 'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
  'SANTOS BRASIL': 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao',
  BTP: 'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
  EMBRAPORT: 'https://www.embraport.com.br',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDT(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
  } catch { return iso; }
}
function isExpired(iso?: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

const emptyShip = (): Partial<Ship> => ({
  name: '', imo: '', armador: '', viagem: '', terminal: 'BTP', berco: '',
  prevAtracacao: '', abertGate: '', deadLine: '', dataAtracacao: '', dataDesatrac: '',
  status: 'NOVO', observacoes: '', tripIds: [], statusHistory: [],
});

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Ico = {
  Ship: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13l1.5 5.5A1 1 0 005.46 20h13.08a1 1 0 00.96-.5L21 13M3 13h18M3 13l2-8h14l2 8M12 3v10"/></svg>,
  Plus: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>,
  Close: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>,
  Edit: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  Trash: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Refresh: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  ExtLink: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>,
  Clock: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Anchor: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3a3 3 0 100 6 3 3 0 000-6zm0 6v12M5 12h14M5 19.5c0-2.5 2-4.5 7-4.5s7 2 7 4.5"/></svg>,
  Warning: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  History: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0zM3.05 11A9 9 0 0112 3v0M3 7l-1-1M3 7l1-1"/></svg>,
  ChevronDown: (p: any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>,
};

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, size = 'sm' }: { status: ShipStatus; size?: 'xs' | 'sm' }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['NOVO'];
  return (
    <span className={`inline-flex items-center gap-1 font-black uppercase rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${size === 'xs' ? 'text-[7px] px-1.5 py-0.5' : 'text-[8px] px-2 py-1'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}/>
      {cfg.label}
    </span>
  );
}

// ── Label/Value row ───────────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide shrink-0">{label}:</span>
      <span className={`text-[9px] font-black truncate ${highlight ? 'text-red-400' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const NaviosTab: React.FC<NaviosTabProps> = ({ user, trips }) => {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminalData, setTerminalData] = useState<Record<string, { vessels: TerminalVessel[]; fetchedAt: string | null; error: string | null }>>({
    ECOPORTO: { vessels: [], fetchedAt: null, error: null },
    'SANTOS BRASIL': { vessels: [], fetchedAt: null, error: null },
    BTP: { vessels: [], fetchedAt: null, error: null },
  });

  const [view, setView] = useState<'painel' | 'lista'>('painel');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<Partial<Ship>>(emptyShip());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Ship | null>(null);
  const [newStatus, setNewStatus] = useState<ShipStatus>('NOVO');
  const [statusObs, setStatusObs] = useState('');
  const [terminalOpen, setTerminalOpen] = useState(false);

  const loadShips = useCallback(async () => {
    setLoading(true);
    try { setShips(await db.getShips()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadTerminals = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('terminal_vessels').select('*').order('fetched_at', { ascending: false });
    const rows = (data ?? []) as any[];
    const byT: Record<string, any[]> = {};
    for (const r of rows) { if (!byT[r.terminal]) byT[r.terminal] = []; byT[r.terminal].push(r); }
    setTerminalData(prev => {
      const next = { ...prev };
      for (const [t, tRows] of Object.entries(byT)) {
        next[t] = { vessels: tRows.map(r => ({ navio: r.navio, situacao: r.situacao, previsao: r.previsao, berco: r.berco, armador: r.armador, viagem: r.viagem, terminal: r.terminal })), fetchedAt: tRows[0]?.fetched_at ?? null, error: null };
      }
      return next;
    });
  }, []);

  useEffect(() => { loadShips(); loadTerminals(); }, []); // eslint-disable-line

  // Counts for panel header
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of ships) c[s.status] = (c[s.status] ?? 0) + 1;
    return c;
  }, [ships]);

  // All status history sorted desc
  const allHistory = useMemo(() => {
    const entries: Array<ShipStatusEntry & { shipName: string; viagem?: string; terminal?: string }> = [];
    for (const s of ships) {
      for (const h of (s.statusHistory ?? [])) {
        entries.push({ ...h, shipName: s.name, viagem: s.viagem, terminal: s.terminal });
      }
    }
    return entries.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).slice(0, 30);
  }, [ships]);

  // Active ships (not finalizado/saído)
  const activeShips = useMemo(() => ships.filter(s => s.status !== 'FINALIZADO' && s.status !== 'SAÍDO' && s.status !== 'DESATRACADO'), [ships]);
  const inactiveShips = useMemo(() => ships.filter(s => s.status === 'FINALIZADO' || s.status === 'SAÍDO' || s.status === 'DESATRACADO'), [ships]);

  // Modal helpers
  const openNew = () => { setEditingShip(emptyShip()); setModalError(null); setModalOpen(true); };
  const openEdit = (s: Ship) => { setEditingShip({ ...s }); setModalError(null); setModalOpen(true); };
  const upd = (f: keyof Ship, v: any) => setEditingShip(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!editingShip.name?.trim()) { setModalError('Nome do navio obrigatório.'); return; }
    setSaving(true); setModalError(null);
    try {
      const isNew = !editingShip.id;
      const toSave: Partial<Ship> = { ...editingShip };
      if (isNew) {
        toSave.statusHistory = [{ status: editingShip.status ?? 'NOVO', dateTime: new Date().toISOString(), obs: 'Criado' }];
      }
      await db.saveShip(toSave);
      setModalOpen(false);
      await loadShips();
    } catch (e: any) { setModalError(e?.message || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este navio do monitoramento?')) return;
    try { await db.deleteShip(id); setShips(p => p.filter(s => s.id !== id)); }
    catch (e: any) { alert('Erro: ' + e?.message); }
  };

  // Update status with history entry
  const openStatusModal = (ship: Ship) => {
    setStatusTarget(ship);
    setNewStatus(ship.status);
    setStatusObs('');
    setStatusModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget) return;
    const entry: ShipStatusEntry = { status: newStatus, dateTime: new Date().toISOString(), obs: statusObs || undefined };
    const updatedHistory = [...(statusTarget.statusHistory ?? []), entry];
    const extraFields: Partial<Ship> = {};
    if (newStatus === 'ATRACADO' && !statusTarget.dataAtracacao) extraFields.dataAtracacao = new Date().toISOString();
    if (newStatus === 'DESATRACADO' && !statusTarget.dataDesatrac) extraFields.dataDesatrac = new Date().toISOString();
    try {
      await db.saveShip({ ...statusTarget, status: newStatus, statusHistory: updatedHistory, ...extraFields });
      setStatusModalOpen(false);
      await loadShips();
    } catch (e: any) { alert('Erro: ' + e?.message); }
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitoramento de Navios</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acompanhe gates, atracações e situação nos terminais de Santos</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['painel', 'lista'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {v === 'painel' ? 'Painel' : 'Lista'}
              </button>
            ))}
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95">
            <Ico.Plus className="w-3.5 h-3.5" /> Novo Navio
          </button>
        </div>
      </div>

      {/* ── Status Summary Bar ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-9 gap-2">
        {PANEL_STATUSES.map(st => {
          const cfg = STATUS_CONFIG[st];
          const n = counts[st] ?? 0;
          return (
            <div key={st} className={`rounded-xl p-3 text-center border ${cfg.border} ${cfg.bg} flex flex-col items-center gap-1`}>
              <span className={`text-xl font-black ${cfg.text}`}>{n}</span>
              <span className={`text-[7px] font-black uppercase leading-tight ${cfg.text} opacity-70`}>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── PAINEL VIEW ── */}
      {view === 'painel' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : activeShips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
              <Ico.Ship className="w-12 h-12 opacity-20"/>
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhum navio em monitoramento</p>
              <button onClick={openNew} className="text-[9px] font-black text-blue-500 hover:underline">+ Adicionar navio</button>
            </div>
          ) : (
            <>
              {/* Active ships grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {activeShips.map(ship => {
                  const cfg = STATUS_CONFIG[ship.status];
                  const dlExpired = isExpired(ship.deadLine);
                  return (
                    <div key={ship.id} className={`bg-[#0f172a] rounded-2xl border ${cfg.border} flex flex-col overflow-hidden transition-all hover:shadow-xl hover:shadow-black/20`}>
                      {/* Card Header */}
                      <div className={`px-4 py-3 ${cfg.bg} border-b ${cfg.border} flex items-start justify-between gap-2`}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Ico.Ship className={`w-3.5 h-3.5 ${cfg.text} shrink-0`}/>
                            <p className={`text-[10px] font-black uppercase truncate ${cfg.text}`}>
                              {ship.name}
                              {ship.viagem && <span className="ml-1.5 opacity-70 font-bold">· {ship.viagem}</span>}
                            </p>
                          </div>
                          <p className="text-[8px] font-bold text-slate-500 uppercase pl-5">
                            {ship.terminal ?? 'Terminal não definido'}
                            {ship.berco ? ` · Berço ${ship.berco}` : ''}
                          </p>
                        </div>
                        <StatusBadge status={ship.status} size="xs"/>
                      </div>

                      {/* Card Body */}
                      <div className="px-4 py-3 space-y-1.5 flex-1">
                        {ship.prevAtracacao && <InfoRow label="Prev. Atracação" value={fmtDT(ship.prevAtracacao)}/>}
                        {ship.abertGate    && <InfoRow label="Abert. Gate"     value={fmtDT(ship.abertGate)}/>}
                        {ship.deadLine     && <InfoRow label="Dead-Line"        value={fmtDT(ship.deadLine)} highlight={dlExpired}/>}
                        {ship.dataAtracacao && <InfoRow label="Data Atracação"  value={fmtDT(ship.dataAtracacao)}/>}
                        {ship.dataDesatrac  && <InfoRow label="Desatracação"    value={fmtDT(ship.dataDesatrac)}/>}
                        {ship.armador      && <InfoRow label="Armador"          value={ship.armador}/>}
                        {!ship.prevAtracacao && !ship.abertGate && !ship.deadLine && (
                          <p className="text-[8px] text-slate-600 italic font-bold">Sem datas definidas</p>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="px-4 py-2.5 border-t border-slate-800/50 flex items-center justify-between">
                        <span className="text-[8px] text-slate-600 font-bold">
                          {ship.updatedAt ? `Atualizado ${fmtDate(ship.updatedAt)}` : '—'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openStatusModal(ship)} title="Alterar status"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all" >
                            <Ico.History className="w-3 h-3 text-slate-400"/>
                          </button>
                          <button onClick={() => openEdit(ship)} title="Editar"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all">
                            <Ico.Edit className="w-3 h-3 text-slate-400"/>
                          </button>
                          <button onClick={() => handleDelete(ship.id)} title="Remover"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 transition-all">
                            <Ico.Trash className="w-3 h-3 text-slate-500 hover:text-red-400"/>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Finalizados (collapsed by default) */}
              {inactiveShips.length > 0 && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Finalizados / Desatracados ({inactiveShips.length})</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <tbody>
                        {inactiveShips.map(s => (
                          <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-5 py-2.5 font-black text-slate-600 uppercase">{s.name}</td>
                            <td className="px-3 py-2.5 text-slate-400 font-bold">{s.viagem ?? '—'}</td>
                            <td className="px-3 py-2.5 text-slate-400 font-bold">{s.terminal ?? '—'}</td>
                            <td className="px-3 py-2.5"><StatusBadge status={s.status} size="xs"/></td>
                            <td className="px-3 py-2.5 text-slate-400 font-bold">{fmtDate(s.updatedAt)}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-1">
                                <button onClick={() => openStatusModal(s)} className="p-1 rounded hover:bg-slate-200 transition"><Ico.History className="w-3 h-3 text-slate-400"/></button>
                                <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-slate-200 transition"><Ico.Edit className="w-3 h-3 text-slate-400"/></button>
                                <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 transition"><Ico.Trash className="w-3 h-3 text-slate-400"/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Últimas Atualizações ── */}
          {allHistory.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                <Ico.History className="w-3.5 h-3.5"/> Últimas Atualizações
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {allHistory.slice(0, 12).map((h, i) => {
                  const cfg = STATUS_CONFIG[h.status as ShipStatus] ?? STATUS_CONFIG['NOVO'];
                  return (
                    <div key={i} className={`rounded-xl p-3 border ${cfg.border} ${cfg.bg} space-y-1`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[8px] font-black text-slate-400">
                          {new Date(h.dateTime).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        </p>
                        <StatusBadge status={h.status as ShipStatus} size="xs"/>
                      </div>
                      <p className={`text-[9px] font-black uppercase truncate ${cfg.text}`}>{h.shipName}</p>
                      {h.viagem && <p className="text-[8px] text-slate-500 font-bold">{h.terminal} · {h.viagem}</p>}
                      {h.obs && <p className="text-[8px] text-slate-500 font-bold italic">{h.obs}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LISTA VIEW ── */}
      {view === 'lista' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ico.Ship className="w-4 h-4 text-slate-400"/>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Navios Monitorados</p>
            </div>
            <span className="text-[9px] font-black text-slate-400">{ships.length} navio(s)</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : ships.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-300">
              <Ico.Ship className="w-10 h-10 opacity-30"/>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum navio cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Navio','Viagem','Terminal','Situação','Prev. Atracação','Abert. Gate','Dead-Line','Criado em','Ações'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ships.map(s => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-black text-slate-800 uppercase whitespace-nowrap">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500 font-bold">{s.viagem ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 font-bold whitespace-nowrap">{s.terminal ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status}/></td>
                      <td className="px-4 py-3 text-slate-600 font-bold whitespace-nowrap">{fmtDT(s.prevAtracacao)}</td>
                      <td className="px-4 py-3 text-slate-600 font-bold whitespace-nowrap">{fmtDT(s.abertGate)}</td>
                      <td className={`px-4 py-3 font-bold whitespace-nowrap ${isExpired(s.deadLine) ? 'text-red-500' : 'text-slate-600'}`}>{fmtDT(s.deadLine)}</td>
                      <td className="px-4 py-3 text-slate-400 font-bold whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openStatusModal(s)} title="Atualizar status" className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"><Ico.History className="w-3.5 h-3.5"/></button>
                          <button onClick={() => openEdit(s)} title="Editar" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Ico.Edit className="w-3.5 h-3.5"/></button>
                          <button onClick={() => handleDelete(s.id)} title="Excluir" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Ico.Trash className="w-3.5 h-3.5"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Terminal Vessels (collapsible) ── */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <button onClick={() => setTerminalOpen(p => !p)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all">
          <div className="flex items-center gap-2">
            <Ico.Anchor className="w-4 h-4 text-slate-400"/>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Lista de Atracação dos Terminais</p>
          </div>
          <Ico.ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${terminalOpen ? 'rotate-180' : ''}`}/>
        </button>
        {terminalOpen && (
          <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            {(['BTP', 'ECOPORTO', 'SANTOS BRASIL'] as const).map(term => {
              const td = terminalData[term];
              return (
                <div key={term} className="bg-[#0f172a] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">{term}</span>
                    <div className="flex items-center gap-2">
                      {td.fetchedAt && <span className="text-[7px] text-slate-600 font-bold">{new Date(td.fetchedAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>}
                      {TERMINAL_LINKS[term] && (
                        <a href={TERMINAL_LINKS[term]} target="_blank" rel="noopener noreferrer" className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 text-slate-400 hover:text-blue-400 transition-all">
                          <Ico.ExtLink className="w-3 h-3"/>
                        </a>
                      )}
                    </div>
                  </div>
                  {td.vessels.length === 0 ? (
                    <p className="text-[8px] text-slate-600 font-bold italic">Aguardando coleta do Railway...</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {td.vessels.slice(0, 12).map((v, i) => (
                        <div key={i} className="flex items-start justify-between gap-2 py-1 border-b border-slate-800/40 last:border-0">
                          <div className="min-w-0">
                            <p className="text-[8px] font-black text-slate-200 truncate uppercase">{v.navio}</p>
                            {v.previsao && <p className="text-[7px] text-slate-500">{v.previsao}</p>}
                          </div>
                          <span className="text-[7px] font-black text-slate-500 shrink-0 truncate max-w-[60px]">{v.situacao.slice(0,12)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Ship Modal (create/edit) ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center"><Ico.Ship className="w-4 h-4 text-blue-400"/></div>
                <h2 className="text-[11px] font-black text-slate-100 uppercase tracking-widest">{editingShip.id ? 'Editar Navio' : 'Novo Navio'}</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all"><Ico.Close className="w-4 h-4"/></button>
            </div>
            <div className="px-8 py-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {modalError && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-[10px] font-black text-red-400 uppercase flex gap-2"><Ico.Warning className="w-3.5 h-3.5 shrink-0"/>{modalError}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Navio *</label>
                  <input value={editingShip.name ?? ''} onChange={e => upd('name', e.target.value)} placeholder="Ex: MSC MELINE"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all uppercase"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nº Viagem</label>
                  <input value={editingShip.viagem ?? ''} onChange={e => upd('viagem', e.target.value)} placeholder="Ex: MM620R"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Terminal</label>
                  <select value={editingShip.terminal ?? 'BTP'} onChange={e => upd('terminal', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all">
                    {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Armador</label>
                  <input value={editingShip.armador ?? ''} onChange={e => upd('armador', e.target.value)} placeholder="Ex: MSC, Maersk..."
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Berço</label>
                  <input value={editingShip.berco ?? ''} onChange={e => upd('berco', e.target.value)} placeholder="Ex: 310"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
              </div>

              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pt-2 border-t border-slate-800">Datas de Gate e Atracação</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Prev. Atracação</label>
                  <input type="datetime-local" value={editingShip.prevAtracacao?.slice(0,16) ?? ''} onChange={e => upd('prevAtracacao', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Abertura de Gate</label>
                  <input type="datetime-local" value={editingShip.abertGate?.slice(0,16) ?? ''} onChange={e => upd('abertGate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dead-Line</label>
                  <input type="datetime-local" value={editingShip.deadLine?.slice(0,16) ?? ''} onChange={e => upd('deadLine', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status Inicial</label>
                  <select value={editingShip.status ?? 'NOVO'} onChange={e => upd('status', e.target.value as ShipStatus)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all">
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data de Atracação</label>
                  <input type="datetime-local" value={editingShip.dataAtracacao?.slice(0,16) ?? ''} onChange={e => upd('dataAtracacao', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Data de Desatracação</label>
                  <input type="datetime-local" value={editingShip.dataDesatrac?.slice(0,16) ?? ''} onChange={e => upd('dataDesatrac', e.target.value ? new Date(e.target.value).toISOString() : '')}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observações</label>
                <textarea value={editingShip.observacoes ?? ''} onChange={e => upd('observacoes', e.target.value)} rows={2}
                  placeholder="Informações adicionais..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"/>
              </div>
            </div>
            <div className="px-8 py-4 border-t border-slate-800 flex items-center gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Update Modal ── */}
      {statusModalOpen && statusTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Atualizar Status</p>
                <p className="text-[12px] font-black text-slate-100 uppercase">{statusTarget.name} {statusTarget.viagem ? `· ${statusTarget.viagem}` : ''}</p>
              </div>
              <button onClick={() => setStatusModalOpen(false)} className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all"><Ico.Close className="w-4 h-4"/></button>
            </div>
            <div className="px-7 py-5 space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Novo Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUSES.map(s => {
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button key={s} onClick={() => setNewStatus(s)}
                        className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase text-left transition-all flex items-center gap-2 ${newStatus === s ? `${cfg.bg} ${cfg.border} ${cfg.text}` : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`}/>
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observação (opcional)</label>
                <input value={statusObs} onChange={e => setStatusObs(e.target.value)} placeholder="Ex: Gate aberto pelo terminal BTP"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
              </div>

              {/* History preview */}
              {(statusTarget.statusHistory ?? []).length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  <p className="text-[8px] font-black text-slate-500 uppercase">Histórico</p>
                  {[...(statusTarget.statusHistory ?? [])].reverse().slice(0, 6).map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[7px] text-slate-600 font-bold whitespace-nowrap">
                        {new Date(h.dateTime).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </span>
                      <StatusBadge status={h.status} size="xs"/>
                      {h.obs && <span className="text-[7px] text-slate-500 truncate">{h.obs}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-7 py-4 border-t border-slate-800 flex gap-3 justify-end">
              <button onClick={() => setStatusModalOpen(false)} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Cancelar</button>
              <button onClick={handleStatusUpdate} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NaviosTab;
