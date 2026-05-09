import React, { useMemo, useState } from 'react';
import { Trip, User } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import DatePicker from '../../shared/DatePicker';

interface ExternalPortalProps {
  user: User;
  trips: Trip[];
}

// Retorna a data local no formato YYYY-MM-DD (sem depender de UTC)
const getLocalDateStr = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ExternalPortal: React.FC<ExternalPortalProps> = ({ user, trips }) => {
  const visibleFields = user.thirdPartyConfig?.visibleFields || ['os', 'container', 'status', 'dateTime', 'driver', 'customer', 'destination', 'category', 'type'];

  const todayLocal = getLocalDateStr();

  const [startDate, setStartDate] = useState<string>(todayLocal);
  const [endDate, setEndDate] = useState<string>(todayLocal);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTrips = useMemo(() => {
    let result = trips.filter(trip => {
      const allowedCategories = user.thirdPartyConfig?.allowedCategories;
      const allowedTypes = user.thirdPartyConfig?.allowedTypes;

      if (allowedCategories && allowedCategories.length > 0) {
        const tripCat = (trip.category || '').trim().toLowerCase();
        if (!allowedCategories.some(c => c.trim().toLowerCase() === tripCat)) return false;
      }

      if (allowedTypes && allowedTypes.length > 0) {
        const tripType = (trip.type || '').trim().toLowerCase();
        if (!allowedTypes.some(t => t.trim().toLowerCase() === tripType)) return false;
      }

      if (!trip.dateTime) return false;
      const tripDateStr = trip.dateTime.includes('T') ? trip.dateTime.split('T')[0] : trip.dateTime;
      let normalizedTripDate = tripDateStr;

      if (tripDateStr.includes('/')) {
        const parts = tripDateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          normalizedTripDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      if (startDate && normalizedTripDate < startDate) return false;
      if (endDate && normalizedTripDate > endDate) return false;
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.os.toLowerCase().includes(q) ||
        (t.container && t.container.toLowerCase().includes(q)) ||
        (t.driver && t.driver.name.toLowerCase().includes(q)) ||
        (t.customer && t.customer.name.toLowerCase().includes(q)) ||
        (t.destination && t.destination.name.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips, user.thirdPartyConfig, startDate, endDate, searchQuery]);

  const columns = useMemo(() => {
    const renderLocation = (loc: any) => {
      if (!loc) return <span className="text-[9px] text-slate-300 italic">—</span>;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-slate-800 text-[10px] uppercase leading-tight">{loc.name || '---'}</span>
          {loc.legalName && <span className="text-[9px] text-slate-400 uppercase leading-tight">{loc.legalName}</span>}
          {loc.cnpj && <span className="text-[9px] text-slate-400">CNPJ: {loc.cnpj}</span>}
          {(loc.city || loc.state) && (
            <span className="text-[8px] text-slate-400 uppercase mt-0.5">
              {[loc.city, loc.state].filter(Boolean).join(' - ')}
            </span>
          )}
        </div>
      );
    };

    const allColumns = [
      {
        key: 'dateTime',
        label: 'Data',
        render: (t: Trip) => {
          if (!t.dateTime) return <span className="text-slate-300">—</span>;
          try {
            const d = new Date(t.dateTime);
            if (isNaN(d.getTime())) return t.dateTime;

            const formattedDate = new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric'
            }).format(d);
            const formattedTime = new Intl.DateTimeFormat('pt-BR', {
              hour: '2-digit', minute: '2-digit'
            }).format(d);

            const tripDateStr = t.dateTime.includes('T') ? t.dateTime.split('T')[0] : t.dateTime.split(' ')[0];
            let normalized = tripDateStr;
            if (tripDateStr.includes('/')) {
              const parts = tripDateStr.split('/');
              if (parts.length === 3) normalized = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }

            const isPast = normalized < todayLocal;
            const isToday = normalized === todayLocal;

            return (
              <div className="flex flex-col gap-1">
                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-lg w-fit
                  ${isPast ? 'bg-red-50 text-red-600' : isToday ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                  <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  {formattedDate}
                </span>
                <span className="text-[9px] text-slate-400 font-bold pl-1">{formattedTime}</span>
              </div>
            );
          } catch {
            return t.dateTime;
          }
        }
      },
      {
        key: 'os',
        label: 'Identificação',
        sortValue: (t: Trip) => t.os,
        render: (t: Trip) => {
          const showCat = visibleFields.includes('category');
          const showType = visibleFields.includes('type');
          return (
            <div className="flex flex-col gap-1.5">
              <span className="font-black text-slate-900 text-[11px] tracking-tight">{t.os}</span>
              {(showCat || showType) && (
                <div className="flex flex-wrap gap-1">
                  {showCat && t.category && (
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase border border-indigo-100">
                      {t.category}
                    </span>
                  )}
                  {showType && t.type && (
                    <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded-md text-[8px] font-black uppercase border border-violet-100">
                      {t.type}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        }
      },
      {
        key: 'container',
        label: 'Equipamento',
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
        )
      },
      {
        key: 'status',
        label: 'Status',
        sortValue: (t: Trip) => t.status || '',
        render: (t: Trip) => {
          const history = t.statusHistory;
          if (!history || history.length === 0) {
            return <span className="text-[9px] font-bold text-slate-400 uppercase italic">—</span>;
          }
          const sorted = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const isCompleted = t.isCompleted || sorted[0]?.status === 'Viagem concluída';

          const getStyle = (status: string, isLatest: boolean) => {
            if (status === 'Viagem concluída' || isCompleted) {
              return isLatest
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200 border-emerald-400 scale-[1.03]'
                : 'bg-emerald-50 text-emerald-600 border-emerald-100';
            }
            if (status === 'Viagem cancelada') {
              return isLatest
                ? 'bg-red-500 text-white shadow-sm shadow-red-200 border-red-400'
                : 'bg-red-50 text-red-500 border-red-100';
            }
            return isLatest
              ? 'bg-blue-500 text-white shadow-sm shadow-blue-200 border-blue-400 scale-[1.03]'
              : 'bg-slate-50 text-slate-400 border-slate-100';
          };

          return (
            <div className="flex flex-col gap-1 py-0.5">
              {sorted.map((entry, idx) => (
                <div
                  key={idx}
                  className={`px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-wide transition-all ${getStyle(entry.status, idx === 0)}`}
                >
                  {entry.status}
                </div>
              ))}
            </div>
          );
        }
      },
      {
        key: 'driver',
        label: 'Motorista',
        sortValue: (t: Trip) => t.driver?.name || '',
        render: (t: Trip) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-black text-slate-800 text-[10px] uppercase leading-tight">{t.driver?.name || <span className="text-slate-300 italic font-normal">—</span>}</span>
            {t.driver?.cpf && <span className="text-[8px] text-slate-400 font-mono">CPF {t.driver.cpf}</span>}
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {t.driver?.plateHorse && (
                <span className="px-1.5 py-0.5 bg-slate-800 text-white rounded-md text-[8px] font-black tracking-widest">
                  {t.driver.plateHorse}
                </span>
              )}
              {t.driver?.plateTrailer && (
                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[8px] font-black tracking-widest">
                  {t.driver.plateTrailer}
                </span>
              )}
            </div>
          </div>
        )
      },
      {
        key: 'customer',
        label: 'Local de Atendimento',
        sortValue: (t: Trip) => t.customer?.name || '',
        render: (t: Trip) => renderLocation(t.customer)
      },
      {
        key: 'destination',
        label: 'Destino',
        sortValue: (t: Trip) => t.destination?.name || '',
        render: (t: Trip) => renderLocation(t.destination)
      },
      {
        key: 'scheduling',
        label: 'Agendamento',
        sortValue: (t: Trip) => t.scheduling?.dateTime || '',
        render: (t: Trip) => {
          const s = t.scheduling;
          if (!s) return <span className="text-[9px] text-slate-300 italic">—</span>;
          let formattedDate = '';
          let formattedTime = '';
          if (s.dateTime) {
            try {
              const d = new Date(s.dateTime);
              if (!isNaN(d.getTime())) {
                formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
                formattedTime = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
              }
            } catch {}
          }
          return (
            <div className="flex flex-col gap-1">
              {s.location && (
                <span className="font-black text-slate-800 text-[10px] uppercase leading-tight">{s.location}</span>
              )}
              {formattedDate && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[8px] font-black">{formattedDate}</span>
                  {formattedTime && (
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-bold">{formattedTime}</span>
                  )}
                </div>
              )}
              {s.obs && <span className="text-[8px] text-slate-400 italic leading-tight mt-0.5">{s.obs}</span>}
            </div>
          );
        }
      }
    ];

    return allColumns.filter(col => {
      // category e type são embutidos na coluna 'os'
      if (col.key === 'category' || col.key === 'type') return false;
      return visibleFields.includes(col.key);
    });
  }, [visibleFields, todayLocal]);

  // Contagem de viagens por estado de data para os cards de resumo
  const stats = useMemo(() => {
    const all = filteredTrips;
    const today = all.filter(t => {
      const ds = t.dateTime?.includes('T') ? t.dateTime.split('T')[0] : t.dateTime?.split(' ')[0] || '';
      let norm = ds;
      if (ds.includes('/')) {
        const p = ds.split('/');
        norm = p.length === 3 ? `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}` : ds;
      }
      return norm === todayLocal;
    }).length;
    const completed = all.filter(t => t.isCompleted || t.status === 'Viagem concluída').length;
    const pending = all.filter(t => !t.isCompleted && t.status !== 'Viagem cancelada').length;
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
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">
                Acompanhamento de Operações em Tempo Real
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Busca */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar OS, container, motorista..."
                  className="w-full sm:w-64 pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700 placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-50 outline-none transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Filtro de data */}
              <div className="flex items-center gap-2">
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Data início..."
                  maxDate={endDate || undefined}
                  className="w-36"
                  inputClassName="py-2 text-[10px]"
                />
                <span className="text-[9px] font-black text-slate-300">→</span>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Data fim..."
                  minDate={startDate || undefined}
                  className="w-36"
                  inputClassName="py-2 text-[10px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="px-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <div>
              <p className="text-[18px] font-black text-slate-900 leading-none">{stats.total}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Total</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p className="text-[18px] font-black text-slate-900 leading-none">{stats.completed}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Concluídas</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p className="text-[18px] font-black text-slate-900 leading-none">{stats.pending}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Em Andamento</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-[18px] font-black text-slate-900 leading-none">{stats.today}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Hoje</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela — sem scroll interno, cresce com o conteúdo */}
      <div className="p-6">
        <SmartOperationTable
          userId={user.id}
          componentId="external_portal_table"
          columns={columns}
          data={filteredTrips}
          defaultVisibleKeys={visibleFields}
          noMaxHeight={true}
          stickyHeaderTop={148}
        />
      </div>
    </div>
  );
};

export default ExternalPortal;
