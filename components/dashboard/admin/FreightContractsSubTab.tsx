
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Trip, TripDocument, FreightContractDoc, Driver } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import DatePicker from '../../shared/DatePicker';
import { fileStorage } from '../../../utils/fileStorage';
import { db } from '../../../utils/storage';
import {
  extractTextFromPDF,
  parseFreightContractText,
  compressPDFForStorage,
  normAccent,
} from '../../../utils/freightContractParser';
import PDFViewer from '../../shared/PDFViewer';

// ── PDF thumbnail cache (module-level to survive re-renders) ─────────────────
const _thumbCache = new Map<string, string | 'loading' | 'error'>();

async function renderPDFThumb(url: string, cacheKey: string): Promise<void> {
  if (_thumbCache.has(cacheKey)) return;
  _thumbCache.set(cacheKey, 'loading');
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
      ).toString();
    }
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.4 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    _thumbCache.set(cacheKey, canvas.toDataURL('image/jpeg', 0.8));
    window.dispatchEvent(new CustomEvent('pdf-thumb-ready', { detail: cacheKey }));
  } catch {
    _thumbCache.set(cacheKey, 'error');
    window.dispatchEvent(new CustomEvent('pdf-thumb-ready', { detail: cacheKey }));
  }
}

const PDFThumbnail: React.FC<{ url: string; docId: string }> = ({ url, docId }) => {
  const [thumb, setThumb] = useState<string | 'loading' | 'error' | null>(() => _thumbCache.get(docId) ?? null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = (e: Event) => {
      if ((e as CustomEvent).detail === docId) setThumb(_thumbCache.get(docId) ?? null);
    };
    window.addEventListener('pdf-thumb-ready', update);
    return () => window.removeEventListener('pdf-thumb-ready', update);
  }, [docId]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        obs.disconnect();
        const cached = _thumbCache.get(docId);
        if (cached) { setThumb(cached); return; }
        setThumb('loading');
        renderPDFThumb(url, docId);
      }
    }, { threshold: 0.1 });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [url, docId]);

  return (
    <div ref={wrapRef} className="w-12 h-16 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
      {thumb && thumb !== 'loading' && thumb !== 'error' ? (
        <img src={thumb} alt="preview" className="w-full h-full object-cover object-top"/>
      ) : thumb === 'loading' ? (
        <svg className="w-4 h-4 text-slate-300 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      ) : (
        <svg className="w-5 h-5 text-red-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
        </svg>
      )}
    </div>
  );
};

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

interface StandaloneContract {
  id: string; code: string; url: string; fileName: string;
  uploadDate: string; expiresAt?: string;
  parsedData?: { prevTermino?: string; localidade?: string; motorista?: string; container?: string; osNumber?: string };
}

const genContractCode = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `CF-${date}-${rand}`;
};

interface FileEntry {
  id: string;
  file: File;
  originalSize: number;
  status: FileStatus;
  errorMsg?: string;
  compressed: boolean;
  parsed: { prevTermino: string; localidade: string; motorista: string; container: string; osNumber: string };
  linkedTripId: string | null;
  linkedDriverId: string | null;
  autoMatched: boolean;
  autoMatchedDriver: boolean;
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
    const normCtn = (s: string) => s.toUpperCase().replace(/[\s\-_.]/g, '');
    const cMatch = parsed.container && t.container && normCtn(t.container) === normCtn(parsed.container);
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
    { value: 'beneficiary', tag: 'Beneficiário', tagClass: 'text-violet-600 bg-violet-50 border-violet-200', label: driver.beneficiaryName || driver.name, sublabel: driver.beneficiaryPhone || driver.beneficiaryEmail || 'Sem contato', available: !!(driver.beneficiaryName || driver.beneficiaryCnpj || driver.beneficiaryPhone || driver.beneficiaryUserId) },
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
  const [standaloneContracts, setStandaloneContracts] = useState<StandaloneContract[]>([]);
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [viewerDoc, setViewerDoc] = useState<{ url: string; title: string } | null>(null);
  const [linkingStandaloneId, setLinkingStandaloneId] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkingInProgress, setLinkingInProgress] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'recipients') ensureCitiesLoaded();
  }, [view]);

  useEffect(() => {
    let mounted = true;
    db.getStandaloneContracts()
      .then(contracts => { if (mounted) setStandaloneContracts(contracts); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) { setShowAddDropdown(false); setAddSearch(''); }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => { setHistoryPage(1); }, [historySearch]);

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
    const norm = normAccent;
    const normCtn = (s: string) => s.toUpperCase().replace(/[\s\-_.]/g, '');

    // Verifica se a localidade do contrato não contradiz o destino da viagem
    const locMatches = (t: Trip): boolean => {
      if (!parsed.localidade) return true;
      const words = norm(parsed.localidade).split(/[\s\-]+/).filter(w => w.length >= 3);
      if (!words.length) return true;
      const dest = norm(t.destination?.name || t.customer?.name || '');
      if (!dest) return true;
      return words.some(w => dest.includes(w));
    };

    // Prioridade 0: OS extraída do PDF bate exatamente com OS da viagem
    if (parsed.osNumber) {
      const normOS = parsed.osNumber.toUpperCase().trim();
      const hit = trips.find(t => t.os && t.os.toUpperCase().trim() === normOS);
      if (hit) return hit.id;
    }

    // Prioridade 1: container + localidade ambos conferem
    if (parsed.container && parsed.localidade) {
      const loc0 = norm(parsed.localidade.split(/[\s\-]+/).filter(w => w.length >= 3)[0] || parsed.localidade.split(' ')[0]);
      const hits = trips.filter(t =>
        t.container && normCtn(t.container) === normCtn(parsed.container) &&
        t.destination?.name && norm(t.destination.name).includes(loc0)
      );
      if (hits.length === 1) return hits[0].id;
      if (hits.length > 1) {
        if (parsed.motorista) {
          const mot0 = norm(parsed.motorista.split(' ')[0]);
          const narrow = hits.filter(t => t.driver?.name && norm(t.driver.name).includes(mot0));
          if (narrow.length === 1) return narrow[0].id;
        }
        return hits[0].id;
      }
    }

    // Prioridade 2: container apenas (aceita qualquer localidade que não contradiga)
    if (parsed.container) {
      const hits = trips.filter(t => t.container && normCtn(t.container) === normCtn(parsed.container));
      if (hits.length === 1) return hits[0].id;
      if (hits.length > 1) {
        // Filtra por localidade para desambiguar
        const narrowed = hits.filter(t => locMatches(t));
        if (narrowed.length === 1) return narrowed[0].id;
        // Filtra também por motorista
        if (parsed.motorista) {
          const mot0 = norm(parsed.motorista.split(' ')[0]);
          const byDriver = narrowed.filter(t => t.driver?.name && norm(t.driver.name).includes(mot0));
          if (byDriver.length === 1) return byDriver[0].id;
        }
        // Escolhe o mais recente (maior data)
        const sorted = [...hits].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        if (locMatches(sorted[0])) return sorted[0].id;
      }
    }

    // Prioridade 3: motorista + localidade (sem container)
    if (parsed.motorista && parsed.localidade) {
      const mot0 = norm(parsed.motorista.split(' ')[0]);
      const loc0 = norm(parsed.localidade.split(/[\s\-]+/).filter(w => w.length >= 3)[0] || parsed.localidade.split(' ')[0]);
      const hits = trips.filter(t =>
        t.driver?.name && norm(t.driver.name).includes(mot0) &&
        t.destination?.name && norm(t.destination.name).includes(loc0)
      );
      if (hits.length === 1) return hits[0].id;
    }

    // Prioridade 4: motorista apenas — só vincula se for o único e localidade não contradiz
    if (parsed.motorista) {
      const mot0 = norm(parsed.motorista.split(' ')[0]);
      const hits = trips.filter(t => t.driver?.name &&
        (norm(t.driver.name).includes(mot0) || mot0.includes(norm(t.driver.name.split(' ')[0])))
      );
      if (hits.length === 1 && locMatches(hits[0])) return hits[0].id;
    }

    return null;
  }, [trips]);

  // ── Driver-only match — quando não encontra viagem, tenta vincular ao motorista ─
  const findDriverMatch = useCallback((parsed: FileEntry['parsed']): string | null => {
    if (!parsed.motorista || !drivers.length) return null;
    const norm = normAccent;
    const words = norm(parsed.motorista).split(/\s+/).filter(w => w.length > 2);
    const hit = drivers.find(d => {
      const dn = norm(d.name);
      return words.length >= 2
        ? words.every(w => dn.includes(w))
        : dn.includes(norm(parsed.motorista.split(' ')[0]));
    });
    return hit?.id ?? null;
  }, [drivers]);

  // ── File processing ───────────────────────────────────────────────────────────
  const patch = (id: string, delta: Partial<FileEntry>) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...delta } : e));

  const processFile = useCallback(async (file: File) => {
    const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setEntries(prev => [...prev, {
      id, file, originalSize: file.size, status: 'parsing', compressed: false,
      parsed: { prevTermino: '', localidade: '', motorista: '', container: '', osNumber: '' },
      linkedTripId: null, linkedDriverId: null, autoMatched: false, autoMatchedDriver: false,
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
        osNumber: parsed.osNumber || '',
      };
      const autoTripId = findAutoMatch(parsedFilled);
      const autoDriverId = !autoTripId ? findDriverMatch(parsedFilled) : null;
      patch(id, {
        file: finalFile, compressed, status: 'ready', parsed: parsedFilled,
        linkedTripId: autoTripId, autoMatched: !!autoTripId,
        linkedDriverId: autoDriverId, autoMatchedDriver: !!autoDriverId,
      });
    } catch {
      patch(id, { status: 'error', errorMsg: 'Falha ao processar PDF.' });
    }
  }, [findAutoMatch, findDriverMatch]);

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')).forEach(processFile);
  };

  // ── Save all — vinculados vão para a viagem; avulsos geram código próprio ────
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
          osNumber: entry.parsed.osNumber || undefined,
        };

        if (entry.linkedTripId) {
          // Vínculo com viagem
          const trip = trips.find(t => t.id === entry.linkedTripId);
          if (!trip) { patch(entry.id, { status: 'error', errorMsg: 'Viagem não encontrada.' }); continue; }
          const existing = activeDocs(trip);
          const url = await fileStorage.uploadFreightContract(entry.file, trip.os, existing.length);
          const doc: FreightContractDoc = {
            id: entry.id, type: 'CONTRATO_FRETE', url, fileName: entry.file.name,
            uploadDate: uploadDate.toISOString(), expiresAt: expiresAt.toISOString(), parsedData,
          };
          await onUpdate({ ...trip, freightContractDoc: [...existing, doc][0] as TripDocument, freightContractDocs: [...existing, doc] });
          // Salva também na tabela freight_contracts com info do motorista
          await db.saveFreightContract({
            fileName: entry.file.name, fileUrl: url, contractNumber: genContractCode(),
            container: parsedData.container, tripId: trip.id, tripOs: trip.os,
            destination: trip.destination?.name ?? trip.customer?.name,
            driverId: trip.driver?.id ?? undefined, driverName: trip.driver?.name ?? undefined,
            status: 'linked',
          });
          // Atualiza data e local do último contrato no motorista
          if (trip.driver?.id) {
            const dest = trip.destination ?? trip.customer;
            const loc = dest?.city ? (dest.state ? `${dest.city} - ${dest.state}` : dest.city) : undefined;
            try {
              await db.updateDriverLastFreightContract(
                trip.driver.id,
                uploadDate.toISOString().slice(0, 10),
                loc,
              );
            } catch { /* non-critical */ }
          }
        } else if (entry.linkedDriverId) {
          // Vínculo apenas com motorista (sem viagem específica)
          const driver = drivers.find(d => d.id === entry.linkedDriverId);
          const driverKey = driver ? `motorista_${driver.id.replace(/[^a-z0-9]/gi, '_')}` : 'sem_vinculo';
          const url = await fileStorage.uploadFreightContract(entry.file, driverKey, Date.now());
          await db.saveFreightContract({
            fileName: entry.file.name, fileUrl: url, contractNumber: genContractCode(),
            container: parsedData.container, destination: parsedData.localidade,
            driverId: driver?.id, driverName: driver?.name, status: 'linked',
          });
          // Também salva em standalone para aparecer no histórico (sem OS vinculada)
          const d2 = uploadDate;
          const pad2 = (n: number) => String(n).padStart(2, '0');
          const datePart2 = `${d2.getFullYear()}${pad2(d2.getMonth() + 1)}${pad2(d2.getDate())}`;
          const ctnPart2 = parsedData.container ? parsedData.container.replace(/[\s\-_.]/g, '').toUpperCase() : Math.random().toString(36).slice(2, 6).toUpperCase();
          const code2 = `SEM-OS-${ctnPart2}-${datePart2}`;
          const standaloneDriver: StandaloneContract = {
            id: entry.id, code: code2, url, fileName: entry.file.name,
            uploadDate: uploadDate.toISOString(), expiresAt: expiresAt.toISOString(),
            parsedData: { ...parsedData, motorista: parsedData.motorista || driver?.name },
          };
          await db.saveStandaloneContract(standaloneDriver);
          if (driver?.id) {
            try {
              await db.updateDriverLastFreightContract(
                driver.id,
                uploadDate.toISOString().slice(0, 10),
                parsedData.localidade,
              );
            } catch { /* non-critical */ }
          }
          const refreshed2 = await db.getStandaloneContracts();
          setStandaloneContracts(refreshed2);
        } else {
          // Sem vínculo: gera código SEM-OS-{container ou rand} e salva em standalone_freight_contracts
          const d = uploadDate;
          const pad = (n: number) => String(n).padStart(2, '0');
          const datePart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
          const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
          const ctnPart = parsedData.container ? parsedData.container.replace(/[\s\-_.]/g, '').toUpperCase() : rand;
          const code = `SEM-OS-${ctnPart}-${datePart}`;
          const url = await fileStorage.uploadFreightContract(entry.file, `sem_os_${ctnPart}`, 0);
          const standalone: StandaloneContract = {
            id: entry.id, code, url, fileName: entry.file.name,
            uploadDate: uploadDate.toISOString(), expiresAt: expiresAt.toISOString(), parsedData,
          };
          const saved = await db.saveStandaloneContract(standalone);
          if (!saved) throw new Error('Falha ao salvar contrato avulso (sem OS). Verifique o console do banco.');
          const refreshed = await db.getStandaloneContracts();
          setStandaloneContracts(refreshed);
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
  const handleDeleteDoc = async (trip: Trip, docId: string) => {
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

  // ── Link standalone → viagem ─────────────────────────────────────────────────
  const handleLinkToTrip = async (standalone: StandaloneContract, trip: Trip) => {
    setLinkingInProgress(true);
    try {
      const doc: FreightContractDoc = {
        id: standalone.id,
        type: 'CONTRATO_FRETE',
        url: standalone.url,
        fileName: standalone.fileName,
        uploadDate: standalone.uploadDate,
        expiresAt: standalone.expiresAt,
        parsedData: standalone.parsedData,
      };
      const existing = activeDocs(trip);
      await onUpdate({
        ...trip,
        freightContractDoc: [...existing, doc][0] as TripDocument,
        freightContractDocs: [...existing, doc],
      });
      await db.deleteStandaloneContract(standalone.id);
      if (trip.driver?.id) {
        const dest2 = trip.destination ?? trip.customer;
        const loc2 = dest2?.city ? (dest2.state ? `${dest2.city} - ${dest2.state}` : dest2.city) : undefined;
        try {
          await db.updateDriverLastFreightContract(
            trip.driver.id,
            new Date(standalone.uploadDate).toISOString().slice(0, 10),
            loc2,
          );
        } catch { /* non-critical */ }
      }
      setStandaloneContracts(prev => prev.filter(s => s.id !== standalone.id));
      setLinkingStandaloneId(null);
      setLinkSearch('');
    } catch (e: any) {
      alert(`Erro ao vincular: ${e?.message || 'desconhecido'}`);
    } finally {
      setLinkingInProgress(false);
    }
  };

  // ── History ───────────────────────────────────────────────────────────────────
  const contractHistory = useMemo(() => {
    const items: { trip: Trip | null; standalone: StandaloneContract | null; doc: FreightContractDoc | StandaloneContract }[] = [];
    for (const t of trips) {
      for (const doc of activeDocs(t)) items.push({ trip: t, standalone: null, doc });
    }
    for (const s of standaloneContracts) {
      items.push({ trip: null, standalone: s, doc: s });
    }
    return items.sort((a, b) => new Date(b.doc.uploadDate).getTime() - new Date(a.doc.uploadDate).getTime());
  }, [trips, standaloneContracts]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return contractHistory;
    const q = historySearch.toLowerCase();
    return contractHistory.filter(({ trip, standalone, doc }) =>
      (trip?.os || '').toLowerCase().includes(q) ||
      (trip?.driver?.name || '').toLowerCase().includes(q) ||
      ((doc as any).parsedData?.container || '').toLowerCase().includes(q) ||
      (trip?.customer?.name || '').toLowerCase().includes(q) ||
      ((doc as any).parsedData?.motorista || '').toLowerCase().includes(q) ||
      (standalone?.code || '').toLowerCase().includes(q) ||
      (standalone?.parsedData?.motorista || '').toLowerCase().includes(q)
    );
  }, [contractHistory, historySearch]);

  // ── Latest contract per driver (computed from live history) ─────────────────
  const driverLatestContractMap = useMemo(() => {
    const map = new Map<string, { date: string; location: string }>();
    for (const { trip, doc } of contractHistory) {
      if (!trip?.driver?.id) continue;
      const existing = map.get(trip.driver.id);
      if (!existing || doc.uploadDate > existing.date) {
        map.set(trip.driver.id, {
          date: doc.uploadDate.slice(0, 10),
          location: trip.destination?.name || trip.customer?.name || '',
        });
      }
    }
    return map;
  }, [contractHistory]);

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

  const getEdit = (driver: Driver): RowEdit => {
    if (edits[driver.id]) return edits[driver.id];
    const computed = driverLatestContractMap.get(driver.id);
    return {
      sendTo: driver.freightContractSendTo || 'driver',
      lastDate: computed?.date || driver.lastFreightContractDate || '',
      lastLocation: computed?.location || driver.lastFreightContractLocation || '',
      saving: false,
      copied: false,
    };
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
                const isDriverOnly = !entry.linkedTripId && !!entry.linkedDriverId;
                const linkedDriver = isDriverOnly ? drivers.find(d => d.id === entry.linkedDriverId) : null;

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

                      {/* Trip selector + driver fallback */}
                      {['ready', 'error'].includes(entry.status) && (
                        <div className="flex items-center gap-2 shrink-0flex-wrap">
                          <TripSelector
                            value={entry.linkedTripId}
                            onChange={id => patch(entry.id, { linkedTripId: id, autoMatched: false, linkedDriverId: id ? null : entry.linkedDriverId })}
                            trips={trips}
                            parsed={entry.parsed}
                            autoMatched={entry.autoMatched}
                          />
                          {!isLinked && isDriverOnly && linkedDriver && (
                            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-xl px-2.5 py-1.5">
                              <span className="flex items-center gap-1 text-[8px] font-black text-indigo-700 uppercase tracking-wide whitespace-nowrap">
                                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                                </svg>
                                {linkedDriver.name.split(' ').slice(0,2).join(' ')}
                              </span>
                              {entry.autoMatchedDriver && (
                                <span className="text-[7px] font-black text-indigo-400 bg-indigo-100 px-1 py-0.5 rounded border border-indigo-200">Auto</span>
                              )}
                              <button
                                onClick={() => patch(entry.id, { linkedDriverId: null, autoMatchedDriver: false })}
                                className="text-indigo-300 hover:text-red-400 transition-colors ml-0.5"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </div>
                          )}
                          {!isLinked && !isDriverOnly && (
                            <>
                              <select
                                value={entry.linkedDriverId || ''}
                                onChange={e => patch(entry.id, { linkedDriverId: e.target.value || null, autoMatchedDriver: false })}
                                className="text-[9px] border border-slate-200 rounded-xl px-2 py-1.5 text-slate-600 bg-white focus:ring-2 focus:ring-indigo-400 outline-none max-w-[160px]"
                              >
                                <option value="">Vincular motorista…</option>
                                {drivers.filter(d => d.status === 'Ativo').sort((a,b) => a.name.localeCompare(b.name)).map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                              <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 uppercase tracking-wide whitespace-nowrap">
                                Sem Vínculo
                              </span>
                            </>
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
              <>
              <div className="space-y-2">
                {filteredHistory.slice((historyPage - 1) * 10, historyPage * 10).map(({ trip, standalone, doc }) => (
                  <div key={doc.id} className={`flex items-center gap-3 bg-white border rounded-2xl px-4 py-3 shadow-sm hover:border-slate-200 transition-colors ${standalone ? 'border-amber-100' : 'border-slate-100'}`}>
                    {/* PDF thumbnail */}
                    <PDFThumbnail url={doc.url} docId={doc.id}/>

                    {/* OS / Código badge */}
                    <div className="flex flex-col items-center shrink-0 w-20">
                      <span className="text-[7px] font-black text-slate-400 uppercase">{standalone ? 'Código' : 'OS'}</span>
                      {standalone ? (
                        <span className="text-[8px] font-black text-amber-600 tracking-tight font-mono">{standalone.code}</span>
                      ) : (
                        <span className="text-[11px] font-black text-blue-700 tracking-tighter">{trip?.os}</span>
                      )}
                    </div>

                    {/* Separator */}
                    <div className="w-px h-10 bg-slate-100 shrink-0"/>

                    {/* Driver */}
                    <div className="flex flex-col min-w-0 w-36 shrink-0">
                      <span className="text-[7px] font-black text-slate-400 uppercase">Motorista</span>
                      <span className="text-[9px] font-black text-slate-700 uppercase truncate">
                        {trip?.driver?.name || (doc as any).parsedData?.motorista || '—'}
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
                      {/* Botão Vincular — só para standalone */}
                      {standalone && (
                        <div className="relative">
                          <button
                            onClick={() => {
                              setLinkingStandaloneId(linkingStandaloneId === standalone.id ? null : standalone.id);
                              setLinkSearch('');
                            }}
                            title="Vincular a uma viagem"
                            className={`p-1.5 rounded-xl transition-colors ${linkingStandaloneId === standalone.id ? 'bg-green-100 text-green-600' : 'text-green-400 hover:bg-green-50'}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                            </svg>
                          </button>
                          {linkingStandaloneId === standalone.id && (
                            <div className="absolute right-0 top-8 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vincular a uma OS</p>
                              <input
                                autoFocus
                                type="text"
                                value={linkSearch}
                                onChange={e => setLinkSearch(e.target.value)}
                                placeholder="Buscar por OS ou motorista…"
                                className="w-full text-[9px] font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-green-400 placeholder:text-slate-300"
                              />
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {trips
                                  .filter(t => {
                                    if (!linkSearch.trim()) return true;
                                    const q = linkSearch.toLowerCase();
                                    return t.os.toLowerCase().includes(q) ||
                                      (t.driver?.name || '').toLowerCase().includes(q) ||
                                      (t.container || '').toLowerCase().includes(q) ||
                                      (t.destination?.name || '').toLowerCase().includes(q);
                                  })
                                  .slice(0, 20)
                                  .map(t => (
                                    <button
                                      key={t.id}
                                      disabled={linkingInProgress}
                                      onClick={() => handleLinkToTrip(standalone, t)}
                                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-blue-700 font-mono shrink-0">{t.os}</span>
                                        <span className="text-[8px] font-bold text-slate-500 truncate">{t.driver?.name}</span>
                                      </div>
                                      {(t.destination?.name || t.container) && (
                                        <div className="flex gap-1.5 mt-0.5">
                                          {t.destination?.name && <span className="text-[7px] text-slate-400 truncate">{t.destination.name}</span>}
                                          {t.container && <span className="text-[7px] font-mono text-slate-400">{t.container}</span>}
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                {trips.filter(t => {
                                  if (!linkSearch.trim()) return true;
                                  const q = linkSearch.toLowerCase();
                                  return t.os.toLowerCase().includes(q) || (t.driver?.name || '').toLowerCase().includes(q) || (t.container || '').toLowerCase().includes(q) || (t.destination?.name || '').toLowerCase().includes(q);
                                }).length === 0 && (
                                  <p className="text-[9px] text-slate-300 text-center py-4">Nenhuma viagem encontrada</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          const label = standalone ? standalone.code : `OS ${trip?.os}`;
                          setViewerDoc({ url: doc.url, title: `Contrato · ${label}` });
                        }}
                        title="Ver PDF"
                        className="p-1.5 rounded-xl text-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          const label = standalone ? `contrato ${standalone.code}` : `OS ${trip?.os}`;
                          if (!confirm(`Excluir ${label}? O arquivo será removido do R2.`)) return;
                          if (standalone) {
                            setDeletingDocId(doc.id);
                            try { await fileStorage.deleteFile(standalone.url); } catch { /* ignore */ }
                            await db.deleteStandaloneContract(standalone.id);
                            setStandaloneContracts(prev => prev.filter(s => s.id !== standalone.id));
                            setDeletingDocId(null);
                          } else if (trip) {
                            handleDeleteDoc(trip, doc.id);
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
              {/* Paginação */}
              {filteredHistory.length > 10 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
                  >← Anterior</button>
                  <span className="text-[9px] font-black text-slate-500 tabular-nums">
                    {historyPage} / {Math.ceil(filteredHistory.length / 10)}
                  </span>
                  <button
                    onClick={() => setHistoryPage(p => Math.min(Math.ceil(filteredHistory.length / 10), p + 1))}
                    disabled={historyPage >= Math.ceil(filteredHistory.length / 10)}
                    className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
                  >Próximo →</button>
                </div>
              )}
              </>
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
      {viewerDoc && (
        <PDFViewer url={viewerDoc.url} title={viewerDoc.title} onClose={() => setViewerDoc(null)} />
      )}
    </div>
  );
};

export default FreightContractsSubTab;
