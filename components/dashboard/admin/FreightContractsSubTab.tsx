
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Trip, TripDocument, FreightContractDoc, Driver } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import DatePicker from '../../shared/DatePicker';
import { fileStorage } from '../../../utils/fileStorage';
import {
  extractTextFromPDF,
  parseFreightContractText,
  compressPDFForStorage,
  normAccent,
} from '../../../utils/freightContractParser';

// ── IBGE city loader ──────────────────────────────────────────────────────────
interface IbgeCity { id: number; nome: string; microrregiao?: { mesorregiao: { UF: { sigla: string } } }; }
type CityEntry = { name: string; uf: string; norm: string };
const accentFree = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
let _cities: CityEntry[] | null = null;
let _fetching = false;
function ensureCitiesLoaded() {
  if (_cities !== null || _fetching) return;
  _fetching = true;
  fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
    .then(r => r.json())
    .then((data: IbgeCity[]) => {
      _cities = data.filter(c => c.microrregiao?.mesorregiao?.UF?.sigla).map(c => ({
        name: c.nome.toUpperCase(), uf: c.microrregiao!.mesorregiao.UF.sigla, norm: accentFree(c.nome),
      }));
    }).catch(() => { _cities = []; }).finally(() => { _fetching = false; window.dispatchEvent(new Event('ibge:ready')); });
}

// ── Types ─────────────────────────────────────────────────────────────────────
type FileStatus = 'parsing' | 'compressing' | 'ready' | 'uploading' | 'done' | 'error';
type SendTo = 'driver' | 'beneficiary' | 'group';

interface FileEntry {
  id: string;
  file: File;
  originalSize: number;
  status: FileStatus;
  errorMsg?: string;
  compressed: boolean;
  parsed: { prevTermino: string; localidade: string; motorista: string; container: string };
  linkedTripId: string | null;
  autoMatched: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
const cleanPhone = (p?: string) => (p || '').replace(/\D/g, '');
const formatDoc = (doc?: string): string => {
  if (!doc) return '';
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return doc;
};

const WaIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.553 4.118 1.524 5.847L.054 23.5l5.832-1.53A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 01-5.034-1.376l-.36-.214-3.735.979 1-3.64-.235-.374A9.862 9.862 0 012.118 12C2.118 6.535 6.535 2.118 12 2.118c5.464 0 9.882 4.417 9.882 9.882 0 5.464-4.418 9.882-9.882 9.882z"/>
  </svg>
);

// ── TripSelector ──────────────────────────────────────────────────────────────
const TripSelector: React.FC<{
  value: string | null;
  onChange: (id: string | null) => void;
  trips: Trip[];
  parsed: FileEntry['parsed'];
  autoMatched: boolean;
}> = ({ value, onChange, trips, parsed, autoMatched }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const selected = trips.find(t => t.id === value) ?? null;

  const isMatch = (t: Trip) => {
    const cMatch = parsed.container && t.container && normAccent(t.container) === normAccent(parsed.container);
    const dMatch = parsed.motorista && t.driver?.name &&
      (normAccent(t.driver.name).includes(normAccent(parsed.motorista.split(' ')[0])) ||
       normAccent(parsed.motorista).includes(normAccent(t.driver.name.split(' ')[0])));
    return !!(cMatch || dMatch);
  };

  const filtered = trips.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.os.toLowerCase().includes(q) || (t.driver?.name || '').toLowerCase().includes(q) ||
      (t.customer?.name || '').toLowerCase().includes(q) || (t.container || '').toLowerCase().includes(q);
  }).sort((a, b) => (isMatch(b) ? 1 : 0) - (isMatch(a) ? 1 : 0));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border text-left transition-all w-56 shadow-sm
          ${selected ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200 hover:border-blue-400'}`}
      >
        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[7px] font-black text-blue-400 uppercase px-1.5 py-0.5 bg-blue-500/20 rounded border border-blue-500/30">OS {selected.os}</span>
                {autoMatched && (
                  <span className="text-[7px] font-black text-emerald-400 uppercase px-1 py-0.5 bg-emerald-500/20 rounded border border-emerald-500/30">Auto</span>
                )}
              </div>
              <p className="text-[9px] font-black text-white uppercase truncate mt-0.5">{selected.driver?.name}</p>
              <p className="text-[7px] font-bold text-slate-400 truncate">{selected.customer?.name}</p>
            </>
          ) : (
            <p className="text-[9px] font-black text-slate-400 uppercase">Vincular manualmente...</p>
          )}
        </div>
        <svg className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''} ${selected ? 'text-slate-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden w-72">
          <div className="p-2.5 border-b border-slate-50">
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar OS, motorista, container..."
                className="w-full pl-8 pr-3 py-2 text-[9px] font-bold text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-300"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {selected && (
              <button type="button" onClick={() => { onChange(null); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-red-50 border-b border-slate-50 text-left transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                <span className="text-[9px] font-black text-red-500 uppercase">Remover vínculo</span>
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="text-center py-6 text-[9px] font-black text-slate-300 uppercase">Nenhuma viagem encontrada</p>
            ) : filtered.map(t => {
              const match = isMatch(t);
              return (
                <button key={t.id} type="button"
                  onClick={() => { onChange(t.id); setOpen(false); setSearch(''); }}
                  className={`w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0
                    ${value === t.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">OS {t.os}</span>
                      {match && (
                        <span className="flex items-center gap-0.5 text-[7px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded">
                          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                          Match
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-black text-slate-800 uppercase truncate mt-0.5">{t.driver?.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[7px] font-bold text-slate-400 truncate">{t.customer?.name}</p>
                      {t.container && <span className="text-[7px] font-mono font-black text-slate-500">{t.container}</span>}
                    </div>
                  </div>
                  {value === t.id && (
                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── SendToDropdown ─────────────────────────────────────────────────────────────
interface SendToOption { value: SendTo; tag: string; tagClass: string; label: string; sublabel: string; available: boolean; }

const SendToDropdown: React.FC<{ driver: Driver; value: SendTo; onChange: (v: SendTo) => void }> = ({ driver, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const options: SendToOption[] = [
    { value: 'driver', tag: 'Motorista', tagClass: 'text-blue-600 bg-blue-50 border-blue-200', label: driver.name, sublabel: driver.phone || 'Sem telefone', available: true },
    { value: 'beneficiary', tag: 'Beneficiário', tagClass: 'text-violet-600 bg-violet-50 border-violet-200', label: driver.beneficiaryName || driver.name, sublabel: driver.beneficiaryPhone || 'Sem telefone', available: !!driver.beneficiaryPhone },
    { value: 'group', tag: 'Grupo', tagClass: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: driver.whatsappGroupName || 'Grupo WhatsApp', sublabel: 'Todos os participantes', available: !!(driver.whatsappGroupLink || driver.whatsappGroupName) },
  ];
  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-all w-52 shadow-sm text-left"
      >
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${selected.tagClass}`}>{selected.tag}</span>
          <p className="text-[9px] font-black text-slate-800 uppercase truncate mt-0.5">{selected.label}</p>
          <p className="text-[7px] font-bold text-slate-400 truncate">{selected.sublabel}</p>
        </div>
        <svg className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden w-64">
          {options.map(opt => (
            <button key={opt.value} type="button" disabled={!opt.available}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 last:border-0
                ${opt.available ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'}
                ${value === opt.value ? 'bg-blue-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${opt.tagClass}`}>{opt.tag}</span>
                <p className="text-[9px] font-black text-slate-800 uppercase truncate mt-0.5">{opt.label}</p>
                <p className="text-[7px] font-bold text-slate-400 truncate">{opt.sublabel}</p>
              </div>
              {value === opt.value && (
                <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── CitySearch ────────────────────────────────────────────────────────────────
const CitySearch: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CityEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(_cities === null);
  const queryRef = useRef(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); queryRef.current = value; }, [value]);
  useEffect(() => {
    const handler = () => { setLoading(false); if (queryRef.current) runSearch(queryRef.current); };
    window.addEventListener('ibge:ready', handler);
    return () => window.removeEventListener('ibge:ready', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const runSearch = (q: string) => {
    if (!q.trim() || !_cities?.length) { setResults([]); return; }
    const parts = q.trim().toUpperCase().split(/\s+/);
    const last = parts[parts.length - 1];
    const ufFilter = parts.length >= 2 && /^[A-Z]{2}$/.test(last) ? last : '';
    const nameQ = accentFree(ufFilter ? parts.slice(0, -1).join(' ') : q);
    if (!nameQ) { setResults([]); return; }
    let hits = _cities!.filter(c => c.norm.includes(nameQ));
    if (ufFilter) hits = hits.filter(c => c.uf === ufFilter);
    setResults(hits.slice(0, 12));
  };

  const handleInput = (raw: string) => {
    const q = raw.toUpperCase(); setQuery(q); onChange(q); queryRef.current = q; setOpen(true);
    if (_cities !== null) runSearch(q); else { setLoading(true); ensureCitiesLoaded(); }
  };
  const handleSelect = (c: CityEntry) => {
    const val = `${c.name} - ${c.uf}`; setQuery(val); onChange(val); queryRef.current = val; setOpen(false); setResults([]);
  };
  const failed = _cities !== null && _cities.length === 0;

  return (
    <div className="relative" ref={wrapRef}>
      <input type="text" value={query} onChange={e => handleInput(e.target.value)}
        onFocus={() => { ensureCitiesLoaded(); setLoading(_cities === null); if (query) { setOpen(true); if (_cities?.length) runSearch(query); } }}
        placeholder="BUSCAR CIDADE..."
        className="text-[9px] font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm w-52 placeholder:text-slate-300 uppercase"
      />
      {open && loading && !failed && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl shadow-lg border border-slate-100 px-4 py-3 flex items-center gap-2">
          <svg className="w-3 h-3 text-blue-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          <span className="text-[9px] text-slate-400 font-bold uppercase whitespace-nowrap">Carregando cidades...</span>
        </div>
      )}
      {open && !loading && !failed && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden w-64">
          {results.map(c => (
            <button key={`${c.name}|${c.uf}`} type="button" onMouseDown={() => handleSelect(c)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-left border-b border-slate-50 last:border-0"
            >
              <span className="text-[9px] font-bold text-slate-800 uppercase">{c.name}</span>
              <span className="text-[8px] font-black text-blue-500 ml-3 shrink-0">{c.uf}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  trips: Trip[];
  onUpdate: (trip: Trip) => Promise<void>;
  userId: string;
  drivers?: Driver[];
  onUpdateDriver?: (driver: Driver) => Promise<void>;
}

interface RowEdit { sendTo: SendTo; lastDate: string; lastLocation: string; saving: boolean; copied: boolean; }

const FreightContractsSubTab: React.FC<Props> = ({ trips, onUpdate, userId, drivers = [], onUpdateDriver }) => {
  const [view, setView] = useState<'upload' | 'recipients'>('upload');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'recipients') ensureCitiesLoaded();
  }, [view]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) { setShowAddDropdown(false); setAddSearch(''); }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Eligible trips ────────────────────────────────────────────────────────────
  const eligibleTrips = useMemo(() => trips.filter(t =>
    (t.isCompleted || t.status === 'Viagem concluída') &&
    (t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO')
  ), [trips]);

  const isExpired = (doc: FreightContractDoc) => doc.expiresAt ? new Date(doc.expiresAt) < new Date() : false;

  const activeDocs = (t: Trip): FreightContractDoc[] => {
    const docs: FreightContractDoc[] = t.freightContractDocs?.length
      ? t.freightContractDocs
      : t.freightContractDoc ? [t.freightContractDoc as FreightContractDoc] : [];
    return docs.filter(d => !isExpired(d));
  };

  // ── Auto-match logic — busca em TODAS as viagens, não só elegíveis ───────────
  const findAutoMatch = useCallback((parsed: FileEntry['parsed']): string | null => {
    const candidates = trips.filter(t => {
      const cMatch = parsed.container && t.container && normAccent(t.container) === normAccent(parsed.container);
      const dMatch = parsed.motorista && t.driver?.name &&
        (normAccent(t.driver.name).includes(normAccent(parsed.motorista.split(' ')[0])) ||
         normAccent(parsed.motorista).includes(normAccent(t.driver.name.split(' ')[0])));
      // Localidade é critério obrigatório quando disponível (evita falso match em container reutilizado)
      const lMatch = !parsed.localidade || !!(t.destination?.name &&
        normAccent(t.destination.name).includes(normAccent(parsed.localidade.split(' ')[0])));
      return !!((cMatch || dMatch) && lMatch);
    });
    return candidates.length === 1 ? candidates[0].id : null;
  }, [trips]);

  // ── File processing ───────────────────────────────────────────────────────────
  const patch = (id: string, delta: Partial<FileEntry>) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...delta } : e));

  const processFile = useCallback(async (file: File) => {
    const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setEntries(prev => [...prev, {
      id, file, originalSize: file.size, status: 'parsing', compressed: false,
      parsed: { prevTermino: '', localidade: '', motorista: '', container: '' },
      linkedTripId: null, autoMatched: false,
    }]);
    try {
      const text = await extractTextFromPDF(file);
      const parsed = parseFreightContractText(text);
      patch(id, { status: 'compressing' });
      const { file: finalFile, compressed } = await compressPDFForStorage(file);
      const parsedFilled = {
        prevTermino: parsed.prevTermino || '',
        localidade: parsed.localidade || '',
        motorista: parsed.motorista || '',
        container: parsed.container || '',
      };
      const autoId = findAutoMatch(parsedFilled);
      patch(id, { file: finalFile, compressed, status: 'ready', parsed: parsedFilled, linkedTripId: autoId, autoMatched: !!autoId });
    } catch {
      patch(id, { status: 'error', errorMsg: 'Falha ao processar PDF.' });
    }
  }, [findAutoMatch]);

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')).forEach(processFile);
  };

  // ── Save all — processa com ou sem vínculo ────────────────────────────────────
  const handleSaveAll = async () => {
    const readyEntries = entries.filter(e => e.status === 'ready');
    if (!readyEntries.length) return;
    setSaving(true);
    for (const entry of readyEntries) {
      patch(entry.id, { status: 'uploading' });
      try {
        const uploadDate = new Date();
        const expiresAt = new Date(uploadDate);
        expiresAt.setDate(expiresAt.getDate() + 90);
        const parsedData = {
          prevTermino: entry.parsed.prevTermino || undefined,
          localidade: entry.parsed.localidade || undefined,
          motorista: entry.parsed.motorista || undefined,
          container: entry.parsed.container || undefined,
        };

        if (entry.linkedTripId) {
          const trip = trips.find(t => t.id === entry.linkedTripId);
          if (!trip) { patch(entry.id, { status: 'error', errorMsg: 'Viagem não encontrada.' }); continue; }
          const existing = activeDocs(trip);
          const url = await fileStorage.uploadFreightContract(entry.file, trip.os, existing.length);
          const doc: FreightContractDoc = {
            id: entry.id, type: 'CONTRATO_FRETE', url, fileName: entry.file.name,
            uploadDate: uploadDate.toISOString(), expiresAt: expiresAt.toISOString(), parsedData,
          };
          const newDocs = [...existing, doc];
          await onUpdate({ ...trip, freightContractDoc: newDocs[0] as TripDocument, freightContractDocs: newDocs });
        } else {
          // Sem vínculo: faz upload como contrato avulso
          const url = await fileStorage.uploadFreightContract(entry.file, 'AVULSO', Date.now());
          const doc: FreightContractDoc = {
            id: entry.id, type: 'CONTRATO_FRETE', url, fileName: entry.file.name,
            uploadDate: uploadDate.toISOString(), expiresAt: expiresAt.toISOString(), parsedData,
          };
          const prev = JSON.parse(localStorage.getItem('avulsoFreightContracts') || '[]');
          localStorage.setItem('avulsoFreightContracts', JSON.stringify([...prev, doc]));
        }
        patch(entry.id, { status: 'done' });
      } catch (err: any) {
        patch(entry.id, { status: 'error', errorMsg: `Erro: ${err?.message || 'desconhecido'}` });
      }
    }
    setSaving(false);
    setTimeout(() => setEntries(prev => prev.filter(e => e.status !== 'done')), 2500);
  };

  // ── Delete doc ────────────────────────────────────────────────────────────────
  const handleDeleteDoc = async (trip: Trip | null, docId: string) => {
    if (!trip) return;
    const docs = activeDocs(trip);
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    setDeletingDocId(docId);
    try {
      await fileStorage.deleteFile(doc.url);
      const remaining = docs.filter(d => d.id !== docId);
      await onUpdate({ ...trip, freightContractDoc: remaining[0] as TripDocument | undefined, freightContractDocs: remaining.length ? remaining : undefined });
    } catch (e: any) {
      alert(`Erro ao excluir: ${e?.message || 'desconhecido'}`);
    } finally {
      setDeletingDocId(null);
    }
  };

  // ── History ───────────────────────────────────────────────────────────────────
  const contractHistory = useMemo(() => {
    const items: { trip: Trip | null; doc: FreightContractDoc }[] = [];
    for (const t of trips) {
      for (const doc of activeDocs(t)) items.push({ trip: t, doc });
    }
    // Contratos avulsos (sem vínculo) salvos localmente
    try {
      const avulsos: FreightContractDoc[] = JSON.parse(localStorage.getItem('avulsoFreightContracts') || '[]');
      for (const doc of avulsos) {
        if (!isExpired(doc)) items.push({ trip: null, doc });
      }
    } catch { /* ignore */ }
    return items.sort((a, b) => new Date(b.doc.uploadDate).getTime() - new Date(a.doc.uploadDate).getTime());
  }, [trips]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return contractHistory;
    const q = historySearch.toLowerCase();
    return contractHistory.filter(({ trip, doc }) =>
      (trip?.os || '').toLowerCase().includes(q) ||
      (trip?.driver?.name || '').toLowerCase().includes(q) ||
      (doc.parsedData?.container || '').toLowerCase().includes(q) ||
      (trip?.customer?.name || '').toLowerCase().includes(q) ||
      (doc.parsedData?.motorista || '').toLowerCase().includes(q)
    );
  }, [contractHistory, historySearch]);

  // ── Recipients ────────────────────────────────────────────────────────────────
  const recipientDrivers = drivers.filter(d => d.status === 'Ativo' && d.freightContractSendTo);
  const availableToAdd = drivers.filter(d =>
    d.status === 'Ativo' && d.driverType !== 'Motoboy' && !d.freightContractSendTo &&
    (addSearch === '' || d.name.toLowerCase().includes(addSearch.toLowerCase()) || d.plateHorse.toLowerCase().includes(addSearch.toLowerCase()))
  );
  const filteredRecipientDrivers = useMemo(() => {
    if (!recipientSearch.trim()) return recipientDrivers;
    const q = recipientSearch.toLowerCase();
    return recipientDrivers.filter(d => d.name.toLowerCase().includes(q) || d.plateHorse.toLowerCase().includes(q) || (d.beneficiaryName || '').toLowerCase().includes(q));
  }, [recipientDrivers, recipientSearch]);

  const getEdit = (driver: Driver): RowEdit => edits[driver.id] ?? {
    sendTo: driver.freightContractSendTo || 'driver', lastDate: driver.lastFreightContractDate || '',
    lastLocation: driver.lastFreightContractLocation || '', saving: false, copied: false,
  };
  const patchEdit = (driverId: string, p: Partial<RowEdit>, base: RowEdit) =>
    setEdits(prev => ({ ...prev, [driverId]: { ...base, ...prev[driverId], ...p } }));

  const handleSaveRecipient = async (driver: Driver) => {
    if (!onUpdateDriver) return;
    const e = getEdit(driver);
    patchEdit(driver.id, { saving: true }, e);
    try {
      await onUpdateDriver({ ...driver, freightContractSendTo: e.sendTo, lastFreightContractDate: e.lastDate || undefined, lastFreightContractLocation: e.lastLocation || undefined });
      setEdits(prev => { const n = { ...prev }; delete n[driver.id]; return n; });
    } catch { patchEdit(driver.id, { saving: false }, e); }
  };
  const handleAdd = async (driver: Driver) => {
    if (!onUpdateDriver) return;
    setShowAddDropdown(false); setAddSearch('');
    await onUpdateDriver({ ...driver, freightContractSendTo: 'driver' });
  };
  const handleRemove = async (driver: Driver) => {
    if (!onUpdateDriver) return;
    await onUpdateDriver({ ...driver, freightContractSendTo: undefined, lastFreightContractDate: undefined, lastFreightContractLocation: undefined });
    setEdits(prev => { const n = { ...prev }; delete n[driver.id]; return n; });
  };
  const handleCopy = (driver: Driver, e: RowEdit) => {
    const date = e.lastDate ? new Date(e.lastDate + 'T12:00').toLocaleDateString('pt-BR') : '—';
    navigator.clipboard.writeText(`${date} - ${driver.name} - ${e.lastLocation || '—'}`).then(() => {
      patchEdit(driver.id, { copied: true }, e);
      const id = driver.id;
      setTimeout(() => setEdits(prev => prev[id] ? { ...prev, [id]: { ...prev[id], copied: false } } : prev), 2000);
    });
  };
  const phoneLink = (driver: Driver, sendTo: SendTo): React.ReactElement => {
    if (sendTo === 'group') {
      const link = driver.whatsappGroupLink;
      if (!link) return <span className="text-[9px] text-slate-300 italic">Grupo não configurado</span>;
      return <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-black text-[9px] hover:underline whitespace-nowrap"><WaIcon/>{driver.whatsappGroupName || 'Grupo'}</a>;
    }
    const phone = sendTo === 'driver' ? driver.phone : driver.beneficiaryPhone;
    if (!phone) return <span className="text-[9px] text-slate-300 italic">—</span>;
    return <a href={`https://wa.me/55${cleanPhone(phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-black text-[9px] tabular-nums hover:underline whitespace-nowrap"><WaIcon/>{phone}</a>;
  };

  // ── Recipient table columns ───────────────────────────────────────────────────
  const recipientColumns = [
    { key: 'name', label: 'Motorista', sortable: true, sortValue: (d: Driver) => d.name,
      render: (driver: Driver) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 text-[10px] uppercase">{driver.name}</span>
          <div className="flex gap-1 mt-1">
            <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">{driver.plateHorse}</span>
            {driver.plateTrailer && <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">{driver.plateTrailer}</span>}
          </div>
        </div>
      ),
    },
    { key: 'beneficiary', label: 'Beneficiário', sortable: false,
      render: (driver: Driver) => driver.beneficiaryName ? (
        <div className="flex flex-col">
          <span className="font-bold text-slate-700 text-[10px] uppercase">{driver.beneficiaryName}</span>
          {driver.beneficiaryCnpj && <span className="text-[8px] text-slate-400 font-bold mt-0.5 font-mono">{formatDoc(driver.beneficiaryCnpj)}</span>}
        </div>
      ) : (
        <div className="flex flex-col">
          <span className="font-bold text-slate-500 text-[10px] uppercase">{driver.name}</span>
          <span className="text-[8px] text-blue-400 font-black italic mt-0.5">próprio</span>
        </div>
      ),
    },
    { key: 'sendTo', label: 'Enviar para', sortable: false,
      render: (driver: Driver) => {
        const e = getEdit(driver);
        return <SendToDropdown driver={driver} value={e.sendTo} onChange={v => patchEdit(driver.id, { sendTo: v }, e)}/>;
      },
    },
    { key: 'whatsapp', label: 'WhatsApp', sortable: false, width: 150,
      render: (driver: Driver) => phoneLink(driver, getEdit(driver).sendTo),
    },
    { key: 'lastDate', label: 'Data Último Contrato', sortable: true, sortValue: (d: Driver) => d.lastFreightContractDate || '',
      render: (driver: Driver) => {
        const e = getEdit(driver);
        return <DatePicker value={e.lastDate} onChange={val => patchEdit(driver.id, { lastDate: val }, e)} placeholder="Selecionar..." inputClassName="!py-2 !text-[9px] !rounded-xl" className="w-36"/>;
      },
    },
    { key: 'lastLocation', label: 'Local Último Contrato', sortable: true, sortValue: (d: Driver) => d.lastFreightContractLocation || '',
      render: (driver: Driver) => {
        const e = getEdit(driver);
        return <CitySearch value={e.lastLocation} onChange={val => patchEdit(driver.id, { lastLocation: val }, e)}/>;
      },
    },
    { key: 'actions', label: '', sortable: false,
      render: (driver: Driver) => {
        const e = getEdit(driver);
        const isDirty = e.sendTo !== (driver.freightContractSendTo || 'driver') || e.lastDate !== (driver.lastFreightContractDate || '') || e.lastLocation !== (driver.lastFreightContractLocation || '');
        return (
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleCopy(driver, e)} title="Copiar" className={`p-2 rounded-xl transition-all ${e.copied ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}>
              {e.copied ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>}
            </button>
            <button onClick={() => handleSaveRecipient(driver)} disabled={e.saving || !isDirty || !onUpdateDriver}
              className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${isDirty && !e.saving ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
              {e.saving ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : 'Salvar'}
            </button>
            <button onClick={() => handleRemove(driver)} title="Remover" className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        );
      },
    },
  ];

  // ── Status badge (file) ───────────────────────────────────────────────────────
  const Spinner = () => (
    <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
  );
  const StatusBadge = ({ entry }: { entry: FileEntry }) => {
    const { status, errorMsg, compressed, originalSize, file } = entry;
    if (status === 'parsing') return <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase"><Spinner/>Lendo PDF…</span>;
    if (status === 'compressing') return <span className="flex items-center gap-1 text-[8px] font-black text-violet-500 uppercase"><Spinner/>Comprimindo…</span>;
    if (status === 'uploading') return <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase"><Spinner/>Enviando…</span>;
    if (status === 'done') return <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase"><svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>Salvo</span>;
    if (status === 'error') return <span className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase" title={errorMsg}><svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>Erro</span>;
    if (compressed && file.size < originalSize) {
      const pct = Math.round((1 - file.size / originalSize) * 100);
      return <span className="flex items-center gap-1.5"><span className="text-[8px] font-bold text-slate-400 line-through">{fmt(originalSize)}</span><span className="text-[8px] font-black text-emerald-600">{fmt(file.size)}</span><span className="text-[7px] font-black text-emerald-500 bg-emerald-50 border border-emerald-100 rounded px-1">−{pct}%</span></span>;
    }
    return <span className="text-[8px] font-bold text-slate-400">{fmt(file.size)}</span>;
  };

  const pendingCount = entries.filter(e => e.status === 'ready').length;
  const processingCount = entries.filter(e => ['parsing', 'compressing'].includes(e.status)).length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Tab nav */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setView('upload')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
              ${view === 'upload' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            Contratos de Frete
            <span className={`px-2 py-0.5 rounded-full text-[8px] ${view === 'upload' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-500'}`}>{contractHistory.length}</span>
          </button>
          <button onClick={() => setView('recipients')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
              ${view === 'recipients' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            Enviar Contratos
            <span className={`px-2 py-0.5 rounded-full text-[8px] ${view === 'recipients' ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-500'}`}>{recipientDrivers.length}</span>
          </button>
        </div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{eligibleTrips.length} viagem{eligibleTrips.length !== 1 ? 's' : ''} elegível{eligibleTrips.length !== 1 ? 'is' : ''}</p>
      </div>

      {/* ── UPLOAD VIEW ──────────────────────────────────────────────────────────── */}
      {view === 'upload' && (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all select-none
              ${dragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-200 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/40'}`}
          >
            <input ref={inputRef} type="file" multiple accept="application/pdf,.pdf" className="hidden"
              onChange={e => e.target.files && handleFiles(e.target.files)}/>
            <div className="flex flex-col items-center gap-3 pointer-events-none">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors ${dragging ? 'bg-blue-600' : 'bg-white border border-slate-200 shadow-sm'}`}>
                <svg className={`w-8 h-8 ${dragging ? 'text-white' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-black text-slate-700 uppercase tracking-wider">{dragging ? 'Solte aqui' : 'Arraste os contratos aqui'}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">ou clique para selecionar — apenas PDF</p>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">O vínculo é detectado automaticamente pelo conteúdo</p>
              </div>
            </div>
          </div>

          {/* File list */}
          {entries.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Arquivos Selecionados ({entries.length})
                  {processingCount > 0 && <span className="ml-2 text-blue-500">· processando {processingCount}…</span>}
                </h4>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEntries([])} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors">
                    Limpar Tudo
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={pendingCount === 0 || saving || processingCount > 0}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95
                      ${pendingCount > 0 && !saving && processingCount === 0 ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                  >
                    {saving ? <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Salvando…</>
                      : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>Salvar Todos ({pendingCount})</>}
                  </button>
                </div>
              </div>

              {entries.map(entry => {
                const displayName = entry.parsed.motorista
                  ? `Contrato · ${entry.parsed.motorista.split(' ').slice(0, 2).join(' ')}${entry.parsed.container ? ` · ${entry.parsed.container}` : ''}`
                  : entry.file.name;
                const isLinked = !!entry.linkedTripId;

                return (
                  <div key={entry.id}
                    className={`rounded-2xl border p-4 transition-all
                      ${entry.status === 'error' ? 'border-red-200 bg-red-50' :
                        entry.status === 'done' ? 'border-emerald-200 bg-emerald-50/60' :
                        'border-slate-200 bg-white shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* PDF icon */}
                      <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                        </svg>
                      </div>

                      {/* Name + status */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-800 leading-tight truncate">
                          {['parsing', 'compressing'].includes(entry.status) ? entry.file.name : displayName}
                        </p>
                        <p className="text-[8px] text-slate-400 font-bold truncate mt-0.5">{entry.file.name}</p>
                        <div className="mt-1"><StatusBadge entry={entry}/></div>
                      </div>

                      {/* Trip selector */}
                      {['ready', 'error'].includes(entry.status) && (
                        <div className="flex items-center gap-2 shrink-0">
                          <TripSelector
                            value={entry.linkedTripId}
                            onChange={id => patch(entry.id, { linkedTripId: id, autoMatched: false })}
                            trips={trips}
                            parsed={entry.parsed}
                            autoMatched={entry.autoMatched}
                          />
                          {!isLinked && (
                            <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 uppercase tracking-wide whitespace-nowrap">
                              Sem Vínculo
                            </span>
                          )}
                        </div>
                      )}

                      {/* Remove button */}
                      {!['uploading', 'done'].includes(entry.status) && (
                        <button onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))}
                          className="p-1.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Parsed data chips */}
                    {['ready', 'error'].includes(entry.status) && (entry.parsed.container || entry.parsed.localidade || entry.parsed.prevTermino || entry.parsed.motorista) && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pl-13">
                        {entry.parsed.container && (
                          <span className="text-[8px] font-mono font-black text-white bg-slate-800 px-2.5 py-1 rounded-lg">{entry.parsed.container}</span>
                        )}
                        {entry.parsed.motorista && (
                          <span className="text-[8px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg truncate max-w-[200px]">{entry.parsed.motorista}</span>
                        )}
                        {entry.parsed.localidade && (
                          <span className="text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">{entry.parsed.localidade}</span>
                        )}
                        {entry.parsed.prevTermino && (
                          <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">Térm: {entry.parsed.prevTermino}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Histórico de Contratos
                <span className="text-[8px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">{contractHistory.length}</span>
              </h4>
              {contractHistory.length > 0 && (
                <div className="relative">
                  <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Buscar histórico..."
                    className="pl-8 pr-3 py-2 text-[9px] font-bold text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm placeholder:text-slate-300 w-48"/>
                </div>
              )}
            </div>

            {contractHistory.length === 0 ? (
              <div className="py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum contrato enviado ainda</p>
                <p className="text-[9px] font-bold text-slate-300 mt-1">Arraste os PDFs acima para começar</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <p className="text-center py-8 text-[9px] font-black text-slate-300 uppercase">Nenhum resultado para "{historySearch}"</p>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map(({ trip, doc }) => (
                  <div key={doc.id} className={`flex items-center gap-3 bg-white border rounded-2xl px-4 py-3 shadow-sm hover:border-slate-200 transition-colors ${!trip ? 'border-amber-100' : 'border-slate-100'}`}>
                    {/* OS badge */}
                    <div className="flex flex-col items-center shrink-0 w-16">
                      <span className="text-[7px] font-black text-slate-400 uppercase">OS</span>
                      {trip ? (
                        <span className="text-[11px] font-black text-blue-700 tracking-tighter">{trip.os}</span>
                      ) : (
                        <span className="text-[8px] font-black text-amber-600 uppercase tracking-tight">Avulso</span>
                      )}
                    </div>

                    {/* Separator */}
                    <div className="w-px h-10 bg-slate-100 shrink-0"/>

                    {/* Driver */}
                    <div className="flex flex-col min-w-0 w-36 shrink-0">
                      <span className="text-[7px] font-black text-slate-400 uppercase">Motorista</span>
                      <span className="text-[9px] font-black text-slate-700 uppercase truncate">
                        {trip?.driver?.name || doc.parsedData?.motorista || '—'}
                      </span>
                      {trip?.driver?.plateHorse && (
                        <div className="flex gap-1 mt-0.5">
                          <span className="text-[7px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{trip.driver.plateHorse}</span>
                        </div>
                      )}
                    </div>

                    {/* Parsed chips */}
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {doc.parsedData?.container && (
                        <span className="text-[8px] font-mono font-black text-white bg-slate-800 px-2 py-0.5 rounded-lg">{doc.parsedData.container}</span>
                      )}
                      {doc.parsedData?.localidade && (
                        <span className="text-[8px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">{doc.parsedData.localidade}</span>
                      )}
                      {doc.parsedData?.prevTermino && (
                        <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">Térm: {doc.parsedData.prevTermino}</span>
                      )}
                      {doc.expiresAt && (
                        <span className="text-[7px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                          Exp: {new Date(doc.expiresAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {/* Upload date */}
                    <span className="text-[8px] font-bold text-slate-400 shrink-0 tabular-nums">
                      {new Date(doc.uploadDate).toLocaleDateString('pt-BR')}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => window.open(doc.url, '_blank')} title="Ver PDF"
                        className="p-1.5 rounded-xl text-blue-400 hover:bg-blue-50 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const label = trip ? `OS ${trip.os}` : 'contrato avulso';
                          if (!confirm(`Excluir ${label}? O arquivo será removido do R2.`)) return;
                          if (trip) {
                            handleDeleteDoc(trip, doc.id);
                          } else {
                            fileStorage.deleteFile(doc.url).catch(() => {}).finally(() => {
                              const prev: FreightContractDoc[] = JSON.parse(localStorage.getItem('avulsoFreightContracts') || '[]');
                              localStorage.setItem('avulsoFreightContracts', JSON.stringify(prev.filter(d => d.id !== doc.id)));
                              // force re-render by clearing history search
                              setHistorySearch(v => v);
                            });
                          }
                        }}
                        disabled={deletingDocId === doc.id}
                        title="Excluir" className="p-1.5 rounded-xl text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        {deletingDocId === doc.id
                          ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RECIPIENTS VIEW ────────────────────────────────────────────────────────── */}
      {view === 'recipients' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)}
                placeholder="Buscar motorista ou placa..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm placeholder:text-slate-300"/>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                {filteredRecipientDrivers.length} motorista{filteredRecipientDrivers.length !== 1 ? 's' : ''}
              </p>
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => { setShowAddDropdown(v => !v); setAddSearch(''); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                  Adicionar Motorista
                </button>
                {showAddDropdown && (
                  <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden w-72">
                    <div className="p-3 border-b border-slate-50">
                      <input autoFocus type="text" value={addSearch} onChange={e => setAddSearch(e.target.value)}
                        placeholder="Buscar por nome ou placa..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-300"/>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {availableToAdd.length === 0
                        ? <p className="text-center py-6 text-[9px] font-black text-slate-300 uppercase">{addSearch ? 'Nenhum resultado' : 'Todos já estão na lista'}</p>
                        : availableToAdd.map(d => (
                          <button key={d.id} onClick={() => handleAdd(d)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-50 last:border-0">
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-slate-800 uppercase">{d.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 mt-0.5 font-mono">{d.plateHorse}</p>
                            </div>
                            <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {filteredRecipientDrivers.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {recipientSearch ? 'Nenhum motorista encontrado' : 'Nenhum motorista adicionado'}
              </p>
              <p className="text-[9px] font-bold text-slate-300 mt-1">
                {recipientSearch ? `Sem resultados para "${recipientSearch}"` : 'Clique em "Adicionar Motorista" para configurar'}
              </p>
            </div>
          ) : (
            <SmartOperationTable userId={userId} componentId="admin-freight-recipients" columns={recipientColumns} data={filteredRecipientDrivers} hideInternalSearch/>
          )}
        </div>
      )}
    </div>
  );
};

export default FreightContractsSubTab;
