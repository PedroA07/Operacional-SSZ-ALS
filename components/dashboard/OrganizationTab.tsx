import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trip, Port, PreStacking, TripStatus } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { organizationService } from '../../services/organizationService';
import { advanceService } from '../../services/advanceService';
import { db } from '../../utils/storage';
import FeedbackModal from '../shared/FeedbackModal';

interface OrganizationTabProps {
  userId: string;
  trips: Trip[];
  ports: Port[];
  preStacking: PreStacking[];
  onRefresh: () => void;
}

interface LocationSearchableSelectProps {
  trip: Trip;
  locations: any[];
  onLocationChange: (trip: Trip, locationId: string) => void;
  isScheduled?: boolean;
}

const LocationSearchableSelect: React.FC<LocationSearchableSelectProps> = ({ trip, locations, onLocationChange, isScheduled }) => {
  const selectedLoc = locations.find(l => l.id === trip.scheduledLocationId);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');

  const filteredLocations = useMemo(() => {
    if (!search) return locations;
    const s = search.toLowerCase();
    return locations.filter(l => 
      l.name?.toLowerCase().includes(s) || 
      l.legalName?.toLowerCase().includes(s) || 
      l.cnpj?.includes(s) ||
      l.city?.toLowerCase().includes(s) ||
      l.zipCode?.includes(s)
    );
  }, [search, locations]);

  const suggestionLoc = useMemo(() => {
    const id = trip.destination?.id || trip.customer.id;
    return locations.find(l => l.id === id);
  }, [trip, locations]);

  return (
    <div className="relative min-w-[180px]">
      {!isSearching ? (
        <div 
          onClick={() => setIsSearching(true)}
          className={`w-full border rounded-lg px-2 py-1.5 cursor-pointer transition-all group ${isScheduled ? 'bg-emerald-100/50 border-emerald-300 shadow-sm hover:border-emerald-500' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm'}`}
        >
          {selectedLoc ? (
            <div className="space-y-0.5">
              <div className="flex justify-between items-start gap-1">
                <p className="text-[9px] font-black text-slate-800 uppercase break-words flex-1 leading-tight">{selectedLoc.name}</p>
                <p className="text-[7px] font-black text-blue-500 whitespace-nowrap">{selectedLoc.zipCode || '---'}</p>
              </div>
              <p className="text-[7px] text-slate-400 font-bold uppercase break-words leading-tight">{selectedLoc.legalName || '---'}</p>
              <div className="flex justify-between items-center pt-0.5 border-t border-slate-50 gap-1">
                <p className="text-[7px] text-slate-500 font-medium whitespace-nowrap">{selectedLoc.cnpj}</p>
                <p className="text-[7px] text-slate-400 font-bold uppercase text-right break-words flex-1">{selectedLoc.city}/{selectedLoc.state}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">Sugestão (Programação):</span>
              <div className="space-y-0.5">
                <div className="flex justify-between items-start gap-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase break-words flex-1 leading-tight">
                    {suggestionLoc?.name || trip.destination?.name || trip.customer.name}
                  </p>
                  <p className="text-[7px] font-black text-slate-300 whitespace-nowrap">
                    {suggestionLoc?.zipCode || '---'}
                  </p>
                </div>
                <p className="text-[7px] text-slate-300 font-bold uppercase break-words leading-tight">
                  {suggestionLoc?.legalName || trip.destination?.legalName || trip.customer.legalName || '---'}
                </p>
                <div className="flex justify-between items-center pt-0.5 border-t border-slate-50/50 gap-1">
                  <p className="text-[7px] text-slate-300 font-medium whitespace-nowrap">
                    {suggestionLoc?.cnpj || trip.destination?.cnpj || trip.customer.cnpj || '---'}
                  </p>
                  <p className="text-[7px] text-slate-300 font-bold uppercase text-right break-words flex-1">
                    {(suggestionLoc?.city || trip.destination?.city || trip.customer.city)}/{(suggestionLoc?.state || trip.destination?.state || trip.customer.state || '---')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute top-0 left-0 w-full z-50 bg-white border-2 border-blue-500 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="relative">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <input 
              autoFocus
              type="text"
              placeholder="BUSCAR LOCAL..."
              className="w-full pl-6 pr-2 py-2 text-[9px] font-black uppercase border-b border-slate-100 outline-none bg-slate-50/50 focus:bg-white transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => setTimeout(() => setIsSearching(false), 200)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <div 
              onClick={() => { onLocationChange(trip, ''); setIsSearching(false); }}
              className="px-2 py-1.5 hover:bg-red-50 cursor-pointer text-[8px] font-black text-red-500 border-b border-slate-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              LIMPAR SELEÇÃO
            </div>
            {filteredLocations.length > 0 ? (
              filteredLocations.map(loc => (
                <div 
                  key={loc.id}
                  onClick={() => { onLocationChange(trip, loc.id); setIsSearching(false); }}
                  className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group"
                >
                  <div className="flex justify-between items-start gap-1">
                    <p className="text-[9px] font-black text-slate-800 uppercase group-hover:text-blue-600 transition-colors break-words flex-1 leading-tight">{loc.name}</p>
                    <p className="text-[7px] font-black text-blue-500 whitespace-nowrap">{loc.zipCode || '---'}</p>
                  </div>
                  <p className="text-[7px] text-slate-400 font-bold uppercase break-words leading-tight">{loc.legalName}</p>
                  <div className="flex justify-between items-center mt-0.5 pt-0.5 border-t border-slate-50/50 gap-1">
                    <p className="text-[7px] text-slate-500 font-medium whitespace-nowrap">{loc.cnpj}</p>
                    <p className="text-[7px] text-slate-400 font-bold uppercase text-right break-words flex-1">{loc.city}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 text-center">
                <p className="text-[8px] font-black text-slate-300 uppercase">Nenhum local encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (locationId: string, dateTime: string) => void;
  locations: any[];
  initialLocationId?: string;
  initialDateTime?: string;
  defaultLocationId?: string;
}

const SchedulingModal: React.FC<SchedulingModalProps> = ({ isOpen, onClose, onConfirm, locations, initialLocationId, initialDateTime, defaultLocationId }) => {
  const [locationId, setLocationId] = useState(initialLocationId || '');
  const [dateTime, setDateTime] = useState(initialDateTime || '');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Use initialLocationId if exists, otherwise use defaultLocationId (customer)
      setLocationId(initialLocationId || defaultLocationId || '');
      setDateTime(initialDateTime || '');
      setSearch('');
    }
  }, [isOpen, initialLocationId, initialDateTime, defaultLocationId]);

  const filteredLocations = useMemo(() => {
    if (!search) return locations;
    const s = search.toLowerCase();
    return locations.filter(l => 
      l.name?.toLowerCase().includes(s) || 
      l.legalName?.toLowerCase().includes(s) || 
      l.cnpj?.includes(s) ||
      l.city?.toLowerCase().includes(s) ||
      l.zipCode?.includes(s)
    );
  }, [search, locations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Agendamento Operacional</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Defina o destino e o cronograma da viagem</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-300 hover:text-red-500 shadow-sm hover:shadow-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Local de Destino</label>
              </div>
              
              <div className="relative group">
                <div className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <input 
                  type="text"
                  placeholder="BUSCAR POR NOME, CNPJ OU CEP..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-[12px] font-bold uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {filteredLocations.length > 0 ? (
                  filteredLocations.map(loc => (
                    <div 
                      key={loc.id}
                      onClick={() => setLocationId(loc.id)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${locationId === loc.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-200 hover:bg-slate-50/50'}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 flex-1">
                          <p className="text-[11px] font-black text-slate-800 uppercase leading-tight break-words">{loc.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase break-words">{loc.legalName || '---'}</p>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          <p className="text-[9px] font-black text-slate-600">{loc.cnpj}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase">{loc.city}/{loc.state}</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center gap-4">
                        <p className="text-[8px] text-slate-400 font-medium uppercase break-words flex-1">{loc.address || 'ENDEREÇO NÃO INFORMADO'}</p>
                        <p className="text-[8px] font-black text-blue-500 whitespace-nowrap">{loc.zipCode || '---'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum local encontrado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Data e Hora do Agendamento</label>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                  <input 
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-[12px] font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resumo da Seleção</h4>
                {locationId ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Destino</span>
                      <span className="text-[10px] font-black text-slate-700 uppercase">{locations.find(l => l.id === locationId)?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Cronograma</span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase">{dateTime ? new Date(dateTime).toLocaleString('pt-BR') : 'NÃO DEFINIDO'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] font-bold text-slate-300 uppercase italic">Aguardando seleção de dados...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-5 border-2 border-slate-200 text-slate-400 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(locationId, dateTime)}
            disabled={!locationId}
            className="flex-1 px-6 py-5 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Confirmar Agendamento
          </button>
        </div>
      </div>
    </div>
  );
};

const OrganizationTab: React.FC<OrganizationTabProps> = ({ userId, trips: propTrips, ports, preStacking, onRefresh }) => {
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(propTrips.length === 0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [activeView, setActiveView] = useState<'COLETA' | 'ENTREGA'>('COLETA');
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedTripForScheduling, setSelectedTripForScheduling] = useState<Trip | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { data: Partial<Trip>, timestamp: number }>>({});
  const [finalizingIds, setFinalizingIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  // Constantes de estabilidade
  const STABILITY_DURATION = 30000; // Aumentado para 30s pois agora temos auto-limpeza ao confirmar

  // Auto-limpeza de atualizações que já foram confirmadas pelo servidor
  useEffect(() => {
    const toRemove: string[] = [];
    Object.entries(pendingUpdates).forEach(([id, pending]) => {
      const serverTrip = propTrips.find(t => t.id === id);
      if (serverTrip) {
        // Verifica se todos os campos pendentes já batem com o servidor
        const matches = Object.entries(pending.data).every(([key, value]) => {
          const serverValue = serverTrip[key as keyof Trip];
          // Comparação profunda simples para objetos (como scheduling ou destination)
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(serverValue) === JSON.stringify(value);
          }
          return serverValue === value;
        });

        if (matches) {
          toRemove.push(id);
        }
      }
    });

    if (toRemove.length > 0) {
      setPendingUpdates(prev => {
        const next = { ...prev };
        let changed = false;
        toRemove.forEach(id => {
          if (next[id]) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [propTrips, pendingUpdates]);

  // Memoização das viagens filtradas e estabilizadas
  const trips = useMemo(() => {
    const defaultStartDateStr = '2026-03-06';
    const now = Date.now();

    return propTrips
      .filter(trip => {
        // Remove viagens que estão sendo finalizadas
        if (finalizingIds.has(trip.id)) return false;

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
        if (!startDate && !endDate && normalizedTripDate < defaultStartDateStr) return false;

        return !trip.isCompleted && !trip.isRemovedFromOrg && trip.status !== 'Viagem concluída' && 
               trip.status !== 'Viagem cancelada' && 
               trip.status !== 'Agendamento realizado';
      })
      .map(serverTrip => {
        const pending = pendingUpdates[serverTrip.id];
        // Se houver uma atualização local feita há menos de STABILITY_DURATION, ela tem prioridade
        if (pending && (now - pending.timestamp) < STABILITY_DURATION) {
          return { ...serverTrip, ...pending.data };
        }
        return serverTrip;
      });
  }, [propTrips, pendingUpdates, finalizingIds]);

  // Sincroniza isLoading
  useEffect(() => {
    if (propTrips.length > 0) {
      setIsLoading(false);
    }
  }, [propTrips]);

  // Limpeza periódica de atualizações expiradas para liberar memória
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPendingUpdates(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (now - next[id].timestamp > 30000) { // Limpa após 30s para dar tempo do servidor responder
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Processa locais a partir das props
  useEffect(() => {
    const processedLocations = [
      ...ports.map(p => ({ 
        id: p.id, 
        name: p.name, 
        legalName: p.legalName, 
        cnpj: p.cnpj, 
        address: p.address, 
        zipCode: p.zipCode,
        city: p.city,
        state: p.state,
        type: 'PORTO'
      })),
      ...preStacking.map(ps => ({ 
        id: ps.id, 
        name: ps.name, 
        legalName: ps.legalName, 
        cnpj: ps.cnpj, 
        address: ps.address, 
        zipCode: ps.zipCode,
        city: ps.city,
        state: ps.state,
        type: 'UNIDADE'
      }))
    ].sort((a, b) => a.name.localeCompare(b.name));
    
    setLocations(processedLocations);
  }, [ports, preStacking]);

  const loadData = async () => {
    onRefresh();
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleNF = useCallback(async (trip: Trip, checked: boolean) => {
    const now = Date.now();
    
    // Registra a atualização pendente imediatamente (Trava a UI)
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { 
        data: { ...(prev[trip.id]?.data || {}), sentNF: checked }, 
        timestamp: now 
      }
    }));

    try {
      await db.saveTrip({ ...trip, sentNF: checked });
    } catch (error) {
      // Em caso de erro, remove a trava para permitir que o dado original volte
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[trip.id];
        return next;
      });
      console.error("Erro ao salvar NF:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', { 
        detail: { message: 'Erro ao salvar NF no banco de dados', type: 'error' } 
      }));
    }
  }, []);

  const handleToggleScheduled = useCallback(async (trip: Trip, checked: boolean) => {
    if (checked) {
      setSelectedTripForScheduling(trip);
      setIsSchedulingModalOpen(true);
    } else {
      const now = Date.now();
      const schedulingData = { 
        isScheduled: false,
        scheduledLocationId: '',
        scheduledDateTime: '',
        scheduling: trip.scheduling ? { ...trip.scheduling, locationId: '', location: '', dateTime: '' } : null
      };

      setPendingUpdates(prev => ({
        ...prev,
        [trip.id]: { 
          data: { ...(prev[trip.id]?.data || {}), ...schedulingData }, 
          timestamp: now 
        }
      }));

      try {
        await db.saveTrip({ ...trip, ...schedulingData });
      } catch (error) {
        setPendingUpdates(prev => {
          const next = { ...prev };
          delete next[trip.id];
          return next;
        });
        console.error("Erro ao remover agendamento:", error);
        window.dispatchEvent(new CustomEvent('als_show_toast', { 
          detail: { message: 'Erro ao remover agendamento', type: 'error' } 
        }));
      }
    }
  }, []);

  const handleConfirmScheduling = useCallback(async (locationId: string, dateTime: string) => {
    if (!selectedTripForScheduling) return;

    const selectedLoc = locations.find(l => l.id === locationId);
    const schedulingData = {
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

    const tripId = selectedTripForScheduling.id;
    const now = Date.now();
    
    setPendingUpdates(prev => ({
      ...prev,
      [tripId]: { 
        data: { ...(prev[tripId]?.data || {}), ...schedulingData }, 
        timestamp: now 
      }
    }));
    
    setIsSchedulingModalOpen(false);
    setSelectedTripForScheduling(null);

    try {
      await db.saveTrip({ ...selectedTripForScheduling, ...schedulingData });
    } catch (error) {
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
      console.error("Erro ao salvar agendamento:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', { 
        detail: { message: 'Erro ao salvar agendamento', type: 'error' } 
      }));
    }
  }, [selectedTripForScheduling, locations]);

  const handleLocationChange = useCallback(async (trip: Trip, locationId: string) => {
    const selectedLoc = locations.find(l => l.id === locationId);
    const locationData = { 
      scheduledLocationId: locationId,
      destination: selectedLoc ? {
        id: selectedLoc.id,
        name: selectedLoc.name,
        legalName: selectedLoc.legalName,
        cnpj: selectedLoc.cnpj,
        city: selectedLoc.city,
        state: selectedLoc.state
      } : trip.destination,
      scheduling: {
        locationId: locationId,
        location: selectedLoc?.name || '',
        dateTime: trip.scheduledDateTime || '',
        obs: trip.scheduling?.obs || ''
      }
    };

    const now = Date.now();
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { 
        data: { ...(prev[trip.id]?.data || {}), ...locationData }, 
        timestamp: now 
      }
    }));

    try {
      await db.saveTrip({ ...trip, ...locationData });
    } catch (error) {
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[trip.id];
        return next;
      });
      console.error("Erro ao salvar local de agendamento:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', { 
        detail: { message: 'Erro ao salvar local de agendamento', type: 'error' } 
      }));
    }
  }, [locations]);

  const handleDateTimeChange = useCallback(async (trip: Trip, dateTime: string) => {
    const dateTimeData = { 
      scheduledDateTime: dateTime,
      scheduling: {
        locationId: trip.scheduledLocationId || '',
        location: trip.scheduling?.location || '',
        dateTime: dateTime,
        obs: trip.scheduling?.obs || ''
      }
    };

    const now = Date.now();
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { 
        data: { ...(prev[trip.id]?.data || {}), ...dateTimeData }, 
        timestamp: now 
      }
    }));

    try {
      await db.saveTrip({ ...trip, ...dateTimeData });
    } catch (error) {
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[trip.id];
        return next;
      });
      console.error("Erro ao salvar data/hora de agendamento:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', { 
        detail: { message: 'Erro ao salvar data/hora de agendamento', type: 'error' } 
      }));
    }
  }, []);

  const handleToggleAdvance = useCallback(async (trip: Trip, checked: boolean) => {
    const advanceData = { 
      hasAdvance: checked,
      advancePayment: { ...trip.advancePayment, status: (checked ? 'LIBERAR' : 'BLOQUEADO') as 'LIBERAR' | 'BLOQUEADO' }
    };

    const now = Date.now();
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { 
        data: { ...(prev[trip.id]?.data || {}), ...advanceData }, 
        timestamp: now 
      }
    }));

    const success = await advanceService.toggleAdvance(trip, checked);
    
    if (!success) {
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[trip.id];
        return next;
      });
      window.dispatchEvent(new CustomEvent('als_show_toast', { 
        detail: { message: 'Erro ao processar adiantamento', type: 'error' } 
      }));
    }
  }, []);

  const handleRemoveFromOrg = useCallback(async (trip: Trip) => {
    const now = Date.now();
    
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { 
        data: { ...(prev[trip.id]?.data || {}), isRemovedFromOrg: true }, 
        timestamp: now 
      }
    }));

    try {
      await db.saveTrip({ ...trip, isRemovedFromOrg: true });
      window.dispatchEvent(new CustomEvent('als_show_toast', { 
        detail: { message: 'Viagem limpa do painel', type: 'success' } 
      }));
    } catch (error) {
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[trip.id];
        return next;
      });
      console.error("Erro ao remover do painel:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', { 
        detail: { message: 'Erro ao processar alteração', type: 'error' } 
      }));
    }
  }, []);

  const handleFinalizeTrips = () => {
    const allScheduled = trips.filter(t => isTripScheduled(t));
    const readyTrips = allScheduled.filter(t => isTripReadyToFinalize(t));

    if (readyTrips.length === 0) {
      alert("Nenhuma viagem está pronta para finalizar. Certifique-se de que 'Mandou NF' e 'Adiantamento' também estão marcados.");
      return;
    }

    let message = `Você está prestes a remover ${readyTrips.length} viagens prontas deste painel. As viagens que ainda não possuem todas as marcações continuarão visíveis. Deseja continuar?`;

    setConfirmModal({
      isOpen: true,
      title: "Limpar Viagens?",
      message: message,
      onConfirm: async () => {
        setIsFinalizing(true);
        const tripsToFinalize = readyTrips;
        const finalizingIdsArray = tripsToFinalize.map(t => t.id);
        
        // Atualização otimista: marca como finalizando
        setFinalizingIds(prev => {
          const next = new Set(prev);
          finalizingIdsArray.forEach(id => next.add(id));
          return next;
        });
        
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        try {
          const success = await organizationService.finalizeScheduledTrips(tripsToFinalize);
          if (success) {
            onRefresh();
          } else {
            // Reverte em caso de erro
            setFinalizingIds(prev => {
              const next = new Set(prev);
              finalizingIdsArray.forEach(id => next.delete(id));
              return next;
            });
            alert("Erro ao finalizar viagens agendadas. Verifique o console.");
          }
        } catch (error) {
          setFinalizingIds(prev => {
            const next = new Set(prev);
            finalizingIdsArray.forEach(id => next.delete(id));
            return next;
          });
          console.error("Erro no handleFinalizeTrips:", error);
          alert("Erro inesperado ao finalizar viagens.");
        } finally {
          setIsFinalizing(false);
        }
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

  const isTripScheduled = useCallback((t: Trip) => {
    return !!t.isScheduled || !!t.preStackingFormData;
  }, []);

  const isTripReadyToFinalize = useCallback((t: Trip) => {
    return isTripScheduled(t) && !!t.sentNF && !!t.hasAdvance;
  }, [isTripScheduled]);

  const columns = useMemo(() => [
    { 
      key: 'dateTime', 
      label: 'Data', 
      render: (t: Trip) => {
        const d = parseDate(t.dateTime);
        const displayDate = d ? new Intl.DateTimeFormat('pt-BR', { 
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }).format(d) : (t.dateTime || '---');
        
        let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
        
        if (d) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const tripDate = new Date(d);
          tripDate.setHours(0, 0, 0, 0);
          
          if (tripDate < now) {
            colorClass = 'bg-red-100 text-red-700 border-red-300';
          } else if (tripDate > now) {
            colorClass = 'bg-blue-100 text-blue-700 border-blue-300';
          }
        }
        
        return (
          <div className={`px-2 py-1 rounded-md border font-black text-[10px] text-center ${colorClass}`}>
            {displayDate}
          </div>
        );
      }
    },
    { 
      key: 'os', 
      label: 'OS', 
      sortValue: (t: Trip) => t.os,
      render: (t: Trip) => (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-black text-slate-900 text-[9px]">{t.os}</span>
            <span className="text-[7px] font-bold text-blue-500 uppercase">{t.container || '---'}</span>
          </div>
          {pendingUpdates[t.id] && (
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" title="Salvando alterações..."></div>
          )}
        </div>
      )
    },
    { 
      key: 'driver', 
      label: 'Motorista', 
      sortValue: (t: Trip) => t.driver?.name || '',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-600 uppercase leading-none text-[9px]">{t.driver.name}</span>
          <div className="flex flex-col gap-0.5 mt-1">
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">Cavalo:</span>
              <span className="text-[7px] bg-slate-100 px-1 py-0.5 rounded font-black text-slate-600 border border-slate-200">{t.driver.plateHorse || '---'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">Carreta:</span>
              <span className="text-[7px] bg-slate-100 px-1 py-0.5 rounded font-black text-slate-600 border border-slate-200">{t.driver.plateTrailer || '---'}</span>
            </div>
          </div>
        </div>
      )
    },
    { 
      key: 'customer', 
      label: 'Local de Atendimento', 
      sortValue: (t: Trip) => t.customer?.name || '',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 uppercase text-[9px]">{t.customer.name}</span>
          <span className="text-[7px] text-slate-400 font-bold uppercase truncate max-w-[120px]">
            {t.customer.legalName || '---'}
          </span>
        </div>
      ) 
    },
    { 
      key: 'sentNF', 
      label: 'Mandou NF', 
      render: (t: Trip) => (
        <div className="flex items-center justify-center gap-2">
          <input 
            type="checkbox" 
            checked={!!t.sentNF} 
            onChange={(e) => handleToggleNF(t, e.target.checked)}
            className="w-4 h-4 rounded-md border-2 border-slate-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
          />
          {pendingUpdates[t.id]?.data.hasOwnProperty('sentNF') && (
            <div className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
      )
    },
    { 
      key: 'isScheduled', 
      label: 'Agendado', 
      render: (t: Trip) => {
        const hasMinuta = !!t.preStackingFormData;
        const isPending = pendingUpdates[t.id]?.data.hasOwnProperty('isScheduled');
        return (
          <div className="flex items-center justify-center gap-2">
            <input 
              type="checkbox" 
              checked={isTripScheduled(t)} 
              disabled={hasMinuta || isPending}
              onChange={(e) => handleToggleScheduled(t, e.target.checked)}
              className={`w-4 h-4 rounded-md border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 transition-all ${hasMinuta || isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={hasMinuta ? "Agendamento automático via Minuta" : (isPending ? "Salvando..." : "")}
            />
            {isPending && (
              <div className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        );
      }
    },
    { 
      key: 'scheduledLocationId', 
      label: 'Local Agendamento', 
      render: (t: Trip) => (
        <LocationSearchableSelect 
          trip={t} 
          locations={locations} 
          onLocationChange={handleLocationChange} 
          isScheduled={isTripScheduled(t)}
        />
      )
    },
    { 
      key: 'scheduledDateTime', 
      label: 'Data/Hora Agend.', 
      render: (t: Trip) => (
        <input 
          type="datetime-local" 
          value={t.scheduledDateTime && typeof t.scheduledDateTime === 'string' ? t.scheduledDateTime.substring(0, 16) : ''} 
          onChange={(e) => handleDateTimeChange(t, e.target.value)}
          className={`bg-slate-50 border rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:border-blue-500 transition-all ${isTripScheduled(t) ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
        />
      )
    },
    { 
      key: 'hasAdvance', 
      label: 'Adiantamento', 
      render: (t: Trip) => (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={!!t.hasAdvance} 
              onChange={(e) => handleToggleAdvance(t, e.target.checked)}
              className="w-4 h-4 rounded-md border-2 border-slate-200 text-orange-600 focus:ring-orange-500 transition-all cursor-pointer"
            />
            {pendingUpdates[t.id]?.data.hasOwnProperty('hasAdvance') && (
              <div className="w-2.5 h-2.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
          {t.hasAdvance && <span className="text-[7px] font-black text-orange-600 uppercase">70% LIB</span>}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: (t: Trip) => (
        <div className="flex items-center justify-center">
          <button 
            onClick={() => {
              if (window.confirm(`Deseja remover a OS ${t.os} deste painel?`)) {
                handleRemoveFromOrg(t);
              }
            }}
            className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
            title="Limpar deste painel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )
    }
  ], [locations, handleToggleNF, handleToggleScheduled, handleLocationChange, handleDateTimeChange, handleToggleAdvance, handleRemoveFromOrg, isTripScheduled]);

  const coletaTrips = useMemo(() => {
    let filtered = trips.filter(t => ['COLETA', 'CABOTAGEM', 'EXPORTAÇÃO'].includes(t.type?.toUpperCase()));
    
    if (startDate) {
      filtered = filtered.filter(t => t.dateTime && t.dateTime.substring(0, 10) >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.dateTime && t.dateTime.substring(0, 10) <= endDate);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.dateTime || 0).getTime();
      const dateB = new Date(b.dateTime || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.driver.name || '').localeCompare(b.driver.name || '');
    });
  }, [trips, startDate, endDate]);

  const entregaTrips = useMemo(() => {
    let filtered = trips.filter(t => ['ENTREGA', 'IMPORTAÇÃO'].includes(t.type?.toUpperCase()));
    
    if (startDate) {
      filtered = filtered.filter(t => t.dateTime && t.dateTime.substring(0, 10) >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.dateTime && t.dateTime.substring(0, 10) <= endDate);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.dateTime || 0).getTime();
      const dateB = new Date(b.dateTime || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.driver.name || '').localeCompare(b.driver.name || '');
    });
  }, [trips, startDate, endDate]);

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
        defaultLocationId={selectedTripForScheduling?.destination?.id || selectedTripForScheduling?.customer?.id}
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

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500"
              title="Data Inicial"
            />
            <span className="text-[10px] font-black text-slate-400 uppercase">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500"
              title="Data Final"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                title="Limpar Filtro"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>
        
        <button 
          onClick={handleFinalizeTrips}
          disabled={isFinalizing || trips.filter(t => isTripReadyToFinalize(t)).length === 0}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {isFinalizing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Limpando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
              Limpar ({trips.filter(t => isTripReadyToFinalize(t)).length})
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
              getRowClassName={(t: Trip) => {
                if (isTripReadyToFinalize(t)) return 'bg-emerald-50 border-l-4 border-emerald-500';
                if (isTripScheduled(t)) return 'bg-amber-50/50 border-l-4 border-amber-400/50';
                return '';
              }}
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
              getRowClassName={(t: Trip) => {
                if (isTripReadyToFinalize(t)) return 'bg-emerald-50 border-l-4 border-emerald-500';
                if (isTripScheduled(t)) return 'bg-amber-50/50 border-l-4 border-amber-400/50';
                return '';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationTab;
