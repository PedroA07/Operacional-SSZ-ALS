import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Trip, User, Devolucao, Customer } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import DatePicker from '../../shared/DatePicker';
import ImageViewer from '../../shared/ImageViewer';
import { db } from '../../../utils/storage';
import { osCategoryService } from '../../../utils/osCategoryService';

interface Category { id: string; name: string; color?: string; }

interface ExternalPortalProps {
  user: User;
  trips: Trip[];
  devolucoes?: Devolucao[];
  customers?: Customer[];
  categories?: Category[];
  onInserted?: () => void;
  onRefresh?: () => Promise<void>;
}

const getLocalDateStr = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* Strip diacritics for accent-safe type matching */
const norm = (s: string) =>
  s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const matchesPage = (rawType: string, pageKey: string): boolean => {
  const t = norm(rawType);
  switch (pageKey) {
    case 'orgColeta':
      return !t.includes('DEVOLU') && (t.includes('COLETA') || t.includes('CABOTAG') || t.includes('EXPORTA'));
    case 'orgEntrega':
      return !t.includes('DEVOLU') && (t.includes('ENTREGA') || t.includes('IMPORTA'));
    case 'orgColetaEntrega':
      return !t.includes('DEVOLU');
    case 'orgDevolucoes':
      return t.includes('DEVOLU');
    default:
      return true;
  }
};

const PAGE_LABELS: Record<string, { label: string; color: string; activeClass: string }> = {
  orgColeta:        { label: 'Coleta / Export',      color: 'blue',    activeClass: 'bg-white text-blue-600 shadow-sm' },
  orgEntrega:       { label: 'Entrega / Import',     color: 'emerald', activeClass: 'bg-white text-emerald-600 shadow-sm' },
  orgColetaEntrega: { label: 'Coleta + Entrega',     color: 'indigo',  activeClass: 'bg-white text-indigo-600 shadow-sm' },
  orgDevolucoes:    { label: 'Devoluções',            color: 'orange',  activeClass: 'bg-white text-orange-600 shadow-sm' },
  emissoes:         { label: 'Emissões',              color: 'purple',  activeClass: 'bg-white text-purple-600 shadow-sm' },
};

const normContainer = (s: string) => s.toUpperCase().replace(/\s/g, '');

function SmartCategorySelect({ categories, value, onChange }: { categories: Category[]; value: string; onChange: (v: string) => void; }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = categories.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  const selected = categories.find(c => c.name === value);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all">
        {selected ? (
          <><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color || '#94a3b8' }} /><span className="text-sm font-bold text-slate-700 uppercase flex-1">{selected.name}</span></>
        ) : <span className="text-sm text-slate-400 flex-1">Selecionar categoria...</span>}
        <svg className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar categoria..."
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus onClick={e => e.stopPropagation()} />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4">Nenhuma categoria encontrada</p>}
            {filtered.map(c => (
              <button key={c.id} type="button" onClick={() => { onChange(c.name); setOpen(false); setQ(''); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${value === c.name ? 'bg-blue-50' : ''}`}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#94a3b8' }} />
                <span className="text-sm font-bold text-slate-700 uppercase">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ExternalPortal: React.FC<ExternalPortalProps> = ({ user, trips, devolucoes = [], customers = [], categories = [], onInserted, onRefresh }) => {
  const todayLocal = getLocalDateStr();

  const [startDate, setStartDate]   = useState<string>(todayLocal);
  const [endDate, setEndDate]       = useState<string>(todayLocal);
  const [searchQuery, setSearchQuery] = useState<string>('');

  /* ── Document viewer state ──────────────────────────────────── */
  const [viewingDoc, setViewingDoc] = useState<{ url: string; fileName: string } | null>(null);

  const handleDownloadDoc = async (url: string, fileName: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  /* ── Insert form state ───────────────────────────────────────── */
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertForm, setInsertForm] = useState({
    container: '', local: '', dateTime: '', os: '', customerSearch: '', selectedCustomerId: '',
  });
  const [insertSaving, setInsertSaving] = useState(false);
  const [insertError, setInsertError]   = useState('');
  const [insertSuccess, setInsertSuccess] = useState(false);

  const canInsertDevolucao = !!(user.thirdPartyConfig?.allowInsertDevolucao && user.thirdPartyConfig?.pages?.orgDevolucoes?.enabled);

  /* ── Emissões state ─────────────────────────────────────────── */
  type EmissoesSubTab = 'TODOS' | 'PEND_DOC' | 'PEND_CTE' | 'CONCLUIDOS';
  const [emissoesSubTab, setEmissoesSubTab] = useState<EmissoesSubTab>('TODOS');
  const [emissCatFilter, setEmissCatFilter] = useState<string[]>([]);
  const [emissCatOpen, setEmissCatOpen] = useState(false);
  const emissCatRef = useRef<HTMLDivElement>(null);
  const [emissPendingUpdates, setEmissPendingUpdates] = useState<Record<string, { data: Partial<Trip>; timestamp: number }>>({});
  const [emissCteEditId, setEmissCteEditId] = useState<string | null>(null);
  const [emissCteVal, setEmissCteVal] = useState('');
  const [emissObsEditId, setEmissObsEditId] = useState<string | null>(null);
  const [emissObsVal, setEmissObsVal] = useState('');
  const [emissInsertModal, setEmissInsertModal] = useState(false);
  const [emissInsertOs, setEmissInsertOs] = useState('');
  const [emissInsertCat, setEmissInsertCat] = useState('');
  const [emissInsertCatDetected, setEmissInsertCatDetected] = useState<string | null>(null);
  const [emissUserChoseCat, setEmissUserChoseCat] = useState(false);
  const [emissInsertLoading, setEmissInsertLoading] = useState(false);
  const EMISS_STABILITY = 30000;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (emissCatRef.current && !emissCatRef.current.contains(e.target as Node)) setEmissCatOpen(false);
    };
    if (emissCatOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [emissCatOpen]);

  const emissEffectiveTrips = useMemo(() => {
    const now = Date.now();
    return trips.map(t => {
      const p = emissPendingUpdates[t.id];
      if (p && now - p.timestamp < EMISS_STABILITY) return { ...t, ...p.data };
      return t;
    });
  }, [trips, emissPendingUpdates]);

  const emissIsBeforeToday = useCallback((t: Trip) => {
    if (!t.dateTime) return false;
    const raw = t.dateTime.includes('T') ? t.dateTime : t.dateTime.replace(' ', 'T');
    const tripDate = raw.split('T')[0];
    const normalized = tripDate.includes('/') ? tripDate.split('/').reverse().join('-') : tripDate;
    return normalized < todayLocal;
  }, [todayLocal]);

  const emissIsConcluido = useCallback((t: Trip) =>
    emissIsBeforeToday(t) || (!!t.coletaDocGenerated && !!t.emissaoCteNumber),
  [emissIsBeforeToday]);

  const emissFiltered = useMemo(() => {
    let base = emissEffectiveTrips;
    const allowed = user.thirdPartyConfig?.allowedCustomers;
    if (allowed?.length) base = base.filter(t => allowed.includes(t.customer?.id || ''));
    if (emissCatFilter.length) base = base.filter(t => emissCatFilter.includes(t.category));
    return base;
  }, [emissEffectiveTrips, user.thirdPartyConfig, emissCatFilter]);

  const emissCounts = useMemo(() => ({
    all:     emissFiltered.length,
    pendDoc: emissFiltered.filter(t => !emissIsConcluido(t) && !t.coletaDocGenerated).length,
    pendCte: emissFiltered.filter(t => !emissIsConcluido(t) && !!t.coletaDocGenerated && !t.emissaoCteNumber).length,
    done:    emissFiltered.filter(t => emissIsConcluido(t)).length,
  }), [emissFiltered, emissIsConcluido]);

  const emissDisplayTrips = useMemo(() => {
    switch (emissoesSubTab) {
      case 'PEND_DOC':   return emissFiltered.filter(t => !emissIsConcluido(t) && !t.coletaDocGenerated);
      case 'PEND_CTE':   return emissFiltered.filter(t => !emissIsConcluido(t) && !!t.coletaDocGenerated && !t.emissaoCteNumber);
      case 'CONCLUIDOS': return emissFiltered.filter(t => emissIsConcluido(t));
      default:           return emissFiltered;
    }
  }, [emissFiltered, emissoesSubTab, emissIsConcluido]);

  const emissHandleUpdate = useCallback(async (trip: Trip, data: Partial<Trip>) => {
    setEmissPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { data: { ...(prev[trip.id]?.data || {}), ...data }, timestamp: Date.now() },
    }));
    try {
      await db.saveTrip({ ...trip, ...data });
    } catch {
      setEmissPendingUpdates(prev => { const n = { ...prev }; delete n[trip.id]; return n; });
    }
  }, []);

  const emissSaveCte = useCallback(async (t: Trip) => {
    await emissHandleUpdate(t, { emissaoCteNumber: emissCteVal.trim() || undefined });
    setEmissCteEditId(null);
  }, [emissHandleUpdate, emissCteVal]);

  const emissSaveObs = useCallback(async (t: Trip) => {
    await emissHandleUpdate(t, { emissaoObservacoes: emissObsVal.trim() || undefined });
    setEmissObsEditId(null);
  }, [emissHandleUpdate, emissObsVal]);

  const emissCloseModal = useCallback(() => {
    setEmissInsertModal(false);
    setEmissInsertOs('');
    setEmissInsertCat('');
    setEmissInsertCatDetected(null);
    setEmissUserChoseCat(false);
  }, []);

  const emissHandleOsChange = useCallback((value: string) => {
    setEmissInsertOs(value);
    if (!emissUserChoseCat) {
      const detected = osCategoryService.detectCategoryFromOS(value);
      setEmissInsertCatDetected(detected);
      if (detected) {
        const matched = categories.find(c => c.name.toLowerCase() === detected.toLowerCase());
        setEmissInsertCat(matched?.name || detected);
      } else {
        setEmissInsertCat('');
      }
    }
  }, [emissUserChoseCat, categories]);

  const emissHandleInsert = async () => {
    if (!emissInsertOs.trim() || !emissInsertCat) return;
    setEmissInsertLoading(true);
    try {
      const newTrip: Trip = {
        id: `new-${Date.now()}`,
        os: emissInsertOs.trim().toUpperCase(),
        booking: '', ship: '',
        dateTime: new Date().toISOString(),
        isLate: false,
        type: 'EXPORTAÇÃO',
        category: emissInsertCat,
        container: '',
        customer: { id: '', name: '', cnpj: '', city: '' },
        driver: { id: '', name: '', plateHorse: '', plateTrailer: '', status: '' },
        status: 'Pendente',
        statusHistory: [],
        balancePayment: { status: 'AGUARDANDO_DOCS' } as any,
        advancePayment: { status: 'BLOQUEADO' } as any,
        coletaEmissaoSolicitada: true,
      };
      await db.saveTrip(newTrip);
      await onRefresh?.();
      emissCloseModal();
    } catch (e) {
      console.error('Emissões insert error:', e);
    } finally {
      setEmissInsertLoading(false);
    }
  };

  const emissGetRowStyle = useCallback((t: Trip): React.CSSProperties => {
    if (emissIsConcluido(t)) return { backgroundColor: 'rgba(16,185,129,0.08)', borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#10b981' };
    if (t.coletaDocGenerated) return { backgroundColor: 'rgba(234,179,8,0.06)', borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#eab308' };
    return { borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#e2e8f0' };
  }, [emissIsConcluido]);

  const emissColumns = useMemo(() => [
    {
      key: 'dateTime', label: 'Data/Hora',
      sortValue: (t: Trip) => t.dateTime || '',
      render: (t: Trip) => {
        if (!t.dateTime) return <span className="text-slate-300 text-[9px]">—</span>;
        try {
          const raw = t.dateTime.includes('T') ? t.dateTime : t.dateTime.replace(' ', 'T');
          const d = new Date(raw);
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-700">{d.toLocaleDateString('pt-BR')}</span>
              <span className="text-[8px] text-slate-400">{d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        } catch { return <span className="text-[9px] text-slate-400">{t.dateTime}</span>; }
      },
    },
    {
      key: 'os', label: 'OS',
      sortValue: (t: Trip) => t.os,
      render: (t: Trip) => (
        <div className="flex flex-col gap-1">
          <span className="font-black text-[10px] text-slate-900">{t.os}</span>
          {t.type && <span className="text-[7px] px-1.5 py-0.5 rounded font-black border w-fit uppercase bg-slate-50 text-slate-500 border-slate-200">{t.type}</span>}
        </div>
      ),
    },
    {
      key: 'category', label: 'Categoria',
      sortValue: (t: Trip) => t.category || '',
      render: (t: Trip) => {
        const cat = categories.find(c => c.name?.toUpperCase() === t.category?.toUpperCase());
        const color = cat?.color;
        return (
          <span className="text-[8px] font-black uppercase px-2 py-1 rounded border w-fit whitespace-nowrap"
            style={color ? { backgroundColor: `${color}25`, color, borderColor: `${color}60` } : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}>
            {t.category || '—'}
          </span>
        );
      },
    },
    {
      key: 'coletaDocGenerated', label: 'Doc Originário', sortable: false,
      render: (t: Trip) => {
        const checked = !!t.coletaDocGenerated;
        return (
          <button type="button" onClick={() => emissHandleUpdate(t, { coletaDocGenerated: !checked })}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl border-2 transition-all duration-150 cursor-pointer active:scale-90 hover:scale-105 ${checked ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-white border-slate-200 text-slate-300'}`}>
            {checked && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow ring-2 ring-white">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7"/></svg>
              </span>
            )}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </button>
        );
      },
    },
    {
      key: 'cte', label: 'CT-E', sortable: false,
      render: (t: Trip) => {
        if (emissCteEditId === t.id) {
          return (
            <div className="flex items-center gap-1">
              <input value={emissCteVal} onChange={e => setEmissCteVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') emissSaveCte(t); if (e.key === 'Escape') setEmissCteEditId(null); }}
                className="w-28 px-2 py-1 text-[9px] border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white" autoFocus placeholder="Nº CT-E" />
              <button type="button" onClick={() => emissSaveCte(t)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Salvar">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
              </button>
              <button type="button" onClick={() => setEmissCteEditId(null)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          );
        }
        return t.emissaoCteNumber ? (
          <button type="button" onClick={() => { setEmissCteEditId(t.id); setEmissCteVal(t.emissaoCteNumber || ''); }}
            className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[8px] font-black border border-blue-200 hover:bg-blue-100 transition-all">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {t.emissaoCteNumber}
          </button>
        ) : (
          <button type="button" onClick={() => { setEmissCteEditId(t.id); setEmissCteVal(''); }}
            className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[8px] font-black border border-dashed border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
            CT-E
          </button>
        );
      },
    },
    {
      key: 'observacoes', label: 'Observações', sortable: false,
      render: (t: Trip) => {
        if (emissObsEditId === t.id) {
          return (
            <div className="flex flex-col gap-1.5">
              <textarea value={emissObsVal} onChange={e => setEmissObsVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setEmissObsEditId(null); }}
                className="w-40 px-2 py-1.5 text-[9px] border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white resize-none" rows={3} autoFocus placeholder="Observações..." />
              <div className="flex gap-1">
                <button type="button" onClick={() => emissSaveObs(t)} className="flex-1 py-0.5 bg-blue-600 text-white rounded-lg text-[8px] font-black hover:bg-blue-700 transition-colors">Salvar</button>
                <button type="button" onClick={() => setEmissObsEditId(null)} className="flex-1 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black hover:bg-slate-200 transition-colors">Cancelar</button>
              </div>
            </div>
          );
        }
        return (
          <button type="button" onClick={() => { setEmissObsEditId(t.id); setEmissObsVal(t.emissaoObservacoes || ''); }}
            className="text-left text-[9px] rounded-lg p-1.5 w-full max-w-[160px] hover:bg-slate-50 transition-colors">
            {t.emissaoObservacoes
              ? <span className="text-slate-700 line-clamp-2">{t.emissaoObservacoes}</span>
              : <span className="text-slate-300 italic">+ observação</span>}
          </button>
        );
      },
    },
  ], [categories, emissHandleUpdate, emissCteEditId, emissCteVal, emissSaveCte, emissObsEditId, emissObsVal, emissSaveObs]);

  /* Customers available to this user (filtered by allowedCustomers if set) */
  const availableCustomers = useMemo(() => {
    const allowed = user.thirdPartyConfig?.allowedCustomers;
    if (!allowed?.length) return customers;
    return customers.filter(c => allowed.some(a => a.trim().toLowerCase() === (c.name || '').trim().toLowerCase()));
  }, [customers, user.thirdPartyConfig]);

  const filteredInsertCustomers = useMemo(() => {
    if (!insertForm.customerSearch.trim()) return availableCustomers;
    const q = insertForm.customerSearch.toLowerCase();
    return availableCustomers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.legalName?.toLowerCase().includes(q) ||
      c.cnpj?.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  }, [availableCustomers, insertForm.customerSearch]);

  /* Match container + optional customer against existing trips */
  const matchTripForInsertion = (containerRaw: string, customerId: string): Trip | null => {
    const ctrNorm = normContainer(containerRaw);
    if (!ctrNorm) return null;
    return trips.find(t => {
      const tCtr = normContainer(t.container || '');
      if (tCtr !== ctrNorm) return false;
      if (customerId) {
        const selectedC = customers.find(c => c.id === customerId);
        if (selectedC) {
          const cnpjMatch = selectedC.cnpj && t.customer?.cnpj &&
            selectedC.cnpj.replace(/\D/g, '') === t.customer.cnpj.replace(/\D/g, '');
          const nameMatch = (selectedC.name || '').trim().toLowerCase() === (t.customer?.name || '').trim().toLowerCase();
          return cnpjMatch || nameMatch;
        }
      }
      return true;
    }) ?? null;
  };

  const handleInsertSubmit = async () => {
    if (!insertForm.container.trim()) {
      setInsertError('O número do container é obrigatório.');
      return;
    }
    setInsertSaving(true);
    setInsertError('');
    try {
      const matched = matchTripForInsertion(insertForm.container, insertForm.selectedCustomerId);
      const selectedCustomer = customers.find(c => c.id === insertForm.selectedCustomerId);

      const customer = matched?.customer || (selectedCustomer ? {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        legalName: selectedCustomer.legalName,
        cnpj: selectedCustomer.cnpj,
        city: selectedCustomer.city,
        state: selectedCustomer.state,
      } : undefined);

      const newDev: Devolucao = {
        id: crypto.randomUUID(),
        os: insertForm.os.trim() || matched?.os || `DEV-${Date.now()}`,
        container: normContainer(insertForm.container),
        local: insertForm.local.trim() || undefined,
        booking: matched?.booking || undefined,
        ship: matched?.ship || undefined,
        customer,
        status: 'Pendente',
        scheduledDateTime: insertForm.dateTime ? new Date(insertForm.dateTime).toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };

      await db.saveDevolucao(newDev);
      setInsertSuccess(true);
      setInsertForm({ container: '', local: '', dateTime: '', os: '', customerSearch: '', selectedCustomerId: '' });
      onInserted?.();
      setTimeout(() => { setShowInsertModal(false); setInsertSuccess(false); }, 1800);
    } catch {
      setInsertError('Erro ao salvar. Tente novamente.');
    } finally {
      setInsertSaving(false);
    }
  };

  /* Which pages are enabled for this user */
  const enabledPages = useMemo(() => {
    const pages = user.thirdPartyConfig?.pages;
    if (!pages) return [];
    return (['orgColeta', 'orgEntrega', 'orgColetaEntrega', 'orgDevolucoes', 'emissoes'] as const).filter(k => pages[k]?.enabled);
  }, [user.thirdPartyConfig]);

  const [activePage, setActivePage] = useState<string>(() => enabledPages[0] || '');

  /* Legacy mode: no page config → use allowedCategories/allowedTypes + global visibleFields */
  const isLegacyMode = enabledPages.length === 0;
  const legacyFields = user.thirdPartyConfig?.visibleFields ||
    ['os', 'container', 'status', 'dateTime', 'driver', 'customer', 'destination', 'category', 'type'];

  /* Current page fields */
  const currentPageKey = enabledPages.includes(activePage as any) ? activePage : (enabledPages[0] || '');
  const currentPageFields: string[] = isLegacyMode
    ? legacyFields
    : (user.thirdPartyConfig?.pages?.[currentPageKey as keyof typeof user.thirdPartyConfig.pages]?.visibleFields || []);

  /* Base trip filtering (date + search + legacy allowedCategories/Types + global data filters) */
  const baseFiltered = useMemo(() => {
    const cfg = user.thirdPartyConfig;
    const allowedContainerTypes = cfg?.allowedContainerTypes;
    const allowedStatuses       = cfg?.allowedStatuses;
    const allowedCustomers      = cfg?.allowedCustomers;

    let result = trips.filter(trip => {
      if (isLegacyMode) {
        const allowedCategories = cfg?.allowedCategories;
        const allowedTypes      = cfg?.allowedTypes;
        if (allowedCategories?.length) {
          const cat = (trip.category || '').trim().toLowerCase();
          if (!allowedCategories.some(c => c.trim().toLowerCase() === cat)) return false;
        }
        if (allowedTypes?.length) {
          const typ = (trip.type || '').trim().toLowerCase();
          if (!allowedTypes.some(t => t.trim().toLowerCase() === typ)) return false;
        }
      }

      /* Global data filters — apply in all modes */
      if (allowedContainerTypes?.length) {
        if (!allowedContainerTypes.includes(trip.containerType || '')) return false;
      }
      if (allowedStatuses?.length) {
        const currentStatus = trip.status || '';
        if (!allowedStatuses.some(s => s.toLowerCase() === currentStatus.toLowerCase())) return false;
      }
      if (allowedCustomers?.length) {
        const customerName = (trip.customer?.name || '').trim().toLowerCase();
        if (!allowedCustomers.some(c => c.trim().toLowerCase() === customerName)) return false;
      }

      if (!trip.dateTime) return false;
      const ds = trip.dateTime.includes('T') ? trip.dateTime.split('T')[0] : trip.dateTime;
      let norm2 = ds;
      if (ds.includes('/')) {
        const [d, m, y] = ds.split('/');
        norm2 = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      if (startDate && norm2 < startDate) return false;
      if (endDate && norm2 > endDate) return false;
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.os.toLowerCase().includes(q) ||
        (t.container && t.container.toLowerCase().includes(q)) ||
        (t.driver?.name && t.driver.name.toLowerCase().includes(q)) ||
        (t.customer?.name && t.customer.name.toLowerCase().includes(q)) ||
        (t.destination?.name && t.destination.name.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips, user.thirdPartyConfig, startDate, endDate, searchQuery, isLegacyMode]);

  /* Page-filtered trips */
  const filteredTrips = useMemo(() => {
    if (isLegacyMode) return baseFiltered;
    return baseFiltered.filter(t => matchesPage(t.type || '', currentPageKey));
  }, [baseFiltered, isLegacyMode, currentPageKey]);

  /* Devoluções filtered for the orgDevolucoes page */
  const filteredDevolucoes = useMemo(() => {
    const cfg = user.thirdPartyConfig;
    const allowedCustomers = cfg?.allowedCustomers;
    return devolucoes.filter(d => {
      if (allowedCustomers?.length) {
        const name = (d.customer?.name || '').trim().toLowerCase();
        if (!allowedCustomers.some(c => c.trim().toLowerCase() === name)) return false;
      }
      return true;
    });
  }, [devolucoes, user.thirdPartyConfig]);

  /* ── Column builders ────────────────────────────────────────── */
  const renderLocation = (loc: any) => {
    if (!loc) return <span className="text-[9px] text-slate-300 italic">—</span>;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-black text-slate-800 text-[10px] uppercase leading-tight">{loc.name || '---'}</span>
        {loc.legalName && <span className="text-[9px] text-slate-400 uppercase leading-tight">{loc.legalName}</span>}
        {loc.cnpj && <span className="text-[9px] text-slate-400">CNPJ: {loc.cnpj}</span>}
        {(loc.city || loc.state) && <span className="text-[8px] text-slate-400 uppercase mt-0.5">{[loc.city, loc.state].filter(Boolean).join(' - ')}</span>}
      </div>
    );
  };

  const columns = useMemo(() => {
    const fields = currentPageFields;
    const isDevPage = currentPageKey === 'orgDevolucoes';

    /* Devoluções-specific columns — data comes from Devolucao type */
    if (isDevPage) {
      const devCols = [
        fields.includes('container') && {
          key: 'container', label: 'Container',
          sortValue: (d: Devolucao) => d.container || '',
          render: (d: Devolucao) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-black text-blue-600 uppercase">{d.container || <span className="text-slate-300 italic font-normal text-[9px]">—</span>}</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase">{d.os}</span>
            </div>
          ),
        },
        fields.includes('destination') && {
          key: 'destination', label: 'Local / Depósito',
          sortValue: (d: Devolucao) => d.local || '',
          render: (d: Devolucao) => d.local
            ? <span className="font-black text-slate-800 text-[10px] uppercase">{d.local}</span>
            : <span className="text-[9px] text-slate-300 italic">—</span>,
        },
        fields.includes('driver') && {
          key: 'driver', label: 'Motorista',
          sortValue: (d: Devolucao) => d.driver?.name || '',
          render: (d: Devolucao) => (
            <div className="flex flex-col gap-0.5">
              <span className="font-black text-slate-800 text-[10px] uppercase">{d.driver?.name || <span className="text-slate-300 italic font-normal">—</span>}</span>
              {d.driver?.plateHorse && <span className="px-1.5 py-0.5 bg-slate-800 text-white rounded-md text-[8px] font-black w-fit">{d.driver.plateHorse}</span>}
            </div>
          ),
        },
        fields.includes('scheduledDateTime') && {
          key: 'scheduledDateTime', label: 'Agendamento',
          sortValue: (d: Devolucao) => d.scheduledDateTime || '',
          render: (d: Devolucao) => {
            if (!d.scheduledDateTime) return <span className="text-[9px] text-slate-300 italic">—</span>;
            try {
              const dt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d.scheduledDateTime));
              return <span className="px-2 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-[9px] font-black">{dt}</span>;
            } catch { return d.scheduledDateTime; }
          },
        },
        fields.includes('agendamentoDoc') && {
          key: 'agendamentoDoc', label: 'Comprovante',
          render: (d: Devolucao) => d.agendamentoDoc
            ? <button
                onClick={() => setViewingDoc({ url: d.agendamentoDoc!.url, fileName: d.agendamentoDoc!.fileName || 'comprovante' })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[8px] font-black text-emerald-700 hover:bg-emerald-100 transition-colors active:scale-95"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Ver
              </button>
            : <span className="text-[9px] text-slate-300 italic">—</span>,
        },
      ].filter(Boolean) as any[];
      return devCols;
    }

    /* Standard columns for Coleta / Entrega */
    const all = [
      {
        key: 'dateTime', label: 'Data',
        render: (t: Trip) => {
          if (!t.dateTime) return <span className="text-slate-300">—</span>;
          try {
            const d = new Date(t.dateTime);
            const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
            const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
            const ds = t.dateTime.includes('T') ? t.dateTime.split('T')[0] : t.dateTime.split(' ')[0];
            let norm2 = ds;
            if (ds.includes('/')) { const [dy, mo, yr] = ds.split('/'); norm2 = `${yr}-${mo?.padStart(2,'0')}-${dy?.padStart(2,'0')}`; }
            const isPast = norm2 < todayLocal; const isToday2 = norm2 === todayLocal;
            return (
              <div className="flex flex-col gap-1">
                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-lg w-fit ${isPast ? 'bg-red-50 text-red-600' : isToday2 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                  <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  {date}
                </span>
                <span className="text-[9px] text-slate-400 font-bold pl-1">{time}</span>
              </div>
            );
          } catch { return t.dateTime; }
        },
      },
      {
        key: 'os', label: 'Identificação',
        sortValue: (t: Trip) => t.os,
        render: (t: Trip) => {
          const showCat = fields.includes('category'); const showType = fields.includes('type');
          return (
            <div className="flex flex-col gap-1.5">
              <span className="font-black text-slate-900 text-[11px] tracking-tight">{t.os}</span>
              {(showCat || showType) && (
                <div className="flex flex-wrap gap-1">
                  {showCat && t.category && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase border border-indigo-100">{t.category}</span>}
                  {showType && t.type && <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded-md text-[8px] font-black uppercase border border-violet-100">{t.type}</span>}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'container', label: 'Equipamento',
        sortValue: (t: Trip) => t.container || '',
        render: (t: Trip) => (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-blue-600 uppercase tracking-wide">
              {t.container || <span className="text-slate-300 italic font-normal text-[9px]">Sem container</span>}
            </span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {t.containerType && <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[8px] font-bold text-slate-500">{t.containerType}</span>}
              {t.tara && <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[8px] font-bold text-slate-500">TARA {t.tara}</span>}
              {t.seal && <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded-md text-[8px] font-bold text-amber-700">🔒 {t.seal}</span>}
            </div>
          </div>
        ),
      },
      {
        key: 'status', label: 'Status',
        sortValue: (t: Trip) => t.status || '',
        render: (t: Trip) => {
          const history = t.statusHistory;
          if (!history?.length) return <span className="text-[9px] font-bold text-slate-400 uppercase italic">—</span>;
          const sorted = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const isCompleted = t.isCompleted || sorted[0]?.status === 'Viagem concluída';
          const getStyle = (status: string, isLatest: boolean) => {
            if (status === 'Viagem concluída' || isCompleted)
              return isLatest ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 border-emerald-400 scale-[1.03]' : 'bg-emerald-50 text-emerald-600 border-emerald-100';
            if (status === 'Viagem cancelada')
              return isLatest ? 'bg-red-500 text-white shadow-sm shadow-red-200 border-red-400' : 'bg-red-50 text-red-500 border-red-100';
            return isLatest ? 'bg-blue-500 text-white shadow-sm shadow-blue-200 border-blue-400 scale-[1.03]' : 'bg-slate-50 text-slate-400 border-slate-100';
          };
          return (
            <div className="flex flex-col gap-1 py-0.5">
              {sorted.map((entry, idx) => (
                <div key={idx} className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-wide transition-all ${getStyle(entry.status, idx === 0)}`}>
                  {entry.status}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        key: 'driver', label: 'Motorista',
        sortValue: (t: Trip) => t.driver?.name || '',
        render: (t: Trip) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-black text-slate-800 text-[10px] uppercase leading-tight">{t.driver?.name || <span className="text-slate-300 italic font-normal">—</span>}</span>
            {t.driver?.cpf && <span className="text-[8px] text-slate-400 font-mono">CPF {t.driver.cpf}</span>}
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {t.driver?.plateHorse && <span className="px-1.5 py-0.5 bg-slate-800 text-white rounded-md text-[8px] font-black tracking-widest">{t.driver.plateHorse}</span>}
              {t.driver?.plateTrailer && <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[8px] font-black tracking-widest">{t.driver.plateTrailer}</span>}
            </div>
          </div>
        ),
      },
      { key: 'customer',    label: 'Local de Atendimento', sortValue: (t: Trip) => t.customer?.name || '',    render: (t: Trip) => renderLocation(t.customer) },
      { key: 'destination', label: 'Destino',              sortValue: (t: Trip) => t.destination?.name || '', render: (t: Trip) => renderLocation(t.destination) },
      {
        key: 'scheduling', label: 'Agendamento',
        sortValue: (t: Trip) => t.scheduling?.dateTime || '',
        render: (t: Trip) => {
          const s = t.scheduling;
          if (!s) return <span className="text-[9px] text-slate-300 italic">—</span>;
          let fDate = '', fTime = '';
          if (s.dateTime) { try { const d = new Date(s.dateTime); fDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d); fTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d); } catch {} }
          return (
            <div className="flex flex-col gap-1">
              {s.location && <span className="font-black text-slate-800 text-[10px] uppercase leading-tight">{s.location}</span>}
              {fDate && <div className="flex items-center gap-1 flex-wrap"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[8px] font-black">{fDate}</span>{fTime && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-bold">{fTime}</span>}</div>}
              {s.obs && <span className="text-[8px] text-slate-400 italic leading-tight mt-0.5">{s.obs}</span>}
            </div>
          );
        },
      },
    ];

    return all.filter(col => {
      if (col.key === 'category' || col.key === 'type') return false;
      return fields.includes(col.key);
    });
  }, [currentPageFields, currentPageKey, todayLocal]);

  /* Stats */
  const stats = useMemo(() => {
    const all = currentPageKey === 'orgDevolucoes' ? [] : filteredTrips;
    const today = all.filter(t => {
      const ds = t.dateTime?.includes('T') ? t.dateTime.split('T')[0] : t.dateTime?.split(' ')[0] || '';
      let n = ds;
      if (ds.includes('/')) { const p = ds.split('/'); n = p.length === 3 ? `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` : ds; }
      return n === todayLocal;
    }).length;
    const completed = all.filter(t => t.isCompleted || t.status === 'Viagem concluída').length;
    const pending   = all.filter(t => !t.isCompleted && t.status !== 'Viagem cancelada').length;
    return { total: all.length, today, completed, pending };
  }, [filteredTrips, todayLocal]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Portal de Viagens</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Acompanhamento de Operações em Tempo Real</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar OS, container, motorista..."
                  className="w-full sm:w-64 pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <DatePicker value={startDate} onChange={setStartDate} placeholder="Data início..." maxDate={endDate || undefined} className="w-36" inputClassName="py-2 text-[10px]"/>
                <span className="text-[9px] font-black text-slate-300">→</span>
                <DatePicker value={endDate} onChange={setEndDate} placeholder="Data fim..." minDate={startDate || undefined} className="w-36" inputClassName="py-2 text-[10px]"/>
              </div>
            </div>
          </div>

          {/* Page tabs — only shown when pages are configured */}
          {enabledPages.length > 1 && (
            <div className="mt-3 flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
              {enabledPages.map(pk => {
                const info = PAGE_LABELS[pk];
                const isActive = pk === currentPageKey;
                return (
                  <button
                    key={pk}
                    onClick={() => setActivePage(pk)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? info.activeClass : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="px-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { count: stats.total,     label: 'Total',        bg: 'bg-blue-100',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', iconColor: 'text-blue-600' },
            { count: stats.completed, label: 'Concluídas',   bg: 'bg-emerald-100', icon: 'M5 13l4 4L19 7',                                                                                                                      iconColor: 'text-emerald-600' },
            { count: stats.pending,   label: 'Em Andamento', bg: 'bg-amber-100',   icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                                                                                      iconColor: 'text-amber-600' },
            { count: stats.today,     label: 'Hoje',         bg: 'bg-indigo-100',  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',                                        iconColor: 'text-indigo-600' },
          ].map(({ count, label, bg, icon, iconColor }) => (
            <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                <svg className={`w-4 h-4 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={icon}/></svg>
              </div>
              <div>
                <p className="text-[18px] font-black text-slate-900 leading-none">{count}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">

        {/* ── Emissões page ─────────────────────────────────────────── */}
        {currentPageKey === 'emissoes' ? (
          <>
            {/* Header row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Emissões</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Documentos originários e CT-Es</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Category filter */}
                <div ref={emissCatRef} className="relative">
                  <button onClick={() => setEmissCatOpen(v => !v)}
                    className={`flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${emissCatOpen || emissCatFilter.length > 0 ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
                    Categorias{emissCatFilter.length > 0 ? ` (${emissCatFilter.length})` : ''}
                  </button>
                  {emissCatOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 w-60">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filtrar por Categoria</span>
                        {emissCatFilter.length > 0 && (
                          <button onClick={() => setEmissCatFilter([])} className="text-[8px] text-red-500 hover:text-red-700 font-black uppercase transition-colors">Limpar</button>
                        )}
                      </div>
                      <div className="space-y-0.5 max-h-52 overflow-y-auto">
                        {categories.map(cat => {
                          const sel = emissCatFilter.includes(cat.name);
                          return (
                            <button key={cat.id} onClick={() => setEmissCatFilter(prev => sel ? prev.filter(c => c !== cat.name) : [...prev, cat.name])}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-colors ${sel ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                              <div className={`w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center ${sel ? 'bg-purple-600 border-purple-600' : 'border-slate-300'}`}>
                                {sel && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                              </div>
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#94a3b8' }} />
                              <span className="text-[10px] font-bold text-slate-700 uppercase truncate">{cat.name}</span>
                            </button>
                          );
                        })}
                        {categories.length === 0 && <p className="text-[9px] text-slate-400 text-center py-3">Nenhuma categoria disponível</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Insert OS */}
                <button onClick={() => setEmissInsertModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-purple-700 transition-all shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                  Inserir OS
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit flex-wrap">
              {([
                { id: 'TODOS' as EmissoesSubTab,      label: 'Todos',              count: emissCounts.all },
                { id: 'PEND_DOC' as EmissoesSubTab,   label: 'Pend. Doc',          count: emissCounts.pendDoc },
                { id: 'PEND_CTE' as EmissoesSubTab,   label: 'Pend. CT-E',         count: emissCounts.pendCte },
                { id: 'CONCLUIDOS' as EmissoesSubTab, label: 'Concluídos',          count: emissCounts.done },
              ]).map(tab => (
                <button key={tab.id} onClick={() => setEmissoesSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${emissoesSubTab === tab.id ? 'bg-white text-purple-600 shadow-sm border border-purple-100' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${emissoesSubTab === tab.id ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500'}`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-200" /><span className="text-[9px] text-slate-500 font-bold uppercase">Pend. Doc</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-400" /><span className="text-[9px] text-slate-500 font-bold uppercase">Doc OK — Pend. CT-E</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-[9px] text-slate-500 font-bold uppercase">Concluído</span></div>
            </div>

            {/* Table */}
            <SmartOperationTable
              userId={user.id}
              componentId="external_portal_emissoes"
              columns={emissColumns}
              data={emissDisplayTrips}
              getRowStyle={emissGetRowStyle}
              noMaxHeight
              stickyHeaderTop={0}
              defaultVisibleKeys={['dateTime', 'os', 'category', 'coletaDocGenerated', 'cte', 'observacoes']}
            />
          </>
        ) : (
          <>
            {/* Insert button — only on devoluções page with permission */}
            {currentPageKey === 'orgDevolucoes' && canInsertDevolucao && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setShowInsertModal(true); setInsertError(''); setInsertSuccess(false); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all active:scale-95 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                  </svg>
                  Registrar Container
                </button>
              </div>
            )}

            <SmartOperationTable
              userId={user.id}
              componentId={`external_portal_${currentPageKey || 'legacy'}`}
              columns={columns}
              data={currentPageKey === 'orgDevolucoes' ? filteredDevolucoes as any[] : filteredTrips}
              defaultVisibleKeys={currentPageFields}
              noMaxHeight={true}
              stickyHeaderTop={enabledPages.length > 1 ? 192 : 148}
            />
          </>
        )}
      </div>

      {/* ── Native document viewer ───────────────────────────────── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: '90vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest truncate">{viewingDoc.fileName}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Comprovante de Agendamento</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadDoc(viewingDoc.url, viewingDoc.fileName)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Baixar
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-500 rounded-xl transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 p-4 min-h-0">
              <ImageViewer url={viewingDoc.url} alt={viewingDoc.fileName} className="h-full" />
            </div>
          </div>
        </div>
      )}

      {/* ── Insert devolução modal ────────────────────────────────── */}
      {showInsertModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-orange-50">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Registrar Container</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Preencha os dados da devolução</p>
              </div>
              <button onClick={() => setShowInsertModal(false)} className="p-2 hover:bg-orange-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-7 space-y-5">
              {insertSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <p className="text-sm font-black text-emerald-700 uppercase tracking-tight">Registrado com sucesso!</p>
                </div>
              ) : (
                <>
                  {insertError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-600 uppercase">{insertError}</div>
                  )}

                  {/* Container — required */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1.5">
                      Container <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: ABCD1234567"
                      value={insertForm.container}
                      onChange={e => setInsertForm(f => ({ ...f, container: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-black uppercase text-slate-800 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                    />
                  </div>

                  {/* OS — optional */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      OS / Referência <span className="text-slate-300 font-bold normal-case">(opcional — gerada automaticamente)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 12345"
                      value={insertForm.os}
                      onChange={e => setInsertForm(f => ({ ...f, os: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Local — optional */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Local / Depósito <span className="text-slate-300 font-bold normal-case">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Depot Santos"
                      value={insertForm.local}
                      onChange={e => setInsertForm(f => ({ ...f, local: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Data/Hora Agendamento — optional */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Data/Hora do Agendamento <span className="text-slate-300 font-bold normal-case">(opcional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={insertForm.dateTime}
                      onChange={e => setInsertForm(f => ({ ...f, dateTime: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Customer — optional */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                      Cliente <span className="text-slate-300 font-bold normal-case">(opcional — vincula à OS se encontrada)</span>
                    </label>
                    {insertForm.selectedCustomerId ? (
                      <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                        <div>
                          <p className="text-[10px] font-black text-slate-800 uppercase">
                            {customers.find(c => c.id === insertForm.selectedCustomerId)?.name}
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                            {customers.find(c => c.id === insertForm.selectedCustomerId)?.cnpj}
                          </p>
                        </div>
                        <button
                          onClick={() => setInsertForm(f => ({ ...f, selectedCustomerId: '', customerSearch: '' }))}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar cliente por nome ou CNPJ..."
                          value={insertForm.customerSearch}
                          onChange={e => setInsertForm(f => ({ ...f, customerSearch: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:border-orange-400 focus:bg-white transition-all"
                        />
                        {insertForm.customerSearch && filteredInsertCustomers.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-orange-200 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                            {filteredInsertCustomers.slice(0, 8).map(c => (
                              <button
                                key={c.id}
                                onClick={() => setInsertForm(f => ({ ...f, selectedCustomerId: c.id, customerSearch: '' }))}
                                className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors border-b border-slate-50 last:border-0"
                              >
                                <p className="text-[10px] font-black text-slate-800 uppercase">{c.name}</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-0.5">{c.cnpj} · {c.city}</p>
                              </button>
                            ))}
                          </div>
                        )}
                        {insertForm.customerSearch && filteredInsertCustomers.length === 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-10 p-4 text-center">
                            <p className="text-[9px] font-black text-slate-300 uppercase">Nenhum cliente encontrado</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Auto-match preview */}
                  {insertForm.container.trim() && (() => {
                    const matched = matchTripForInsertion(insertForm.container, insertForm.selectedCustomerId);
                    return matched ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
                        <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <div>
                          <p className="text-[9px] font-black text-emerald-700 uppercase">OS vinculada automaticamente</p>
                          <p className="text-[8px] font-bold text-emerald-600 mt-0.5">
                            OS {matched.os} · {matched.customer?.name} {matched.booking ? `· BK ${matched.booking}` : ''}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>

            {!insertSuccess && (
              <div className="px-7 py-5 border-t border-slate-100 flex gap-3 bg-slate-50/60">
                <button
                  onClick={() => setShowInsertModal(false)}
                  className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  disabled={insertSaving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInsertSubmit}
                  disabled={insertSaving || !insertForm.container.trim()}
                  className="flex-1 py-3 text-[10px] font-black uppercase text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {insertSaving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                  {insertSaving ? 'Salvando...' : 'Registrar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Emissões: Insert OS modal ────────────────────────────── */}
      {emissInsertModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4" onClick={e => { if (e.target === e.currentTarget) emissCloseModal(); }}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Inserir OS</h3>
              <button onClick={emissCloseModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Número da OS <span className="text-red-400">*</span></label>
                <input value={emissInsertOs} onChange={e => emissHandleOsChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && emissInsertCat) emissHandleInsert(); }}
                  placeholder="Ex: 6ALC123456A"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all" autoFocus />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Categoria <span className="text-red-400">*</span></label>
                {emissInsertCatDetected && !emissUserChoseCat ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span className="flex-1 text-sm font-black text-emerald-700 uppercase">{emissInsertCat}</span>
                    <button type="button" onClick={() => { setEmissUserChoseCat(true); setEmissInsertCat(''); }}
                      className="text-[8px] font-black text-emerald-600 hover:text-emerald-800 uppercase bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg transition-colors">
                      Alterar
                    </button>
                  </div>
                ) : (
                  <SmartCategorySelect categories={categories} value={emissInsertCat} onChange={v => { setEmissInsertCat(v); setEmissUserChoseCat(true); }} />
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={emissCloseModal} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={emissHandleInsert} disabled={!emissInsertOs.trim() || !emissInsertCat || emissInsertLoading}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black uppercase hover:bg-purple-700 disabled:opacity-50 transition-colors">
                {emissInsertLoading ? 'Salvando...' : 'Inserir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalPortal;
