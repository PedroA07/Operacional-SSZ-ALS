import React, { useMemo, useState } from 'react';
import { Trip, User } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import DatePicker from '../../shared/DatePicker';

interface ExternalPortalProps {
  user: User;
  trips: Trip[];
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
    case 'orgDevolucoes':
      return t.includes('DEVOLU');
    default:
      return true;
  }
};

const PAGE_LABELS: Record<string, { label: string; color: string; activeClass: string }> = {
  orgColeta:    { label: 'Coleta / Export',  color: 'blue',    activeClass: 'bg-white text-blue-600 shadow-sm' },
  orgEntrega:   { label: 'Entrega / Import', color: 'emerald', activeClass: 'bg-white text-emerald-600 shadow-sm' },
  orgDevolucoes: { label: 'Devoluções',       color: 'orange',  activeClass: 'bg-white text-orange-600 shadow-sm' },
};

const ExternalPortal: React.FC<ExternalPortalProps> = ({ user, trips }) => {
  const todayLocal = getLocalDateStr();

  const [startDate, setStartDate]   = useState<string>(todayLocal);
  const [endDate, setEndDate]       = useState<string>(todayLocal);
  const [searchQuery, setSearchQuery] = useState<string>('');

  /* Which pages are enabled for this user */
  const enabledPages = useMemo(() => {
    const pages = user.thirdPartyConfig?.pages;
    if (!pages) return [];
    return (['orgColeta', 'orgEntrega', 'orgDevolucoes'] as const).filter(k => pages[k]?.enabled);
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

  /* Base trip filtering (date + search + legacy allowedCategories/Types) */
  const baseFiltered = useMemo(() => {
    let result = trips.filter(trip => {
      if (isLegacyMode) {
        const allowedCategories = user.thirdPartyConfig?.allowedCategories;
        const allowedTypes = user.thirdPartyConfig?.allowedTypes;
        if (allowedCategories?.length) {
          const cat = (trip.category || '').trim().toLowerCase();
          if (!allowedCategories.some(c => c.trim().toLowerCase() === cat)) return false;
        }
        if (allowedTypes?.length) {
          const typ = (trip.type || '').trim().toLowerCase();
          if (!allowedTypes.some(t => t.trim().toLowerCase() === typ)) return false;
        }
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

    /* Devoluções-specific columns */
    if (isDevPage) {
      const devCols = [
        fields.includes('container') && {
          key: 'container', label: 'Container',
          sortValue: (t: Trip) => t.container || '',
          render: (t: Trip) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-black text-blue-600 uppercase">{t.container || <span className="text-slate-300 italic font-normal text-[9px]">—</span>}</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase">{t.os}</span>
            </div>
          ),
        },
        fields.includes('destination') && {
          key: 'destination', label: 'Local / Depósito',
          sortValue: (t: Trip) => t.destination?.name || '',
          render: (t: Trip) => renderLocation(t.destination),
        },
        fields.includes('driver') && {
          key: 'driver', label: 'Motorista',
          sortValue: (t: Trip) => t.driver?.name || '',
          render: (t: Trip) => (
            <div className="flex flex-col gap-0.5">
              <span className="font-black text-slate-800 text-[10px] uppercase">{t.driver?.name || <span className="text-slate-300 italic font-normal">—</span>}</span>
              {t.driver?.plateHorse && <span className="px-1.5 py-0.5 bg-slate-800 text-white rounded-md text-[8px] font-black w-fit">{t.driver.plateHorse}</span>}
            </div>
          ),
        },
        fields.includes('scheduledDateTime') && {
          key: 'scheduledDateTime', label: 'Agendamento',
          sortValue: (t: Trip) => t.scheduledDateTime || '',
          render: (t: Trip) => {
            if (!t.scheduledDateTime) return <span className="text-[9px] text-slate-300 italic">—</span>;
            try {
              const d = new Date(t.scheduledDateTime);
              const dt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
              return <span className="px-2 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-[9px] font-black">{dt}</span>;
            } catch { return t.scheduledDateTime; }
          },
        },
        fields.includes('agendamentoDoc') && {
          key: 'agendamentoDoc', label: 'Comprovante',
          render: (t: Trip) => t.agendamentoDoc
            ? <a href={t.agendamentoDoc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[8px] font-black text-emerald-700 hover:bg-emerald-100 transition-colors">
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
    const all = filteredTrips;
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

      <div className="p-6">
        <SmartOperationTable
          userId={user.id}
          componentId={`external_portal_${currentPageKey || 'legacy'}`}
          columns={columns}
          data={filteredTrips}
          defaultVisibleKeys={currentPageFields}
          noMaxHeight={true}
          stickyHeaderTop={enabledPages.length > 1 ? 192 : 148}
        />
      </div>
    </div>
  );
};

export default ExternalPortal;
