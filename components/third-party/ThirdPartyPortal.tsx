
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip, Driver, Category, CustomStatus, TripStatus } from '../../types';
import { db } from '../../utils/storage';
import { Icons } from '../../constants/icons';
import UserProfile from '../dashboard/UserProfile';
import DatabaseStatus from '../dashboard/DatabaseStatus';
import SmartOperationTable from '../dashboard/operations/SmartOperationTable';
import { getOperationTableColumns } from '../dashboard/operations/OperationTableColumns';
import { statusService } from '../../utils/statusService';
import DocumentViewerModal from '../dashboard/operations/DocumentViewerModal';
import TripDetailsViewerModal from '../dashboard/operations/TripDetailsViewerModal';
import DriverDocsViewerModal from '../dashboard/operations/DriverDocsViewerModal';
import StatusHistoryManagerModal from '../dashboard/operations/StatusHistoryManagerModal';
import DateRangeFilter from '../dashboard/operations/DateRangeFilter';

interface ThirdPartyPortalProps {
  user: User;
  onLogout: () => void;
}

const ThirdPartyPortal: React.FC<ThirdPartyPortalProps> = ({ user, onLogout }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));
  
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isTripDetailsOpen, setIsTripDetailsOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });

  const loadData = useCallback(async () => {
    try {
      const [allTrips, allDrivers, allCategories, allStatuses] = await Promise.all([
        db.getTrips(),
        db.getDrivers(),
        db.getCategories(),
        db.getCustomStatuses()
      ]);
      
      setTrips(allTrips);
      setDrivers(allDrivers);
      setCategories(allCategories);
      setCustomStatuses(allStatuses);
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

  const visibleFields = user.thirdPartyConfig?.visibleFields || [];
  const visibleFilters = user.thirdPartyConfig?.visibleFilters || ['search', 'date_range'];
  const allowedCategories = user.thirdPartyConfig?.allowedCategories || [];
  const allowedTypes = user.thirdPartyConfig?.allowedTypes || [];

  const filteredTrips = useMemo(() => {
    let result = [...trips];

    // Filtro por Configuração do Terceiro
    result = result.filter(t => {
      const categoryMatch = allowedCategories.length === 0 || allowedCategories.includes(t.category);
      const typeMatch = allowedTypes.length === 0 || allowedTypes.includes(t.type);
      return categoryMatch && typeMatch;
    });

    // Filtro por Data
    if (startDate || endDate) {
      result = result.filter(t => {
        if (!t.dateTime) return false;
        const tripDateStr = t.dateTime.includes('T') ? t.dateTime.split('T')[0] : t.dateTime;
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
    }

    // Filtro por Busca
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.os.toLowerCase().includes(q) || 
        (t.container && t.container.toLowerCase().includes(q)) || 
        (t.driver && t.driver.name.toLowerCase().includes(q)) || 
        (t.customer && t.customer.name.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [trips, startDate, endDate, searchQuery, allowedCategories, allowedTypes]);

  const columns = useMemo(() => {
    const allCols = getOperationTableColumns(
      () => {}, // openStatusEditor (disabled)
      () => {}, // onEditTrip (disabled)
      () => {}, // onEditOC (disabled)
      () => {}, // onEditMinuta (disabled)
      (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
      () => {}, // onDeleteTrip (disabled)
      loadData,
      () => {}, // onEditScheduling (disabled)
      user,
      () => {}, // onLocateDriver (disabled)
      (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); },
      (t) => { setSelectedTrip(t); setIsHistoryModalOpen(true); },
      () => {}, // onSetPriority (disabled)
      drivers,
      categories
    );

    const allowedKeys = new Set<string>(visibleFields);
    // Sempre incluir dateTime se nenhuma for selecionada para não quebrar a tabela
    if (allowedKeys.size === 0) allowedKeys.add('dateTime');

    return allCols.filter(col => allowedKeys.has(col.key));
  }, [visibleFields, drivers, categories, loadData, user]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-40 shrink-0">
        <div className="flex items-center gap-6">
          <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/10 overflow-hidden border border-slate-100">
            <img src="/logo.jpg" alt="ALS" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Portal Externo</h1>
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
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              {visibleFilters.includes('search') && (
                <div className="flex-1 w-full max-w-md relative group">
                   <input 
                     type="text" 
                     placeholder="BUSCAR OS, CONTAINER OU MOTORISTA..."
                     className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 text-[10px] font-black uppercase focus:border-blue-500 focus:bg-white transition-all outline-none"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                   />
                   <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
              )}

              {visibleFilters.includes('date_range') && (
                <DateRangeFilter startDate={startDate} onStartDateChange={setStartDate} endDate={endDate} onEndDateChange={setEndDate} onClear={() => { setStartDate(''); setEndDate(''); }} />
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-20 text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando dados...</p>
            </div>
          ) : visibleFields.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-amber-200 shadow-sm p-20 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h3>
              <p className="text-sm font-bold text-slate-500 max-w-md">
                Você não possui colunas liberadas para visualização. Por favor, solicite a liberação de visualização de dados ao administrador do sistema.
              </p>
            </div>
          ) : (
            <SmartOperationTable 
              userId={user.id}
              componentId="third-party-portal-table"
              columns={columns}
              data={filteredTrips}
              title="Viagens"
              onRowClick={(t) => { setSelectedTrip(t); setIsTripDetailsOpen(true); }}
            />
          )}
        </div>
      </main>

      <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-center px-10 shrink-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
          ALS Transportes © 2026 • Sistema de Gestão Logística
        </p>
      </footer>

      {/* Modais de Visualização */}
      <DocumentViewerModal 
        isOpen={isDocViewerOpen} 
        onClose={() => setIsDocViewerOpen(false)} 
        url={previewDocData.url} 
        title={previewDocData.title} 
      />
      
      {isTripDetailsOpen && selectedTrip && (
        <TripDetailsViewerModal 
          isOpen={isTripDetailsOpen} 
          onClose={() => setIsTripDetailsOpen(false)} 
          trip={selectedTrip} 
          user={user} 
          onManageHistory={() => setIsHistoryModalOpen(true)}
        />
      )}

      {isDriverDocsModalOpen && selectedTrip && (
        <DriverDocsViewerModal 
          isOpen={isDriverDocsModalOpen} 
          onClose={() => setIsDriverDocsModalOpen(false)} 
          trip={selectedTrip} 
          user={user} 
          onSuccess={loadData} 
        />
      )}

      {isHistoryModalOpen && selectedTrip && (
        <StatusHistoryManagerModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)} 
          trip={selectedTrip} 
          allTrips={trips} 
          user={user} 
          onSuccess={loadData} 
        />
      )}
    </div>
  );
};

export default ThirdPartyPortal;
