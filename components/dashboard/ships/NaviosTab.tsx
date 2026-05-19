import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip, Ship, ShipStatus, ShipStatusEntry, TerminalVessel } from '../../../types';
import { db, supabase } from '../../../utils/storage';

interface NaviosTabProps { user: User; trips: Trip[]; }

// ── Terminal config ────────────────────────────────────────────────────────────
const TERM_ACCENT: Record<string, { bg: string; text: string; border: string; dot: string; badge: string }> = {
  'BTP':           { bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/30',   dot: 'bg-amber-400',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  'ECOPORTO':      { bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-500/30',    dot: 'bg-blue-400',    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  'SANTOS BRASIL': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  'EMBRAPORT':     { bg: 'bg-purple-500/10',  text: 'text-purple-300',  border: 'border-purple-500/30',  dot: 'bg-purple-400',  badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
};
const TERM_LINKS: Record<string, string> = {
  'BTP':           'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
  'ECOPORTO':      'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
  'SANTOS BRASIL': 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao',
  'EMBRAPORT':     'https://www.embraport.com.br',
};

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ShipStatus, { label: string; bg: string; text: string; border: string; dot: string; rowBg: string }> = {
  'NOVO':               { label: 'Novo',           bg: 'bg-slate-500/20',   text: 'text-slate-300',   border: 'border-slate-500/30',   dot: 'bg-slate-400',   rowBg: '' },
  'NÃO ENCONTRADO':     { label: 'Não Encontrado', bg: 'bg-orange-500/15',  text: 'text-orange-300',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  rowBg: 'bg-orange-950/20' },
  'SEM PREVISÃO':       { label: 'Sem Previsão',   bg: 'bg-slate-500/15',   text: 'text-slate-400',   border: 'border-slate-600/30',   dot: 'bg-slate-500',   rowBg: '' },
  'AG. ATRACAÇÃO':      { label: 'Ag. Atracação',  bg: 'bg-yellow-500/15',  text: 'text-yellow-300',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  rowBg: 'bg-yellow-950/20' },
  'ATRACADO':           { label: 'Atracado',        bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30',   dot: 'bg-amber-400',   rowBg: 'bg-amber-950/25' },
  'GATE ABERTO':        { label: 'Gate Aberto',     bg: 'bg-green-500/15',   text: 'text-green-300',   border: 'border-green-500/30',   dot: 'bg-green-400',   rowBg: 'bg-green-950/25' },
  'GATE FECHADO':       { label: 'Gate Fechado',    bg: 'bg-red-500/15',     text: 'text-red-300',     border: 'border-red-500/30',     dot: 'bg-red-400',     rowBg: 'bg-red-950/25' },
  'GATE ENCERRADO':     { label: 'Gate Encerrado',  bg: 'bg-pink-500/15',    text: 'text-pink-300',    border: 'border-pink-500/30',    dot: 'bg-pink-400',    rowBg: 'bg-pink-950/20' },
  'DESATRACADO':        { label: 'Desatracado',     bg: 'bg-slate-600/15',   text: 'text-slate-400',   border: 'border-slate-600/30',   dot: 'bg-slate-500',   rowBg: 'bg-slate-800/30' },
  'FINALIZADO':         { label: 'Finalizado',      bg: 'bg-slate-600/20',   text: 'text-slate-400',   border: 'border-slate-600/30',   dot: 'bg-slate-500',   rowBg: '' },
  'EM TRÂNSITO':        { label: 'Em Trânsito',     bg: 'bg-blue-400/15',    text: 'text-blue-300',    border: 'border-blue-400/30',    dot: 'bg-blue-400',    rowBg: 'bg-blue-950/20' },
  'FUNDEADO':           { label: 'Fundeado',        bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30',   dot: 'bg-amber-400',   rowBg: 'bg-amber-950/20' },
  'AGUARDANDO JANELA':  { label: 'Ag. Janela',      bg: 'bg-violet-500/15',  text: 'text-violet-300',  border: 'border-violet-500/30',  dot: 'bg-violet-400',  rowBg: 'bg-violet-950/20' },
  'SAÍDO':              { label: 'Saído',           bg: 'bg-slate-500/15',   text: 'text-slate-400',   border: 'border-slate-500/30',   dot: 'bg-slate-500',   rowBg: '' },
};

const PANEL_STATUSES: ShipStatus[] = ['NOVO','NÃO ENCONTRADO','SEM PREVISÃO','GATE FECHADO','GATE ABERTO','GATE ENCERRADO','AG. ATRACAÇÃO','ATRACADO','DESATRACADO'];
const ALL_STATUSES: ShipStatus[]   = Object.keys(STATUS_CFG) as ShipStatus[];
const TERMINALS_MANUAL             = ['BTP','ECOPORTO','SANTOS BRASIL','EMBRAPORT','OUTRO'];

// ── TV filter options ──────────────────────────────────────────────────────────
type TVFilter = 'TODOS' | 'ATRACADO' | 'AG. ATRACAÇÃO' | 'GATE ABERTO' | 'GATE FECHADO' | 'DESATRACADO' | 'SEM PREVISÃO';
const TV_FILTERS: { key: TVFilter; label: string }[] = [
  { key: 'TODOS',          label: 'Todos' },
  { key: 'ATRACADO',       label: 'Atracados' },
  { key: 'AG. ATRACAÇÃO',  label: 'Na Barra' },
  { key: 'GATE ABERTO',    label: 'Gate Aberto' },
  { key: 'GATE FECHADO',   label: 'Gate Fechado' },
  { key: 'DESATRACADO',    label: 'Desatracados' },
  { key: 'SEM PREVISÃO',   label: 'Previstos' },
];

// ── Situação → ShipStatus ─────────────────────────────────────────────────────
function mapSituacao(s: string): ShipStatus {
  const n = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('em operac') || n.includes('operando') || n.includes('atracad')) return 'ATRACADO';
  if (n.includes('gate abert') || n.includes('gate open'))                         return 'GATE ABERTO';
  if (n.includes('gate fech') || n.includes('gate closed'))                        return 'GATE FECHADO';
  if (n.includes('gate encerr') || n.includes('encerr'))                           return 'GATE ENCERRADO';
  if (n.includes('desatrac') || n.includes('saiu') || n.includes('saido'))         return 'DESATRACADO';
  if (n.includes('previsto') || n.includes('aguard') || n.includes('ag.') || n.includes('ag '))
    return 'AG. ATRACAÇÃO';
  return 'SEM PREVISÃO';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Formata string de data brasileira ou ISO para exibição curta */
function fmtCell(v?: string | null): string {
  if (!v || v === '—') return '—';
  // Já no formato DD/MM/YYYY HH:MM — retorna como está, apenas trunca
  if (/^\d{2}\/\d{2}\/\d{2,4}/.test(v)) {
    // Se tiver hora, mostra só até os minutos
    const parts = v.split(' ');
    const datePart = parts[0]; // DD/MM/YYYY ou DD/MM/YY
    const timePart = parts[1] ? parts[1].slice(0,5) : ''; // HH:MM
    return timePart ? `${datePart} ${timePart}` : datePart;
  }
  // ISO string
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
  } catch { return v; }
}

function fmtDT(iso?: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
  } catch { return iso; }
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
  } catch { return iso; }
}

function isExpired(v?: string | null) {
  if (!v) return false;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) {
    const [dd, mm, yyyy] = v.split(/[\/ ]/);
    return new Date(`${yyyy}-${mm}-${dd}`) < new Date();
  }
  return new Date(v) < new Date();
}

const emptyShip = (): Partial<Ship> => ({
  name:'', imo:'', armador:'', viagem:'', terminal:'BTP', berco:'',
  prevAtracacao:'', abertGate:'', deadLine:'', dataAtracacao:'', dataDesatrac:'',
  status:'NOVO', observacoes:'', tripIds:[], statusHistory:[],
});

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const I = {
  Ship:    (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13l1.5 5.5A1 1 0 005.46 20h13.08a1 1 0 00.96-.5L21 13M3 13h18M3 13l2-8h14l2 8M12 3v10"/></svg>,
  Plus:    (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>,
  Close:   (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>,
  Edit:    (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  Trash:   (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Refresh: (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  Link:    (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>,
  History: (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Warning: (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
  Anchor:  (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3a3 3 0 100 6 3 3 0 000-6zm0 6v12M5 12h14M5 19.5c0-2.5 2-4.5 7-4.5s7 2 7 4.5"/></svg>,
  ChevD:   (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>,
  Pin:     (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>,
  Gate:    (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>,
};

// ── Sub-components ────────────────────────────────────────────────────────────
function SBadge({ status, size='sm' }: { status: ShipStatus; size?: 'xs'|'sm' }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG['NOVO'];
  return (
    <span className={`inline-flex items-center gap-1 font-black uppercase rounded-full border ${c.bg} ${c.text} ${c.border} ${size==='xs' ? 'text-[7px] px-1.5 py-0.5' : 'text-[8px] px-2 py-0.5'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}/>{c.label}
    </span>
  );
}

function TermBadge({ terminal }: { terminal: string }) {
  const acc = TERM_ACCENT[terminal] ?? { badge: 'bg-slate-700 text-slate-300 border-slate-600' };
  const short: Record<string,string> = { 'SANTOS BRASIL': 'SB', 'ECOPORTO': 'ECO', 'BTP': 'BTP', 'EMBRAPORT': 'EMB' };
  return (
    <span className={`inline-flex items-center font-black uppercase rounded border text-[7px] px-1.5 py-0.5 whitespace-nowrap ${acc.badge}`}>
      {short[terminal] ?? terminal.slice(0,3)}
    </span>
  );
}

function GateTag({ value, isDeadline }: { value?: string | null; isDeadline?: boolean }) {
  if (!value || value === '—') return <span className="text-slate-700">—</span>;
  const expired = isExpired(value);
  return (
    <span className={`text-[8px] font-black whitespace-nowrap ${expired ? 'text-red-400' : isDeadline ? 'text-orange-400' : 'text-green-400'}`}>
      {fmtCell(value)}
    </span>
  );
}

// ── Table cell helper ─────────────────────────────────────────────────────────
function TC({ v, muted }: { v?: string | null; muted?: boolean }) {
  const val = fmtCell(v);
  if (val === '—') return <span className="text-slate-700">—</span>;
  return <span className={`whitespace-nowrap ${muted ? 'text-slate-400' : 'text-slate-200'}`}>{val}</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────
const NaviosTab: React.FC<NaviosTabProps> = ({ user }) => {
  const [ships, setShips]             = useState<Ship[]>([]);
  const [loadingShips, setLS]         = useState(true);
  const [termVessels, setTV]          = useState<TerminalVessel[]>([]);
  const [tvFetchedAt, setTVAt]        = useState<string|null>(null);
  const [loadingTV, setLTV]           = useState(true);
  const [tvError, setTVError]         = useState<string|null>(null);
  const [tvFilter, setTVFilter]       = useState<TVFilter>('TODOS');

  // modal states
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState<Partial<Ship>>(emptyShip());
  const [saving, setSaving]           = useState(false);
  const [mErr, setMErr]               = useState<string|null>(null);

  const [stModal, setStModal]         = useState(false);
  const [stTarget, setStTarget]       = useState<Ship|null>(null);
  const [newSt, setNewSt]             = useState<ShipStatus>('NOVO');
  const [stObs, setStObs]             = useState('');

  const [showMonit, setShowMonit]     = useState(true);
  const [showHist, setShowHist]       = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadShips = useCallback(async () => {
    setLS(true);
    try { setShips(await db.getShips()); } catch(e){console.error(e);} finally { setLS(false); }
  }, []);

  const loadTV = useCallback(async () => {
    if (!supabase) return;
    setLTV(true); setTVError(null);
    try {
      const { data, error } = await supabase
        .from('terminal_vessels')
        .select('*')
        .order('fetched_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];

      setTV(rows.map(r => ({
        terminal:      r.terminal,
        navio:         r.navio,
        situacao:      r.situacao,
        previsao:      r.previsao,
        berco:         r.berco,
        armador:       r.armador,
        viagem:        r.viagem,
        // BTP extended fields
        rap:           r.rap,
        agencia:       r.agencia,
        dtPrevChegada: r.dt_prev_chegada,
        dtChegada:     r.dt_chegada,
        dtPrevAtrac:   r.dt_prev_atrac,
        dtAtracacao:   r.dt_atracacao,
        dtPrevSaida:   r.dt_prev_saida,
        dtSaida:       r.dt_saida,
        gateDry:       r.gate_dry,
        gateReefer:    r.gate_reefer,
        deadLineStr:   r.dead_line_str,
        servico:       r.servico,
        fetchedAt:     r.fetched_at,
      } as TerminalVessel)));

      setTVAt(rows[0]?.fetched_at ?? null);
    } catch(e:any) {
      setTVError(e?.message ?? 'Erro ao carregar dados dos terminais');
    } finally { setLTV(false); }
  }, []);

  useEffect(() => { loadShips(); loadTV(); }, []); // eslint-disable-line

  // ── Derived ────────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Partial<Record<ShipStatus, number>> = {};
    for (const v of termVessels) {
      const s = mapSituacao(v.situacao);
      c[s] = (c[s] ?? 0) + 1;
    }
    for (const s of ships) {
      if (s.status !== 'FINALIZADO' && s.status !== 'SAÍDO') {
        c[s.status] = (c[s.status] ?? 0) + 1;
      }
    }
    return c;
  }, [termVessels, ships]);

  const filteredVessels = useMemo(() => {
    if (tvFilter === 'TODOS') return termVessels;
    return termVessels.filter(v => mapSituacao(v.situacao) === tvFilter);
  }, [termVessels, tvFilter]);

  // Count per filter for badges
  const filterCounts = useMemo(() => {
    const c: Partial<Record<TVFilter, number>> = { TODOS: termVessels.length };
    for (const v of termVessels) {
      const s = mapSituacao(v.situacao) as TVFilter;
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [termVessels]);

  const allHistory = useMemo(() => {
    const e: Array<ShipStatusEntry & { shipName: string; viagem?: string; terminal?: string }> = [];
    for (const s of ships) for (const h of (s.statusHistory ?? [])) e.push({ ...h, shipName: s.name, viagem: s.viagem, terminal: s.terminal });
    return e.sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).slice(0,20);
  }, [ships]);

  // Whether any vessel has extended BTP data
  const hasExtended = useMemo(() => termVessels.some(v =>
    v.dtPrevChegada || v.dtChegada || v.dtPrevAtrac || v.dtAtracacao ||
    v.dtPrevSaida   || v.dtSaida   || v.gateDry     || v.gateReefer  ||
    v.deadLineStr   || v.servico
  ), [termVessels]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openNew = (prefill?: Partial<Ship>) => { setEditing({ ...emptyShip(), ...prefill }); setMErr(null); setModalOpen(true); };
  const openEdit = (s: Ship) => { setEditing({ ...s }); setMErr(null); setModalOpen(true); };
  const upd = (f: keyof Ship, v: any) => setEditing(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!editing.name?.trim()) { setMErr('Nome do navio obrigatório.'); return; }
    setSaving(true); setMErr(null);
    try {
      const isNew = !editing.id;
      const toSave: Partial<Ship> = { ...editing };
      if (isNew) toSave.statusHistory = [{ status: editing.status ?? 'NOVO', dateTime: new Date().toISOString(), obs: 'Criado' }];
      await db.saveShip(toSave);
      setModalOpen(false);
      await loadShips();
    } catch(e:any) { setMErr(e?.message || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover navio do monitoramento?')) return;
    try { await db.deleteShip(id); setShips(p => p.filter(s => s.id !== id)); }
    catch(e:any) { alert('Erro: ' + e?.message); }
  };

  const openStModal = (ship: Ship) => { setStTarget(ship); setNewSt(ship.status); setStObs(''); setStModal(true); };
  const handleStUpdate = async () => {
    if (!stTarget) return;
    const entry: ShipStatusEntry = { status: newSt, dateTime: new Date().toISOString(), obs: stObs || undefined };
    const hist = [...(stTarget.statusHistory ?? []), entry];
    const extra: Partial<Ship> = {};
    if (newSt === 'ATRACADO'    && !stTarget.dataAtracacao) extra.dataAtracacao = new Date().toISOString();
    if (newSt === 'DESATRACADO' && !stTarget.dataDesatrac)  extra.dataDesatrac  = new Date().toISOString();
    try { await db.saveShip({ ...stTarget, status: newSt, statusHistory: hist, ...extra }); setStModal(false); await loadShips(); }
    catch(e:any) { alert('Erro: ' + e?.message); }
  };

  const handlePinFromTerminal = (v: TerminalVessel) => {
    openNew({
      name:         v.navio.toUpperCase(),
      terminal:     v.terminal,
      viagem:       v.viagem,
      armador:      v.armador,
      berco:        v.berco,
      prevAtracacao: v.dtPrevAtrac || v.previsao || '',
      deadLine:      v.deadLineStr || '',
      status:        mapSituacao(v.situacao),
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitoramento de Navios</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Programação de atracação · BTP · ECOPORTO · Santos Brasil
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { loadTV(); loadShips(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <I.Refresh className="w-3.5 h-3.5"/> Atualizar
          </button>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95"
          >
            <I.Plus className="w-3.5 h-3.5"/> Monitorar Navio
          </button>
        </div>
      </div>

      {/* ── Status summary bar ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-9 gap-2">
        {PANEL_STATUSES.map(st => {
          const c = STATUS_CFG[st]; const n = counts[st] ?? 0;
          return (
            <div key={st} className={`rounded-xl p-3 text-center border ${c.border} ${c.bg} flex flex-col items-center gap-1`}>
              <span className={`text-2xl font-black ${n > 0 ? c.text : 'text-slate-600'}`}>{n}</span>
              <span className={`text-[7px] font-black uppercase leading-tight ${n > 0 ? c.text : 'text-slate-600'} opacity-80`}>{c.label}</span>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TERMINAL VESSELS — tabela estilo BTP
      ══════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-[#0f172a] border border-slate-800 overflow-hidden">

        {/* Table toolbar */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <I.Anchor className="w-4 h-4 text-slate-500"/>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Programação de Atracação
            </span>
            {tvFetchedAt && (
              <span className="text-[8px] text-slate-600 font-bold">
                · atualizado {new Date(tvFetchedAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
              </span>
            )}
            {loadingTV && <span className="text-[8px] text-blue-400 font-bold animate-pulse">Carregando...</span>}
          </div>

          {/* Terminal links */}
          <div className="flex items-center gap-2">
            {(['BTP','ECOPORTO','SANTOS BRASIL'] as const).map(t => (
              <a key={t} href={TERM_LINKS[t]} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1 text-[7px] font-black uppercase px-2 py-1 rounded border transition-all hover:opacity-80 ${TERM_ACCENT[t].badge}`}>
                <I.Link className="w-2.5 h-2.5"/> {t === 'SANTOS BRASIL' ? 'S.BRASIL' : t}
              </a>
            ))}
          </div>
        </div>

        {/* Filter buttons */}
        <div className="px-5 py-2.5 border-b border-slate-800/60 flex items-center gap-2 flex-wrap">
          {TV_FILTERS.map(({ key, label }) => {
            const active = tvFilter === key;
            const cnt = filterCounts[key] ?? 0;
            const statusKey = key === 'TODOS' ? null : key as ShipStatus;
            const cfg = statusKey ? STATUS_CFG[statusKey] : null;
            return (
              <button
                key={key}
                onClick={() => setTVFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                  active
                    ? cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-slate-700 text-slate-200 border-slate-600'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
                }`}
              >
                {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>}
                {label}
                {cnt > 0 && <span className={`ml-0.5 font-black ${active ? '' : 'text-slate-600'}`}>({cnt})</span>}
              </button>
            );
          })}
        </div>

        {/* Error state */}
        {tvError && (
          <div className="px-6 py-4 flex items-start gap-3">
            <I.Warning className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase">Aguardando dados do Railway</p>
              <p className="text-[9px] text-amber-600 font-bold mt-0.5">{tvError}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loadingTV && termVessels.length === 0 && !tvError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <I.Anchor className="w-12 h-12 text-slate-800"/>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aguardando primeira coleta</p>
            <p className="text-[9px] text-slate-700 font-bold max-w-xs">
              O bot raspa os terminais a cada 30 min e salva automaticamente.
            </p>
          </div>
        )}

        {/* ── THE TABLE ── */}
        {filteredVessels.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] border-collapse" style={{ minWidth: hasExtended ? '1400px' : '700px' }}>
              <thead>
                <tr className="border-b border-slate-800">
                  {/* Sticky columns */}
                  <th className="sticky left-0 z-10 bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-r border-slate-800/60 w-16">
                    Porto
                  </th>
                  <th className="sticky left-16 z-10 bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-r border-slate-800/60 min-w-[140px]">
                    Navio
                  </th>
                  <th className="sticky left-[196px] z-10 bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-r border-slate-800/60 w-28">
                    Status
                  </th>
                  {/* Scrollable columns */}
                  <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Viagem</th>
                  <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Agência</th>
                  <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Berço</th>
                  {hasExtended && <>
                    <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Prev. Chegada</th>
                    <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Chegada</th>
                    <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Prev. Atrac.</th>
                    <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Atracação</th>
                    <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Prev. Saída</th>
                    <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Saída</th>
                    <th className="px-3 py-2.5 text-center font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Gate Dry</th>
                    <th className="px-3 py-2.5 text-center font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Gate Reefer</th>
                    <th className="px-3 py-2.5 text-center font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Dead-Line</th>
                    <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Serviço</th>
                  </>}
                  {!hasExtended && (
                    <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Previsão</th>
                  )}
                  <th className="px-3 py-2.5 w-8"/>
                </tr>
              </thead>
              <tbody>
                {filteredVessels.map((v, idx) => {
                  const st  = mapSituacao(v.situacao);
                  const sc  = STATUS_CFG[st];
                  const acc = TERM_ACCENT[v.terminal] ?? TERM_ACCENT['BTP'];
                  const isMonitored = ships.some(s => s.name.toUpperCase() === v.navio.toUpperCase());
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-slate-800/50 transition-colors group ${sc.rowBg || ''} hover:brightness-125`}
                    >
                      {/* TERMINAL (sticky) */}
                      <td className={`sticky left-0 z-10 px-3 py-2 border-r border-slate-800/40 ${sc.rowBg || 'bg-[#0f172a]'}`}>
                        <TermBadge terminal={v.terminal}/>
                      </td>

                      {/* NAVIO (sticky) */}
                      <td className={`sticky left-16 z-10 px-3 py-2 border-r border-slate-800/40 ${sc.rowBg || 'bg-[#0f172a]'}`}>
                        <div className="flex flex-col gap-0.5">
                          <span className={`font-black uppercase whitespace-nowrap ${sc.text}`}>{v.navio}</span>
                          {v.rap && <span className="text-[7px] text-slate-600 font-bold">RAP: {v.rap}</span>}
                        </div>
                      </td>

                      {/* STATUS (sticky) */}
                      <td className={`sticky left-[196px] z-10 px-3 py-2 border-r border-slate-800/40 ${sc.rowBg || 'bg-[#0f172a]'}`}>
                        <SBadge status={st} size="xs"/>
                      </td>

                      {/* VIAGEM */}
                      <td className="px-3 py-2">
                        <span className="text-slate-400 font-bold whitespace-nowrap">{v.viagem || '—'}</span>
                      </td>

                      {/* AGÊNCIA */}
                      <td className="px-3 py-2">
                        <span className="text-slate-400 whitespace-nowrap">{v.agencia || v.armador || '—'}</span>
                      </td>

                      {/* BERÇO */}
                      <td className="px-3 py-2">
                        <span className="text-slate-400 whitespace-nowrap">{v.berco || '—'}</span>
                      </td>

                      {hasExtended && <>
                        {/* PREV. CHEGADA */}
                        <td className="px-3 py-2"><TC v={v.dtPrevChegada} muted/></td>

                        {/* CHEGADA */}
                        <td className="px-3 py-2"><TC v={v.dtChegada}/></td>

                        {/* PREV. ATRAC. */}
                        <td className="px-3 py-2"><TC v={v.dtPrevAtrac} muted/></td>

                        {/* ATRACAÇÃO */}
                        <td className="px-3 py-2">
                          <span className={`whitespace-nowrap font-black ${v.dtAtracacao ? sc.text : 'text-slate-700'}`}>
                            {fmtCell(v.dtAtracacao) || '—'}
                          </span>
                        </td>

                        {/* PREV. SAÍDA */}
                        <td className="px-3 py-2"><TC v={v.dtPrevSaida} muted/></td>

                        {/* SAÍDA */}
                        <td className="px-3 py-2"><TC v={v.dtSaida}/></td>

                        {/* GATE DRY */}
                        <td className="px-3 py-2 text-center">
                          <GateTag value={v.gateDry}/>
                        </td>

                        {/* GATE REEFER */}
                        <td className="px-3 py-2 text-center">
                          <GateTag value={v.gateReefer}/>
                        </td>

                        {/* DEAD-LINE */}
                        <td className="px-3 py-2 text-center">
                          <GateTag value={v.deadLineStr} isDeadline/>
                        </td>

                        {/* SERVIÇO */}
                        <td className="px-3 py-2">
                          <span className="text-slate-400 whitespace-nowrap">{v.servico || '—'}</span>
                        </td>
                      </>}

                      {/* PREVISÃO (fallback for non-BTP) */}
                      {!hasExtended && (
                        <td className="px-3 py-2">
                          <TC v={v.previsao || v.dtPrevAtrac} muted/>
                        </td>
                      )}

                      {/* PIN ACTION */}
                      <td className="px-3 py-2">
                        {isMonitored ? (
                          <I.Pin className="w-3 h-3 text-blue-500" title="Monitorado"/>
                        ) : (
                          <button
                            onClick={() => handlePinFromTerminal(v)}
                            title="Adicionar ao monitoramento"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <I.Pin className="w-3 h-3 text-slate-600 hover:text-blue-400 transition-colors"/>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredVessels.length === 0 && tvFilter !== 'TODOS' && (
              <div className="flex items-center justify-center py-10 text-slate-600 text-[9px] font-black uppercase">
                Nenhum navio neste filtro
              </div>
            )}
          </div>
        )}

        {/* Table footer */}
        {termVessels.length > 0 && (
          <div className="px-5 py-2 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-[7px] text-slate-700 font-bold uppercase">
              {filteredVessels.length} de {termVessels.length} navios · scraped pelo Railway Bot
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[7px] text-amber-700 font-bold">
                <span className="w-2 h-2 rounded-sm bg-amber-950/60 border border-amber-700/40"/> Atracado
              </span>
              <span className="flex items-center gap-1 text-[7px] text-yellow-700 font-bold">
                <span className="w-2 h-2 rounded-sm bg-yellow-950/60 border border-yellow-700/40"/> Na Barra
              </span>
              <span className="flex items-center gap-1 text-[7px] text-green-700 font-bold">
                <span className="w-2 h-2 rounded-sm bg-green-950/60 border border-green-700/40"/> Gate Aberto
              </span>
              <span className="flex items-center gap-1 text-[7px] text-red-700 font-bold">
                <span className="w-2 h-2 rounded-sm bg-red-950/60 border border-red-700/40"/> Gate Fechado
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          NAVIOS MONITORADOS (manual)
      ══════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button
          onClick={() => setShowMonit(p => !p)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-2">
            <I.Ship className="w-4 h-4 text-slate-400"/>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Navios Monitorados</p>
            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{ships.length}</span>
          </div>
          <I.ChevD className={`w-4 h-4 text-slate-400 transition-transform ${showMonit ? 'rotate-180' : ''}`}/>
        </button>

        {showMonit && (
          loadingShips ? (
            <div className="flex items-center justify-center h-24 border-t border-slate-100">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : ships.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 gap-2 border-t border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Nenhum navio adicionado</p>
              <button onClick={() => openNew()} className="text-[9px] font-black text-blue-500 hover:underline">+ Adicionar navio</button>
            </div>
          ) : (
            <div className="border-t border-slate-100">
              {/* Active ships */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {ships.filter(s => !['FINALIZADO','SAÍDO','DESATRACADO'].includes(s.status)).map(ship => {
                  const c = STATUS_CFG[ship.status]; const dlExp = isExpired(ship.deadLine);
                  return (
                    <div key={ship.id} className={`bg-[#0f172a] rounded-2xl border ${c.border} flex flex-col overflow-hidden`}>
                      <div className={`px-4 py-3 ${c.bg} border-b ${c.border} flex items-start justify-between gap-2`}>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase truncate ${c.text}`}>
                            {ship.name}{ship.viagem && <span className="ml-1.5 opacity-70 font-bold">· {ship.viagem}</span>}
                          </p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">
                            {ship.terminal ?? '—'}{ship.berco ? ` · Berço ${ship.berco}` : ''}
                          </p>
                        </div>
                        <SBadge status={ship.status} size="xs"/>
                      </div>
                      <div className="px-4 py-3 space-y-1.5 flex-1">
                        {ship.prevAtracacao && <Row label="Prev. Atracação" value={fmtDT(ship.prevAtracacao)}/>}
                        {ship.abertGate     && <Row label="Abert. Gate"     value={fmtDT(ship.abertGate)}/>}
                        {ship.deadLine      && <Row label="Dead-Line"        value={fmtDT(ship.deadLine)} red={dlExp}/>}
                        {ship.dataAtracacao && <Row label="Data Atracação"   value={fmtDT(ship.dataAtracacao)}/>}
                        {ship.dataDesatrac  && <Row label="Desatracação"     value={fmtDT(ship.dataDesatrac)}/>}
                        {!ship.prevAtracacao && !ship.abertGate && !ship.deadLine && (
                          <p className="text-[8px] text-slate-600 italic font-bold">Sem datas definidas</p>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-slate-800/50 flex items-center justify-between">
                        <span className="text-[7px] text-slate-600 font-bold">{fmtDate(ship.updatedAt)}</span>
                        <div className="flex gap-1">
                          <Btn onClick={() => openStModal(ship)} title="Status"><I.History className="w-3 h-3"/></Btn>
                          <Btn onClick={() => openEdit(ship)} title="Editar"><I.Edit className="w-3 h-3"/></Btn>
                          <Btn onClick={() => handleDelete(ship.id)} title="Remover" danger><I.Trash className="w-3 h-3"/></Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Finished/desatracado */}
              {ships.filter(s => ['FINALIZADO','SAÍDO','DESATRACADO'].includes(s.status)).length > 0 && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-[9px]">
                    <thead><tr className="border-b border-slate-100">
                      {['Navio','Viagem','Terminal','Status','Atualizado',''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {ships.filter(s => ['FINALIZADO','SAÍDO','DESATRACADO'].includes(s.status)).map(s => (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-black text-slate-600 uppercase">{s.name}</td>
                          <td className="px-3 py-2.5 text-slate-400">{s.viagem??'—'}</td>
                          <td className="px-3 py-2.5 text-slate-400">{s.terminal??'—'}</td>
                          <td className="px-3 py-2.5"><SBadge status={s.status} size="xs"/></td>
                          <td className="px-3 py-2.5 text-slate-400">{fmtDate(s.updatedAt)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1">
                              <Btn onClick={() => openStModal(s)} title="Status"><I.History className="w-3 h-3"/></Btn>
                              <Btn onClick={() => openEdit(s)} title="Editar"><I.Edit className="w-3 h-3"/></Btn>
                              <Btn onClick={() => handleDelete(s.id)} title="Remover" danger><I.Trash className="w-3 h-3"/></Btn>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* ── ÚLTIMAS ATUALIZAÇÕES ── */}
      {allHistory.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setShowHist(p => !p)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-2">
              <I.History className="w-4 h-4 text-slate-400"/>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Histórico de Status</p>
            </div>
            <I.ChevD className={`w-4 h-4 text-slate-400 transition-transform ${showHist ? 'rotate-180' : ''}`}/>
          </button>
          {showHist && (
            <div className="border-t border-slate-100 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {allHistory.map((h, i) => {
                const c = STATUS_CFG[h.status as ShipStatus] ?? STATUS_CFG['NOVO'];
                return (
                  <div key={i} className={`rounded-xl p-3 border ${c.border} ${c.bg} space-y-1`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[8px] font-black text-slate-400">
                        {new Date(h.dateTime).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </p>
                      <SBadge status={h.status as ShipStatus} size="xs"/>
                    </div>
                    <p className={`text-[9px] font-black uppercase truncate ${c.text}`}>{h.shipName}</p>
                    {h.viagem && <p className="text-[8px] text-slate-500 font-bold">{h.terminal} · {h.viagem}</p>}
                    {h.obs    && <p className="text-[8px] text-slate-500 italic">{h.obs}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SHIP MODAL
      ══════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <I.Ship className="w-4 h-4 text-blue-400"/>
                </div>
                <h2 className="text-[11px] font-black text-slate-100 uppercase tracking-widest">
                  {editing.id ? 'Editar Navio' : 'Adicionar ao Monitoramento'}
                </h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all">
                <I.Close className="w-4 h-4"/>
              </button>
            </div>
            <div className="px-7 py-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {mErr && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-[10px] font-black text-red-400 uppercase flex gap-2">
                  <I.Warning className="w-3.5 h-3.5 shrink-0"/>{mErr}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome do Navio *</label>
                  <input value={editing.name??''} onChange={e=>upd('name',e.target.value)} placeholder="Ex: MSC MELINE"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all uppercase"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nº Viagem</label>
                  <input value={editing.viagem??''} onChange={e=>upd('viagem',e.target.value)} placeholder="Ex: MM620R"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Terminal</label>
                  <select value={editing.terminal??'BTP'} onChange={e=>upd('terminal',e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all">
                    {TERMINALS_MANUAL.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Armador</label>
                  <input value={editing.armador??''} onChange={e=>upd('armador',e.target.value)} placeholder="Ex: MSC, Maersk..."
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Berço</label>
                  <input value={editing.berco??''} onChange={e=>upd('berco',e.target.value)} placeholder="Ex: 310"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
                </div>
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pt-2 border-t border-slate-800">Datas</p>
              <div className="grid grid-cols-2 gap-4">
                {([
                  ['Prev. Atracação','prevAtracacao'],
                  ['Abertura de Gate','abertGate'],
                  ['Dead-Line','deadLine'],
                  ['Status','status'],
                  ['Data de Atracação','dataAtracacao'],
                  ['Data de Desatracação','dataDesatrac'],
                ] as [string, keyof Ship][]).map(([lbl, field]) => (
                  <div key={field}>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{lbl}</label>
                    {field === 'status' ? (
                      <select value={(editing[field] as string)??'NOVO'} onChange={e=>upd(field, e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all">
                        {ALL_STATUSES.map(s=><option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                      </select>
                    ) : (
                      <input type="datetime-local" value={((editing[field] as string)??'').slice(0,16)}
                        onChange={e=>upd(field, e.target.value ? new Date(e.target.value).toISOString() : '')}
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"/>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observações</label>
                <textarea value={editing.observacoes??''} onChange={e=>upd('observacoes',e.target.value)} rows={2} placeholder="Info adicional..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"/>
              </div>
            </div>
            <div className="px-7 py-4 border-t border-slate-800 flex gap-3 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STATUS MODAL
      ══════════════════════════════════════════════════════════════ */}
      {stModal && stTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Atualizar Status</p>
                <p className="text-[12px] font-black text-slate-100 uppercase">
                  {stTarget.name}{stTarget.viagem ? ` · ${stTarget.viagem}` : ''}
                </p>
              </div>
              <button onClick={() => setStModal(false)} className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all">
                <I.Close className="w-4 h-4"/>
              </button>
            </div>
            <div className="px-7 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {ALL_STATUSES.map(s => {
                  const c = STATUS_CFG[s];
                  return (
                    <button key={s} onClick={() => setNewSt(s)}
                      className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase text-left transition-all flex items-center gap-2 ${newSt===s ? `${c.bg} ${c.border} ${c.text}` : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                      <span className={`w-2 h-2 rounded-full ${c.dot}`}/>{c.label}
                    </button>
                  );
                })}
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observação (opcional)</label>
                <input value={stObs} onChange={e=>setStObs(e.target.value)} placeholder="Ex: Gate aberto pelo terminal BTP"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
              </div>
              {(stTarget.statusHistory ?? []).length > 0 && (
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  <p className="text-[7px] font-black text-slate-600 uppercase">Histórico</p>
                  {[...(stTarget.statusHistory ?? [])].reverse().slice(0,5).map((h,i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[7px] text-slate-600 font-bold whitespace-nowrap">
                        {new Date(h.dateTime).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                      </span>
                      <SBadge status={h.status} size="xs"/>
                      {h.obs && <span className="text-[7px] text-slate-500 truncate">{h.obs}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-7 py-4 border-t border-slate-800 flex gap-3 justify-end">
              <button onClick={() => setStModal(false)} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Cancelar</button>
              <button onClick={handleStUpdate} className="px-7 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Small helpers ─────────────────────────────────────────────────────────────
function Row({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wide shrink-0">{label}:</span>
      <span className={`text-[8px] font-black truncate ${red ? 'text-red-400' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
function Btn({ onClick, title, danger, children }: { onClick: () => void; title?: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg transition-all ${danger ? 'bg-slate-800 hover:bg-red-900/60' : 'bg-slate-800 hover:bg-slate-700'}`}>
      <span className={danger ? 'text-slate-500' : 'text-slate-400'}>{children}</span>
    </button>
  );
}

export default NaviosTab;
