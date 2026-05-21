import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Trip, Ship, ShipStatus, ShipStatusEntry, TerminalVessel } from '../../../types';
import { db, supabase } from '../../../utils/storage';
import DateTimePicker from '../../shared/DateTimePicker';

interface NaviosTabProps { user: User; trips: Trip[]; }

// ── Trip type colors ───────────────────────────────────────────────────────────
const TRIP_TYPE_CFG: Record<string, { bg: string; text: string; border: string }> = {
  'COLETA':      { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'CABOTAGEM':   { bg: 'bg-cyan-500/15',    text: 'text-cyan-300',    border: 'border-cyan-500/30'    },
  'EXPORTAÇÃO':  { bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30'   },
  'ENTREGA':     { bg: 'bg-violet-500/15',  text: 'text-violet-300',  border: 'border-violet-500/30'  },
  'IMPORTAÇÃO':  { bg: 'bg-blue-500/15',    text: 'text-blue-300',    border: 'border-blue-500/30'    },
};
function getTripTypeStyle(type?: string) {
  const key = (type || '').toUpperCase();
  return TRIP_TYPE_CFG[key] ?? { bg: 'bg-slate-700/60', text: 'text-slate-300', border: 'border-slate-600/40' };
}

// ── Terminal config ────────────────────────────────────────────────────────────
const TERM_ACCENT: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'BTP':           { bg: 'bg-amber-500/10',   text: 'text-amber-300',   border: 'border-amber-500/30',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  'ECOPORTO':      { bg: 'bg-blue-500/10',    text: 'text-blue-300',    border: 'border-blue-500/30',    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  'SANTOS BRASIL': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  'EMBRAPORT':     { bg: 'bg-blue-900/20',     text: 'text-blue-300',    border: 'border-blue-800/40',    badge: 'bg-blue-900/30 text-blue-200 border-blue-700/40' },
};
const TERM_LINKS: Record<string, string> = {
  'BTP':           'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
  'ECOPORTO':      'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
  'SANTOS BRASIL': 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao',
  'EMBRAPORT':     'http://www.embraportonline.com.br/Navios/Escala',
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
const INACTIVE_STATUSES = ['Viagem concluída', 'Viagem cancelada', 'Reutilização'];

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
function isToday(v?: string | null): boolean {
  if (!v || v === '—' || v === '-') return false;
  let d: Date;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) {
    const parts = v.split(/[\/\s:]/);
    d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  } else {
    try { d = new Date(v); } catch { return false; }
  }
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function gateTimeStr(v?: string | null): string {
  if (!v) return '';
  if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(v)) return v.split(' ')[1].slice(0, 5);
  return '';
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
  Search:   (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Eye:      (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  Settings: (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Tag:      (p:any) => <svg {...p} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
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
// ── Logos SVG — réplicas pixel-perfect das marcas reais ─────────────────────

/**
 * SANTOS BRASIL
 * Quadrado: verde (#0e9b47) + azul (#1570b8) separados por curva S branca.
 * Bezier cúbica real: M 35,0 C 20,33 80,67 65,100
 * Blue region acompanha exatamente a borda da curva S.
 */
function LogoSVGSantosBrasil({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* campo verde (base toda) */}
      <rect width="100" height="100" rx="6" fill="#0e9b47"/>
      {/* campo azul: região direita/superior delimitada pela curva S */}
      <path
        d="M 100,0 L 100,100 L 65,100 C 80,67 20,33 35,0 Z"
        fill="#1570b8"
      />
      {/* curva S branca — bezier cúbica com inflexão genuína */}
      <path
        d="M 35,0 C 20,33 80,67 65,100"
        stroke="white" strokeWidth="14" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

/**
 * BTP — Brasil Terminal Portuário
 * Logo horizontal: duas ondas sobrepostas (teal + verde-limão) +
 * "Brasil" em bold teal escuro + "TERMINAL PORTUÁRIO" pequeno.
 * Exatamente como na imagem: sem box, sem fundo colorido.
 */
function LogoSVGBTP({ height = 32 }: { height?: number }) {
  // Proporção do logo real: ~3.4:1 (570×89px)
  const w = Math.round(height * 3.4);
  return (
    <svg width={w} height={height} viewBox="0 0 340 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* onda azul-teal (superior) */}
      <path
        d="M 0,30 Q 85,2 170,18 Q 255,34 340,10"
        stroke="#5bbdd4" strokeWidth="11" strokeLinecap="round" fill="none"
      />
      {/* onda verde-limão (inferior, paralela) */}
      <path
        d="M 0,48 Q 85,20 170,36 Q 255,52 340,28"
        stroke="#8dc63f" strokeWidth="11" strokeLinecap="round" fill="none"
      />
      {/* "Brasil" — bold teal escuro, exatamente como no logo */}
      <text
        x="0" y="82"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900" fontSize="44" fill="#2a6e7e"
      >Brasil</text>
      {/* "TERMINAL PORTUÁRIO" — espaçado, cinza claro */}
      <text
        x="2" y="98"
        fontFamily="Arial, sans-serif"
        fontWeight="400" fontSize="14" fill="#888" letterSpacing="4"
      >TERMINAL PORTUÁRIO</text>
    </svg>
  );
}

/**
 * BTP — ícone compacto para tabela (quadrado)
 * Versão reduzida: duas ondas + "BTP" em teal.
 */
function IconSVGBTP({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="6" fill="#f0f5f8"/>
      <path d="M 6,30 Q 30,8 54,20 Q 78,32 94,12"
            stroke="#5bbdd4" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <path d="M 6,48 Q 30,26 54,38 Q 78,50 94,30"
            stroke="#8dc63f" strokeWidth="9" strokeLinecap="round" fill="none"/>
      <text x="50" y="82" textAnchor="middle"
            fontFamily="Arial Black, Arial, sans-serif"
            fontWeight="900" fontSize="24" fill="#2a6e7e" letterSpacing="1">BTP</text>
    </svg>
  );
}

/**
 * ECOPORTO SANTOS
 * Logo horizontal: folha/semente oval verde rotacionada + "eco" teal leve +
 * "PORTO" bold negro + "SANTOS" pequeno cinza abaixo.
 * Igual à imagem: "eco" e "PORTO" formam uma palavra composta, folha acima-direita.
 */
function LogoSVGEcoporto({ height = 32 }: { height?: number }) {
  const w = Math.round(height * 2.8);
  return (
    <svg width={w} height={height} viewBox="0 0 280 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* folha/semente oval sólida — verde, rotacionada ~-38° */}
      <ellipse cx="230" cy="22" rx="46" ry="20" fill="#46b32a" transform="rotate(-38 230 22)"/>
      {/* nervura central da folha */}
      <path d="M 208,40 Q 228,22 244,8"
            stroke="#2d7a1a" strokeWidth="3" strokeLinecap="round" fill="none"/>
      {/* "eco" — peso regular, teal, mesmo tamanho de "PORTO" mas sem bold */}
      <text x="0" y="68"
            fontFamily="Arial, sans-serif"
            fontWeight="400" fontSize="44" fill="#3a7d7a">eco</text>
      {/* "PORTO" — black/900, logo após "eco" */}
      <text x="94" y="68"
            fontFamily="Arial Black, Arial, sans-serif"
            fontWeight="900" fontSize="44" fill="#1a1a1a">PORTO</text>
      {/* "SANTOS" — pequeno, cinza, alinhado com "PORTO" */}
      <text x="96" y="88"
            fontFamily="Arial, sans-serif"
            fontWeight="400" fontSize="14" fill="#999" letterSpacing="4">SANTOS</text>
    </svg>
  );
}

/**
 * ECOPORTO — ícone compacto para tabela (quadrado)
 * Folha oval + "ECO" em teal.
 */
function IconSVGEcoporto({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="6" fill="#f4faf2"/>
      <ellipse cx="68" cy="28" rx="26" ry="13" fill="#46b32a" transform="rotate(-38 68 28)"/>
      <path d="M 52,44 Q 66,28 76,18" stroke="#2d7a1a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <text x="50" y="80" textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontWeight="400" fontSize="20" fill="#3a7d7a">eco</text>
      <text x="50" y="97" textAnchor="middle"
            fontFamily="Arial Black, Arial, sans-serif"
            fontWeight="900" fontSize="16" fill="#1a1a1a" letterSpacing="1">PORTO</text>
    </svg>
  );
}

/**
 * EMBRAPORT — DP World Santos  (ícone compacto para tabela)
 * Globo navy (#003764) com grade branca + arco vermelho no topo.
 * Fundo branco — idêntico ao mark do logo real.
 */
function IconSVGEmbraport({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="6" fill="#f0f4f8"/>
      {/* Globo navy */}
      <circle cx="50" cy="50" r="36" fill="#003764"/>
      {/* Paralelos — branco */}
      <path d="M 16,37 Q 50,30 84,37" stroke="white" strokeWidth="1.5" fill="none"/>
      <line x1="14" y1="50" x2="86" y2="50" stroke="white" strokeWidth="1.5"/>
      <path d="M 16,63 Q 50,70 84,63" stroke="white" strokeWidth="1.5" fill="none"/>
      {/* Meridianos — branco */}
      <path d="M 50,14 Q 63,50 50,86" stroke="white" strokeWidth="1.5" fill="none"/>
      <path d="M 50,14 Q 37,50 50,86" stroke="white" strokeWidth="1.5" fill="none"/>
      {/* Arco vermelho — topo do globo */}
      <path d="M 23,27 Q 50,14 77,27" stroke="#cc003d" strokeWidth="5" strokeLinecap="round" fill="none"/>
      {/* Contorno do globo */}
      <circle cx="50" cy="50" r="36" stroke="white" strokeWidth="1.8" fill="none"/>
    </svg>
  );
}

/**
 * EMBRAPORT — DP World Santos (logo horizontal para cards)
 * Layout fiel ao logo real:
 *   [Globo à esquerda] + "DP WORLD" bold navy + "Santos" verde abaixo
 * Aspect ratio ≈ 3.2:1
 */
function LogoSVGEmbraport({ height = 32 }: { height?: number }) {
  const w = Math.round(height * 3.2);
  return (
    <svg width={w} height={height} viewBox="0 0 320 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ── Globo (esquerda) ── */}
      <circle cx="46" cy="46" r="38" fill="#003764"/>
      {/* Paralelos */}
      <path d="M 10,33 Q 46,25 82,33" stroke="white" strokeWidth="1.8" fill="none"/>
      <line x1="8" y1="46" x2="84" y2="46" stroke="white" strokeWidth="1.8"/>
      <path d="M 10,59 Q 46,67 82,59" stroke="white" strokeWidth="1.8" fill="none"/>
      {/* Meridianos */}
      <path d="M 46,8  Q 61,46 46,84" stroke="white" strokeWidth="1.8" fill="none"/>
      <path d="M 46,8  Q 31,46 46,84" stroke="white" strokeWidth="1.8" fill="none"/>
      {/* Arco vermelho proeminente — topo */}
      <path d="M 19,22 Q 46,9 73,22" stroke="#cc003d" strokeWidth="6" strokeLinecap="round" fill="none"/>
      {/* Contorno */}
      <circle cx="46" cy="46" r="38" stroke="white" strokeWidth="2" fill="none"/>

      {/* ── Texto (direita) ── */}
      {/* "DP WORLD" — bold navy */}
      <text x="96" y="56"
            fontFamily="Arial Black, Arial, sans-serif"
            fontWeight="900" fontSize="46" fill="#003764" letterSpacing="-0.5">DP WORLD</text>
      {/* "Santos" — verde, regular, abaixo */}
      <text x="98" y="80"
            fontFamily="Arial, sans-serif"
            fontWeight="400" fontSize="22" fill="#4c9e2e">Santos</text>
    </svg>
  );
}


/** Genérico */
function IconSVGGeneric({ terminal, size = 32 }: { terminal: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="6" fill="#334155"/>
      <text x="50" y="65" textAnchor="middle"
            fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="28" fill="white">
        {terminal.slice(0,3).toUpperCase()}
      </text>
    </svg>
  );
}

/** Badge compact para linhas da tabela */
function TermBadge({ terminal }: { terminal: string }) {
  if (terminal === 'SANTOS BRASIL') return <LogoSVGSantosBrasil size={26}/>;
  if (terminal === 'BTP')           return <IconSVGBTP size={26}/>;
  if (terminal === 'ECOPORTO')      return <IconSVGEcoporto size={26}/>;
  if (terminal === 'EMBRAPORT')     return <IconSVGEmbraport size={26}/>;
  return <IconSVGGeneric terminal={terminal} size={26}/>;
}

/** Badge grande para cards do monitoramento — logo completa horizontal */
function TermBadgeLarge({ terminal }: { terminal: string }) {
  if (terminal === 'SANTOS BRASIL') {
    return (
      <span className="inline-flex items-center gap-2 shrink-0">
        <LogoSVGSantosBrasil size={32}/>
        <svg width={72} height={32} viewBox="0 0 72 32" fill="none">
          <text x="0" y="14" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="12" fill="#0e9b47">Santos</text>
          <text x="0" y="28" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="12" fill="#1570b8" letterSpacing="0.5">BRASIL</text>
        </svg>
      </span>
    );
  }
  if (terminal === 'BTP')       return <LogoSVGBTP height={30}/>;
  if (terminal === 'ECOPORTO')  return <LogoSVGEcoporto height={30}/>;
  if (terminal === 'EMBRAPORT') return <LogoSVGEmbraport height={30}/>;
  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      <IconSVGGeneric terminal={terminal} size={30}/>
      <span className="text-[9px] font-black text-slate-300 uppercase">{terminal}</span>
    </span>
  );
}

// ── Trip Detail Modal ─────────────────────────────────────────────────────────
interface TripDetailModalProps {
  trip: Trip;
  locations: any[];
  onClose: () => void;
  onTripSaved: (updated: Trip) => void;
}
const TripDetailModal: React.FC<TripDetailModalProps> = ({ trip, locations, onClose, onTripSaved }) => {
  const [tab, setTab]         = useState<'info' | 'agendamento' | 'minuta'>('info');
  const [saving, setSaving]   = useState(false);
  const [locSearch, setLocSearch] = useState('');
  const [selLocId, setSelLocId]   = useState(trip.scheduledLocationId || '');
  const [dateTime, setDateTime]   = useState(() => {
    const raw = trip.scheduling?.dateTime || trip.scheduledDateTime || '';
    if (!raw) return '';
    if (raw.length <= 16 && !raw.endsWith('Z')) return raw.substring(0, 16);
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return '';
      const off = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - off).toISOString().slice(0, 16);
    } catch { return ''; }
  });

  const filteredLocs = useMemo(() => {
    if (!locSearch) return locations;
    const s = locSearch.toLowerCase();
    return locations.filter(l =>
      l.name?.toLowerCase().includes(s) || l.legalName?.toLowerCase().includes(s) ||
      l.cnpj?.includes(s) || l.city?.toLowerCase().includes(s)
    );
  }, [locations, locSearch]);

  const selLoc = locations.find(l => l.id === selLocId);
  const tc = getTripTypeStyle(trip.type);
  const isScheduled = !!trip.isScheduled;
  const hasMinuta = !!trip.preStackingFormData;

  const handleSaveScheduling = async () => {
    if (!selLocId || !dateTime) return;
    setSaving(true);
    const isoDateTime = new Date(dateTime).toISOString();
    const schedulingData = {
      isScheduled: true,
      sentNF: true,
      scheduledLocationId: selLocId,
      scheduledDateTime: dateTime,
      destination: selLoc ? { id: selLoc.id, name: selLoc.name, legalName: selLoc.legalName, cnpj: selLoc.cnpj, city: selLoc.city, state: selLoc.state } : trip.destination,
      scheduling: { locationId: selLocId, location: selLoc?.name || '', dateTime: isoDateTime, obs: trip.scheduling?.obs || '' },
    };
    try {
      await db.saveTrip({ ...trip, ...schedulingData });
      onTripSaved({ ...trip, ...schedulingData } as Trip);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Agendamento salvo', type: 'success' } }));
    } catch { window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar agendamento', type: 'error' } })); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0f172a] w-full max-w-2xl rounded-2xl border border-slate-700 overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[7px] font-black uppercase rounded px-1.5 py-0.5 border ${tc.bg} ${tc.text} ${tc.border}`}>
                <I.Tag className="w-2 h-2"/>{trip.type}
              </span>
              {trip.category && <span className="text-[7px] text-slate-500 font-bold border border-slate-700 rounded px-1.5 py-0.5">{trip.category}</span>}
              {isScheduled
                ? <span className="flex items-center gap-1 text-[7px] font-black text-green-400"><I.Check className="w-2.5 h-2.5"/> Agendado</span>
                : <span className="flex items-center gap-1 text-[7px] font-black text-amber-400"><I.Warning className="w-2.5 h-2.5"/> Ag. Pendente</span>}
              {hasMinuta && <span className="text-[7px] font-black text-blue-400 border border-blue-800 rounded px-1.5 py-0.5">Minuta</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-black text-slate-100 uppercase">{trip.os}</span>
              {trip.container && <span className="text-[9px] font-bold text-slate-400 border border-slate-700 rounded px-1.5">{trip.container}</span>}
            </div>
            <p className="text-[9px] text-slate-500 font-bold">{trip.driver?.name} · {trip.status}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-xl transition-all text-slate-500 hover:text-slate-200 shrink-0">
            <I.Close className="w-4 h-4"/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 shrink-0">
          {([
            { key: 'info'        as const, label: 'Detalhes'    },
            { key: 'agendamento' as const, label: 'Agendamento' },
            { key: 'minuta'      as const, label: 'Minuta'      },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-t-lg text-[8px] font-black uppercase tracking-widest transition-all border-b-2 ${
                tab === key ? 'text-blue-300 border-blue-500' : 'text-slate-600 border-transparent hover:text-slate-400'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── INFO ── */}
          {tab === 'info' && (
            <div className="space-y-3">
              {[
                { label: 'Navio',       value: trip.ship },
                { label: 'Motorista',   value: trip.driver?.name },
                { label: 'Cavalo',      value: trip.driver?.plateHorse },
                { label: 'Carreta',     value: trip.driver?.plateTrailer },
                { label: 'Container',   value: trip.container },
                { label: 'Data Prog.',  value: trip.dateTime ? new Date(trip.dateTime).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : null },
                { label: 'Destino',     value: trip.destination?.name || trip.scheduling?.location },
                { label: 'Cidade',      value: trip.destination ? `${trip.destination.city}/${trip.destination.state}` : null },
                { label: 'Cliente',     value: trip.customer?.name },
                { label: 'Armador',     value: (trip as any).armador },
                { label: 'Booking',     value: (trip as any).booking },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest w-20 shrink-0 pt-0.5">{label}</span>
                  <span className="text-[9px] font-bold text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── AGENDAMENTO ── */}
          {tab === 'agendamento' && (
            <div className="space-y-4">
              {isScheduled && (
                <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-green-950/20 border border-green-900/30">
                  <I.Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5"/>
                  <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-green-400 uppercase tracking-widest">Agendado</p>
                    {trip.scheduling?.location && <p className="text-[9px] font-bold text-slate-200">{trip.scheduling.location}</p>}
                    {(trip.scheduling?.dateTime || trip.scheduledDateTime) && (
                      <p className="text-[8px] text-slate-400 font-bold">
                        {new Date(trip.scheduling?.dateTime || trip.scheduledDateTime!).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    )}
                    {trip.scheduling?.obs && <p className="text-[8px] text-slate-500">{trip.scheduling.obs}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{isScheduled ? 'Editar agendamento' : 'Novo agendamento'}</p>

                {/* Local */}
                <div className="space-y-2">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Local de destino</label>
                  <input
                    type="text" placeholder="Buscar local..."
                    value={locSearch} onChange={e => setLocSearch(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-[9px] text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500 transition-all"
                  />
                  {locSearch && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
                      {filteredLocs.slice(0, 15).map(l => (
                        <button key={l.id} onClick={() => { setSelLocId(l.id); setLocSearch(''); }}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-700 transition-all ${selLocId === l.id ? 'bg-blue-900/40' : 'bg-slate-800/60'}`}>
                          <p className="text-[8px] font-black text-slate-200">{l.name}</p>
                          <p className="text-[7px] text-slate-500">{l.city}/{l.state} · {l.type}</p>
                        </button>
                      ))}
                      {filteredLocs.length === 0 && <p className="px-3 py-2 text-[8px] text-slate-600">Nenhum local encontrado</p>}
                    </div>
                  )}
                  {selLoc && !locSearch && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-900/20 border border-blue-800/40">
                      <I.Check className="w-3 h-3 text-blue-400 shrink-0"/>
                      <div className="min-w-0">
                        <p className="text-[8px] font-black text-blue-300 truncate">{selLoc.name}</p>
                        <p className="text-[7px] text-slate-500">{selLoc.city}/{selLoc.state}</p>
                      </div>
                      <button onClick={() => setSelLocId('')} className="ml-auto text-slate-600 hover:text-red-400 shrink-0">
                        <I.Close className="w-3 h-3"/>
                      </button>
                    </div>
                  )}
                </div>

                {/* Data/Hora */}
                <div className="space-y-2">
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Data e hora</label>
                  <DateTimePicker
                    value={dateTime}
                    onChange={setDateTime}
                    placeholder="Selecionar data e hora..."
                    inputClassName="!bg-slate-800 !border-slate-700 !text-slate-200 !placeholder-slate-600 focus:!border-blue-500 !text-[9px]"
                  />
                </div>

                <button
                  onClick={handleSaveScheduling}
                  disabled={saving || !selLocId || !dateTime}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  {saving ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </div>
          )}

          {/* ── MINUTA ── */}
          {tab === 'minuta' && (
            <div className="space-y-3">
              {hasMinuta ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-900/20 border border-blue-800/30">
                    <I.Check className="w-4 h-4 text-blue-400 shrink-0"/>
                    <div>
                      <p className="text-[8px] font-black text-blue-300 uppercase tracking-widest">Minuta gerada</p>
                      {trip.preStackingFormData?.porto && <p className="text-[9px] font-bold text-slate-300">{trip.preStackingFormData.porto}</p>}
                    </div>
                  </div>
                  {Object.entries(trip.preStackingFormData || {}).filter(([k]) => !['id','tripId'].includes(k)).slice(0, 12).map(([k, v]) => (
                    v ? (
                      <div key={k} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-800">
                        <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest w-28 shrink-0 pt-0.5">{k}</span>
                        <span className="text-[9px] font-bold text-slate-300">{String(v)}</span>
                      </div>
                    ) : null
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <I.Anchor className="w-8 h-8 text-slate-700"/>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nenhuma minuta gerada</p>
                  <p className="text-[8px] text-slate-700 max-w-xs">
                    Para gerar a minuta, acesse a página de Organização, localize esta OS e use a opção de agendamento.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [tvTermFilter, setTVTermFilter] = useState<string>('TODOS');
  const [shipSearch, setShipSearch]   = useState('');
  // Monitoramento: set de índices expandidos
  const [expandedVessels, setExpandedVessels] = useState<Set<number>>(new Set());

  // Locations (ports + preStacking) for scheduling modal
  const [locations, setLocations]     = useState<any[]>([]);
  useEffect(() => {
    Promise.all([db.getPorts(), db.getPreStacking()]).then(([ports, preStacking]) => {
      setLocations([
        ...ports.map((p: any) => ({ id: p.id, name: p.name, legalName: p.legalName, cnpj: p.cnpj, city: p.city, state: p.state, type: 'PORTO' })),
        ...preStacking.map((ps: any) => ({ id: ps.id, name: ps.name, legalName: ps.legalName, cnpj: ps.cnpj, city: ps.city, state: ps.state, type: 'UNIDADE' })),
      ].sort((a, b) => a.name.localeCompare(b.name)));
    }).catch(() => {});
  }, []);

  // Trip detail modal
  const [detailTrip, setDetailTrip]   = useState<Trip|null>(null);

  // Ship modal
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

  // ── Filtro de tipos no Monitoramento ─────────────────────────────────────────
  const [showTypeConfig, setShowTypeConfig] = useState(false);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('monitTypeFilter');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const toggleType = (type: string) => {
    setTypeFilter(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      localStorage.setItem('monitTypeFilter', JSON.stringify([...next]));
      return next;
    });
  };
  const clearTypeFilter = () => {
    setTypeFilter(new Set());
    localStorage.removeItem('monitTypeFilter');
  };

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

  // ── Auto-refresh ─────────────────────────────────────────────────────────────
  const AUTO_REFRESH_MS = 3 * 60 * 1000; // 3 minutos
  const [nextRefresh, setNextRefresh] = useState<number>(Date.now() + AUTO_REFRESH_MS);
  const [countdown, setCountdown]     = useState<string>('3:00');

  useEffect(() => { loadShips(); loadTV(); }, []); // eslint-disable-line

  // Polling de 3 em 3 minutos
  useEffect(() => {
    const refresh = () => {
      loadTV();
      setNextRefresh(Date.now() + AUTO_REFRESH_MS);
    };
    const interval = setInterval(refresh, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadTV]); // eslint-disable-line

  // Contador regressivo
  useEffect(() => {
    const tick = setInterval(() => {
      const remaining = Math.max(0, nextRefresh - Date.now());
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${m}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(tick);
  }, [nextRefresh]);


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
    let res = termVessels;
    if (tvFilter !== 'TODOS')      res = res.filter(v => mapSituacao(v.situacao) === tvFilter);
    if (tvTermFilter !== 'TODOS')  res = res.filter(v => v.terminal === tvTermFilter);
    if (shipSearch.trim()) {
      const q = shipSearch.trim().toUpperCase();
      res = res.filter(v => v.navio.toUpperCase().includes(q));
    }
    return res;
  }, [termVessels, tvFilter, tvTermFilter, shipSearch]);

  const filterCounts = useMemo(() => {
    const c: Partial<Record<TVFilter, number>> = { TODOS: termVessels.length };
    for (const v of termVessels) { const s = mapSituacao(v.situacao) as TVFilter; c[s] = (c[s]??0)+1; }
    return c;
  }, [termVessels]);

  // ── MONITORAMENTO: trip-vessel matching ──────────────────────────────────────
  // Replica exatamente os filtros do painel de Organização (ambas as views)
  const orgTripsWithShip = useMemo(() =>
    trips.filter(t => {
      if (INACTIVE_STATUSES.includes(t.status)) return false;
      if (t.isRemovedFromOrg) return false;
      if (!t.ship?.trim()) return false;
      // Viagem agendada: mantém visível até o horário do agendamento passar
      if (t.isScheduled) {
        const scheduledDT = t.scheduling?.dateTime || t.scheduledDateTime;
        if (!scheduledDT) return true;
        return new Date(scheduledDT) > new Date();
      }
      const dt = t.dateTime;
      if (dt) {
        const raw = dt.includes('T') ? dt.split('T')[0] : dt.split(' ')[0];
        const normalized = raw.includes('/') ? raw.split('/').reverse().join('-') : raw;
        if (normalized < '2026-04-01') return false;
      }
      return true;
    }),
  [trips]);

  // Todos os tipos únicos das viagens org (para o painel de configuração)
  const allTripTypes = useMemo(() => {
    const s = new Set<string>();
    for (const t of orgTripsWithShip) { if (t.type?.trim()) s.add(t.type.trim()); }
    return [...s].sort();
  }, [orgTripsWithShip]);

  // Viagens filtradas pelo filtro de tipo (vazio = todas)
  const filteredOrgTrips = useMemo(() =>
    typeFilter.size === 0
      ? orgTripsWithShip
      : orgTripsWithShip.filter(t => typeFilter.has(t.type ?? '')),
  [orgTripsWithShip, typeFilter]);

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
    for (const t of filteredOrgTrips) {
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
  }, [termVessels, filteredOrgTrips]);

  // Trips whose ship was NOT found in any terminal vessel
  const unmatchedTrips = useMemo(() => {
    return filteredOrgTrips.filter(t =>
      !termVessels.some(v => shipMatch(v.navio, t.ship))
    );
  }, [filteredOrgTrips, termVessels]);

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

  const handleTripSaved = useCallback((updated: Trip) => {
    setDetailTrip(updated);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {detailTrip && (
        <TripDetailModal
          trip={detailTrip}
          locations={locations}
          onClose={() => setDetailTrip(null)}
          onTripSaved={handleTripSaved}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitoramento de Navios</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            BTP · ECOPORTO · Santos Brasil · EMBRAPORT — atualizado pelo Railway Bot
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
              {loadingTV
                ? <span className="text-[8px] text-blue-400 font-bold animate-pulse">Carregando...</span>
                : <span className="flex items-center gap-1 text-[7px] text-slate-600 font-bold" title="Próxima atualização automática">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"/>
                    auto {countdown}
                  </span>
              }
            </div>
            <div className="flex items-center gap-2">
              {(['BTP','ECOPORTO','SANTOS BRASIL','EMBRAPORT'] as const).map(t => (
                <a key={t} href={TERM_LINKS[t]} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700">
                  <TermBadge terminal={t}/>
                  <I.Link className="w-2.5 h-2.5 text-slate-500"/>
                </a>
              ))}
            </div>
          </div>

          {/* Search + Terminal filter */}
          <div className="px-5 py-2.5 border-b border-slate-800/60 flex items-center gap-3 flex-wrap">
            {/* Busca de navio */}
            <div className="relative flex items-center">
              <I.Search className="absolute left-2.5 w-3 h-3 text-slate-500 pointer-events-none"/>
              <input
                type="text"
                placeholder="Buscar navio..."
                value={shipSearch}
                onChange={e => setShipSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[8px] font-bold text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500 transition-all w-40"
              />
              {shipSearch && (
                <button onClick={() => setShipSearch('')} className="absolute right-2 text-slate-500 hover:text-slate-300">
                  <I.Close className="w-2.5 h-2.5"/>
                </button>
              )}
            </div>
            {/* Filtro por porto */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['TODOS', 'BTP', 'ECOPORTO', 'SANTOS BRASIL', 'EMBRAPORT'] as const).map(t => {
                const active = tvTermFilter === t;
                const acc = t === 'TODOS' ? null : TERM_ACCENT[t];
                return (
                  <button key={t} onClick={() => setTVTermFilter(t)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
                      active
                        ? acc ? `${acc.bg} ${acc.text} ${acc.border}` : 'bg-slate-700 text-slate-200 border-slate-600'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'
                    }`}>
                    {t !== 'TODOS' && <TermBadge terminal={t}/>}
                    {t === 'TODOS' ? 'Todos' : TERM_SHORT[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filters */}
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
                    <th className="bg-[#0a101c] px-3 py-2.5 text-center font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Gate Dry</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 text-center font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Gate Reefer</th>
                    <th className="bg-[#0a101c] px-3 py-2.5 w-8"/>
                  </tr>
                </thead>
                <tbody>
                  {filteredVessels.map((v, idx) => {
                    const st  = mapSituacao(v.situacao);
                    const sc  = STATUS_CFG[st];
                    const isM = ships.some(s => s.name.toUpperCase() === v.navio.toUpperCase());
                    const dlExpired = isExpiredStr(v.deadLineStr);
                    return (
                      <tr key={idx} className={`border-b border-slate-800/40 transition-colors group ${sc.rowBg || ''} hover:brightness-125`}>
                        <td className={`sticky left-0 z-10 px-3 py-2 border-r border-slate-800/40 ${sc.rowBg || 'bg-[#0f172a]'}`}>
                          <TermBadge terminal={v.terminal}/>
                        </td>
                        <td className={`sticky left-14 z-10 px-3 py-2 border-r border-slate-800/40 ${sc.rowBg || 'bg-[#0f172a]'}`}>
                          <span className={`font-black uppercase whitespace-nowrap text-[9px] ${sc.text}`}>{v.navio}</span>
                          {v.rap && <div className="text-[7px] text-slate-600 font-bold">RAP {v.rap}</div>}
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {/* Tag: Gate Fechado/Encerrado */}
                            {(st === 'GATE ENCERRADO' || (isExpiredStr(v.deadLineStr) && st !== 'GATE ABERTO' && st !== 'ATRACADO' && st !== 'DESATRACADO')) && (
                              <span className="inline-flex items-center gap-0.5 text-[6px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
                                <I.Warning className="w-2 h-2"/> Gate Fechado
                              </span>
                            )}
                            {/* Tag: Abre Hoje (previsão de abertura de gate no dia atual) */}
                            {(() => {
                              const gv = v.gateDry || v.gateReefer;
                              const t2 = gateTimeStr(gv);
                              if (isToday(gv) && !isExpiredStr(gv)) return (
                                <span className="inline-flex items-center gap-0.5 text-[6px] font-black uppercase px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                                  <I.Check className="w-2 h-2"/> Abre Hoje{t2 ? ` ${t2}` : ''}
                                </span>
                              );
                              return null;
                            })()}
                          </div>
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
                          {v.gateDry
                            ? <span className={`font-black ${isExpiredStr(v.gateDry) ? 'text-red-400' : 'text-green-400'}`}>{fmtCell(v.gateDry)}</span>
                            : <span className="text-slate-700">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {v.gateReefer
                            ? <span className={`font-black ${isExpiredStr(v.gateReefer) ? 'text-red-400' : 'text-green-400'}`}>{fmtCell(v.gateReefer)}</span>
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
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <I.Search className="w-4 h-4 text-slate-500"/>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Navios — Viagens da Organização
                </span>
                {vesselMatches.length > 0 && (
                  <span className="text-[8px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {vesselMatches.length} navios · {vesselMatches.reduce((a,m) => a+m.matchedTrips.length,0)} viagens
                  </span>
                )}
                {typeFilter.size > 0 && (
                  <span className="text-[7px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    {typeFilter.size} tipo(s) filtrado(s)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {vesselMatches.some(m => m.pendingCount > 0) && (
                  <span className="flex items-center gap-1.5 text-[8px] font-black text-red-400">
                    <I.Warning className="w-3 h-3"/>
                    {vesselMatches.reduce((a,m)=>a+m.pendingCount,0)} pendentes
                  </span>
                )}
                {/* Botão de configuração de tipos */}
                <button
                  onClick={() => setShowTypeConfig(p => !p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${
                    showTypeConfig
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                  title="Filtrar por tipo de programação">
                  <I.Settings className="w-3 h-3"/>
                  Tipos
                  {typeFilter.size > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"/>}
                </button>
              </div>
            </div>

            {/* Painel de configuração de tipos */}
            {showTypeConfig && (
              <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <I.Tag className="w-3 h-3"/> Filtrar por tipo de programação
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[7px] text-slate-600 font-bold">
                      {typeFilter.size === 0 ? 'Mostrando todos' : `${typeFilter.size} selecionado(s)`}
                    </span>
                    {typeFilter.size > 0 && (
                      <button onClick={clearTypeFilter}
                        className="text-[7px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest">
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                {allTripTypes.length === 0 ? (
                  <p className="text-[8px] text-slate-600 italic">Nenhum tipo encontrado nas viagens</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTripTypes.map(tp => {
                      const active = typeFilter.has(tp);
                      return (
                        <button key={tp} onClick={() => toggleType(tp)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wide transition-all ${
                            active
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-slate-800/60 text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-400'
                          }`}>
                          {active && <I.Check className="w-2.5 h-2.5"/>}
                          {tp}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-[7px] text-slate-700 font-bold mt-2">
                  Vazio = mostra todos os tipos · Selecionado = mostra apenas os marcados
                </p>
              </div>
            )}

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
                      {/* Vessel info row — clicável para expandir/recolher viagens */}
                      <div
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:brightness-110 ${sc.border} ${sc.bg}`}
                        onClick={() => setExpandedVessels(prev => {
                          const next = new Set(prev);
                          if (next.has(idx)) next.delete(idx); else next.add(idx);
                          return next;
                        })}
                      >
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TermBadgeLarge terminal={match.vessel.terminal}/>
                            <span className={`text-[11px] font-black uppercase ${sc.text}`}>{match.vessel.navio}</span>
                            {match.vessel.viagem && <span className="text-[8px] text-slate-500 font-bold">{match.vessel.viagem}</span>}
                            <SBadge status={st} size="xs"/>
                            {/* Tag: Gate Fechado */}
                            {(st === 'GATE ENCERRADO' || (isExpiredStr(match.vessel.deadLineStr) && st !== 'GATE ABERTO' && st !== 'ATRACADO' && st !== 'DESATRACADO')) && (
                              <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                <I.Warning className="w-2.5 h-2.5"/> Gate Fechado
                              </span>
                            )}
                            {/* Tag: Abre Hoje */}
                            {(() => {
                              const gv = match.vessel.gateDry || match.vessel.gateReefer;
                              const t2 = gateTimeStr(gv);
                              if (isToday(gv) && !isExpiredStr(gv)) return (
                                <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                  <I.Check className="w-2.5 h-2.5"/> Abre Hoje{t2 ? ` às ${t2}` : ''}
                                </span>
                              );
                              return null;
                            })()}
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
                                <I.Warning className="w-2.5 h-2.5 inline-block mr-0.5"/> Dead-Line {fmtCell(dl)}{dlExp ? ' (VENCIDO)' : ''}
                              </span>
                            )}
                            {(match.vessel.gateDry || match.vessel.gateReefer) && (
                              <span className="text-[8px] font-black text-green-400">
                                <I.Check className="w-2.5 h-2.5 inline-block mr-0.5"/> Gate {fmtCell(match.vessel.gateDry || match.vessel.gateReefer)}
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
                        {/* Counts + chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          {match.pendingCount > 0 && (
                            <div className="text-center px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                              <p className="text-[14px] font-black text-red-400">{match.pendingCount}</p>
                              <p className="text-[6px] font-black text-red-500 uppercase">Pendente</p>
                            </div>
                          )}
                          {match.scheduledCount > 0 && (
                            <div className="text-center px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-[14px] font-black text-green-400">{match.scheduledCount}</p>
                              <p className="text-[6px] font-black text-green-600 uppercase">Agendados</p>
                            </div>
                          )}
                          <div className="flex flex-col items-center gap-0.5 ml-1">
                            <span className="text-[6px] font-black text-slate-600 uppercase">{match.matchedTrips.length} viag.</span>
                            <I.ChevD className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expandedVessels.has(idx) ? 'rotate-180' : ''}`}/>
                          </div>
                        </div>
                      </div>

                      {/* Gate + Deadline do terminal (do vessel) — visível sempre */}
                      {(match.vessel.gateDry || match.vessel.gateReefer || match.vessel.deadLineStr || match.vessel.dtPrevAtrac) && (
                        <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800/40 flex-wrap">
                          {match.vessel.dtPrevAtrac && (
                            <span className="text-[8px] text-slate-400">
                              <span className="text-slate-600 font-bold uppercase text-[7px]">Prev. Atrac. </span>
                              {fmtCell(match.vessel.dtPrevAtrac)}
                            </span>
                          )}
                          {match.vessel.deadLineStr && (
                            <span className={`text-[8px] font-black flex items-center gap-1 ${isExpiredStr(match.vessel.deadLineStr) ? 'text-red-400' : 'text-orange-400'}`}>
                              <I.Warning className="w-2.5 h-2.5"/>
                              <span className="text-slate-600 font-bold uppercase text-[7px]">Dead-Line </span>
                              {fmtCell(match.vessel.deadLineStr)}
                              {isExpiredStr(match.vessel.deadLineStr) && <span className="text-[6px] font-black text-red-500 uppercase">(VENCIDO)</span>}
                            </span>
                          )}
                          {(match.vessel.gateDry || match.vessel.gateReefer) && (
                            <span className={`text-[8px] font-black flex items-center gap-1 ${isExpiredStr(match.vessel.gateDry || match.vessel.gateReefer) ? 'text-slate-500' : 'text-green-400'}`}>
                              <I.Check className="w-2.5 h-2.5"/>
                              <span className="text-slate-600 font-bold uppercase text-[7px]">Abert. Gate </span>
                              {fmtCell(match.vessel.gateDry || match.vessel.gateReefer)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Trips list — exibida somente quando expandido */}
                      {expandedVessels.has(idx) && (
                      <div className="space-y-1.5 pl-2">
                        {match.matchedTrips.map((t, ti) => {
                          const isScheduled = t.isScheduled || t.status === 'Agendamento realizado';
                          const hasMinuta = !!t.preStackingFormData;
                          const tc = getTripTypeStyle(t.type);
                          return (
                            <button key={ti} onClick={e => { e.stopPropagation(); setDetailTrip(t); }}
                              className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all hover:brightness-125 cursor-pointer ${isScheduled ? 'border-green-900/30 bg-green-950/10' : 'border-slate-800 bg-slate-900/40'}`}>
                              {/* Indicador de status */}
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${isScheduled ? 'bg-green-500' : 'bg-red-500'}`}/>

                              {/* Informações da viagem */}
                              <div className="flex-1 min-w-0 space-y-1">
                                {/* Linha 1: OS + container + motorista */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[9px] font-black text-slate-200 uppercase">{t.os}</span>
                                  {t.container && (
                                    <span className="text-[7px] font-bold text-slate-500 border border-slate-700 rounded px-1">{t.container}</span>
                                  )}
                                  <span className="text-[8px] text-slate-500 truncate">{t.driver?.name}</span>
                                </div>
                                {/* Linha 2: tipo (colorido) + categoria + minuta badge */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {t.type && (
                                    <span className={`inline-flex items-center gap-1 text-[7px] font-black uppercase rounded px-1.5 py-0.5 border ${tc.bg} ${tc.text} ${tc.border}`}>
                                      <I.Tag className="w-2 h-2"/>{t.type}
                                    </span>
                                  )}
                                  {t.category && (
                                    <span className="inline-flex items-center text-[7px] font-bold uppercase rounded px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/40">
                                      {t.category}
                                    </span>
                                  )}
                                  {hasMinuta && (
                                    <span className="text-[6px] font-black text-blue-400 border border-blue-800 rounded px-1 py-0.5">Minuta</span>
                                  )}
                                  <span className="text-[7px] text-slate-600">{t.status}</span>
                                </div>
                                {/* Local + data/hora do agendamento */}
                                {isScheduled && (t.scheduling?.location || t.destination?.name) && (
                                  <div className="flex items-center gap-1.5 text-[7px] flex-wrap">
                                    <I.Pin className="w-2.5 h-2.5 text-emerald-500 shrink-0"/>
                                    <span className="text-emerald-400 font-black truncate max-w-[14rem]">
                                      {t.scheduling?.location || t.destination?.name}
                                    </span>
                                    {(t.scheduling?.dateTime || t.scheduledDateTime) && (
                                      <span className="text-slate-500 font-bold shrink-0">
                                        {fmtDT(t.scheduling?.dateTime || t.scheduledDateTime)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Status agendamento + seta */}
                              <div className="shrink-0 flex flex-col items-end gap-1 ml-2">
                                {isScheduled
                                  ? <span className="flex items-center gap-1 text-[7px] font-black text-green-500">
                                      <I.Check className="w-2.5 h-2.5"/> Agendado
                                    </span>
                                  : <span className="flex items-center gap-1 text-[7px] font-black text-amber-400">
                                      <I.Warning className="w-2.5 h-2.5"/> Pendente
                                    </span>}
                                <I.ChevD className="w-3 h-3 text-slate-700 rotate-[-90deg]"/>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      )}
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
