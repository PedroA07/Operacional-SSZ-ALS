
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip, Category, OperationType } from '../../types';
import { db } from '../../utils/storage';
import { Icons } from '../../constants/icons';
import UserProfile from '../dashboard/UserProfile';
import DatabaseStatus from '../dashboard/DatabaseStatus';
import SmartOperationTable from '../dashboard/operations/SmartOperationTable';
import { EquipmentColumn } from '../dashboard/operations/columns/EquipmentColumn';

interface ThirdPartyPortalProps {
  user: User;
  onLogout: () => void;
}

const ThirdPartyPortal: React.FC<ThirdPartyPortalProps> = ({ user, onLogout }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));
  
  // Filtros de Data
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]);

  const loadData = useCallback(async () => {
    try {
      const [allTrips, allPorts, allPreStacking, allCats, allTypes] = await Promise.all([
        db.getTrips(),
        db.getPorts(),
        db.getPreStacking(),
        db.getCategories(),
        db.getOperationTypes()
      ]);
      
      setTrips(allTrips);
      setCategories(allCats);
      setOperationTypes(allTypes);
      
      const processedLocations = [
        ...allPorts,
        ...allPreStacking
      ];
      setLocations(processedLocations);
      
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (error) {
      console.error("Erro ao carregar dados para terceiro:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const visibleFields = user.thirdPartyConfig?.visibleFields || ['os', 'status', 'dateTime'];
  const allowedCategories = user.thirdPartyConfig?.allowedCategories || [];
  const allowedTypes = user.thirdPartyConfig?.allowedTypes || [];

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      // Filtro de Busca
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        (t.os || '').toLowerCase().includes(searchLower) ||
        (t.container || '').toLowerCase().includes(searchLower) ||
        (t.booking || '').toLowerCase().includes(searchLower)
      );

      if (!matchesSearch) return false;

      // Filtro de Data
      if (t.dateTime) {
        const tripDate = t.dateTime.split('T')[0];
        if (startDate && tripDate < startDate) return false;
        if (endDate && tripDate > endDate) return false;
      }

      // Filtro de Configuração do Terceiro (Categorias)
      if (allowedCategories.length > 0) {
        if (!t.category || !allowedCategories.includes(t.category)) return false;
      }

      // Filtro de Configuração do Terceiro (Tipos)
      if (allowedTypes.length > 0) {
        if (!t.type || !allowedTypes.includes(t.type)) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
      const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
      return dateB - dateA;
    });
  }, [trips, searchTerm, startDate, endDate, allowedCategories, allowedTypes]);

  const columns = useMemo(() => {
    const allCols = [
      {
        key: 'dateTime',
        label: 'Data e Hora',
        render: (t: Trip) => (
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-700 uppercase">
              {t.dateTime ? new Date(t.dateTime).toLocaleDateString('pt-BR') : '---'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
              {t.dateTime ? new Date(t.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '---'}
            </span>
          </div>
        )
      },
      {
        key: 'os',
        label: 'Operação',
        render: (t: Trip) => (
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{t.os || '---'}</span>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-50 px-1.5 py-0.5 rounded">{t.category || '---'}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{t.type || '---'}</span>
            </div>
          </div>
        )
      },
      {
        key: 'container',
        label: 'Equipamento',
        render: (t: Trip) => EquipmentColumn(t)
      },
      {
        key: 'customer',
        label: 'Local de Atendimento',
        render: (t: Trip) => (
          t.customer && typeof t.customer === 'object' ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-black text-slate-700 uppercase">{t.customer.name || '---'}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{t.customer.legalName || '---'}</span>
              <div className="flex gap-2 mt-0.5">
                <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">CNPJ: {t.customer.cnpj || '---'}</span>
                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {t.customer.city || '---'}{t.customer.state ? `/${t.customer.state}` : ''}
                </span>
              </div>
            </div>
          ) : <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{t.customer || '---'}</span>
        )
      },
      {
        key: 'destination',
        label: 'Destino',
        render: (t: Trip) => (
          t.destination && typeof t.destination === 'object' ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-black text-slate-700 uppercase">{t.destination.name || '---'}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{t.destination.legalName || '---'}</span>
              <div className="flex gap-2 mt-0.5">
                <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">CNPJ: {t.destination.cnpj || '---'}</span>
                <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {t.destination.city || '---'}{t.destination.state ? `/${t.destination.state}` : ''}
                </span>
              </div>
            </div>
          ) : <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{t.destination || '---'}</span>
        )
      },
      {
        key: 'isScheduled',
        label: 'Agendado',
        render: (t: Trip) => (
          <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border ${
            t.isScheduled 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
              : 'bg-slate-50 text-slate-400 border-slate-100'
          }`}>
            {t.isScheduled ? 'SIM' : 'NÃO'}
          </span>
        )
      },
      {
        key: 'schedulingLocation',
        label: 'Local Agend.',
        render: (t: Trip) => {
          const schedulingLoc = t.scheduledLocationId 
            ? locations.find(l => l.id === t.scheduledLocationId)
            : null;
          
          return schedulingLoc ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-black text-slate-700 uppercase">{schedulingLoc.name || '---'}</span>
              <div className="flex gap-2 mt-0.5">
                <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">CNPJ: {schedulingLoc.cnpj || '---'}</span>
              </div>
            </div>
          ) : <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{t.scheduling?.location || '---'}</span>;
        }
      },
      {
        key: 'status',
        label: 'Status',
        render: (t: Trip) => (
          <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-tight border border-blue-100">
            {t.status}
          </span>
        )
      }
    ];

    // Filtra colunas baseado na configuração de visibilidade do terceiro
    return allCols.filter(col => {
      // Se não houver configuração, mostra apenas as colunas padrão
      if (!visibleFields || visibleFields.length === 0) {
        return ['dateTime', 'os', 'status'].includes(col.key);
      }
      // Caso contrário, mostra apenas as colunas configuradas
      return visibleFields.includes(col.key);
    });
  }, [visibleFields, locations]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-40 shrink-0">
        <div className="flex items-center gap-6">
          <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/10 overflow-hidden border border-slate-100">
            <img src="/logo.jpg" alt="ALS" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Portal do Terceiro</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">ALS Transportes • Acesso Externo</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sincronizado: {lastSyncTime}</span>
          </div>
          <DatabaseStatus />
          <div className="h-8 w-px bg-slate-200"></div>
          <UserProfile user={user} />
          <button 
            onClick={onLogout}
            className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-transparent hover:border-red-100"
            title="Sair"
          >
            <Icons.Logout className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Filtros de Topo */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pesquisar</label>
              <div className="relative">
                <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="OS, Container ou Booking..."
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-2 w-full md:w-48">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Inicial</label>
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-2 w-full md:w-48">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Final</label>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              />
            </div>

            <button 
              onClick={loadData}
              className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
              title="Atualizar"
            >
              <Icons.Refresh className="w-5 h-5" />
            </button>
          </div>

          <SmartOperationTable 
            userId={user.id}
            componentId="third-party-portal"
            title="Acompanhamento de Viagens"
            data={filteredTrips}
            columns={columns}
            hideInternalSearch={true} // Já temos a busca externa
          />
        </div>
      </main>

      <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-center px-10 shrink-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
          ALS Transportes © 2026 • Sistema de Gestão Logística
        </p>
      </footer>
    </div>
  );
};

export default ThirdPartyPortal;
