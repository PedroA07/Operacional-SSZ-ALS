import React, { useState, useEffect, useCallback } from 'react';
import { User, Trip, Ship, ShipStatus, TerminalVessel } from '../../../types';
import { db, supabase } from '../../../utils/storage';

interface NaviosTabProps {
  user: User;
  trips: Trip[];
}

const SHIP_STATUSES: ShipStatus[] = ['EM TRÂNSITO', 'ATRACADO', 'FUNDEADO', 'AGUARDANDO JANELA', 'SAÍDO', 'GATE ABERTO', 'GATE FECHADO', 'AG. ATRACAÇÃO', 'FINALIZADO'];
const TERMINALS = ['ECOPORTO', 'SANTOS BRASIL', 'EMBRAPORT', 'BTP', 'OUTRO'];

const TERMINAL_KEYS: Record<string, string> = {
  ECOPORTO: 'ecoporto',
  'SANTOS BRASIL': 'santosbrasil',
  BTP: 'btp',
};

const TERMINAL_LINKS: Record<string, string> = {
  ECOPORTO: 'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
  'SANTOS BRASIL': 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao',
  BTP: 'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
  EMBRAPORT: 'https://www.embraport.com.br',
};

const TERMINAL_ACCENT: Record<string, { ring: string; iconBg: string; iconText: string; badge: string; dot: string }> = {
  'ECOPORTO':       { ring: 'border-blue-500/30',    iconBg: 'bg-blue-500/20',    iconText: 'text-blue-400',    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',    dot: 'bg-blue-400' },
  'SANTOS BRASIL':  { ring: 'border-emerald-500/30', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', dot: 'bg-emerald-400' },
  'BTP':            { ring: 'border-amber-500/30',   iconBg: 'bg-amber-500/20',   iconText: 'text-amber-400',   badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',   dot: 'bg-amber-400' },
  'EMBRAPORT':      { ring: 'border-purple-500/30',  iconBg: 'bg-purple-500/20',  iconText: 'text-purple-400',  badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',  dot: 'bg-purple-400' },
};

interface TerminalState {
  vessels: TerminalVessel[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const IconShip = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M3 13l1.5 5.5A1 1 0 005.46 20h13.08a1 1 0 00.96-.5L21 13M3 13h18M3 13l2-8h14l2 8M12 3v10"/>
  </svg>
);

const IconRefresh = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
  </svg>
);

const IconExternalLink = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
  </svg>
);

const IconSpinner = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg>
);

const IconClock = ({ className = 'w-3 h-3' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const IconWarning = ({ className = 'w-3 h-3' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
  </svg>
);

const IconAnchor = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M12 3a3 3 0 100 6 3 3 0 000-6zm0 6v12M5 12h14M5 19.5c0-2.5 2-4.5 7-4.5s7 2 7 4.5"/>
  </svg>
);

const IconVessel = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M3 13l1.5 5.5A1 1 0 005.46 20h13.08a1 1 0 00.96-.5L21 13M3 13h18M3 13l2-8h14l2 8"/>
  </svg>
);

const IconEdit = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
  </svg>
);

const IconTrash = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
  </svg>
);

const IconSearch = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"/>
  </svg>
);

const IconPlus = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
  </svg>
);

const IconClose = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeClass(status: ShipStatus): string {
  switch (status) {
    case 'ATRACADO': return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'EM TRÂNSITO': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'FUNDEADO': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'AGUARDANDO JANELA': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'SAÍDO': return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  }
}

function situacaoBadgeClass(situacao: string): string {
  const s = situacao.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s.includes('em operac') || s.includes('operando')) return 'bg-green-500/20 text-green-400';
  if (s.includes('previsto') || s.includes('prev')) return 'bg-blue-500/20 text-blue-400';
  if (s.includes('desatrac') || s.includes('encerr') || s.includes('saido') || s.includes('saiu')) return 'bg-slate-500/20 text-slate-400';
  return 'bg-amber-500/20 text-amber-400';
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
  } catch { return iso; }
}

const emptyShip = (): Partial<Ship> => ({
  name: '', imo: '', armador: '', viagem: '', terminal: '',
  berco: '', eta: '', etd: '', status: 'EM TRÂNSITO', observacoes: '', tripIds: [],
});

// ── Component ─────────────────────────────────────────────────────────────────

const NaviosTab: React.FC<NaviosTabProps> = ({ user, trips }) => {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loadingShips, setLoadingShips] = useState(true);

  const [terminalData, setTerminalData] = useState<Record<string, TerminalState>>({
    ECOPORTO:       { vessels: [], loading: false, error: null, fetchedAt: null },
    'SANTOS BRASIL':{ vessels: [], loading: false, error: null, fetchedAt: null },
    BTP:            { vessels: [], loading: false, error: null, fetchedAt: null },
    EMBRAPORT:      { vessels: [], loading: false, error: null, fetchedAt: null },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<Partial<Ship>>(emptyShip());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadShips = useCallback(async () => {
    setLoadingShips(true);
    try { setShips(await db.getShips()); }
    catch (e) { console.error('[NaviosTab] loadShips:', e); }
    finally { setLoadingShips(false); }
  }, []);

  // Lê todos os terminais do Supabase (populados pelo Railway a cada 30 min)
  const loadAllTerminals = useCallback(async () => {
    if (!supabase) return;
    const labels = ['ECOPORTO', 'SANTOS BRASIL', 'BTP'] as const;
    setTerminalData(prev => {
      const next = { ...prev };
      labels.forEach(l => { next[l] = { ...next[l], loading: true, error: null }; });
      return next;
    });
    try {
      const { data, error } = await supabase
        .from('terminal_vessels')
        .select('*')
        .order('fetched_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Array<{ terminal: string; navio: string; situacao: string; previsao?: string; berco?: string; armador?: string; viagem?: string; fetched_at: string }>;
      const byTerminal: Record<string, typeof rows> = {};
      for (const r of rows) {
        if (!byTerminal[r.terminal]) byTerminal[r.terminal] = [];
        byTerminal[r.terminal].push(r);
      }
      setTerminalData(prev => {
        const next = { ...prev };
        for (const [name, termRows] of Object.entries(byTerminal)) {
          next[name] = {
            vessels: termRows.map(r => ({ navio: r.navio, situacao: r.situacao, previsao: r.previsao, berco: r.berco, armador: r.armador, viagem: r.viagem, terminal: r.terminal } as TerminalVessel)),
            loading: false,
            error: null,
            fetchedAt: termRows[0]?.fetched_at ?? null,
          };
        }
        labels.forEach(l => {
          if (!next[l].fetchedAt || next[l].loading) {
            next[l] = { vessels: [], loading: false, error: 'Aguardando primeira coleta (até 30 min)', fetchedAt: null };
          }
        });
        return next;
      });
    } catch (e: any) {
      setTerminalData(prev => {
        const next = { ...prev };
        ['ECOPORTO', 'SANTOS BRASIL', 'BTP'].forEach(l => {
          next[l] = { ...next[l], loading: false, error: e?.message ?? 'Erro ao ler dados' };
        });
        return next;
      });
    }
  }, []);

  const fetchTerminal = useCallback(async (terminalLabel: string) => {
    if (!TERMINAL_KEYS[terminalLabel]) return;
    setTerminalData(prev => ({ ...prev, [terminalLabel]: { ...prev[terminalLabel], loading: true } }));
    try {
      if (!supabase) throw new Error('Supabase não configurado');
      const { data, error } = await supabase
        .from('terminal_vessels')
        .select('*')
        .eq('terminal', terminalLabel)
        .order('fetched_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Array<{ terminal: string; navio: string; situacao: string; previsao?: string; berco?: string; armador?: string; viagem?: string; fetched_at: string }>;
      setTerminalData(prev => ({
        ...prev,
        [terminalLabel]: {
          vessels: rows.map(r => ({ navio: r.navio, situacao: r.situacao, previsao: r.previsao, berco: r.berco, armador: r.armador, viagem: r.viagem, terminal: r.terminal } as TerminalVessel)),
          loading: false,
          error: rows.length === 0 ? 'Sem dados — aguardando coleta do Railway' : null,
          fetchedAt: rows[0]?.fetched_at ?? null,
        },
      }));
    } catch (e: any) {
      setTerminalData(prev => ({
        ...prev,
        [terminalLabel]: { ...prev[terminalLabel], loading: false, error: e?.message || 'Erro ao buscar dados', fetchedAt: new Date().toISOString() },
      }));
    }
  }, []);

  useEffect(() => {
    loadShips();
    loadAllTerminals();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openNewModal = () => { setEditingShip(emptyShip()); setModalError(null); setModalOpen(true); };
  const openEditModal = (ship: Ship) => { setEditingShip({ ...ship }); setModalError(null); setModalOpen(true); };
  const updateField = (field: keyof Ship, value: any) => setEditingShip(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!editingShip.name?.trim()) { setModalError('O nome do navio é obrigatório.'); return; }
    if (!editingShip.status) { setModalError('O status é obrigatório.'); return; }
    setSaving(true); setModalError(null);
    try { await db.saveShip(editingShip); setModalOpen(false); await loadShips(); }
    catch (e: any) { setModalError(e?.message || 'Erro ao salvar navio.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este navio do registro?')) return;
    try { await db.deleteShip(id); setShips(prev => prev.filter(s => s.id !== id)); }
    catch (e: any) { alert('Erro ao excluir: ' + (e?.message || e)); }
  };

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitoramento de Navios</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acompanhe a situação dos navios nos terminais de Santos</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95"
        >
          <IconPlus />
          Novo Navio
        </button>
      </div>

      {/* ── Terminal Cards ── */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Status dos Terminais</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(['ECOPORTO', 'SANTOS BRASIL', 'BTP', 'EMBRAPORT'] as const).map(term => {
            const state = terminalData[term];
            const hasKey = !!TERMINAL_KEYS[term];
            const accent = TERMINAL_ACCENT[term];
            const hasData = state.vessels.length > 0;
            const isOnline = hasData && !state.error;

            return (
              <div key={term} className={`bg-[#0f172a] rounded-2xl p-5 flex flex-col gap-4 border ${hasData ? accent.ring : 'border-slate-800'} transition-all`}>

                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Terminal Icon */}
                    <div className={`w-9 h-9 rounded-xl ${accent.iconBg} flex items-center justify-center shrink-0`}>
                      <IconAnchor className={`w-4 h-4 ${accent.iconText}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-100 uppercase tracking-widest leading-tight">{term}</p>
                      {/* Status dot */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? accent.dot : state.loading ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                        <span className="text-[8px] font-bold text-slate-500 uppercase">
                          {state.loading ? 'Buscando...' : isOnline ? `${state.vessels.length} navios` : 'Sem dados'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasKey && (
                      <button
                        onClick={() => fetchTerminal(term)}
                        disabled={state.loading}
                        title="Atualizar dados"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all disabled:opacity-40"
                      >
                        {state.loading ? <IconSpinner className="w-3.5 h-3.5" /> : <IconRefresh className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {TERMINAL_LINKS[term] && (
                      <a
                        href={TERMINAL_LINKS[term]}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir portal do terminal"
                        className={`w-7 h-7 flex items-center justify-center rounded-lg ${accent.iconBg} ${accent.iconText} hover:opacity-80 transition-all`}
                      >
                        <IconExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                {state.fetchedAt && (
                  <div className="flex items-center gap-1.5 -mt-1">
                    <IconClock className={`w-2.5 h-2.5 ${accent.iconText} opacity-60`} />
                    <p className="text-[8px] text-slate-600 font-bold">
                      Atualizado às {new Date(state.fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}

                {/* Error State */}
                {!state.loading && state.error && state.vessels.length === 0 && (
                  <div className="rounded-xl bg-slate-800/60 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <IconWarning className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[8px] text-amber-400/80 font-bold leading-relaxed">{state.error}</p>
                    </div>
                    {TERMINAL_LINKS[term] && (
                      <a
                        href={TERMINAL_LINKS[term]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase ${accent.iconText} hover:opacity-80 transition-colors`}
                      >
                        <IconExternalLink className="w-2.5 h-2.5" />
                        Ver no portal do terminal
                      </a>
                    )}
                  </div>
                )}

                {/* No key (EMBRAPORT) */}
                {!hasKey && !state.loading && (
                  <div className="rounded-xl bg-slate-800/40 p-3 space-y-2">
                    <p className="text-[9px] text-slate-600 font-bold italic">Sem dados públicos disponíveis</p>
                    {TERMINAL_LINKS[term] && (
                      <a
                        href={TERMINAL_LINKS[term]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase ${accent.iconText} hover:opacity-80 transition-colors`}
                      >
                        <IconExternalLink className="w-2.5 h-2.5" />
                        Acessar portal
                      </a>
                    )}
                  </div>
                )}

                {/* Vessel List */}
                {state.vessels.length > 0 && (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
                    {state.vessels.slice(0, 8).map((v, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-800/50 last:border-0">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <IconVessel className={`w-3 h-3 ${accent.iconText} mt-0.5 shrink-0`} />
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-200 truncate uppercase">{v.navio}</p>
                            {v.previsao && <p className="text-[8px] text-slate-500 font-bold">{v.previsao}</p>}
                            {v.berco && <p className="text-[8px] text-slate-600 font-bold">Berço {v.berco}</p>}
                          </div>
                        </div>
                        <span className={`shrink-0 text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap ${situacaoBadgeClass(v.situacao)}`}>
                          {v.situacao.length > 13 ? v.situacao.slice(0, 13) + '…' : v.situacao}
                        </span>
                      </div>
                    ))}
                    {state.vessels.length > 8 && (
                      <p className="text-[8px] text-slate-600 font-bold pt-1 text-center">
                        +{state.vessels.length - 8} navios ·{' '}
                        <a href={TERMINAL_LINKS[term]} target="_blank" rel="noopener noreferrer" className={`${accent.iconText} hover:underline`}>
                          ver todos
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Ships Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconShip className="w-4 h-4 text-slate-400" />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Navios Cadastrados</p>
          </div>
          <span className="text-[9px] font-black text-slate-400">{ships.length} navio(s)</span>
        </div>

        {loadingShips ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ships.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-300">
            <IconShip className="w-10 h-10 opacity-30" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhum navio cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Navio', 'IMO', 'Armador', 'Terminal', 'Status', 'ETA', 'ETD', 'Viagem', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ships.map(ship => (
                  <tr key={ship.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-black text-slate-800 uppercase whitespace-nowrap">{ship.name}</td>
                    <td className="px-4 py-3 text-slate-500 font-bold">{ship.imo || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-bold">{ship.armador || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-bold">{ship.terminal || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full font-black uppercase text-[8px] ${statusBadgeClass(ship.status)}`}>
                        {ship.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-bold whitespace-nowrap">{formatDate(ship.eta)}</td>
                    <td className="px-4 py-3 text-slate-600 font-bold whitespace-nowrap">{formatDate(ship.etd)}</td>
                    <td className="px-4 py-3 text-slate-500 font-bold">{ship.viagem || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://www.vesselfinder.com/?name=${encodeURIComponent(ship.name)}`}
                          target="_blank" rel="noopener noreferrer"
                          title="Buscar no VesselFinder"
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <IconSearch />
                        </a>
                        <button
                          onClick={() => openEditModal(ship)}
                          title="Editar"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <IconEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(ship.id)}
                          title="Excluir"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <IconShip className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-[11px] font-black text-slate-100 uppercase tracking-widest">
                  {editingShip.id ? 'Editar Navio' : 'Novo Navio'}
                </h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all">
                <IconClose />
              </button>
            </div>

            <div className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-[10px] font-black text-red-400 uppercase flex items-center gap-2">
                  <IconWarning className="w-3.5 h-3.5 shrink-0" />
                  {modalError}
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome do Navio *</label>
                  <a
                    href={`https://www.vesselfinder.com/?name=${encodeURIComponent(editingShip.name || '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[8px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
                  >
                    <IconSearch className="w-2.5 h-2.5" />
                    VesselFinder
                  </a>
                </div>
                <input
                  value={editingShip.name || ''}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Ex: MSC ANNA"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">IMO</label>
                  <input value={editingShip.imo || ''} onChange={e => updateField('imo', e.target.value)} placeholder="Ex: 9876543"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Armador</label>
                  <input value={editingShip.armador || ''} onChange={e => updateField('armador', e.target.value)} placeholder="Ex: MSC, Maersk..."
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nº Viagem</label>
                  <input value={editingShip.viagem || ''} onChange={e => updateField('viagem', e.target.value)} placeholder="Ex: 001N"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Berço</label>
                  <input value={editingShip.berco || ''} onChange={e => updateField('berco', e.target.value)} placeholder="Ex: 310"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Terminal</label>
                  <select value={editingShip.terminal || ''} onChange={e => updateField('terminal', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all">
                    <option value="">Selecionar...</option>
                    {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status *</label>
                  <select value={editingShip.status || 'EM TRÂNSITO'} onChange={e => updateField('status', e.target.value as ShipStatus)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all">
                    {SHIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ETA (Chegada Prevista)</label>
                  <input type="date" value={editingShip.eta || ''} onChange={e => updateField('eta', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ETD (Saída Prevista)</label>
                  <input type="date" value={editingShip.etd || ''} onChange={e => updateField('etd', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observações</label>
                <textarea value={editingShip.observacoes || ''} onChange={e => updateField('observacoes', e.target.value)} rows={3}
                  placeholder="Observações sobre o navio ou viagem..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none" />
              </div>
            </div>

            <div className="px-8 py-5 border-t border-slate-800 flex items-center gap-3 justify-end">
              <button onClick={() => setModalOpen(false)}
                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NaviosTab;
