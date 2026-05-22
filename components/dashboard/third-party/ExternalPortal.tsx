import React, { useMemo, useState } from 'react';
import { Trip, User, Devolucao, Customer } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import DatePicker from '../../shared/DatePicker';
import { db } from '../../../utils/storage';

interface ExternalPortalProps {
  user: User;
  trips: Trip[];
  devolucoes?: Devolucao[];
  customers?: Customer[];
  onInserted?: () => void;
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
};

const normContainer = (s: string) => s.toUpperCase().replace(/\s/g, '');

const ExternalPortal: React.FC<ExternalPortalProps> = ({ user, trips, devolucoes = [], customers = [], onInserted }) => {
  const todayLocal = getLocalDateStr();

  const [startDate, setStartDate]   = useState<string>(todayLocal);
  const [endDate, setEndDate]       = useState<string>(todayLocal);
  const [searchQuery, setSearchQuery] = useState<string>('');

  /* ── Insert form state ───────────────────────────────────────── */
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertForm, setInsertForm] = useState({
    container: '', local: '', dateTime: '', os: '', customerSearch: '', selectedCustomerId: '',
  });
  const [insertSaving, setInsertSaving] = useState(false);
  const [insertError, setInsertError]   = useState('');
  const [insertSuccess, setInsertSuccess] = useState(false);

  const canInsertDevolucao = !!(user.thirdPartyConfig?.allowInsertDevolucao && user.thirdPartyConfig?.pages?.orgDevolucoes?.enabled);

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
    return (['orgColeta', 'orgEntrega', 'orgColetaEntrega', 'orgDevolucoes'] as const).filter(k => pages[k]?.enabled);
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
            ? <a href={d.agendamentoDoc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[8px] font-black text-emerald-700 hover:bg-emerald-100 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Ver
              </a>
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
      </div>

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
    </div>
  );
};

export default ExternalPortal;
