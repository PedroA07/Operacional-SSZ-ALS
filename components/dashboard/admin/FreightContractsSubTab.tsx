
import React, { useState, useRef, useEffect } from 'react';
import { Trip, TripDocument, Driver } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import DatePicker from '../../shared/DatePicker';

// ── IBGE city loader ──────────────────────────────────────────────────────────
interface IbgeCity {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao: { UF: { sigla: string } } };
}
type CityEntry = { name: string; uf: string; norm: string };

// Strip accents for accent-insensitive search
const accentFree = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

let _cities: CityEntry[] | null = null; // null=not fetched, []=error/empty
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

  // Re-run search when IBGE finishes loading
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
    // Split query: last token treated as UF filter if it's exactly 2 letters
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
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pre-warm IBGE when entering recipients view
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

  // ── Trips queue ──────────────────────────────────────────────────────────────
  const eligibleTrips = trips.filter(t =>
    (t.isCompleted || t.status === 'Viagem concluída') &&
    (t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO')
  );

  const handleFileUpload = (trip: Trip, ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const doc: TripDocument = {
        id: `freight-contract-${Date.now()}`,
        type: 'CONTRATO_FRETE',
        url: reader.result as string,
        fileName: `CONTRATO - ${trip.driver.name} - OS ${trip.os}`,
        uploadDate: new Date().toISOString(),
      };
      await onUpdate({ ...trip, freightContractDoc: doc });
    };
    reader.readAsDataURL(file);
  };

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
      key: 'contract_status', label: '5. Ação Contrato',
      render: (t: Trip) => t.freightContractDoc ? (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl border border-emerald-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="text-[9px] font-black uppercase">Anexado</span>
          <button onClick={() => window.open(t.freightContractDoc!.url, '_blank')} className="ml-2 text-[8px] font-black text-blue-600 hover:underline">Ver</button>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-95">
          <input type="file" className="hidden" accept=".pdf,image/*" onChange={(ev) => handleFileUpload(t, ev)} />
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Anexar</span>
        </label>
      ),
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
          <select
            value={e.sendTo}
            onChange={ev => patchEdit(driver.id, { sendTo: ev.target.value as SendTo }, e)}
            className="text-[9px] font-black uppercase bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm"
          >
            <option value="driver">Motorista</option>
            <option value="beneficiary" disabled={!driver.beneficiaryPhone}>
              Beneficiário{!driver.beneficiaryPhone ? ' (sem tel.)' : ''}
            </option>
            <option value="group" disabled={!driver.whatsappGroupLink && !driver.whatsappGroupName}>
              Grupo (ambos){!driver.whatsappGroupLink && !driver.whatsappGroupName ? ' (não config.)' : ''}
            </option>
          </select>
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
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
        </div>
        <div>
          <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Gestão de Contratos de Frete</h4>
          <p className="text-[9px] font-bold text-blue-800 opacity-70 mt-1 uppercase leading-tight">
            Gerencie a fila de contratos pendentes e configure os motoristas destinatários de envio via WhatsApp.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setView('queue')}
          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'queue' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
          Fila de Contratos
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] ${view === 'queue' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-500'}`}>{eligibleTrips.length}</span>
        </button>
        <button onClick={() => setView('recipients')}
          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'recipients' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
          Motoristas Destinatários
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] ${view === 'recipients' ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-500'}`}>{recipientDrivers.length}</span>
        </button>
      </div>

      {view === 'queue' && (
        <SmartOperationTable userId={userId} componentId="admin-freight-contracts" columns={queueColumns} data={eligibleTrips} title="Fila de Documentação de Frete" />
      )}

      {view === 'recipients' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {recipientDrivers.length} motorista{recipientDrivers.length !== 1 ? 's' : ''} configurado{recipientDrivers.length !== 1 ? 's' : ''}
            </p>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => { setShowAddDropdown(v => !v); setAddSearch(''); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                Adicionar Motorista
              </button>
              {showAddDropdown && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden w-72">
                  <div className="p-3 border-b border-slate-50">
                    <input autoFocus type="text" value={addSearch} onChange={e => setAddSearch(e.target.value)}
                      placeholder="Buscar por nome ou placa..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-300" />
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
                        <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {recipientDrivers.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nenhum motorista adicionado</p>
              <p className="text-[9px] font-bold text-slate-300 mt-1">Clique em "Adicionar Motorista" para configurar os destinatários</p>
            </div>
          ) : (
            <SmartOperationTable
              userId={userId}
              componentId="admin-freight-recipients"
              columns={recipientColumns}
              data={recipientDrivers}
              hideInternalSearch
              noMaxHeight
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FreightContractsSubTab;
