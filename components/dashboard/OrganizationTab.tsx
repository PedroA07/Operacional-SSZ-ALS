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

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (locationId: string, dateTime: string) => void;
  locations: any[];
  initialLocationId?: string;
  initialDateTime?: string;
}

const SchedulingModal: React.FC<SchedulingModalProps> = ({ isOpen, onClose, onConfirm, locations, initialLocationId, initialDateTime }) => {
  const [locationId, setLocationId] = useState(initialLocationId || '');
  const [dateTime, setDateTime] = useState(initialDateTime || '');

  useEffect(() => {
    if (isOpen) {
      setLocationId(initialLocationId || '');
      setDateTime(initialDateTime || '');
    }
  }, [isOpen, initialLocationId, initialDateTime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Detalhes do Agendamento</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Vincule local, data e hora</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Local de Agendamento</label>
            <div className="relative">
              <select 
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-bold uppercase outline-none focus:border-blue-500 transition-all appearance-none"
              >
                <option value="">SELECIONE UM LOCAL...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} - {loc.legalName}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data e Hora</label>
            <input 
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-bold outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 border border-slate-200 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(locationId, dateTime)}
            className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

const OrganizationTab: React.FC<OrganizationTabProps> = ({ userId }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [activeView, setActiveView] = useState<'COLETA' | 'ENTREGA'>('COLETA');
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedTripForScheduling, setSelectedTripForScheduling] = useState<Trip | null>(null);
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
    if (checked) {
      setSelectedTripForScheduling(trip);
      setIsSchedulingModalOpen(true);
    } else {
      const updatedTrip: Trip = { 
        ...trip, 
        isScheduled: false,
        scheduledLocationId: '',
        scheduledDateTime: '',
        scheduling: trip.scheduling ? { ...trip.scheduling, locationId: '', location: '', dateTime: '' } : null
      };
      await db.saveTrip(updatedTrip);
      setTrips(prev => prev.map(t => t.id === trip.id ? updatedTrip : t));
    }
  }, []);

  const handleConfirmScheduling = async (locationId: string, dateTime: string) => {
    if (!selectedTripForScheduling) return;
    
    const selectedLoc = locations.find(l => l.id === locationId);
    
    const updatedTrip: Trip = {
      ...selectedTripForScheduling,
      isScheduled: true,
      scheduledLocationId: locationId,
      scheduledDateTime: dateTime,
      destination: selectedLoc ? {
        id: selectedLoc.id,
        name: selectedLoc.name,
        legalName: selectedLoc.legalName,
        cnpj: selectedLoc.cnpj,
        city: selectedLoc.city,
        state: selectedLoc.state
      } : selectedTripForScheduling.destination,
      scheduling: {
        locationId: locationId,
        location: selectedLoc?.name || '',
        dateTime: dateTime,
        obs: selectedTripForScheduling.scheduling?.obs || ''
      }
    };
    
    await db.saveTrip(updatedTrip);
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    setIsSchedulingModalOpen(false);
    setSelectedTripForScheduling(null);
  };

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

  const isPastDate = (dateStr: string) => {
    const d = parseDate(dateStr);
    if (!d) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tripDate = new Date(d);
    tripDate.setHours(0, 0, 0, 0);
    
    return tripDate < today;
  };

  const columns = useMemo(() => [
    { 
      key: 'dateTime', 
      label: 'Data', 
      render: (t: Trip) => {
        const today = isToday(t.dateTime);
        const past = isPastDate(t.dateTime);
        const d = parseDate(t.dateTime);
        const displayDate = d ? d.toLocaleDateString('pt-BR') : (t.dateTime || '---');
        
        return (
          <div className={`px-3 py-1.5 rounded-lg font-black text-[10px] text-center ${today ? 'bg-slate-100 text-slate-600' : (past ? 'bg-red-100 text-red-600 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-600')}`}>
            {displayDate}
          </div>
        );
      }
    },
    { key: 'os', label: 'OS', render: (t: Trip) => <span className="font-black text-slate-900">{t.os}</span> },
    { key: 'driver', label: 'Motorista', render: (t: Trip) => <span className="font-bold text-slate-600 uppercase">{t.driver.name}</span> },
    { 
      key: 'customer', 
      label: 'Local de Atendimento', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase text-[10px]">{t.customer.name}</span>
          <span className="text-[8px] text-slate-400 font-bold uppercase truncate max-w-[150px]">
            {t.customer.legalName || '---'}
          </span>
        </div>
      ) 
    },
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
      label: 'Agendamento', 
      render: (t: Trip) => {
        const selectedLoc = locations.find(l => l.id === t.scheduledLocationId);
        return (
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={!!t.isScheduled} 
              onChange={(e) => handleToggleScheduled(t, e.target.checked)}
              className="w-5 h-5 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
            />
            {t.isScheduled && (
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-emerald-600 uppercase leading-tight">{selectedLoc?.name || 'Local não definido'}</span>
                <span className="text-[8px] text-slate-400 font-bold">
                  {t.scheduledDateTime ? new Date(t.scheduledDateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--/-- --:--'}
                </span>
              </div>
            )}
          </div>
        );
      }
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
  ], [locations, handleToggleNF, handleToggleScheduled, handleToggleAdvance]);

  const coletaTrips = useMemo(() => 
    trips.filter(t => ['COLETA', 'CABOTAGEM', 'EXPORTAÇÃO'].includes(t.type?.toUpperCase())), 
  [trips]);

  const entregaTrips = useMemo(() => 
    trips.filter(t => ['ENTREGA', 'IMPORTAÇÃO'].includes(t.type?.toUpperCase())), 
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

      <SchedulingModal 
        isOpen={isSchedulingModalOpen}
        onClose={() => { setIsSchedulingModalOpen(false); setSelectedTripForScheduling(null); }}
        onConfirm={handleConfirmScheduling}
        locations={locations}
        initialLocationId={selectedTripForScheduling?.scheduledLocationId}
        initialDateTime={selectedTripForScheduling?.scheduledDateTime}
      />

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Organização Operacional</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Agendamentos e NF • Dados desde 06/03/2026</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setActiveView('COLETA')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'COLETA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Coleta/Export
            </button>
            <button 
              onClick={() => setActiveView('ENTREGA')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'ENTREGA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Entrega/Import
            </button>
          </div>
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
              Finalizar Agendados
            </>
          )}
        </button>
      </div>

      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {activeView === 'COLETA' ? (
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
              getRowClassName={(t: Trip) => t.isScheduled ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-4">
              <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Entrega e Importação</h3>
            </div>
            <SmartOperationTable 
              userId={userId} 
              componentId="org-entrega-import" 
              columns={columns} 
              data={entregaTrips} 
              hideInternalSearch={false}
              getRowClassName={(t: Trip) => t.isScheduled ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationTab;
