import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trip, Port, PreStacking, TripStatus } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { organizationService } from '../../services/organizationService';
import { advanceService } from '../../services/advanceService';
import { db } from '../../utils/storage';
import FeedbackModal from '../shared/FeedbackModal';

interface OrganizationTabProps {
  userId: string;
}

const OrganizationTab: React.FC<OrganizationTabProps> = ({ userId }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedTrips, fetchedLocations] = await Promise.all([
        organizationService.fetchOperations(),
        organizationService.fetchLocations()
      ]);
      setTrips(fetchedTrips);
      setLocations(fetchedLocations);
    } catch (error) {
      console.error("Erro ao carregar dados da organização:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleNF = useCallback(async (trip: Trip, checked: boolean) => {
    const updatedTrip = { ...trip, sentNF: checked };
    await db.saveTrip(updatedTrip);
    setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
  }, []);

  const handleToggleScheduled = useCallback(async (trip: Trip, checked: boolean) => {
    const updatedTrip = { ...trip, isScheduled: checked };
    await db.saveTrip(updatedTrip);
    setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
  }, []);

  const handleLocationChange = useCallback(async (trip: Trip, locationId: string) => {
    const updatedTrip = { ...trip, scheduledLocationId: locationId };
    await db.saveTrip(updatedTrip);
    setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
  }, []);

  const handleDateTimeChange = useCallback(async (trip: Trip, dateTime: string) => {
    const updatedTrip = { ...trip, scheduledDateTime: dateTime };
    await db.saveTrip(updatedTrip);
    setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
  }, []);

  const handleToggleAdvance = useCallback(async (trip: Trip, checked: boolean) => {
    const success = await advanceService.toggleAdvance(trip, checked);
    if (success) {
      setTrips(prev => prev.map(t => t.id === trip.id ? { 
        ...t, 
        hasAdvance: checked,
        advancePayment: { ...t.advancePayment, status: checked ? 'LIBERAR' : 'BLOQUEADO' }
      } : t));
    }
  }, []);

  const handleFinalizeTrips = () => {
    const scheduledCount = trips.filter(t => t.isScheduled).length;
    if (scheduledCount === 0) {
      alert("Nenhuma viagem marcada como 'Agendado'.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Finalizar Viagens Agendadas?",
      message: `Você está prestes a alterar o status de ${scheduledCount} viagens para "Agendamento realizado". Elas serão removidas deste painel. Deseja continuar?`,
      onConfirm: async () => {
        setIsFinalizing(true);
        const success = await organizationService.finalizeScheduledTrips(trips);
        if (success) {
          await loadData();
        }
        setIsFinalizing(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00`);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  const isToday = (dateStr: string) => {
    const d = parseDate(dateStr);
    if (!d) return false;
    
    const today = new Date().toISOString().split('T')[0];
    const date = d.toISOString().split('T')[0];
    return today === date;
  };

  const columns = useMemo(() => [
    { 
      key: 'dateTime', 
      label: 'Data', 
      render: (t: Trip) => {
        const today = isToday(t.dateTime);
        const d = parseDate(t.dateTime);
        const displayDate = d ? d.toLocaleDateString('pt-BR') : (t.dateTime || '---');
        
        return (
          <div className={`px-3 py-1.5 rounded-lg font-black text-[10px] text-center ${today ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600 border border-red-200 animate-pulse'}`}>
            {displayDate}
            {!today && <span className="block text-[7px] mt-0.5">FORA DE HOJE</span>}
          </div>
        );
      }
    },
    { key: 'os', label: 'OS', render: (t: Trip) => <span className="font-black text-slate-900">{t.os}</span> },
    { key: 'driver', label: 'Motorista', render: (t: Trip) => <span className="font-bold text-slate-600 uppercase">{t.driver.name}</span> },
    { key: 'customer', label: 'Local de Atendimento', render: (t: Trip) => <span className="font-bold text-slate-500 uppercase text-[9px]">{t.customer.name}</span> },
    { 
      key: 'sentNF', 
      label: 'Mandou NF', 
      render: (t: Trip) => (
        <input 
          type="checkbox" 
          checked={!!t.sentNF} 
          onChange={(e) => handleToggleNF(t, e.target.checked)}
          className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
        />
      )
    },
    { 
      key: 'isScheduled', 
      label: 'Agendado', 
      render: (t: Trip) => (
        <input 
          type="checkbox" 
          checked={!!t.isScheduled} 
          onChange={(e) => handleToggleScheduled(t, e.target.checked)}
          className="w-5 h-5 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
        />
      )
    },
    { 
      key: 'scheduledLocationId', 
      label: 'Local Agendamento', 
      render: (t: Trip) => (
        <select 
          value={t.scheduledLocationId || ''} 
          onChange={(e) => handleLocationChange(t, e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[9px] font-bold uppercase outline-none focus:border-blue-500 transition-all"
        >
          <option value="">SELECIONE...</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      )
    },
    { 
      key: 'scheduledDateTime', 
      label: 'Data/Hora Agend.', 
      render: (t: Trip) => (
        <input 
          type="datetime-local" 
          value={t.scheduledDateTime ? t.scheduledDateTime.substring(0, 16) : ''} 
          onChange={(e) => handleDateTimeChange(t, e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[9px] font-bold outline-none focus:border-blue-500 transition-all"
        />
      )
    },
    { 
      key: 'hasAdvance', 
      label: 'Adiantamento', 
      render: (t: Trip) => (
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={!!t.hasAdvance} 
            onChange={(e) => handleToggleAdvance(t, e.target.checked)}
            className="w-5 h-5 rounded-lg border-2 border-slate-200 text-orange-600 focus:ring-orange-500 transition-all cursor-pointer"
          />
          {t.hasAdvance && <span className="text-[7px] font-black text-orange-600 uppercase">70% LIB</span>}
        </div>
      )
    }
  ], [locations, handleToggleNF, handleToggleScheduled, handleLocationChange, handleDateTimeChange, handleToggleAdvance]);

  const coletaTrips = useMemo(() => 
    trips.filter(t => ['COLETA', 'CABOTAGEM', 'EXPORTAÇÃO'].includes(t.type?.toUpperCase())), 
  [trips]);

  const entregaTrips = useMemo(() => 
    trips.filter(t => ['ENTREGA', 'CABOTAGEM', 'IMPORTAÇÃO'].includes(t.type?.toUpperCase())), 
  [trips]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-[3rem] border border-slate-100 shadow-sm animate-pulse">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Carregando Painel Operacional...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <FeedbackModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        type="confirm" 
        onConfirm={confirmModal.onConfirm} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
      />

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Organização Operacional</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Agendamentos e NF • Dados desde 06/03/2026</p>
        </div>
        <button 
          onClick={handleFinalizeTrips}
          disabled={isFinalizing}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {isFinalizing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Processando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              Viagens Finalizadas
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 ml-4">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Coleta, Cabotagem e Exportação</h3>
          </div>
          <SmartOperationTable 
            userId={userId} 
            componentId="org-coleta-export" 
            columns={columns} 
            data={coletaTrips} 
            hideInternalSearch={false}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 ml-4">
            <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Entrega, Cabotagem e Importação</h3>
          </div>
          <SmartOperationTable 
            userId={userId} 
            componentId="org-entrega-import" 
            columns={columns} 
            data={entregaTrips} 
            hideInternalSearch={false}
          />
        </div>
      </div>
    </div>
  );
};

export default OrganizationTab;
