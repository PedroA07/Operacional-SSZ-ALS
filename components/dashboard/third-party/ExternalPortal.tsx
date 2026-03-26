import React, { useMemo, useState } from 'react';
import { Trip, User } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';

interface ExternalPortalProps {
  user: User;
  trips: Trip[];
}

// Componente principal do Portal Externo
// Aqui renderizamos a tabela de viagens para usuários externos (clientes/terceiros)
const ExternalPortal: React.FC<ExternalPortalProps> = ({ user, trips }) => {
  // Define quais colunas serão exibidas com base na configuração do usuário.
  // Se não houver configuração, usa um padrão.
  const visibleFields = user.thirdPartyConfig?.visibleFields || ['os', 'container', 'status', 'dateTime', 'driver', 'customer', 'isScheduled', 'destination', 'category', 'type'];

  // Define a data atual no formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // Estados para o filtro de data e busca
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtra as viagens com base nas configurações de acesso do usuário e no filtro de data
  const filteredTrips = useMemo(() => {
    let result = trips.filter(trip => {
      // Aplica os filtros de categoria e tipo permitidos, se definidos (ignorando case e espaços)
      const allowedCategories = user.thirdPartyConfig?.allowedCategories;
      const allowedTypes = user.thirdPartyConfig?.allowedTypes;
      
      if (allowedCategories && allowedCategories.length > 0) {
        const tripCat = (trip.category || '').trim().toLowerCase();
        const hasMatch = allowedCategories.some(c => c.trim().toLowerCase() === tripCat);
        if (!hasMatch) return false;
      }
      
      if (allowedTypes && allowedTypes.length > 0) {
        const tripType = (trip.type || '').trim().toLowerCase();
        const hasMatch = allowedTypes.some(t => t.trim().toLowerCase() === tripType);
        if (!hasMatch) return false;
      }
      
      // Filtro de data
      if (!trip.dateTime) return false;
      const tripDateStr = trip.dateTime.includes('T') ? trip.dateTime.split('T')[0] : trip.dateTime;
      let normalizedTripDate = tripDateStr;
      
      // Normaliza a data caso venha no formato DD/MM/YYYY
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

  // Define as colunas disponíveis para a tabela inteligente (SmartOperationTable)
  const columns = useMemo(() => {
    const renderLocation = (loc: any) => {
      if (!loc) return <span className="text-[9px] text-slate-400">---</span>;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-slate-800 text-[10px] uppercase">{loc.name || '---'}</span>
          {loc.legalName && <span className="text-[9px] text-slate-500 uppercase">{loc.legalName}</span>}
          {loc.cnpj && <span className="text-[9px] text-slate-500">CNPJ: {loc.cnpj}</span>}
          {(loc.city || loc.state || loc.neighborhood) && (
            <span className="text-[9px] text-slate-500 uppercase">
              {[loc.neighborhood, loc.city, loc.state].filter(Boolean).join(' - ')}
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
          if (!t.dateTime) return '---';
          try {
            const d = new Date(t.dateTime);
            if (isNaN(d.getTime())) return t.dateTime;
            
            const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }).format(d);

            const tripDateStr = t.dateTime.includes('T') ? t.dateTime.split('T')[0] : t.dateTime.split(' ')[0];
            let normalized = tripDateStr;
            if (tripDateStr.includes('/')) {
              const parts = tripDateStr.split('/');
              if (parts.length === 3) normalized = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }

            const todayStr = new Date().toISOString().split('T')[0];
            
            let colorClass = "text-slate-600";
            let bgClass = "";
            
            if (normalized < todayStr) {
              colorClass = "text-red-700";
              bgClass = "bg-red-50 px-1.5 py-0.5 rounded";
            } else if (normalized === todayStr) {
              colorClass = "text-emerald-700";
              bgClass = "bg-emerald-50 px-1.5 py-0.5 rounded";
            } else {
              colorClass = "text-blue-700";
              bgClass = "bg-blue-50 px-1.5 py-0.5 rounded";
            }

            return <span className={`font-bold text-[10px] ${colorClass} ${bgClass}`}>{formattedDate}</span>;
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
            <div className="flex flex-col gap-1">
              <span className="font-black text-slate-900 text-[10px]">{t.os}</span>
              {(showCat || showType) && (
                <div className="flex flex-wrap gap-1">
                  {showCat && t.category && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-bold uppercase">{t.category}</span>}
                  {showType && t.type && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[8px] font-bold uppercase">{t.type}</span>}
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
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-blue-600 uppercase">{t.container || 'SEM CONTAINER'}</span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {t.containerType && <span className="px-1 py-0.5 bg-slate-100 rounded text-[8px] font-bold text-slate-600">{t.containerType}</span>}
              {t.tara && <span className="px-1 py-0.5 bg-slate-100 rounded text-[8px] font-bold text-slate-600">TARA: {t.tara}</span>}
              {t.seal && <span className="px-1 py-0.5 bg-slate-100 rounded text-[8px] font-bold text-slate-600">LACRE: {t.seal}</span>}
            </div>
          </div>
        )
      },
      { 
        key: 'status', 
        label: 'Status', 
        sortValue: (t: Trip) => t.status || '',
        render: (t: Trip) => <span className="text-[9px] font-bold text-slate-600 uppercase">{t.status || '---'}</span>
      },
      { 
        key: 'driver', 
        label: 'Motorista', 
        sortValue: (t: Trip) => t.driver?.name || '',
        render: (t: Trip) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-800 text-[10px] uppercase">{t.driver?.name || '---'}</span>
            {t.driver?.cpf && <span className="text-[9px] text-slate-500">CPF: {t.driver.cpf}</span>}
            <div className="flex gap-1 mt-0.5">
              {t.driver?.plateHorse && <span className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[8px] font-bold text-slate-600">CAV: {t.driver.plateHorse}</span>}
              {t.driver?.plateTrailer && <span className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[8px] font-bold text-slate-600">CAR: {t.driver.plateTrailer}</span>}
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
        key: 'isScheduled', 
        label: 'Agendamento', 
        sortValue: (t: Trip) => t.isScheduled ? 'SIM' : 'NÃO',
        render: (t: Trip) => (
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${t.isScheduled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
            <span className={`text-[9px] font-black uppercase ${t.isScheduled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {t.isScheduled ? 'Agendado' : 'Não Agendado'}
            </span>
          </div>
        )
      },
      { 
        key: 'destination', 
        label: 'Destino', 
        sortValue: (t: Trip) => t.destination?.name || '',
        render: (t: Trip) => renderLocation(t.destination)
      }
    ];

    return allColumns.filter(col => {
      if (col.key === 'category' || col.key === 'type') return false;
      return visibleFields.includes(col.key);
    });
  }, [visibleFields]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Portal de Viagens</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Acompanhamento de Operações</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="BUSCAR OS, CONTAINER..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-[10px] font-black uppercase focus:border-blue-500 transition-all outline-none shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
            <div className="flex items-center gap-2 px-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[10px] font-black text-slate-600 outline-none bg-transparent uppercase cursor-pointer"
              />
            </div>
            <span className="text-slate-300 font-black text-[10px]">ATÉ</span>
            <div className="flex items-center gap-2 px-2">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[10px] font-black text-slate-600 outline-none bg-transparent uppercase cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <SmartOperationTable 
        userId={user.id}
        componentId="external_portal_table"
        columns={columns}
        data={filteredTrips}
        defaultVisibleKeys={visibleFields}
        noMaxHeight={true}
      />
    </div>
  );
};

export default ExternalPortal;
