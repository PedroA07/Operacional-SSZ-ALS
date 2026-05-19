import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip, Ship, ShipStatus, ShipStatusEntry, TerminalVessel } from '../../../types';
import { db, supabase } from '../../../utils/storage';

interface NaviosTabProps { user: User; trips: Trip[]; }

// ── Terminal accent colors ─────────────────────────────────────────────────────
const TERM_ACCENT: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'BTP':           { bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
  'ECOPORTO':      { bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-500/30',    dot: 'bg-blue-400' },
  'SANTOS BRASIL': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  'EMBRAPORT':     { bg: 'bg-purple-500/10',  text: 'text-purple-300',  border: 'border-purple-500/30',  dot: 'bg-purple-400' },
};
const TERM_LINKS: Record<string, string> = {
  'BTP':           'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
  'ECOPORTO':      'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
  'SANTOS BRASIL': 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao',
  'EMBRAPORT':     'https://www.embraport.com.br',
};

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ShipStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  'NOVO':              { label: 'Novo',           bg: 'bg-slate-500/20',  text: 'text-slate-300',  border: 'border-slate-500/30',  dot: 'bg-slate-400' },
  'NÃO ENCONTRADO':   { label: 'Não Encontrado', bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  'SEM PREVISÃO':     { label: 'Sem Previsão',   bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  'AG. ATRACAÇÃO':    { label: 'Ag. Atracação',  bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  'ATRACADO':         { label: 'Atracado',        bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/30',   dot: 'bg-blue-400' },
  'GATE ABERTO':      { label: 'Gate Aberto',     bg: 'bg-green-500/20',  text: 'text-green-300',  border: 'border-green-500/30',  dot: 'bg-green-400' },
  'GATE FECHADO':     { label: 'Gate Fechado',    bg: 'bg-red-500/20',    text: 'text-red-300',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  'GATE ENCERRADO':   { label: 'Gate Encerrado',  bg: 'bg-pink-500/20',   text: 'text-pink-300',   border: 'border-pink-500/30',   dot: 'bg-pink-400' },
  'DESATRACADO':      { label: 'Desatracado',     bg: 'bg-cyan-500/20',   text: 'text-cyan-300',   border: 'border-cyan-500/30',   dot: 'bg-cyan-400' },
  'FINALIZADO':       { label: 'Finalizado',      bg: 'bg-slate-600/20',  text: 'text-slate-400',  border: 'border-slate-600/30',  dot: 'bg-slate-500' },
  'EM TRÂNSITO':      { label: 'Em Trânsito',     bg: 'bg-blue-400/20',   text: 'text-blue-300',   border: 'border-blue-400/30',   dot: 'bg-blue-400' },
  'FUNDEADO':         { label: 'Fundeado',        bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  'AGUARDANDO JANELA':{ label: 'Ag. Janela',      bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  'SAÍDO':            { label: 'Saído',           bg: 'bg-slate-500/20',  text: 'text-slate-400',  border: 'border-slate-500/30',  dot: 'bg-slate-500' },
};
const PANEL_STATUSES: ShipStatus[] = ['NOVO','NÃO ENCONTRADO','SEM PREVISÃO','GATE FECHADO','GATE ABERTO','GATE ENCERRADO','AG. ATRACAÇÃO','ATRACADO','DESATRACADO'];
const ALL_STATUSES: ShipStatus[] = Object.keys(STATUS_CFG) as ShipStatus[];
const TERMINALS_MANUAL = ['BTP','ECOPORTO','SANTOS BRASIL','EMBRAPORT','OUTRO'];

// ── Situação → ShipStatus ─────────────────────────────────────────────────────
function mapSituacao(s: string): ShipStatus {
  const n = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('em operac') || n.includes('operando') || n.includes('atracad')) return 'ATRACADO';
  if (n.includes('gate abert') || n.includes('gate open'))                        return 'GATE ABERTO';
  if (n.includes('gate fech') || n.includes('gate closed'))                       return 'GATE FECHADO';
  if (n.includes('gate encerr') || n.includes('encerr'))                          return 'GATE ENCERRADO';
  if (n.includes('desatrac') || n.includes('saiu') || n.includes('saido'))        return 'DESATRACADO';
  if (n.includes('previsto') || n.includes('aguard') || n.includes('ag.atrac') || n.includes('ag. atrac')) return 'AG. ATRACAÇÃO';
  return 'SEM PREVISÃO';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
function isExpired(iso?: string | null) {
  return !!iso && new Date(iso) < new Date();
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
};

function SBadge({ status, size='sm' }: { status: ShipStatus; size?: 'xs'|'sm' }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG['NOVO'];
  return (
    <span className={`inline-flex items-center gap-1 font-black uppercase rounded-full border ${c.bg} ${c.text} ${c.border} ${size==='xs' ? 'text-[7px] px-1.5 py-0.5' : 'text-[8px] px-2 py-0.5'}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}/>{c.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const NaviosTab: React.FC<NaviosTabProps> = ({ user }) => {
  const [ships, setShips]           = useState<Ship[]>([]);
  const [loadingShips, setLS]       = useState(true);
  const [termVessels, setTV]        = useState<TerminalVessel[]>([]);
  const [tvFetchedAt, setTVAt]      = useState<string|null>(null);
  const [loadingTV, setLTV]         = useState(true);
  const [tvError, setTVError]       = useState<string|null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date|null>(null);

  // modal states
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Partial<Ship>>(emptyShip());
  const [saving, setSaving]         = useState(false);
  const [mErr, setMErr]             = useState<string|null>(null);

  const [stModal, setStModal]       = useState(false);
  const [stTarget, setStTarget]     = useState<Ship|null>(null);
  const [newSt, setNewSt]           = useState<ShipStatus>('NOVO');
  const [stObs, setStObs]           = useState('');

  const [showMonit, setShowMonit]   = useState(true);
  const [showHist, setShowHist]     = useState(true);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadShips = useCallback(async () => {
    setLS(true);
    try { setShips(await db.getShips()); } catch(e){console.error(e);} finally { setLS(false); }
  }, []);

  const loadTV = useCallback(async () => {
    if (!supabase) return;
    setLTV(true); setTVError(null);
    try {
      const { data, error } = await supabase.from('terminal_vessels').select('*').order('fetched_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      setTV(rows.map(r => ({ navio: r.navio, situacao: r.situacao, previsao: r.previsao, berco: r.berco, armador: r.armador, viagem: r.viagem, terminal: r.terminal })));
      setTVAt(rows[0]?.fetched_at ?? null);
      setLastRefresh(new Date());
    } catch(e:any) {
      setTVError(e?.message ?? 'Erro ao carregar dados dos terminais');
    } finally { setLTV(false); }
  }, []);

  useEffect(() => { loadShips(); loadTV(); }, []); // eslint-disable-line

  // ── Derived ────────────────────────────────────────────────────────────────
  // Group terminal vessels by terminal
  const byTerminal = useMemo(() => {
    const m: Record<string, TerminalVessel[]> = {};
    for (const v of termVessels) {
      if (!m[v.terminal]) m[v.terminal] = [];
      m[v.terminal].push(v);
    }
    return m;
  }, [termVessels]);

  // Status counts: terminal vessels + manual ships
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

  const allHistory = useMemo(() => {
    const e: Array<ShipStatusEntry & { shipName: string; viagem?: string; terminal?: string }> = [];
    for (const s of ships) for (const h of (s.statusHistory ?? [])) e.push({ ...h, shipName: s.name, viagem: s.viagem, terminal: s.terminal });
    return e.sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).slice(0,20);
  }, [ships]);

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
    if (newSt === 'ATRACADO' && !stTarget.dataAtracacao) extra.dataAtracacao = new Date().toISOString();
    if (newSt === 'DESATRACADO' && !stTarget.dataDesatrac) extra.dataDesatrac = new Date().toISOString();
    try { await db.saveShip({ ...stTarget, status: newSt, statusHistory: hist, ...extra }); setStModal(false); await loadShips(); }
    catch(e:any) { alert('Erro: ' + e?.message); }
  };

  const handlePinFromTerminal = (v: TerminalVessel) => {
    openNew({ name: v.navio.toUpperCase(), terminal: v.terminal, viagem: v.viagem, armador: v.armador, berco: v.berco, prevAtracacao: v.previsao ? '' : '', status: mapSituacao(v.situacao) });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitoramento de Navios</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acompanhe gates, atracações e situação nos terminais de Santos</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { loadTV(); loadShips(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 text-[9px] font-black uppercase tracking-widest transition-all">
            <I.Refresh className="w-3.5 h-3.5"/> Atualizar
          </button>
          <button onClick={() => openNew()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95">
            <I.Plus className="w-3.5 h-3.5"/> Novo Navio
          </button>
        </div>
      </div>

      {/* Status summary bar */}
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

      {/* ── TERMINAL VESSELS — primary content ── */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <I.Anchor className="w-4 h-4 text-slate-400"/>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Lista de Atracação dos Terminais</p>
            {tvFetchedAt && (
              <span className="text-[8px] text-slate-400 font-bold">
                — atualizado às {new Date(tvFetchedAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
              </span>
            )}
          </div>
          {loadingTV && <span className="text-[8px] text-blue-400 font-bold animate-pulse">Carregando...</span>}
        </div>

        {tvError && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-start gap-3">
            <I.Warning className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
            <div>
              <p className="text-[10px] font-black text-amber-700 uppercase">Aguardando dados do Railway</p>
              <p className="text-[9px] text-amber-600 font-bold mt-0.5">{tvError}</p>
            </div>
          </div>
        )}

        {!loadingTV && termVessels.length === 0 && !tvError && (
          <div className="rounded-2xl bg-[#0f172a] border border-slate-800 px-6 py-10 flex flex-col items-center gap-3 text-center">
            <I.Anchor className="w-10 h-10 text-slate-700"/>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aguardando primeira coleta do Railway</p>
            <p className="text-[9px] text-slate-600 font-bold">O bot raspa os terminais a cada 30 minutos e salva aqui automaticamente.</p>
          </div>
        )}

        {/* Terminal grids */}
        {(['BTP','ECOPORTO','SANTOS BRASIL'] as const).map(term => {
          const vessels = byTerminal[term];
          if (!vessels || vessels.length === 0) return null;
          const acc = TERM_ACCENT[term];
          return (
            <div key={term} className="rounded-2xl bg-[#0f172a] border border-slate-800 overflow-hidden">
              {/* Terminal header */}
              <div className={`px-5 py-3 flex items-center justify-between border-b ${acc.border} ${acc.bg}`}>
                <div className="flex items-center gap-3">
                  <I.Anchor className={`w-4 h-4 ${acc.text}`}/>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${acc.text}`}>{term}</span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${acc.bg} ${acc.text} border ${acc.border}`}>
                    {vessels.length} navios
                  </span>
                </div>
                <a href={TERM_LINKS[term]} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 text-[8px] font-black uppercase ${acc.text} hover:opacity-70 transition-all`}>
                  <I.Link className="w-3 h-3"/> Portal
                </a>
              </div>

              {/* Vessel cards grid */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {vessels.map((v, idx) => {
                  const mappedStatus = mapSituacao(v.situacao);
                  const sc = STATUS_CFG[mappedStatus];
                  const isMonitored = ships.some(s => s.name.toUpperCase() === v.navio.toUpperCase());
                  return (
                    <div key={idx} className={`rounded-xl border ${sc.border} bg-slate-900/60 flex flex-col overflow-hidden hover:shadow-lg hover:shadow-black/20 transition-all`}>
                      {/* Vessel header */}
                      <div className={`px-3 py-2.5 flex items-start justify-between gap-2 ${sc.bg}`}>
                        <div className="min-w-0">
                          <p className={`text-[9px] font-black uppercase truncate ${sc.text}`}>{v.navio}</p>
                          {v.viagem && <p className="text-[7px] text-slate-500 font-bold">{v.viagem}</p>}
                        </div>
                        <SBadge status={mappedStatus} size="xs"/>
                      </div>
                      {/* Vessel details */}
                      <div className="px-3 py-2 space-y-1 flex-1">
                        <p className="text-[8px] text-slate-400 font-bold">{v.situacao}</p>
                        {v.previsao && (
                          <div className="flex items-center gap-1.5">
                            <I.History className="w-2.5 h-2.5 text-slate-600"/>
                            <p className="text-[8px] text-slate-500 font-bold">{v.previsao}</p>
                          </div>
                        )}
                        {v.berco && <p className="text-[7px] text-slate-600 font-bold">Berço {v.berco}</p>}
                        {v.armador && <p className="text-[7px] text-slate-600 font-bold">{v.armador}</p>}
                      </div>
                      {/* Pin to monitoring */}
                      <div className="px-3 py-2 border-t border-slate-800/50">
                        {isMonitored ? (
                          <span className="text-[7px] font-black text-blue-400 flex items-center gap-1">
                            <I.Pin className="w-2.5 h-2.5"/> Monitorado
                          </span>
                        ) : (
                          <button onClick={() => handlePinFromTerminal(v)}
                            className="text-[7px] font-black text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors">
                            <I.Pin className="w-2.5 h-2.5"/> Adicionar ao monitoramento
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MONITORAMENTO MANUAL ── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button onClick={() => setShowMonit(p => !p)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all">
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
              {/* Active */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {ships.filter(s => s.status !== 'FINALIZADO' && s.status !== 'SAÍDO' && s.status !== 'DESATRACADO').map(ship => {
                  const c = STATUS_CFG[ship.status]; const dlExp = isExpired(ship.deadLine);
                  return (
                    <div key={ship.id} className={`bg-[#0f172a] rounded-2xl border ${c.border} flex flex-col overflow-hidden`}>
                      <div className={`px-4 py-3 ${c.bg} border-b ${c.border} flex items-start justify-between gap-2`}>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase truncate ${c.text}`}>
                            {ship.name}{ship.viagem && <span className="ml-1.5 opacity-70 font-bold">· {ship.viagem}</span>}
                          </p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{ship.terminal ?? '—'}{ship.berco ? ` · Berço ${ship.berco}` : ''}</p>
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

              {/* Finished */}
              {ships.filter(s => ['FINALIZADO','SAÍDO','DESATRACADO'].includes(s.status)).length > 0 && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-[9px]">
                    <thead><tr className="border-b border-slate-100">
                      {['Navio','Viagem','Terminal','Status','Atualizado',''].map(h=><th key={h} className="px-4 py-2.5 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {ships.filter(s => ['FINALIZADO','SAÍDO','DESATRACADO'].includes(s.status)).map(s=>(
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-black text-slate-600 uppercase">{s.name}</td>
                          <td className="px-3 py-2.5 text-slate-400">{s.viagem??'—'}</td>
                          <td className="px-3 py-2.5 text-slate-400">{s.terminal??'—'}</td>
                          <td className="px-3 py-2.5"><SBadge status={s.status} size="xs"/></td>
                          <td className="px-3 py-2.5 text-slate-400">{fmtDate(s.updatedAt)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1">
                              <Btn onClick={()=>openStModal(s)} title="Status"><I.History className="w-3 h-3"/></Btn>
                              <Btn onClick={()=>openEdit(s)} title="Editar"><I.Edit className="w-3 h-3"/></Btn>
                              <Btn onClick={()=>handleDelete(s.id)} title="Remover" danger><I.Trash className="w-3 h-3"/></Btn>
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
          <button onClick={() => setShowHist(p => !p)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all">
            <div className="flex items-center gap-2">
              <I.History className="w-4 h-4 text-slate-400"/>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Últimas Atualizações</p>
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

      {/* ── SHIP MODAL ── */}
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

      {/* ── STATUS MODAL ── */}
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
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observação (opcional)</label>
                <input value={stObs} onChange={e=>setStObs(e.target.value)} placeholder="Ex: Gate aberto pelo terminal BTP"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"/>
              </div>
              {(stTarget.statusHistory ?? []).length > 0 && (
                <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
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
