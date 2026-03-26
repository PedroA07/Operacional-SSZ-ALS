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
  const visibleFields = user.thirdPartyConfig?.visibleFields || ['os', 'container', 'status', 'dateTime', 'driver', 'customer', 'destination', 'category', 'type'];

  // Estados para o filtro de data
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filtra as viagens com base nas configurações de acesso do usuário e no filtro de data
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // Aplica os filtros de categoria e tipo permitidos, se definidos
      const allowedCategories = user.thirdPartyConfig?.allowedCategories;
      const allowedTypes = user.thirdPartyConfig?.allowedTypes;
      
      if (allowedCategories && allowedCategories.length > 0 && !allowedCategories.includes(trip.category)) return false;
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(trip.type)) return false;
      
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
  }, [trips, user.thirdPartyConfig, startDate, endDate]);

  // Define as colunas disponíveis para a tabela inteligente (SmartOperationTable)
  const columns = useMemo(() => {
    const allColumns = [
      { 
        key: 'dateTime', 
        label: 'Data', 
        render: (t: Trip) => {
          if (!t.dateTime) return '---';
          try {
            const d = new Date(t.dateTime);
            if (isNaN(d.getTime())) return t.dateTime;
            return new Intl.DateTimeFormat('pt-BR', { 
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }).format(d);
          } catch {
            return t.dateTime;
          }
        }
      },
      { 
        key: 'os', 
        label: 'OS', 
        sortValue: (t: Trip) => t.os,
        render: (t: Trip) => <span className="font-black text-slate-900 text-[9px]">{t.os}</span>
      },
      { 
        key: 'container', 
        label: 'Container', 
        sortValue: (t: Trip) => t.container || '',
        render: (t: Trip) => <span className="text-[9px] font-bold text-blue-500 uppercase">{t.container || '---'}</span>
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
        render: (t: Trip) => <span className="font-bold text-slate-600 uppercase leading-none text-[9px]">{t.driver?.name || '---'}</span>
      },
      { 
        key: 'customer', 
        label: 'Cliente', 
        sortValue: (t: Trip) => t.customer?.name || '',
        render: (t: Trip) => <span className="font-black text-slate-800 uppercase text-[9px]">{t.customer?.name || '---'}</span>
      },
      { 
        key: 'destination', 
        label: 'Destino', 
        sortValue: (t: Trip) => t.destination?.name || '',
        render: (t: Trip) => <span className="font-black text-slate-800 uppercase text-[9px]">{t.destination?.name || '---'}</span>
      },
      { 
        key: 'category', 
        label: 'Categoria', 
        sortValue: (t: Trip) => t.category || '',
        render: (t: Trip) => <span className="text-[9px] font-bold text-slate-600 uppercase">{t.category || '---'}</span>
      },
      { 
        key: 'type', 
        label: 'Tipo', 
        sortValue: (t: Trip) => t.type || '',
        render: (t: Trip) => <span className="text-[9px] font-bold text-slate-600 uppercase">{t.type || '---'}</span>
      }
    ];

    return allColumns.filter(col => visibleFields.includes(col.key));
  }, [visibleFields]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Portal de Viagens</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Acompanhamento de Operações</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
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
      />
    </div>
  );
};

export default ExternalPortal;
