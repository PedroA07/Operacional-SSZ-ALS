import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Trip, User, Driver, Customer } from '../../types';
import { db } from '../../utils/storage';
import SmartOperationTable from './operations/SmartOperationTable';
import CteAttachmentsModal from './emissoes/CteAttachmentsModal';
import ImportOsModal from './emissoes/ImportOsModal';
import NewTripModal from './operations/NewTripModal';

interface Category { id: string; name: string; color?: string; }

interface EmissoesTabProps {
  userId: string;
  user: User;
  trips: Trip[];
  onRefresh: () => Promise<void>;
  categories: Category[];
}

type SubTab = 'TODOS' | 'PEND_DOC' | 'PEND_CTE' | 'CONCLUIDOS';

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
  // Tipos de operação (para colorir o tipo da programação nas linhas)
  const [operationTypes, setOperationTypes] = useState<{ name: string; color?: string }[]>([]);

  useEffect(() => {
    db.getOperationTypes().then(types => setOperationTypes(types || [])).catch(() => {});
  }, []);

  const typeBadge = useCallback((t: Trip) => {
    const name = (t.type || '').toUpperCase();
    const op = operationTypes.find(o => o.name?.toUpperCase() === name);
    const color = op?.color;
    return (
      <span
        className="text-[7px] px-1.5 py-0.5 rounded font-black border w-fit uppercase whitespace-nowrap"
        style={color
          ? { backgroundColor: `${color}20`, color, borderColor: `${color}55` }
          : { backgroundColor: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}
      >
        {t.type || 'SEM TIPO'}
      </span>
    );
  }, [operationTypes]);
  // Cadastros para o formulário completo de Nova Programação (carregados sob demanda)
  const [insertDrivers, setInsertDrivers] = useState<Driver[]>([]);
  const [insertCustomers, setInsertCustomers] = useState<Customer[]>([]);
  const [insertLoading, setInsertLoading] = useState(false);

  const openInsertModal = useCallback(async () => {
    setInsertLoading(true);
    try {
      const [d, c] = await Promise.all([db.getDrivers(), db.getCustomers()]);
      setInsertDrivers(d || []);
      setInsertCustomers(c || []);
    } catch (e) {
      console.error('Erro ao carregar cadastros:', e);
    } finally {
      setInsertLoading(false);
      setShowInsertModal(true);
    }
  }, []);

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

  // Doc Originário: marca também nas demais programações da mesma OS
  // (ex.: a linha correspondente na Coleta do Dia) e força o refresh global
  const handleToggleDocOriginario = useCallback(async (trip: Trip, checked: boolean) => {
    const os = (trip.os || '').trim().toUpperCase();
    const sameOs = os ? propTrips.filter(t => (t.os || '').trim().toUpperCase() === os) : [];
    const targets = sameOs.length ? sameOs : [trip];
    const now = Date.now();
    setPendingUpdates(prev => {
      const n = { ...prev };
      targets.forEach(t => { n[t.id] = { data: { ...(n[t.id]?.data || {}), coletaDocGenerated: checked }, timestamp: now }; });
      return n;
    });
    try {
      for (const t of targets) {
        await db.saveTrip({ ...t, coletaDocGenerated: checked });
      }
      onRefresh();
    } catch (e) {
      setPendingUpdates(prev => { const n = { ...prev }; targets.forEach(t => delete n[t.id]); return n; });
      console.error('Erro ao marcar Doc Originário:', e);
    }
  }, [propTrips, onRefresh]);

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
          {/* Tipo da programação — sempre visível */}
          {typeBadge(t)}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      sortValue: (t: Trip) => t.type || '',
      render: (t: Trip) => typeBadge(t),
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
            onClick={() => handleToggleDocOriginario(t, !checked)}
            title={checked ? 'Doc gerado — clique para desmarcar (reflete na Coleta do Dia)' : 'Marcar como gerado (reflete na Coleta do Dia)'}
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
  ], [categories, handleUpdate, handleToggleDocOriginario, cteEditingId, cteInputValue, saveCte, obsEditingId, obsInputValue, saveObs, typeBadge]);

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

          {/* Insert OS button — abre o formulário completo de Nova Programação */}
          <button
            onClick={openInsertModal}
            disabled={insertLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-60"
          >
            {insertLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
              </svg>
            )}
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
        defaultVisibleKeys={['dateTime', 'os', 'type', 'category', 'coletaDocGenerated', 'cte', 'cteAnexos', 'observacoes']}
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

      {/* Insert OS modal — formulário completo (equivalente a Nova Programação) */}
      <NewTripModal
        isOpen={showInsertModal}
        onClose={() => setShowInsertModal(false)}
        onSuccess={() => { onRefresh(); }}
        drivers={insertDrivers}
        customers={insertCustomers}
        categories={categories as any}
      />
    </div>
  );
};

export default EmissoesTab;
