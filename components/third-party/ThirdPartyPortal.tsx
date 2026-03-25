
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip } from '../../types';
import { db } from '../../utils/storage';
import { Icons } from '../../constants/icons';
import UserProfile from '../dashboard/UserProfile';
import DatabaseStatus from '../dashboard/DatabaseStatus';
import SmartOperationTable from '../dashboard/operations/SmartOperationTable';

interface ThirdPartyPortalProps {
  user: User;
  onLogout: () => void;
}

const ThirdPartyPortal: React.FC<ThirdPartyPortalProps> = ({ user, onLogout }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('pt-BR'));
  
  const [startDate, setStartDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

  const loadData = useCallback(async () => {
    try {
      const allTrips = await db.getTrips();
      // Talvez filtrar viagens específicas para este terceiro? 
      // Por enquanto, mostra todas, mas com campos limitados.
      setTrips(allTrips);
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
  const allowedCategories = user.thirdPartyConfig?.allowedCategories || [];
  const allowedTypes = user.thirdPartyConfig?.allowedTypes || [];

  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      // Use local date for comparison to avoid timezone issues
      const tripDate = new Date(t.dateTime).toLocaleDateString('en-CA');
      const dateMatch = tripDate >= startDate && tripDate <= endDate;
      
      const categoryMatch = allowedCategories.includes(t.category);
      const typeMatch = allowedTypes.includes(t.type);
      
      return dateMatch && categoryMatch && typeMatch;
    }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [trips, startDate, endDate, allowedCategories, allowedTypes]);

  const getFieldLabel = (fieldId: string) => {
    const labels: Record<string, string> = {
      os_info: 'OS',
      scheduled_date: 'Data e Hora Programada',
      driver_info: 'Motorista',
      customer_info: 'Cliente',
      is_scheduled: 'Agendado',
      dropoff_location: 'Local de Baixa',
      status: 'Status',
      documents: 'Docs'
    };
    return labels[fieldId] || fieldId;
  };

  const columns = useMemo(() => {
    return visibleFields.map((fieldId: string) => ({
      key: fieldId,
      label: getFieldLabel(fieldId),
      render: (row: Trip) => {
        if (fieldId === 'status') {
          return (
            <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-tight border border-blue-100">
              {row.status}
            </span>
          );
        }
        if (fieldId === 'os_info') {
          return (
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{row.os}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">{row.category} • {row.type}</span>
            </div>
          );
        }
        if (fieldId === 'scheduled_date') {
          const dateObj = new Date(row.dateTime);
          return (
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">{dateObj.toLocaleDateString('pt-BR')}</span>
              <span className="text-[10px] text-slate-500 font-bold">{dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        }
        if (fieldId === 'driver_info') {
          if (typeof row.driver === 'object' && row.driver) {
            return (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 uppercase">{row.driver.name}</span>
                <span className="text-[10px] text-slate-500 font-bold">CPF: {row.driver.cpf || 'N/I'}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Cavalo: {row.driver.plateHorse || 'N/I'} • Carreta: {row.driver.plateTrailer || 'N/I'}</span>
              </div>
            );
          }
          return <span className="text-xs font-bold text-slate-500 uppercase">{typeof row.driver === 'string' ? row.driver : 'N/I'}</span>;
        }
        if (fieldId === 'customer_info') {
          if (typeof row.customer === 'object' && row.customer) {
            return (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 uppercase">{row.customer.name}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{row.customer.legalName || 'N/I'}</span>
                <span className="text-[10px] text-slate-500 font-bold">CNPJ: {row.customer.cnpj || 'N/I'}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{row.customer.city || 'N/I'}</span>
              </div>
            );
          }
          return <span className="text-xs font-bold text-slate-500 uppercase">{typeof row.customer === 'string' ? row.customer : 'N/I'}</span>;
        }
        if (fieldId === 'is_scheduled') {
          const isScheduled = !!row.scheduling;
          return (
            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight ${isScheduled ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
              {isScheduled ? 'SIM' : 'NÃO'}
            </span>
          );
        }
        if (fieldId === 'dropoff_location') {
          const location = row.scheduling?.location || 'N/I';
          return <span className="text-xs font-bold text-slate-500 uppercase">{location}</span>;
        }
        if (fieldId === 'documents') {
          return (
            <div className="flex gap-1">
              {row.documents?.length ? (
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tight">
                  {row.documents.length} Anexos
                </span>
              ) : (
                <span className="text-[9px] text-slate-300 font-bold uppercase">Nenhum</span>
              )}
            </div>
          );
        }
        return null;
      }
    }));
  }, [visibleFields]);

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
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Acompanhamento de Viagens</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Listagem de operações em tempo real</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <div className="flex flex-col px-3">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Inicial</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none"
                  />
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="flex flex-col px-3">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Final</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none"
                  />
                </div>
              </div>
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
            />
          )}
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
