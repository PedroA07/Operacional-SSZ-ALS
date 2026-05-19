import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip, Ship, ShipStatus, ShipStatusEntry, TerminalVessel } from '../../../types';
import { db, supabase } from '../../../utils/storage';

interface NaviosTabProps { user: User; trips: Trip[]; }

// ── Terminal config ────────────────────────────────────────────────────────────
const TERM_ACCENT: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'BTP':           { bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/30',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  'ECOPORTO':      { bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-500/30',    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  'SANTOS BRASIL': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  'EMBRAPORT':     { bg: 'bg-purple-500/10',  text: 'text-purple-300',  border: 'border-purple-500/30',  badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
};
const TERM_LINKS: Record<string, string> = {
  'BTP':           'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
  'ECOPORTO':      'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
  'SANTOS BRASIL': 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao',
  'EMBRAPORT':     'https://www.embraport.com.br',
};
const TERM_SHORT: Record<string, string> = {
  'BTP': 'BTP', 'ECOPORTO': 'ECO', 'SANTOS BRASIL': 'SB', 'EMBRAPORT': 'EMB',
};

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ShipStatus, { label: string; bg: string; text: string; border: string; dot: string; rowBg: string }> = {
  'NOVO':               { label: 'Novo',           bg: 'bg-slate-500/20',   text: 'text-slate-300',   border: 'border-slate-500/30',   dot: 'bg-slate-400',   rowBg: '' },
  'NÃO ENCONTRADO':     { label: 'Não Encontrado', bg: 'bg-orange-500/15',  text: 'text-orange-300',  border: 'border-orange-500/30',  dot: 'bg-orange-400',  rowBg: 'bg-orange-950/20' },
  'SEM PREVISÃO':       { label: 'Sem Previsão',   bg: 'bg-slate-500/15',   text: 'text-slate-400',   border: 'border-slate-600/30',   dot: 'bg-slate-500',   rowBg: '' },
  'AG. ATRACAÇÃO':      { label: 'Na Barra',        bg: 'bg-yellow-500/15',  text: 'text-yellow-300',  border: 'border-yellow-500/30',  dot: 'bg-yellow-400',  rowBg: 'bg-yellow-950/20' },
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

const PANEL_STATUSES: ShipStatus[] = ['NOVO','NÃO ENCONTRADO','SEM PREVISÃO','GATE FECHADO','GATE ABERTO','AG. ATRACAÇÃO','ATRACADO','DESATRACADO'];
const ALL_STATUSES: ShipStatus[]   = Object.keys(STATUS_CFG) as ShipStatus[];
const TERMINALS_MANUAL             = ['BTP','ECOPORTO','SANTOS BRASIL','EMBRAPORT','OUTRO'];

// ── TV filter ──────────────────────────────────────────────────────────────────
type TVFilter = 'TODOS' | ShipStatus;
const TV_FILTERS: { key: TVFilter; label: string }[] = [
  { key: 'TODOS',          label: 'Todos' },
  { key: 'ATRACADO',       label: 'Atracados' },
  { key: 'AG. ATRACAÇÃO',  label: 'Na Barra' },
  { key: 'GATE ABERTO',    label: 'Gate Aberto' },
  { key: 'GATE FECHADO',   label: 'Gate Fechado' },
  { key: 'DESATRACADO',    label: 'Desatracados' },
  { key: 'SEM PREVISÃO',   label: 'Previstos' },
];

// ── Active trip statuses (not completed) ──────────────────────────────────────
const INACTIVE_STATUSES = ['Viagem concluída', 'Viagem cancelada'];

// ── Situação → ShipStatus ─────────────────────────────────────────────────────
function mapSituacao(s: string): ShipStatus {
  const n = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('em operac') || n.includes('operando') || n.includes('atracad') || n === 'em operação') return 'ATRACADO';
  if (n.includes('na barra') || n.includes('esperado'))                                                    return 'AG. ATRACAÇÃO';
  if (n.includes('gate abert') || n.includes('gate open'))                                                 return 'GATE ABERTO';
  if (n.includes('gate fech') || n.includes('gate closed'))                                                return 'GATE FECHADO';
  if (n.includes('gate encerr'))                                                                            return 'GATE ENCERRADO';
  if (n.includes('encerrado'))                                                                              return 'GATE ENCERRADO';
  if (n.includes('desatrac') || n.includes('saiu') || n.includes('saido'))                                return 'DESATRACADO';
  if (n.includes('previsto') || n.includes('aguard') || n.includes('ag.') || n === 'ag. atracação')       return 'AG. ATRACAÇÃO';
  return 'SEM PREVISÃO';
}

// ── Ship name normalizer / matcher ────────────────────────────────────────────
function normShip(name: string): string {
  return name.toUpperCase().trim().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ');
}
function shipMatch(a: string, b: string): boolean {
  const na = normShip(a); const nb = normShip(b);
  if (!na || !nb || na.length < 3 || nb.length < 3) return false;
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer  = na.length < nb.length ? nb : na;
  if (shorter.length >= 4 && longer.includes(shorter)) return true;
  // word overlap: ≥ 2 words in common
  const wa = new Set(na.split(' ').filter(w => w.length > 2));
  const wb = new Set(nb.split(' ').filter(w => w.length > 2));
  let common = 0;
  wa.forEach(w => { if (wb.has(w)) common++; });
  return common >= 2;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCell(v?: string | null): string {
  if (!v || v === '—' || v === '-') return '—';
  if (/^\d{2}\/\d{2}\/\d{2,4}/.test(v)) {
    const [date, time] = v.split(' ');
    return time ? `${date} ${time.slice(0,5)}` : date;
  }
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
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}
function isExpiredStr(v?: string | null) {
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
  Check:   (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>,
  Search:  (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Eye:     (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
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
// ── Terminal logo badges (branded) ───────────────────────────────────────────
const TERM_LOGO_CFG: Record<string, { bg: string; text: string; label: string; icon?: React.ReactNode }> = {
  'BTP':           { bg: '#00437a', text: '#ffffff', label: 'BTP'  },
  'ECOPORTO':      { bg: '#006b2f', text: '#ffffff', label: 'ECO'  },
  'SANTOS BRASIL': { bg: '#003087', text: '#ffffff', label: 'SB'   },
  'EMBRAPORT':     { bg: '#6b21a8', text: '#ffffff', label: 'EMB'  },
};
function TermBadge({ terminal }: { terminal: string }) {
  const cfg = TERM_LOGO_CFG[terminal];
  if (!cfg) {
    return (
      <span className="inline-flex items-center font-black uppercase rounded border text-[7px] px-1.5 py-0.5 whitespace-nowrap bg-slate-700 text-slate-300 border-slate-600">
        {terminal.slice(0,3)}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-black uppercase rounded text-[7px] px-1.5 py-0.5 whitespace-nowrap shrink-0 tracking-widest"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {/* Anchor icon for port terminals */}
      <svg className="w-2 h-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a3 3 0 100 6 3 3 0 000-6zm0 6v12M5 12h14M5 19.5c0-2.5 2-4.5 7-4.5s7 2 7 4.5"/>
      </svg>
      {cfg.label}
    </span>
  );
}
function TermBadgeLarge({ terminal }: { terminal: string }) {
  const cfg = TERM_LOGO_CFG[terminal];
  const names: Record<string,string> = {
    'BTP': 'BTP', 'ECOPORTO': 'Ecoporto', 'SANTOS BRASIL': 'Santos Brasil', 'EMBRAPORT': 'Embraport',
  };
  if (!cfg) return <TermBadge terminal={terminal}/>;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-black uppercase rounded-md text-[8px] px-2 py-1 whitespace-nowrap shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a3 3 0 100 6 3 3 0 000-6zm0 6v12M5 12h14M5 19.5c0-2.5 2-4.5 7-4.5s7 2 7 4.5"/>
      </svg>
      {names[terminal] ?? terminal}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const NaviosTab: React.FC<NaviosTabProps> = ({ user, trips }) => {
  // View tab
  const [viewTab, setViewTab]         = useState<'programacao' | 'monitoramento'>('programacao');

  // Data
  const [ships, setShips]             = useState<Ship[]>([]);
  const [loadingShips, setLS]         = useState(true);
  const [termVessels, setTV]          = useState<TerminalVessel[]>([]);
  const [tvFetchedAt, setTVAt]        = useState<string|null>(null);
  const [loadingTV, setLTV]           = useState(true);
  const [tvError, setTVError]         = useState<string|null>(null);
  const [tvFilter, setTVFilter]       = useState<TVFilter>('TODOS');

  // Modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState<Partial<Ship>>(emptyShip());
  const [saving, setSaving]           = useState(false);
  const [mErr, setMErr]               = useState<string|null>(null);
  const [stModal, setStModal]         = useState(false);
  const [stTarget, setStTarget]       = useState<Ship|null>(null);
  const [newSt, setNewSt]             = useState<ShipStatus>('NOVO');
  const [stObs, setStObs]             = useState('');

  // Collapsibles
  const [showMonit, setShowMonit]     = useState(true);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadShips = useCallback(async () => {
    setLS(true);
    try { setShips(await db.getShips()); } catch(e){console.error(e);} finally { setLS(false); }
  }, []);

  const loadTV = useCallback(async () => {
    if (!supabase) return;
    setLTV(true); setTVError(null);
    try {
      const { data, error } = await supabase
        .from('terminal_vessels').select('*').order('fetched_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      setTV(rows.map(r => ({
        terminal: r.terminal, navio: r.navio, situacao: r.situacao,
        previsao: r.previsao, berco: r.berco, armador: r.armador, viagem: r.viagem,
        rap: r.rap, agencia: r.agencia,
        dtPrevChegada: r.dt_prev_chegada, dtChegada: r.dt_chegada,
        dtPrevAtrac: r.dt_prev_atrac, dtAtracacao: r.dt_atracacao,
        dtPrevSaida: r.dt_prev_saida, dtSaida: r.dt_saida,
        gateDry: r.gate_dry, gateReefer: r.gate_reefer,
        deadLineStr: r.dead_line_str, servico: r.servico, fetchedAt: r.fetched_at,
      } as TerminalVessel)));
      setTVAt(rows[0]?.fetched_at ?? null);
    } catch(e:any) { setTVError(e?.message ?? 'Erro ao carregar dados dos terminais'); }
    finally { setLTV(false); }
  }, []);

  useEffect(() => { loadShips(); loadTV(); }, []); // eslint-disable-line

  // ── Derived ─────────────────────────────────────────────────────────────────
  // Status counts (panel bar)
  const counts = useMemo(() => {
    const c: Partial<Record<ShipStatus, number>> = {};
    for (const v of termVessels) { const s = mapSituacao(v.situacao); c[s] = (c[s]??0)+1; }
    for (const s of ships) { if (!['FINALIZADO','SAÍDO'].includes(s.status)) c[s.status] = (c[s.status]??0)+1; }
    return c;
  }, [termVessels, ships]);

  // Filtered vessels for Programação tab
  const filteredVessels = useMemo(() => {
    if (tvFilter === 'TODOS') return termVessels;
    return termVessels.filter(v => mapSituacao(v.situacao) === tvFilter);
  }, [termVessels, tvFilter]);

  const filterCounts = useMemo(() => {
    const c: Partial<Record<TVFilter, number>> = { TODOS: termVessels.length };
    for (const v of termVessels) { const s = mapSituacao(v.situacao) as TVFilter; c[s] = (c[s]??0)+1; }
    return c;
  }, [termVessels]);

  // ── MONITORAMENTO: trip-vessel matching ──────────────────────────────────────
  // Only trips that are in the Organização page (not removed) and have a ship name
  const orgTripsWithShip = useMemo(() =>
    trips.filter(t => !INACTIVE_STATUSES.includes(t.status) && !t.isRemovedFromOrg && t.ship?.trim()),
  [trips]);

  // Group by ship name → find matching terminal vessel
  interface VesselMatch {
    vessel: TerminalVessel;
    matchedTrips: Trip[];
    pendingCount: number;   // trips without scheduling (agendamento pendente)
    scheduledCount: number;
  }
  const vesselMatches = useMemo<VesselMatch[]>(() => {
    const matches: VesselMatch[] = [];
    const usedVessels = new Set<number>();
    // Group trips by ship name first
    const byShip = new Map<string, Trip[]>();
    for (const t of orgTripsWithShip) {
      const key = normShip(t.ship);
      if (!byShip.has(key)) byShip.set(key, []);
      byShip.get(key)!.push(t);
    }
    // For each vessel, find matching trips
    termVessels.forEach((vessel, idx) => {
      const matched: Trip[] = [];
      byShip.forEach((tripList, shipKey) => {
        if (shipMatch(vessel.navio, shipKey)) {
          matched.push(...tripList);
          usedVessels.add(idx);
        }
      });
      if (matched.length > 0) {
        matches.push({
          vessel,
          matchedTrips: matched,
          pendingCount:   matched.filter(t => !t.isScheduled && t.status !== 'Agendamento realizado').length,
          scheduledCount: matched.filter(t =>  t.isScheduled || t.status === 'Agendamento realizado').length,
        });
      }
    });
    return matches;
  }, [termVessels, activeTripsWithShip]);

  // Trips whose ship was NOT found in any terminal vessel
  const unmatchedTrips = useMemo(() => {
    return orgTripsWithShip.filter(t =>
      !termVessels.some(v => shipMatch(v.navio, t.ship))
    );
  }, [orgTripsWithShip, termVessels]);

  const allHistory = useMemo(() => {
    const e: Array<ShipStatusEntry & { shipName: string; viagem?: string; terminal?: string }> = [];
    for (const s of ships) for (const h of (s.statusHistory ?? [])) e.push({ ...h, shipName: s.name, viagem: s.viagem, terminal: s.terminal });
    return e.sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).slice(0,20);
  }, [ships]);

  // ── Actions ──────────────────────────────────────────────────────────────────
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
      await db.saveShip(toSave); setModalOpen(false); await loadShips();
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
  const pinFromTerminal = (v: TerminalVessel) => openNew({
    name: v.navio.toUpperCase(), terminal: v.terminal, viagem: v.viagem,
    armador: v.armador, berco: v.berco,
    prevAtracacao: v.dtPrevAtrac || v.previsao || '',
    deadLine: v.deadLineStr || '',
    status: mapSituacao(v.situacao),
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitoramento de Navios</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            BTP · ECOPORTO · Santos Brasil — atualizado pelo Railway Bot
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { loadTV(); loadShips(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 text-[9px] font-black uppercase tracking-widest transition-all">
            <I.Refresh className="w-3.5 h-3.5"/> Atualizar
          </button>
          <button onClick={() => openNew()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95">
            <I.Plus className="w-3.5 h-3.5"/> Monitorar Navio
          </button>
        </div>
      </div>

      {/* Status summary bar */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
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

      {/* ── TAB NAVIGATION ── */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { key: 'programacao'  as const, label: 'Programação de Atracação', icon: I.Anchor },
          { key: 'monitoramento' as const, label: `Monitoramento${vesselMatches.length > 0 ? ` (${vesselMatches.length})` : ''}`, icon: I.Eye },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setViewTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              viewTab === key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon className="w-3.5 h-3.5"/>
            {label}
            {key === 'monitoramento' && vesselMatches.some(m => m.pendingCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"/>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB: PROGRAMAÇÃO DE ATRACAÇÃO
      ══════════════════════════════════════════════════════════════ */}
      {viewTab === 'programacao' && (
        <div className="rounded-2xl bg-[#0f172a] border border-slate-800 overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <I.Anchor className="w-4 h-4 text-slate-500"/>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Programação de Atracação</span>
              {tvFetchedAt && (
                <span className="text-[8px] text-slate-600 font-bold">
                  · {new Date(tvFetchedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                </span>
              )}
              {loadingTV && <span className="text-[8px] text-blue-400 font-bold animate-pulse">Carregando...</span>}
            </div>
            <div className="flex items-center gap-2">
              {(['BTP','ECOPORTO','SANTOS BRASIL'] as const).map(t => {
                const cfg = TERM_LOGO_CFG[t];
                return (
                  <a key={t} href={TERM_LINKS[t]} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[7px] font-black uppercase px-2 py-1 rounded transition-all hover:opacity-80"
                    style={{ backgroundColor: cfg?.bg ?? '#334155', color: cfg?.text ?? '#fff' }}>
                    <I.Link className="w-2.5 h-2.5"/> {TERM_SHORT[t]}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="px-5 py-2.5 border-b border-slate-800/60 flex items-center gap-2 flex-wrap">
            {TV_FILTERS.map(({ key, label }) => {
              const active = tvFilter === key;
              const cnt = filterCounts[key as TVFilter] ?? 0;
              const cfg = key === 'TODOS' ? null : STATUS_CFG[key as ShipStatus];
              return (
                <button key={key} onClick={() => setTVFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                    active
                      ? cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-slate-700 text-slate-200 border-slate-600'
                      : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
                  }`}>
                  {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>}
                  {label}
                  {cnt > 0 && <span className={`font-black ${active ? '' : 'text-slate-600'}`}>({cnt})</span>}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {tvError && (
            <div className="px-6 py-4 flex items-start gap-3">
              <I.Warning className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
              <div>
                <p className="text-[10px] font-black text-amber-400 uppercase">Aguardando dados do Railway</p>
                <p className="text-[9px] text-amber-600 font-bold mt-0.5">{tvError}</p>
              </div>
            </div>
          )}

          {/* Empty */}
          {!loadingTV && termVessels.length === 0 && !tvError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <I.Anchor className="w-12 h-12 text-slate-800"/>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aguardando primeira coleta</p>
              <p className="text-[9px] text-slate-700 font-bold">O bot raspa os terminais a cada 30 min automaticamente.</p>
            </div>
          )}

          {/* Table */}
          {filteredVessels.length > 0 && (
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
              <table className="w-full text-[9px] border-collapse" style={{ minWidth: '900px' }}>
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-slate-800">
                    <th className="sticky left-0 z-30 bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-r border-slate-800/60 w-14">Porto</th>
                    <th className="sticky left-14 z-30 bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-r border-slate-800/60 min-w-[140px]">Navio</th>
                    <th className="sticky left-[182px] z-30 bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap border-r border-slate-800/60 w-24">Status</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Viagem</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Armador</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Berço</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Prev. Atrac.</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Atracação</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Prev. Saída</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Saída</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-center font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Dead-Line</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-center font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Gate</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 w-8"/>
                  </tr>
                </thead>
                <tbody>
                  {filteredVessels.map((v, idx) => {
                    const st  = mapSituacao(v.situacao);
                    const sc  = STATUS_CFG[st];
                    const isM = ships.some(s => s.name.toUpperCase() === v.navio.toUpperCase());
                    // Best gate value: gateDry → gateReefer → deadline as fallback reference
                    const gateVal = v.gateDry || v.gateReefer;
                    const dlExpired = isExpiredStr(v.deadLineStr);
                    return (
                      <tr key={idx} className={`border-b border-slate-800/40 transition-colors group ${sc.rowBg || ''} hover:brightness-125`}>
                        <td className={`sticky left-0 z-10 px-3 py-2 border-r border-slate-800/40 ${sc.rowBg || 'bg-[#0f172a]'}`}>
                          <TermBadge terminal={v.terminal}/>
                        </td>
                        <td className={`sticky left-14 z-10 px-3 py-2 border-r border-slate-800/40 ${sc.rowBg || 'bg-[#0f172a]'}`}>
                          <span className={`font-black uppercase whitespace-nowrap text-[9px] ${sc.text}`}>{v.navio}</span>
                          {v.rap && <div className="text-[7px] text-slate-600 font-bold">RAP {v.rap}</div>}
                        </td>
                        <td className={`sticky left-[182px] z-10 px-3 py-2 border-r border-slate-800/40 ${sc.rowBg || 'bg-[#0f172a]'}`}>
                          <SBadge status={st} size="xs"/>
                        </td>
                        <td className="px-3 py-2 text-slate-400 font-bold whitespace-nowrap">{v.viagem || '—'}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{v.armador || v.agencia || '—'}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{v.berco || '—'}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtCell(v.dtPrevAtrac || v.previsao) || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`font-black ${v.dtAtracacao ? sc.text : 'text-slate-700'}`}>
                            {fmtCell(v.dtAtracacao) || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtCell(v.dtPrevSaida) || '—'}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{fmtCell(v.dtSaida) || '—'}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {v.deadLineStr
                            ? <span className={`font-black ${dlExpired ? 'text-red-400' : 'text-orange-400'}`}>{fmtCell(v.deadLineStr)}</span>
                            : <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {gateVal
                            ? <span className={`font-black ${isExpiredStr(gateVal) ? 'text-red-400' : 'text-green-400'}`}>{fmtCell(gateVal)}</span>
                            : <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {isM
                            ? <I.Pin className="w-3 h-3 text-blue-500" title="Monitorado"/>
                            : <button onClick={() => pinFromTerminal(v)} title="Adicionar ao monitoramento"
                                className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <I.Pin className="w-3 h-3 text-slate-600 hover:text-blue-400 transition-colors"/>
                              </button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {termVessels.length > 0 && (
            <div className="px-5 py-2 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
              <span className="text-[7px] text-slate-700 font-bold uppercase">
                {filteredVessels.length} de {termVessels.length} navios
              </span>
              <div className="flex items-center gap-3">
                {([['ATRACADO','amber'],['AG. ATRACAÇÃO','yellow'],['GATE ABERTO','green'],['GATE FECHADO','red']] as [string,string][]).map(([lbl,c]) => (
                  <span key={lbl} className={`flex items-center gap-1 text-[7px] text-${c}-700 font-bold`}>
                    <span className={`w-2 h-2 rounded-sm bg-${c}-950/60 border border-${c}-700/40`}/>{STATUS_CFG[lbl as ShipStatus]?.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: MONITORAMENTO
      ══════════════════════════════════════════════════════════════ */}
      {viewTab === 'monitoramento' && (
        <div className="space-y-5">

          {/* ── A: Navios identificados em viagens ativas ── */}
          <div className="rounded-2xl bg-[#0f172a] border border-slate-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <I.Search className="w-4 h-4 text-slate-500"/>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Navios Identificados em Viagens Ativas
                </span>
                {vesselMatches.length > 0 && (
                  <span className="text-[8px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {vesselMatches.length} navios · {vesselMatches.reduce((a,m) => a+m.matchedTrips.length,0)} viagens
                  </span>
                )}
              </div>
              {vesselMatches.some(m => m.pendingCount > 0) && (
                <span className="flex items-center gap-1.5 text-[8px] font-black text-red-400">
                  <I.Warning className="w-3.5 h-3.5"/>
                  {vesselMatches.reduce((a,m)=>a+m.pendingCount,0)} agendamentos pendentes
                </span>
              )}
            </div>

            {vesselMatches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <I.Search className="w-10 h-10 text-slate-800"/>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Nenhuma viagem ativa com navio nos terminais
                </p>
                <p className="text-[9px] text-slate-700 font-bold max-w-xs">
                  Quando houver viagens com nomes de navios que constam nos terminais, elas aparecerão aqui.
                </p>
              </div>
            )}

            {vesselMatches.length > 0 && (
              <div className="divide-y divide-slate-800/60">
                {vesselMatches.map((match, idx) => {
                  const st  = mapSituacao(match.vessel.situacao);
                  const sc  = STATUS_CFG[st];
                  const acc = TERM_ACCENT[match.vessel.terminal] ?? TERM_ACCENT['BTP'];
                  const dl  = match.vessel.deadLineStr;
                  const dlExp = isExpiredStr(dl);
                  return (
                    <div key={idx} className="p-4 space-y-3">
                      {/* Vessel info row */}
                      <div className={`flex items-start gap-3 p-3 rounded-xl border ${sc.border} ${sc.bg}`}>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TermBadgeLarge terminal={match.vessel.terminal}/>
                            <span className={`text-[11px] font-black uppercase ${sc.text}`}>{match.vessel.navio}</span>
                            {match.vessel.viagem && <span className="text-[8px] text-slate-500 font-bold">{match.vessel.viagem}</span>}
                            <SBadge status={st} size="xs"/>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            {(match.vessel.dtPrevAtrac || match.vessel.previsao) && (
                              <span className="text-[8px] text-slate-400">
                                <span className="text-slate-600 font-bold">Prev. Atrac. </span>
                                {fmtCell(match.vessel.dtPrevAtrac || match.vessel.previsao)}
                              </span>
                            )}
                            {match.vessel.dtAtracacao && (
                              <span className={`text-[8px] font-black ${sc.text}`}>
                                <span className="text-slate-500 font-bold">Atracou </span>
                                {fmtCell(match.vessel.dtAtracacao)}
                              </span>
                            )}
                            {match.vessel.dtPrevSaida && (
                              <span className="text-[8px] text-slate-400">
                                <span className="text-slate-600 font-bold">Prev. Saída </span>
                                {fmtCell(match.vessel.dtPrevSaida)}
                              </span>
                            )}
                            {dl && (
                              <span className={`text-[8px] font-black ${dlExp ? 'text-red-400' : 'text-orange-400'}`}>
                                ⏰ Dead-Line {fmtCell(dl)}{dlExp ? ' (VENCIDO)' : ''}
                              </span>
                            )}
                            {(match.vessel.gateDry || match.vessel.gateReefer) && (
                              <span className="text-[8px] font-black text-green-400">
                                🔓 Gate {fmtCell(match.vessel.gateDry || match.vessel.gateReefer)}
                              </span>
                            )}
                            {match.vessel.berco && (
                              <span className="text-[8px] text-slate-500">Berço {match.vessel.berco}</span>
                            )}
                            {(match.vessel.armador || match.vessel.agencia) && (
                              <span className="text-[8px] text-slate-500">{match.vessel.armador || match.vessel.agencia}</span>
                            )}
                          </div>
                        </div>
                        {/* Counts */}
                        <div className="flex gap-2 shrink-0">
                          {match.pendingCount > 0 && (
                            <div className="text-center px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                              <p className="text-[14px] font-black text-red-400">{match.pendingCount}</p>
                              <p className="text-[6px] font-black text-red-500 uppercase">Ag. Pendente</p>
                            </div>
                          )}
                          {match.scheduledCount > 0 && (
                            <div className="text-center px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-[14px] font-black text-green-400">{match.scheduledCount}</p>
                              <p className="text-[6px] font-black text-green-600 uppercase">Agendados</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Trips list */}
                      <div className="space-y-1.5 pl-2">
                        {match.matchedTrips.map((t, ti) => {
                          const isScheduled = t.isScheduled || t.status === 'Agendamento realizado';
                          return (
                            <div key={ti}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${isScheduled ? 'border-green-900/30 bg-green-950/10' : 'border-slate-800 bg-slate-900/40'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isScheduled ? 'bg-green-500' : 'bg-red-500'}`}/>
                              <span className="text-[9px] font-black text-slate-300 uppercase">{t.os}</span>
                              <span className="text-[8px] text-slate-500 truncate">{t.driver?.name}</span>
                              <span className="text-[8px] text-slate-600">{t.status}</span>
                              {t.container && <span className="text-[7px] text-slate-600 font-bold">{t.container}</span>}
                              <div className="ml-auto shrink-0">
                                {isScheduled
                                  ? <span className="flex items-center gap-1 text-[7px] font-black text-green-500">
                                      <I.Check className="w-2.5 h-2.5"/> Agendado
                                    </span>
                                  : <span className="flex items-center gap-1 text-[7px] font-black text-red-400">
                                      <I.Warning className="w-2.5 h-2.5"/> Pendente
                                    </span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── B: Navios não encontrados nos terminais ── */}
          {unmatchedTrips.length > 0 && (
            <div className="rounded-2xl border border-orange-900/30 bg-orange-950/10 overflow-hidden">
              <div className="px-5 py-3 border-b border-orange-900/20 flex items-center gap-2">
                <I.Warning className="w-4 h-4 text-orange-500"/>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                  Navios não encontrados nos terminais ({unmatchedTrips.length})
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {unmatchedTrips.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <I.Ship className="w-3 h-3 text-slate-600 shrink-0"/>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black text-orange-300 uppercase truncate">{t.ship}</p>
                      <p className="text-[7px] text-slate-500">{t.os} · {t.status}</p>
                    </div>
                    <span className="text-[7px] text-slate-600 font-bold shrink-0">{t.destination?.name || t.customer?.name || '?'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── C: Navios Monitorados (Manual) ── */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <button onClick={() => setShowMonit(p => !p)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all">
              <div className="flex items-center gap-2">
                <I.Ship className="w-4 h-4 text-slate-400"/>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Navios Monitorados Manualmente</p>
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
                <div className="border-t border-slate-100 p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {ships.map(ship => {
                    const c = STATUS_CFG[ship.status]; const dlExp = ship.deadLine ? new Date(ship.deadLine) < new Date() : false;
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
              )
            )}
          </div>

          {/* Histórico de status */}
          {allHistory.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <I.History className="w-4 h-4 text-slate-400"/>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Histórico de Status</p>
                </div>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {allHistory.map((h, i) => {
                  const c = STATUS_CFG[h.status as ShipStatus] ?? STATUS_CFG['NOVO'];
                  return (
                    <div key={i} className={`rounded-xl p-3 border ${c.border} ${c.bg} space-y-1`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[8px] font-black text-slate-400">
                          {new Date(h.dateTime).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        </p>
                        <SBadge status={h.status as ShipStatus} size="xs"/>
                      </div>
                      <p className={`text-[9px] font-black uppercase truncate ${c.text}`}>{h.shipName}</p>
                      {h.obs && <p className="text-[8px] text-slate-500 italic">{h.obs}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ MODALS ══ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center"><I.Ship className="w-4 h-4 text-blue-400"/></div>
                <h2 className="text-[11px] font-black text-slate-100 uppercase tracking-widest">{editing.id ? 'Editar Navio' : 'Adicionar ao Monitoramento'}</h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all"><I.Close className="w-4 h-4"/></button>
            </div>
            <div className="px-7 py-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {mErr && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-[10px] font-black text-red-400 uppercase flex gap-2"><I.Warning className="w-3.5 h-3.5 shrink-0"/>{mErr}</div>}
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
                {([['Prev. Atracação','prevAtracacao'],['Abertura de Gate','abertGate'],['Dead-Line','deadLine'],['Status','status'],['Data de Atracação','dataAtracacao'],['Data de Desatracação','dataDesatrac']] as [string, keyof Ship][]).map(([lbl, field]) => (
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
                <textarea value={editing.observacoes??''} onChange={e=>upd('observacoes',e.target.value)} rows={2}
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

      {stModal && stTarget && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-7 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Atualizar Status</p>
                <p className="text-[12px] font-black text-slate-100 uppercase">{stTarget.name}{stTarget.viagem ? ` · ${stTarget.viagem}` : ''}</p>
              </div>
              <button onClick={() => setStModal(false)} className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all"><I.Close className="w-4 h-4"/></button>
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
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observação</label>
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
