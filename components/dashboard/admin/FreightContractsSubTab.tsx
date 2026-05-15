
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trip, TripDocument, FreightContractDoc, Driver } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import DatePicker from '../../shared/DatePicker';
import FreightContractDropzone from './FreightContractDropzone';
import { fileStorage } from '../../../utils/fileStorage';

// ── IBGE city loader ──────────────────────────────────────────────────────────
interface IbgeCity {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao: { UF: { sigla: string } } };
}
type CityEntry = { name: string; uf: string; norm: string };

const accentFree = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

let _cities: CityEntry[] | null = null;
let _fetching = false;

function ensureCitiesLoaded() {
  if (_cities !== null || _fetching) return;
  _fetching = true;
  fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
    .then(r => r.json())
    .then((data: IbgeCity[]) => {
      _cities = data
        .filter(c => c.microrregiao?.mesorregiao?.UF?.sigla)
        .map(c => {
          const name = c.nome.toUpperCase();
          return { name, uf: c.microrregiao!.mesorregiao.UF.sigla, norm: accentFree(c.nome) };
        });
    })
    .catch(() => { _cities = []; })
    .finally(() => {
      _fetching = false;
      window.dispatchEvent(new Event('ibge:ready'));
    });
}

// ── CitySearch ────────────────────────────────────────────────────────────────
const CitySearch: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [query, setQuery]       = useState(value);
  const [results, setResults]   = useState<CityEntry[]>([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(_cities === null);
  const queryRef                = useRef(value);
  const wrapRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); queryRef.current = value; }, [value]);

  useEffect(() => {
    const handler = () => {
      setLoading(false);
      if (queryRef.current) runSearch(queryRef.current);
    };
    window.addEventListener('ibge:ready', handler);
    return () => window.removeEventListener('ibge:ready', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const runSearch = (q: string) => {
    if (!q.trim() || !_cities || !_cities.length) { setResults([]); return; }
    const parts = q.trim().toUpperCase().split(/\s+/);
    const lastPart = parts[parts.length - 1];
    const ufFilter = parts.length >= 2 && /^[A-Z]{2}$/.test(lastPart) ? lastPart : '';
    const nameQ = accentFree(ufFilter ? parts.slice(0, -1).join(' ') : q);
    if (!nameQ) { setResults([]); return; }
    let hits = _cities.filter(c => c.norm.includes(nameQ));
    if (ufFilter) hits = hits.filter(c => c.uf === ufFilter);
    setResults(hits.slice(0, 12));
  };

  const handleInput = (raw: string) => {
    const q = raw.toUpperCase();
    setQuery(q);
    onChange(q);
    queryRef.current = q;
    setOpen(true);
    if (_cities !== null) {
      runSearch(q);
    } else {
      setLoading(true);
      ensureCitiesLoaded();
    }
  };

  const handleSelect = (c: CityEntry) => {
    const val = `${c.name} - ${c.uf}`;
    setQuery(val);
    onChange(val);
    queryRef.current = val;
    setOpen(false);
    setResults([]);
  };

  const failed = _cities !== null && _cities.length === 0;

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => {
          ensureCitiesLoaded();
          setLoading(_cities === null);
          if (query) { setOpen(true); if (_cities?.length) runSearch(query); }
        }}
        placeholder="BUSCAR CIDADE..."
        className="text-[9px] font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm w-52 placeholder:text-slate-300 uppercase"
      />

      {open && loading && !failed && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl shadow-lg border border-slate-100 px-4 py-3 flex items-center gap-2">
          <svg className="w-3 h-3 text-blue-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-[9px] text-slate-400 font-bold uppercase whitespace-nowrap">Carregando cidades...</span>
        </div>
      )}

      {open && failed && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl shadow-lg border border-red-100 px-4 py-3 text-[9px] text-red-400 font-bold uppercase whitespace-nowrap">
          Sem conexão · Digite livremente
        </div>
      )}

      {open && !loading && !failed && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden w-64">
          {results.map(c => (
            <button
              key={`${c.name}|${c.uf}`}
              type="button"
              onMouseDown={() => handleSelect(c)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-left border-b border-slate-50 last:border-0"
            >
              <span className="text-[9px] font-bold text-slate-800 uppercase leading-tight">{c.name}</span>
              <span className="text-[8px] font-black text-blue-500 ml-3 shrink-0">{c.uf}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
type SendTo = 'driver' | 'beneficiary' | 'group';

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

const phoneLink = (driver: Driver, sendTo: SendTo): React.ReactElement => {
  if (sendTo === 'group') {
    const name = driver.whatsappGroupName || 'Grupo WhatsApp';
    const link = driver.whatsappGroupLink;
    if (!link) return <span className="text-[9px] text-slate-300 italic">Grupo não configurado</span>;
    return (
      <a href={link} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-black text-[9px] hover:underline whitespace-nowrap"
      >
        <WaIcon />{name}
      </a>
    );
  }
  const phone = sendTo === 'driver' ? driver.phone : driver.beneficiaryPhone;
  if (!phone) return <span className="text-[9px] text-slate-300 italic">—</span>;
  return (
    <a href={`https://wa.me/55${cleanPhone(phone)}`} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-black text-[9px] tabular-nums hover:underline whitespace-nowrap"
    >
      <WaIcon />{phone}
    </a>
  );
};

// ── SendToDropdown ─────────────────────────────────────────────────────────────
interface SendToOption {
  value: SendTo;
  tag: string;
  tagClass: string;
  label: string;
  sublabel: string;
  available: boolean;
}

const SendToDropdown: React.FC<{ driver: Driver; value: SendTo; onChange: (v: SendTo) => void }> = ({ driver, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const options: SendToOption[] = [
    {
      value: 'driver',
      tag: 'Motorista',
      tagClass: 'text-blue-600 bg-blue-50 border-blue-200',
      label: driver.name,
      sublabel: driver.phone || 'Sem telefone',
      available: true,
    },
    {
      value: 'beneficiary',
      tag: 'Beneficiário',
      tagClass: 'text-violet-600 bg-violet-50 border-violet-200',
      label: driver.beneficiaryName || driver.name,
      sublabel: driver.beneficiaryPhone || 'Sem telefone',
      available: !!driver.beneficiaryPhone,
    },
    {
      value: 'group',
      tag: 'Grupo',
      tagClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      label: driver.whatsappGroupName || 'Grupo WhatsApp',
      sublabel: 'Todos os participantes',
      available: !!(driver.whatsappGroupLink || driver.whatsappGroupName),
    },
  ];

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
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
            <button
              key={opt.value}
              type="button"
              disabled={!opt.available}
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

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  trips: Trip[];
  onUpdate: (trip: Trip) => Promise<void>;
  userId: string;
  drivers?: Driver[];
  onUpdateDriver?: (driver: Driver) => Promise<void>;
}

interface RowEdit {
  sendTo: SendTo;
  lastDate: string;
  lastLocation: string;
  saving: boolean;
  copied: boolean;
}

const FreightContractsSubTab: React.FC<Props> = ({ trips, onUpdate, userId, drivers = [], onUpdateDriver }) => {
  const [view, setView] = useState<'queue' | 'recipients'>('queue');
  const [edits, setEdits] = useState<Record<string, RowEdit>>({});
  const [dropzoneOpen, setDropzoneOpen] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [queueSearch, setQueueSearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'recipients') ensureCitiesLoaded();
  }, [view]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false); setAddSearch('');
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const recipientDrivers = drivers.filter(d => d.status === 'Ativo' && d.freightContractSendTo);

  const availableToAdd = drivers.filter(d =>
    d.status === 'Ativo' && d.driverType !== 'Motoboy' && !d.freightContractSendTo &&
    (addSearch === '' || d.name.toLowerCase().includes(addSearch.toLowerCase()) || d.plateHorse.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const getEdit = (driver: Driver): RowEdit =>
    edits[driver.id] ?? {
      sendTo: driver.freightContractSendTo || 'driver',
      lastDate: driver.lastFreightContractDate || '',
      lastLocation: driver.lastFreightContractLocation || '',
      saving: false,
      copied: false,
    };

  const patchEdit = (driverId: string, patch: Partial<RowEdit>, base: RowEdit) =>
    setEdits(prev => ({ ...prev, [driverId]: { ...base, ...prev[driverId], ...patch } }));

  const handleSave = async (driver: Driver) => {
    if (!onUpdateDriver) return;
    const e = getEdit(driver);
    patchEdit(driver.id, { saving: true }, e);
    try {
      await onUpdateDriver({
        ...driver,
        freightContractSendTo: e.sendTo,
        lastFreightContractDate: e.lastDate || undefined,
        lastFreightContractLocation: e.lastLocation || undefined,
      });
      setEdits(prev => { const n = { ...prev }; delete n[driver.id]; return n; });
    } catch {
      patchEdit(driver.id, { saving: false }, e);
    }
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
    const text = `${date} - ${driver.name} - ${e.lastLocation || '—'}`;
    navigator.clipboard.writeText(text).then(() => {
      patchEdit(driver.id, { copied: true }, e);
      const id = driver.id;
      setTimeout(() => setEdits(prev => prev[id] ? { ...prev, [id]: { ...prev[id], copied: false } } : prev), 2000);
    });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const isExpired = (doc: FreightContractDoc) =>
    doc.expiresAt ? new Date(doc.expiresAt) < new Date() : false;

  const activeDocs = (t: Trip): FreightContractDoc[] => {
    const docs: FreightContractDoc[] = t.freightContractDocs?.length
      ? t.freightContractDocs
      : t.freightContractDoc
        ? [t.freightContractDoc as FreightContractDoc]
        : [];
    return docs.filter(d => !isExpired(d));
  };

  // ── Exclusão: R2 primeiro, depois Supabase ────────────────────────────────────
  const handleDeleteDoc = async (trip: Trip, docId: string) => {
    const allDocs = activeDocs(trip);
    const doc = allDocs.find(d => d.id === docId);
    if (!doc) return;
    setDeletingDocId(docId);
    try {
      await fileStorage.deleteFile(doc.url);
      const remaining = allDocs.filter(d => d.id !== docId);
      const legacyDoc = remaining[0] as TripDocument | undefined;
      await onUpdate({ ...trip, freightContractDoc: legacyDoc, freightContractDocs: remaining.length ? remaining : undefined });
    } catch (e: any) {
      alert(`Erro ao excluir: ${e?.message || 'desconhecido'}`);
    } finally {
      setDeletingDocId(null);
    }
  };

  // ── Trips queue ──────────────────────────────────────────────────────────────
  const eligibleTrips = trips.filter(t =>
    (t.isCompleted || t.status === 'Viagem concluída') &&
    (t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO')
  );

  const filteredQueueTrips = useMemo(() => {
    if (!queueSearch.trim()) return eligibleTrips;
    const q = queueSearch.toLowerCase().trim();
    return eligibleTrips.filter(t =>
      t.os.toLowerCase().includes(q) ||
      (t.driver?.name || '').toLowerCase().includes(q) ||
      (t.customer?.name || '').toLowerCase().includes(q) ||
      (t.customer?.legalName || '').toLowerCase().includes(q)
    );
  }, [eligibleTrips, queueSearch]);

  const filteredRecipientDrivers = useMemo(() => {
    if (!recipientSearch.trim()) return recipientDrivers;
    const q = recipientSearch.toLowerCase().trim();
    return recipientDrivers.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.plateHorse.toLowerCase().includes(q) ||
      (d.beneficiaryName || '').toLowerCase().includes(q)
    );
  }, [recipientDrivers, recipientSearch]);

  const handleDropzoneDone = async (trip: Trip, docs: FreightContractDoc[]) => {
    const legacyDoc = docs[0] as TripDocument | undefined;
    await onUpdate({ ...trip, freightContractDoc: legacyDoc, freightContractDocs: docs });
    setDropzoneOpen(null);
  };

  // ── Queue columns ─────────────────────────────────────────────────────────────
  const queueColumns = [
    {
      key: 'dateTime', label: '1. Data/Hora Viagem',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 text-[10px]">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
          <span className="text-blue-600 font-bold text-[9px]">{new Date(t.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ),
    },
    { key: 'os', label: '2. OS', render: (t: Trip) => <span className="font-black text-blue-700 text-sm tracking-tighter">{t.os}</span> },
    {
      key: 'customer_info', label: '3. Cliente (Razão / Fantasia)',
      render: (t: Trip) => (
        <div className="flex flex-col max-w-[280px]">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight truncate">{t.customer?.legalName || t.customer?.name}</span>
          <p className="text-[8px] font-bold text-slate-400 uppercase italic mt-0.5">FAN: {t.customer?.name}</p>
          <span className="text-[8px] font-black text-blue-500 uppercase mt-1">{t.customer?.city} - {t.customer?.state}</span>
        </div>
      ),
    },
    {
      key: 'driver_info', label: '4. Motorista / Equipamento',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-700 uppercase text-[10px]">{t.driver?.name}</span>
          <div className="flex gap-1.5 mt-1.5">
            <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold">{t.driver?.plateHorse}</span>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200 text-[9px] font-mono font-bold">{t.driver?.plateTrailer}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'contract_status', label: '5. Contratos de Frete',
      render: (t: Trip) => {
        const allDocs = activeDocs(t);

        if (dropzoneOpen === t.id) {
          return (
            <div className="w-[520px] py-2">
              <FreightContractDropzone
                tripOS={t.os}
                tripDriver={t.driver?.name}
                existingDocs={allDocs}
                onDone={docs => handleDropzoneDone(t, docs)}
                onCancel={() => setDropzoneOpen(null)}
              />
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-2 min-w-[280px]">
            {/* Motorista vinculado automaticamente à viagem */}
            {t.driver && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 rounded-xl w-fit">
                <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <span className="text-[8px] font-black text-white uppercase truncate max-w-[150px]">{t.driver.name}</span>
                <span className="text-[7px] font-black text-emerald-400 uppercase tracking-wide">Vinculado</span>
              </div>
            )}

            {/* Contratos salvos */}
            {allDocs.map((doc, idx) => (
              <div key={doc.id} className="flex flex-col bg-emerald-50 border border-emerald-100 rounded-xl p-3 gap-2">
                {/* Header do contrato */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span className="text-[9px] font-black text-emerald-700 uppercase">Contrato {idx + 1}{allDocs.length > 1 ? `/${allDocs.length}` : ''}</span>
                    {doc.expiresAt && (
                      <span className="text-[7px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 shrink-0">
                        Expira {new Date(doc.expiresAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => window.open(doc.url, '_blank')}
                      title="Ver PDF"
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir contrato ${idx + 1}? O arquivo será removido do R2 e do banco.`))
                          handleDeleteDoc(t, doc.id);
                      }}
                      disabled={deletingDocId === doc.id}
                      title="Excluir"
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-100 transition-colors disabled:opacity-40"
                    >
                      {deletingDocId === doc.id
                        ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Dados extraídos do PDF */}
                {doc.parsedData && (
                  <div className="flex flex-col gap-1">
                    {doc.parsedData.container && (
                      <span className="text-[8px] font-mono font-black text-white bg-slate-800 px-2 py-1 rounded-lg w-fit tracking-wide">
                        {doc.parsedData.container}
                      </span>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {doc.parsedData.localidade && (
                        <span className="text-[8px] font-bold text-slate-600 truncate">
                          <span className="text-slate-400">Local: </span>{doc.parsedData.localidade}
                        </span>
                      )}
                      {doc.parsedData.prevTermino && (
                        <span className="text-[8px] font-bold text-slate-600 truncate">
                          <span className="text-slate-400">Térm: </span>{doc.parsedData.prevTermino}
                        </span>
                      )}
                      {doc.parsedData.motorista && (
                        <span className="text-[8px] font-bold text-slate-500 col-span-2 truncate">
                          <span className="text-slate-400">Mot: </span>{doc.parsedData.motorista}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Botão Anexar / Adicionar */}
            <button
              onClick={() => setDropzoneOpen(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-95 w-fit"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              <span className="text-[9px] font-black uppercase tracking-widest">
                {allDocs.length > 0 ? 'Adicionar PDF' : 'Anexar Contrato'}
              </span>
            </button>
          </div>
        );
      },
    },
  ];

  // ── Recipients columns ────────────────────────────────────────────────────────
  const recipientColumns = [
    {
      key: 'name',
      label: 'Motorista',
      sortable: true,
      sortValue: (d: Driver) => d.name,
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
    {
      key: 'beneficiary',
      label: 'Beneficiário',
      sortable: false,
      render: (driver: Driver) => (
        driver.beneficiaryName ? (
          <div className="flex flex-col">
            <span className="font-bold text-slate-700 text-[10px] uppercase leading-tight">{driver.beneficiaryName}</span>
            {driver.beneficiaryCnpj && (
              <span className="text-[8px] text-slate-400 font-bold mt-0.5 font-mono">{formatDoc(driver.beneficiaryCnpj)}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="font-bold text-slate-500 text-[10px] uppercase leading-tight">{driver.name}</span>
            <span className="text-[8px] text-blue-400 font-black italic mt-0.5">próprio</span>
          </div>
        )
      ),
    },
    {
      key: 'sendTo',
      label: 'Enviar para',
      sortable: false,
      render: (driver: Driver) => {
        const e = getEdit(driver);
        return (
          <SendToDropdown
            driver={driver}
            value={e.sendTo}
            onChange={v => patchEdit(driver.id, { sendTo: v }, e)}
          />
        );
      },
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      sortable: false,
      width: 150,
      render: (driver: Driver) => {
        const e = getEdit(driver);
        return phoneLink(driver, e.sendTo);
      },
    },
    {
      key: 'lastDate',
      label: 'Data Último Contrato',
      sortable: true,
      sortValue: (d: Driver) => d.lastFreightContractDate || '',
      render: (driver: Driver) => {
        const e = getEdit(driver);
        return (
          <DatePicker
            value={e.lastDate}
            onChange={val => patchEdit(driver.id, { lastDate: val }, e)}
            placeholder="Selecionar..."
            inputClassName="!py-2 !text-[9px] !rounded-xl"
            className="w-36"
          />
        );
      },
    },
    {
      key: 'lastLocation',
      label: 'Local Último Contrato',
      sortable: true,
      sortValue: (d: Driver) => d.lastFreightContractLocation || '',
      render: (driver: Driver) => {
        const e = getEdit(driver);
        return (
          <CitySearch
            value={e.lastLocation}
            onChange={val => patchEdit(driver.id, { lastLocation: val }, e)}
          />
        );
      },
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (driver: Driver) => {
        const e = getEdit(driver);
        const isDirty =
          e.sendTo !== (driver.freightContractSendTo || 'driver') ||
          e.lastDate !== (driver.lastFreightContractDate || '') ||
          e.lastLocation !== (driver.lastFreightContractLocation || '');
        return (
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleCopy(driver, e)} title="Copiar data · motorista · local"
              className={`p-2 rounded-xl transition-all ${e.copied ? 'bg-emerald-100 text-emerald-600' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}>
              {e.copied
                ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              }
            </button>
            <button onClick={() => handleSave(driver)}
              disabled={e.saving || !isDirty || !onUpdateDriver}
              className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${isDirty && !e.saving ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
              {e.saving
                ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                : 'Salvar'}
            </button>
            <button onClick={() => handleRemove(driver)} title="Remover da lista"
              className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        );
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Gestão de Contratos de Frete</h4>
          <p className="text-[9px] font-bold text-blue-800 opacity-70 mt-1 uppercase leading-tight">
            Gerencie a fila de contratos pendentes e configure os motoristas destinatários de envio via WhatsApp.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('queue')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'queue' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 10h16M4 14h10"/>
          </svg>
          Fila de Contratos
          <span className={`px-2 py-0.5 rounded-full text-[8px] ${view === 'queue' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-500'}`}>{eligibleTrips.length}</span>
        </button>
        <button
          onClick={() => setView('recipients')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'recipients' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          Enviar Contratos
          <span className={`px-2 py-0.5 rounded-full text-[8px] ${view === 'recipients' ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-500'}`}>{recipientDrivers.length}</span>
        </button>
      </div>

      {/* Queue view */}
      {view === 'queue' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              value={queueSearch}
              onChange={e => setQueueSearch(e.target.value)}
              placeholder="Buscar por OS, motorista ou cliente..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm placeholder:text-slate-300"
            />
            {queueSearch && (
              <button
                onClick={() => setQueueSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            )}
          </div>

          {queueSearch && (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {filteredQueueTrips.length} resultado{filteredQueueTrips.length !== 1 ? 's' : ''} para "{queueSearch}"
            </p>
          )}

          <SmartOperationTable
            userId={userId}
            componentId="admin-freight-contracts"
            columns={queueColumns}
            data={filteredQueueTrips}
            title="Fila de Documentação de Frete"
          />
        </div>
      )}

      {/* Recipients view */}
      {view === 'recipients' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Search bar */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="text"
                value={recipientSearch}
                onChange={e => setRecipientSearch(e.target.value)}
                placeholder="Buscar motorista ou placa..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm placeholder:text-slate-300"
              />
              {recipientSearch && (
                <button
                  onClick={() => setRecipientSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                {filteredRecipientDrivers.length} motorista{filteredRecipientDrivers.length !== 1 ? 's' : ''}
                {recipientSearch ? ' encontrado' : ' configurado'}{filteredRecipientDrivers.length !== 1 ? 's' : ''}
              </p>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => { setShowAddDropdown(v => !v); setAddSearch(''); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95"
                >
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
                      {availableToAdd.length === 0 ? (
                        <p className="text-center py-6 text-[9px] font-black text-slate-300 uppercase">
                          {addSearch ? 'Nenhum resultado' : 'Todos os motoristas já estão na lista'}
                        </p>
                      ) : availableToAdd.map(d => (
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
                {recipientSearch ? `Sem resultados para "${recipientSearch}"` : 'Clique em "Adicionar Motorista" para configurar os destinatários'}
              </p>
            </div>
          ) : (
            <SmartOperationTable
              userId={userId}
              componentId="admin-freight-recipients"
              columns={recipientColumns}
              data={filteredRecipientDrivers}
              hideInternalSearch
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FreightContractsSubTab;
