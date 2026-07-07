import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Trip, User } from '../../types';
import { db } from '../../utils/storage';
import { osCategoryService } from '../../utils/osCategoryService';
import SmartOperationTable from './operations/SmartOperationTable';
import CteAttachmentsModal from './emissoes/CteAttachmentsModal';
import ImportOsModal from './emissoes/ImportOsModal';

interface Category { id: string; name: string; color?: string; }

interface EmissoesTabProps {
  userId: string;
  user: User;
  trips: Trip[];
  onRefresh: () => Promise<void>;
  categories: Category[];
}

type SubTab = 'TODOS' | 'PEND_DOC' | 'PEND_CTE' | 'CONCLUIDOS';

// ── Smart category picker ─────────────────────────────────────────────────────
function SmartCategorySelect({ categories, value, onChange }: {
  categories: Category[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = categories.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  const selected = categories.find(c => c.name === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
      >
        {selected ? (
          <>
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color || '#94a3b8' }} />
            <span className="text-sm font-bold text-slate-700 uppercase flex-1">{selected.name}</span>
          </>
        ) : (
          <span className="text-sm text-slate-400 flex-1">Selecionar vínculo...</span>
        )}
        <svg className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar vínculo..."
              className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-4">Nenhum vínculo encontrado</p>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.name); setOpen(false); setQ(''); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${value === c.name ? 'bg-blue-50' : ''}`}
              >
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

// ── Main component ────────────────────────────────────────────────────────────
const EmissoesTab: React.FC<EmissoesTabProps> = ({ userId, user, trips: propTrips, onRefresh, categories }) => {
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { data: Partial<Trip>; timestamp: number }>>({});
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('TODOS');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const catFilterRef = useRef<HTMLDivElement>(null);

  const [cteEditingId, setCteEditingId] = useState<string | null>(null);
  const [cteInputValue, setCteInputValue] = useState('');
  const [attachTripId, setAttachTripId] = useState<string | null>(null);
  const [obsEditingId, setObsEditingId] = useState<string | null>(null);
  const [obsInputValue, setObsInputValue] = useState('');

  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [insertOs, setInsertOs] = useState('');
  const [insertCategory, setInsertCategory] = useState('');
  const [insertCategoryDetected, setInsertCategoryDetected] = useState<string | null>(null);
  const [userChoseCategory, setUserChoseCategory] = useState(false);
  const [insertLoading, setInsertLoading] = useState(false);

  const STABILITY = 30000;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catFilterRef.current && !catFilterRef.current.contains(e.target as Node)) {
        setCategoryFilterOpen(false);
      }
    };
    if (categoryFilterOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [categoryFilterOpen]);

  // Apply pending updates optimistically
  const effectiveTrips = useMemo(() => {
    const now = Date.now();
    return propTrips.map(t => {
      const p = pendingUpdates[t.id];
      if (p && now - p.timestamp < STABILITY) return { ...t, ...p.data };
      return t;
    });
  }, [propTrips, pendingUpdates]);

  // Filter by selected categories
  const categoryFiltered = useMemo(() => {
    if (selectedCategories.length === 0) return effectiveTrips;
    return effectiveTrips.filter(t => selectedCategories.includes(t.category));
  }, [effectiveTrips, selectedCategories]);

  // Filter by allowed customers for third-party users
  const allowedFiltered = useMemo(() => {
    if (user.role !== 'third_party') return categoryFiltered;
    const allowed = user.thirdPartyConfig?.allowedCustomers;
    if (!allowed?.length) return categoryFiltered;
    return categoryFiltered.filter(t => allowed.includes(t.customer?.id || ''));
  }, [categoryFiltered, user]);

  // Sub-tab counts
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const isBeforeToday = useCallback((t: Trip) => {
    if (!t.dateTime) return false;
    const raw = t.dateTime.includes('T') ? t.dateTime : t.dateTime.replace(' ', 'T');
    const tripDate = raw.split('T')[0];
    const normalized = tripDate.includes('/') ? tripDate.split('/').reverse().join('-') : tripDate;
    return normalized < today;
  }, [today]);

  const isConcluido = useCallback((t: Trip) =>
    isBeforeToday(t) || (!!t.coletaDocGenerated && !!t.emissaoCteNumber),
  [isBeforeToday]);

  const counts = useMemo(() => ({
    all: allowedFiltered.length,
    pendDoc: allowedFiltered.filter(t => !isConcluido(t) && !t.coletaDocGenerated).length,
    pendCte: allowedFiltered.filter(t => !isConcluido(t) && !!t.coletaDocGenerated && !t.emissaoCteNumber).length,
    done: allowedFiltered.filter(t => isConcluido(t)).length,
  }), [allowedFiltered, isConcluido]);

  // Final display trips
  const displayTrips = useMemo(() => {
    switch (activeSubTab) {
      case 'PEND_DOC':   return allowedFiltered.filter(t => !isConcluido(t) && !t.coletaDocGenerated);
      case 'PEND_CTE':   return allowedFiltered.filter(t => !isConcluido(t) && !!t.coletaDocGenerated && !t.emissaoCteNumber);
      case 'CONCLUIDOS': return allowedFiltered.filter(t => isConcluido(t));
      default:           return allowedFiltered;
    }
  }, [allowedFiltered, activeSubTab, isConcluido]);

  const handleUpdate = useCallback(async (trip: Trip, data: Partial<Trip>) => {
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { data: { ...(prev[trip.id]?.data || {}), ...data }, timestamp: Date.now() },
    }));
    try {
      await db.saveTrip({ ...trip, ...data });
    } catch (e) {
      setPendingUpdates(prev => { const n = { ...prev }; delete n[trip.id]; return n; });
      console.error('Emissões update error:', e);
    }
  }, []);

  const saveCte = useCallback(async (t: Trip) => {
    const val = cteInputValue.trim() || undefined;
    await handleUpdate(t, { emissaoCteNumber: val });
    setCteEditingId(null);
  }, [handleUpdate, cteInputValue]);

  const saveObs = useCallback(async (t: Trip) => {
    const val = obsInputValue.trim() || undefined;
    await handleUpdate(t, { emissaoObservacoes: val });
    setObsEditingId(null);
  }, [handleUpdate, obsInputValue]);

  const closeInsertModal = useCallback(() => {
    setShowInsertModal(false);
    setInsertOs('');
    setInsertCategory('');
    setInsertCategoryDetected(null);
    setUserChoseCategory(false);
  }, []);

  const handleInsertOsChange = useCallback((value: string) => {
    setInsertOs(value);
    if (!userChoseCategory) {
      const detected = osCategoryService.detectCategoryFromOS(value);
      setInsertCategoryDetected(detected);
      if (detected) {
        const matched = categories.find(c => c.name.toLowerCase() === detected.toLowerCase());
        setInsertCategory(matched?.name || detected);
      } else {
        setInsertCategory('');
      }
    }
  }, [userChoseCategory, categories]);

  const handleInsertOs = async () => {
    if (!insertOs.trim() || !insertCategory) return;
    setInsertLoading(true);
    try {
      const newTrip: Trip = {
        id: `new-${Date.now()}`,
        os: insertOs.trim().toUpperCase(),
        booking: '',
        ship: '',
        dateTime: new Date().toISOString(),
        isLate: false,
        type: 'EXPORTAÇÃO',
        category: insertCategory,
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
      await onRefresh();
      closeInsertModal();
    } catch (e) {
      console.error('Insert OS error:', e);
    } finally {
      setInsertLoading(false);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'dateTime',
      label: 'Data/Hora',
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
      key: 'os',
      label: 'OS',
      sortValue: (t: Trip) => t.os,
      render: (t: Trip) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-[10px] text-slate-900">{t.os}</span>
            {t.container && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-black border uppercase bg-indigo-50 text-indigo-600 border-indigo-200 whitespace-nowrap">
                {t.container}
              </span>
            )}
          </div>
          {t.type && (
            <span className="text-[7px] px-1.5 py-0.5 rounded font-black border w-fit uppercase bg-slate-50 text-slate-500 border-slate-200">
              {t.type}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categoria',
      sortValue: (t: Trip) => t.category || '',
      render: (t: Trip) => {
        const cat = categories.find(c => c.name?.toUpperCase() === t.category?.toUpperCase());
        const color = cat?.color;
        return (
          <span
            className="text-[8px] font-black uppercase px-2 py-1 rounded border w-fit whitespace-nowrap"
            style={color
              ? { backgroundColor: `${color}25`, color, borderColor: `${color}60` }
              : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}
          >
            {t.category || '—'}
          </span>
        );
      },
    },
    {
      key: 'coletaDocGenerated',
      label: 'Doc Originário',
      sortable: false,
      render: (t: Trip) => {
        const checked = !!t.coletaDocGenerated;
        return (
          <button
            type="button"
            onClick={() => handleUpdate(t, { coletaDocGenerated: !checked })}
            title={checked ? 'Doc gerado — clique para desmarcar' : 'Marcar como gerado'}
            className={`relative flex items-center justify-center w-9 h-9 rounded-xl border-2 transition-all duration-150 cursor-pointer active:scale-90 hover:scale-105 ${
              checked ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-white border-slate-200 text-slate-300'
            }`}
          >
            {checked && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow ring-2 ring-white">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7"/>
                </svg>
              </span>
            )}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </button>
        );
      },
    },
    {
      key: 'cte',
      label: 'CT-E',
      sortable: false,
      render: (t: Trip) => {
        if (cteEditingId === t.id) {
          return (
            <div className="flex items-center gap-1">
              <input
                value={cteInputValue}
                onChange={e => setCteInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCte(t); if (e.key === 'Escape') setCteEditingId(null); }}
                className="w-28 px-2 py-1 text-[9px] border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                autoFocus
                placeholder="Nº CT-E"
              />
              <button
                type="button"
                onClick={() => saveCte(t)}
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Salvar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setCteEditingId(null)}
                className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                title="Cancelar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          );
        }
        return t.emissaoCteNumber ? (
          <button
            type="button"
            onClick={() => { setCteEditingId(t.id); setCteInputValue(t.emissaoCteNumber || ''); }}
            className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[8px] font-black border border-blue-200 hover:bg-blue-100 transition-all"
            title="Editar CT-E"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            {t.emissaoCteNumber}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setCteEditingId(t.id); setCteInputValue(''); }}
            className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[8px] font-black border border-dashed border-slate-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            CT-E
          </button>
        );
      },
    },
    {
      key: 'cteAnexos',
      label: 'Anexos CT-E',
      sortable: false,
      render: (t: Trip) => {
        const count = t.emissaoCteAttachments?.length || 0;
        return count > 0 ? (
          <button
            type="button"
            onClick={() => setAttachTripId(t.id)}
            className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[8px] font-black border border-indigo-200 hover:bg-indigo-100 transition-all"
            title={`${count} anexo(s) — clique para gerenciar`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
            {count} {count === 1 ? 'anexo' : 'anexos'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAttachTripId(t.id)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[8px] font-black border border-dashed border-slate-300 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all"
            title="Anexar CT-E (PDF ou XML)"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
            Anexar
          </button>
        );
      },
    },
    {
      key: 'observacoes',
      label: 'Observações',
      sortable: false,
      render: (t: Trip) => {
        if (obsEditingId === t.id) {
          return (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={obsInputValue}
                onChange={e => setObsInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setObsEditingId(null); }}
                className="w-40 px-2 py-1.5 text-[9px] border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white resize-none"
                rows={3}
                autoFocus
                placeholder="Observações..."
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => saveObs(t)}
                  className="flex-1 py-0.5 bg-blue-600 text-white rounded-lg text-[8px] font-black hover:bg-blue-700 transition-colors"
                >Salvar</button>
                <button
                  type="button"
                  onClick={() => setObsEditingId(null)}
                  className="flex-1 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black hover:bg-slate-200 transition-colors"
                >Cancelar</button>
              </div>
            </div>
          );
        }
        return (
          <button
            type="button"
            onClick={() => { setObsEditingId(t.id); setObsInputValue(t.emissaoObservacoes || ''); }}
            className="text-left text-[9px] rounded-lg p-1.5 w-full max-w-[160px] hover:bg-slate-50 transition-colors"
            title={t.emissaoObservacoes || 'Clique para adicionar observação'}
          >
            {t.emissaoObservacoes
              ? <span className="text-slate-700 line-clamp-2">{t.emissaoObservacoes}</span>
              : <span className="text-slate-300 italic">+ observação</span>}
          </button>
        );
      },
    },
  ], [categories, handleUpdate, cteEditingId, cteInputValue, saveCte, obsEditingId, obsInputValue, saveObs]);

  // ── Row styling ────────────────────────────────────────────────────────────
  const getRowStyle = useCallback((t: Trip): React.CSSProperties => {
    if (isConcluido(t)) {
      return { backgroundColor: 'rgba(16,185,129,0.08)', borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#10b981' };
    }
    if (t.coletaDocGenerated) {
      return { backgroundColor: 'rgba(234,179,8,0.06)', borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#eab308' };
    }
    return { borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: '#e2e8f0' };
  }, [isConcluido]);

  // ── Sub-tab definitions ────────────────────────────────────────────────────
  const subTabs: { id: SubTab; label: string; count: number }[] = [
    { id: 'TODOS',      label: 'Todos',                   count: counts.all },
    { id: 'PEND_DOC',   label: 'Pend. Doc Originário',    count: counts.pendDoc },
    { id: 'PEND_CTE',   label: 'Pend. CT-E',              count: counts.pendCte },
    { id: 'CONCLUIDOS', label: 'Concluídos',               count: counts.done },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Emissões</h2>
          <p className="text-xs text-slate-500 mt-0.5">Acompanhe documentos originários e CT-Es das operações.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">

          {/* Category filter */}
          <div ref={catFilterRef} className="relative">
            <button
              onClick={() => setCategoryFilterOpen(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${
                categoryFilterOpen || selectedCategories.length > 0
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
              </svg>
              Vínculos{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}
            </button>

            {categoryFilterOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 w-60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filtrar por Vínculo</span>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="text-[8px] text-red-500 hover:text-red-700 font-black uppercase transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="space-y-0.5 max-h-52 overflow-y-auto">
                  {categories.map(cat => {
                    const isSelected = selectedCategories.includes(cat.name);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategories(prev =>
                          isSelected ? prev.filter(c => c !== cat.name) : [...prev, cat.name]
                        )}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {isSelected && (
                            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeWidth="4" d="M5 13l4 4L19 7"/>
                            </svg>
                          )}
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color || '#94a3b8' }} />
                        <span className="text-[10px] font-bold text-slate-700 uppercase truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                  {categories.length === 0 && (
                    <p className="text-[9px] text-slate-400 text-center py-3">Nenhum vínculo disponível</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Import OS button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
            title="Importar OS da Aliança em PDF — extrai os dados automaticamente"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            Importar OS
          </button>

          {/* Insert OS button */}
          <button
            onClick={() => setShowInsertModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-700 transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Inserir OS
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
              activeSubTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
              activeSubTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-200" />
          <span className="text-[9px] text-slate-500 font-bold uppercase">Pend. Doc</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-[9px] text-slate-500 font-bold uppercase">Doc OK — Pend. CT-E</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-[9px] text-slate-500 font-bold uppercase">Concluído</span>
        </div>
      </div>

      {/* Smart table */}
      <SmartOperationTable
        userId={userId}
        componentId="emissoes_tab"
        columns={columns}
        data={displayTrips}
        getRowStyle={getRowStyle}
        noMaxHeight
        stickyHeaderTop={0}
        defaultVisibleKeys={['dateTime', 'os', 'category', 'coletaDocGenerated', 'cte', 'cteAnexos', 'observacoes']}
      />

      {/* Import OS modal */}
      {showImportModal && (
        <ImportOsModal
          onClose={() => setShowImportModal(false)}
          onImported={onRefresh}
        />
      )}

      {/* CT-E attachments modal */}
      {attachTripId && (() => {
        const attachTrip = effectiveTrips.find(t => t.id === attachTripId);
        if (!attachTrip) return null;
        return (
          <CteAttachmentsModal
            trip={attachTrip}
            onClose={() => setAttachTripId(null)}
            onUpdate={handleUpdate}
          />
        );
      })()}

      {/* Insert OS modal */}
      {showInsertModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[500] p-4 animate-in fade-in duration-200" onClick={e => { if (e.target === e.currentTarget) closeInsertModal(); }}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Inserir OS</h3>
              <button
                onClick={closeInsertModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  Número da OS <span className="text-red-400">*</span>
                </label>
                <input
                  value={insertOs}
                  onChange={e => handleInsertOsChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && insertCategory) handleInsertOs(); }}
                  placeholder="Ex: 6ALC123456A"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  Vínculo Operacional <span className="text-red-400">*</span>
                </label>
                {insertCategoryDetected && !userChoseCategory ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span className="flex-1 text-sm font-black text-emerald-700 uppercase">{insertCategory}</span>
                    <button
                      type="button"
                      onClick={() => { setUserChoseCategory(true); setInsertCategory(''); }}
                      className="text-[8px] font-black text-emerald-600 hover:text-emerald-800 uppercase bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      Alterar
                    </button>
                  </div>
                ) : (
                  <SmartCategorySelect
                    categories={categories}
                    value={insertCategory}
                    onChange={v => { setInsertCategory(v); setUserChoseCategory(true); }}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={closeInsertModal}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleInsertOs}
                disabled={!insertOs.trim() || !insertCategory || insertLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {insertLoading ? 'Salvando...' : 'Inserir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmissoesTab;
