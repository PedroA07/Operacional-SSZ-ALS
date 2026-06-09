import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Port, PreStacking, TripStatus, StatusHistoryEntry, TerminalVessel, Driver, Customer, Devolucao, Liberacao } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { organizationService } from '../../services/organizationService';
import { advanceService } from '../../services/advanceService';
import { db, supabase } from '../../utils/storage';
import FeedbackModal from '../shared/FeedbackModal';
import DateTimePicker from '../shared/DateTimePicker';
import ImageViewer from '../shared/ImageViewer';
import PreStackingForm from './forms/PreStackingForm';
import OrdemColetaForm from './forms/OrdemColetaForm';
import DevolucaoVazioForm from './forms/DevolucaoVazioForm';
import LiberacaoVazioForm from './forms/LiberacaoVazioForm';
import { localDateStr, localDateTimeStr } from '../../utils/dateHelpers';
import { r2Service } from '../../utils/r2Service';

interface OrganizationTabProps {
  userId: string;
  trips: Trip[];
  ports: Port[];
  preStacking: PreStacking[];
  drivers: Driver[];
  customers: Customer[];
  onRefresh: () => void;
}

interface LocationSearchableSelectProps {
  trip: Trip;
  locations: any[];
  onLocationChange: (trip: Trip, locationId: string) => void;
  isScheduled?: boolean;
  isFreteMorto?: boolean;
}

const LocationSearchableSelect: React.FC<LocationSearchableSelectProps> = ({ trip, locations, onLocationChange, isScheduled, isFreteMorto }) => {
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

  if (isFreteMorto) {
    return (
      <div className="min-w-[180px] border rounded-lg px-2 py-2 bg-slate-100 border-slate-400 flex items-center justify-center">
        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Frete Morto</span>
      </div>
    );
  }

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
                    {suggestionLoc?.name || trip.destination?.name || trip.customer?.name || '---'}
                  </p>
                  <p className="text-[7px] font-black text-slate-300 whitespace-nowrap">
                    {suggestionLoc?.zipCode || '---'}
                  </p>
                </div>
                <p className="text-[7px] text-slate-300 font-bold uppercase break-words leading-tight">
                  {suggestionLoc?.legalName || trip.destination?.legalName || trip.customer?.legalName || '---'}
                </p>
                <div className="flex justify-between items-center pt-0.5 border-t border-slate-50/50 gap-1">
                  <p className="text-[7px] text-slate-300 font-medium whitespace-nowrap">
                    {suggestionLoc?.cnpj || trip.destination?.cnpj || trip.customer?.cnpj || '---'}
                  </p>
                  <p className="text-[7px] text-slate-300 font-bold uppercase text-right break-words flex-1">
                    {(suggestionLoc?.city || trip.destination?.city || trip.customer?.city)}/{(suggestionLoc?.state || trip.destination?.state || trip.customer?.state || '---')}
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
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Local de Destino <span className="text-red-500">*</span></label>
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
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Data e Hora do Agendamento <span className="text-red-500">*</span></label>
                </div>
                <DateTimePicker
                  value={dateTime}
                  onChange={setDateTime}
                  placeholder="Selecionar data e hora..."
                />
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
            disabled={!locationId || !dateTime}
            className="flex-1 px-6 py-5 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Confirmar Agendamento
          </button>
        </div>
      </div>
    </div>
  );
};

// Converte ISO UTC (ou string local) para o formato exigido por datetime-local input
const formatToLocalInput = (isoString: string): string => {
  if (!isoString) return '';
  try {
    // Se já é uma string local sem timezone (ex: "2026-05-15T10:30"), retorna diretamente
    if (isoString.length <= 16 && !isoString.endsWith('Z') && !isoString.includes('+')) {
      return isoString.substring(0, 16);
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  } catch (e) {
    return '';
  }
};

const ToggleIconBtn: React.FC<{
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  activeClass: string;
  inactiveClass: string;
  badgeColor?: string;
  title?: string;
  children: React.ReactNode;
}> = ({ checked, onClick, disabled, loading, activeClass, inactiveClass, badgeColor = 'bg-slate-500', title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    title={title}
    className={`relative flex items-center justify-center w-9 h-9 rounded-xl border-2 transition-all duration-150 ${checked ? activeClass : inactiveClass} ${!disabled && !loading ? 'cursor-pointer active:scale-90 hover:scale-105' : 'opacity-50 cursor-not-allowed'}`}
  >
    {loading ? (
      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ) : children}
    {checked && !loading && (
      <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 ${badgeColor} rounded-full flex items-center justify-center shadow ring-2 ring-white`}>
        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7"/>
        </svg>
      </span>
    )}
  </button>
);

type DevScheduleStatus = 'critico' | 'pendente' | 'agendado' | 'normal';

function getDevScheduleStatus(d: Devolucao): DevScheduleStatus {
  if (d.status === 'Cancelado' || d.status === 'Realizado') return 'normal';
  if (!d.scheduledDateTime) return 'normal';
  const now = new Date();
  const scheduledDt = new Date(d.scheduledDateTime);
  if (scheduledDt > now) return 'agendado';
  if (d.agendamentoDoc) return 'normal';
  const hoursLate = (now.getTime() - scheduledDt.getTime()) / (1000 * 60 * 60);
  return hoursLate > 48 ? 'critico' : 'pendente';
}

const DEV_PRIORITY: Record<DevScheduleStatus, number> = { critico: 3, pendente: 2, agendado: 1, normal: 0 };

const OrganizationTab: React.FC<OrganizationTabProps> = ({ userId, trips: propTrips, ports, preStacking, drivers, customers, onRefresh }) => {
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([]);
  const [settingsModal, setSettingsModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Trip | null>(null);
  const [terminalVessels, setTerminalVessels] = useState<TerminalVessel[]>([]);
  const [minutaTrip, setMinutaTrip] = useState<Trip | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [activeView, setActiveView] = useState<'COLETA' | 'ENTREGA' | 'DEVOLUÇÕES' | 'LIBERAÇÕES'>('COLETA');
  const [devolucoes, setDevolucoes] = useState<Devolucao[]>([]);
  const [devMinutaDev, setDevMinutaDev] = useState<Devolucao | null>(null);
  const [uploadingDevId, setUploadingDevId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; fileName: string } | null>(null);

  const handleDownloadDoc = async (url: string, fileName: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };
  const [showDevAddForm, setShowDevAddForm] = useState(false);
  const [devAddForm, setDevAddForm] = useState({ container: '', local: '', dateTime: '', driverId: '' });
  const [savingDevAdd, setSavingDevAdd] = useState(false);
  const [liberacoes, setLiberacoes] = useState<Liberacao[]>([]);
  const [libMinuta, setLibMinuta] = useState<Liberacao | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [selectedTripForScheduling, setSelectedTripForScheduling] = useState<Trip | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { data: Partial<Trip>, timestamp: number }>>({});
  const [finalizingIds, setFinalizingIds] = useState<Set<string>>(new Set());
  const [hiddenTripTypesColeta, setHiddenTripTypesColeta] = useState<string[] | null>(() => {
    const saved = localStorage.getItem('orgVisibleTripTypesColeta');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });
  const [hiddenTripTypesEntrega, setHiddenTripTypesEntrega] = useState<string[] | null>(() => {
    const saved = localStorage.getItem('orgVisibleTripTypesEntrega');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  const [ocTrip, setOcTrip] = useState<Trip | null>(null);

  // Constantes de estabilidade
  const STABILITY_DURATION = 30000; // Aumentado para 30s pois agora temos auto-limpeza ao confirmar

  // Auto-limpeza de atualizações que já foram confirmadas pelo servidor
  useEffect(() => {
    const fetchTypes = async () => {
      const [types, cats] = await Promise.all([db.getOperationTypes(), db.getCategories()]);
      setOperationTypes(types);
      setCategories(cats);
    };
    fetchTypes();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const fetchVessels = () =>
      supabase!.from('terminal_vessels').select('*').order('fetched_at', { ascending: false })
        .then(({ data }) => {
          if (!data) return;
          setTerminalVessels(data.map((r: any) => ({
            terminal: r.terminal, navio: r.navio, situacao: r.situacao,
            viagem: r.viagem,
            gateDry:      r.gate_dry         ?? undefined,
            gateReefer:   r.gate_reefer      ?? undefined,
            deadLineStr:  r.dead_line_str    ?? undefined,
            dtPrevChegada:  r.dt_prev_chegada,
            dtChegada:      r.dt_chegada,
            dtPrevAtrac:    r.dt_prev_atrac,
            dtAtracacao:    r.dt_atracacao,
            dtPrevSaida:    r.dt_prev_saida,
            dtSaida:        r.dt_saida,
            prevGateDry:    r.prev_gate_dry    ?? undefined,
            prevGateReefer: r.prev_gate_reefer ?? undefined,
            fetchedAt:      r.fetched_at,
          } as TerminalVessel)));
        });

    fetchVessels();

    const channel = supabase
      .channel('org-terminal-vessels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'terminal_vessels' }, fetchVessels)
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, []);

  // Separa "NAVIO/VIAGEM", "NAVIO|VIAGEM" ou "NAVIO VIAGEM" → { name, voyage }
  const splitShipField = useCallback((raw: string): { name: string; voyage: string } => {
    if (!raw) return { name: '', voyage: '' };
    // Separador explícito: / ou |
    const explicitMatch = raw.match(/^([^/|]+)[/|](.*)$/);
    if (explicitMatch) {
      return { name: explicitMatch[1].trim(), voyage: explicitMatch[2].trim() };
    }
    // Código de viagem ao final após espaço: letras/dígitos curtos (ex: "621N", "0BCNQN1RC", "619S")
    // Padrão: última "palavra" que seja alfanumérica compacta (sem espaços internos, 2-12 chars)
    const spaceMatch = raw.match(/^(.*?)\s+([A-Z0-9]{2,12})$/i);
    if (spaceMatch) {
      const candidate = spaceMatch[2].toUpperCase();
      // Só considera como viagem se não for apenas uma palavra simples do nome do navio
      // (viagens tendem a misturar dígitos e letras ou serem alfanuméricos curtos)
      if (/\d/.test(candidate) || candidate.length <= 6) {
        return { name: spaceMatch[1].trim(), voyage: candidate };
      }
    }
    return { name: raw.trim(), voyage: '' };
  }, []);

  const parseFlexDate = (str: string): Date | null => {
    if (!str || str === '--' || str === '-') return null;
    if (str.includes('/')) {
      const parts = str.split(' ');
      const [d, m, y] = parts[0].split('/');
      const time = (parts[1] || '12:00').slice(0, 5); // trunca "HH:MM:SS" → "HH:MM"
      // Suporta ano 2 dígitos: "26" → 2026 (Santos Brasil retorna "DD/MM/YY")
      const yNum = parseInt(y, 10);
      const fullY = yNum < 100 ? yNum + 2000 : yNum;
      const dt = new Date(`${fullY}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${time}:00`);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(str);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const getVesselForTrip = useCallback((shipRaw: string): TerminalVessel | null => {
    if (!shipRaw) return null;
    const { name, voyage } = splitShipField(shipRaw);
    const norm = (s: string) => s.toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Z0-9]/g, '');
    const n = norm(name || shipRaw);
    if (!n || n.length < 3) return null;

    const nameWords = (name || shipRaw).toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/\s+/).filter(w => w.length > 2);

    const nameMatches = (v: TerminalVessel) => {
      const vn = norm(v.navio);
      const vRaw = v.navio.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (vn === n) return true;
      if (vn.includes(n) || n.includes(vn)) return true;
      return nameWords.length >= 2 && nameWords.every(w => vRaw.includes(w));
    };

    const matches = terminalVessels.filter(nameMatches);
    if (matches.length === 0) return null;

    // Filtra por viagem se disponível — usa includes para cobrir "RAP621N" ⊇ "621N"
    let pool = matches;
    if (voyage) {
      const normVoyage = norm(voyage);
      const voyageMatches = matches.filter(v => {
        if (!v.viagem) return false;
        const nv = norm(v.viagem);
        return nv === normVoyage || nv.includes(normVoyage) || normVoyage.includes(nv);
      });
      if (voyageMatches.length > 0) pool = voyageMatches;
    }

    // Dentro do pool, prioriza pelo deadline mais urgente com data futura.
    // Isso resolve o caso em que BTP e EMBRAPORT têm o mesmo navio/viagem
    // mas prazos diferentes: o mais urgente é o relevante para a operação.
    const now = new Date();
    const deadlineDt = (v: TerminalVessel) => parseFlexDate(v.deadLineStr || '');

    pool.sort((a, b) => {
      const da = deadlineDt(a);
      const db = deadlineDt(b);
      const daFut = da && da > now;
      const dbFut = db && db > now;
      // Ambos com deadline futuro: prefere o mais urgente (menor prazo)
      if (daFut && dbFut) return da!.getTime() - db!.getTime();
      // Apenas um tem deadline futuro: prefere ele
      if (daFut) return -1;
      if (dbFut) return 1;
      // Nenhum tem deadline futuro: prefere o mais recentemente expirado
      if (da && db) return db.getTime() - da.getTime();
      if (da) return -1;
      if (db) return 1;
      // Sem deadline: prefere quem tem dados de gate
      return (b.gateDry || b.gateReefer ? 1 : 0) - (a.gateDry || a.gateReefer ? 1 : 0);
    });

    return pool[0];
  }, [terminalVessels, splitShipField]);

  const mapSituacaoGate = (s: string) => {
    const n = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (n.includes('gate abert') || n.includes('gate open'))  return 'GATE ABERTO' as const;
    if (n.includes('gate fech') || n.includes('gate closed')) return 'GATE FECHADO' as const;
    if (n.includes('gate encerr') || n.includes('encerrado')) return 'GATE ENCERRADO' as const;
    if (n.includes('em operac') || n.includes('operando') || n.includes('atracad')) return 'ATRACADO' as const;
    if (n.includes('desatrac') || n.includes('saiu'))         return 'DESATRACADO' as const;
    if (n.includes('na barra') || n.includes('esperado') || n.includes('previsto') || n.includes('aguard')) return 'AG_ATRAC' as const;
    return null;
  };

  const renderGateTag = useCallback((shipName?: string, containerType?: string): React.ReactNode => {
    if (!shipName) return null;
    const vessel = getVesselForTrip(shipName);
    if (!vessel) return null;
    const now = new Date();
    const isReefer = /R/i.test(containerType || '');

    // Abertura efetiva (gate já aberto)
    const gateStr = isReefer
      ? (vessel.gateReefer || vessel.gateDry)
      : (vessel.gateDry || vessel.gateReefer);
    const gateDt = parseFlexDate(gateStr || '');

    // Previsão de abertura (gate ainda não aberto — Santos Brasil PREVISAO_LIBERACAO)
    const prevGateStr = isReefer
      ? (vessel.prevGateReefer || vessel.prevGateDry)
      : (vessel.prevGateDry || vessel.prevGateReefer);
    const prevGateDt = parseFlexDate(prevGateStr || '');

    const deadDt = parseFlexDate(vessel.deadLineStr || '');

    const fmtDate = (d: Date) =>
      d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    // Use situacao from scraper as primary source (same as NaviosTab)
    const situacaoStatus = mapSituacaoGate(vessel.situacao);

    // Override: if bot still says "Gate Aberto" but deadline already passed, treat as fechado
    let effectiveStatus = (situacaoStatus === 'GATE ABERTO' && deadDt && deadDt <= now)
      ? 'GATE FECHADO'
      : situacaoStatus;

    // Override: gate opening is still in the future → not open yet, show Gate Fechado com previsão
    if (effectiveStatus === 'GATE ABERTO' && gateDt && gateDt > now) {
      effectiveStatus = 'GATE FECHADO';
    }

    if (effectiveStatus === 'GATE ABERTO') {
      const encDt = deadDt || gateDt;
      return (
        <span className="inline-flex items-center gap-1 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-green-500/10 text-green-700 border-green-500/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-500"/>
          Gate Aberto
          {encDt && (
            <span className={`font-bold normal-case ml-0.5 ${encDt <= now ? 'text-red-500' : 'text-orange-500'}`}>
              • Enc. {fmtDate(encDt)}
            </span>
          )}
        </span>
      );
    }

    if (effectiveStatus === 'GATE FECHADO') {
      // showActual = tem data de abertura efetiva que ainda não chegou
      const showActual  = !!(gateDt && gateDt > now);
      // Se tem abertura efetiva futura → usa ela (vermelho "Abre");
      // caso contrário → usa previsão se existir (azul "~Abre")
      const aberturaRef = showActual ? gateDt : prevGateDt;
      const isPreview   = !showActual && !!prevGateDt;
      return (
        <span className="inline-flex items-center gap-1 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-red-500/10 text-red-600 border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-500"/>
          Gate Fechado
          {aberturaRef && (
            <span className={`font-bold normal-case ml-0.5 ${isPreview ? 'text-blue-400' : 'text-red-400'}`}>
              • {isPreview ? '~Abre' : 'Abre'} {fmtDate(aberturaRef)}
            </span>
          )}
        </span>
      );
    }

    if (effectiveStatus === 'GATE ENCERRADO') {
      return (
        <span className="inline-flex items-center gap-1 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-pink-500/10 text-pink-600 border-pink-500/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-pink-500"/>
          Gate Encerrado
        </span>
      );
    }

    if (effectiveStatus === 'ATRACADO') {
      return (
        <span className="inline-flex items-center gap-1 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500"/>
          Atracado
        </span>
      );
    }

    // situacao not recognized — fall back to gate datetime logic if available
    if (!gateDt) return null;
    if (gateDt > now) {
      return (
        <span className="inline-flex items-center gap-1 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-red-500/10 text-red-600 border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-500"/>
          Gate Fechado
          <span className="font-bold text-red-400 normal-case ml-0.5">• Abre {fmtDate(gateDt)}</span>
        </span>
      );
    }
    if (deadDt && deadDt < now) {
      return (
        <span className="inline-flex items-center gap-1 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-pink-500/10 text-pink-600 border-pink-500/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-pink-500"/>
          Gate Encerrado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-green-500/10 text-green-700 border-green-500/30">
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-500"/>
        Gate Aberto
        {deadDt && (
          <span className="font-bold text-orange-500 normal-case ml-0.5">• Enc. {fmtDate(deadDt)}</span>
        )}
      </span>
    );
  }, [getVesselForTrip]);

  /** Mostra previsões de chegada / atracação / saída abaixo do gate tag */
  const renderVesselDates = useCallback((shipName?: string): React.ReactNode => {
    if (!shipName) return null;
    const vessel = getVesselForTrip(shipName);
    if (!vessel) return null;

    const fmtShort = (s?: string): string | null => {
      if (!s || s === '--' || s === '-') return null;
      const d = parseFlexDate(s);
      if (!d) return null;
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const rows: { label: string; value: string; actual: boolean }[] = [];

    const chegFmt     = fmtShort(vessel.dtChegada) || fmtShort(vessel.dtPrevChegada);
    const atracFmt    = fmtShort(vessel.dtAtracacao) || fmtShort(vessel.dtPrevAtrac);
    const saidaFmt    = fmtShort(vessel.dtSaida) || fmtShort(vessel.dtPrevSaida);
    // Previsão de abertura do gate — só mostra se ainda não há abertura efetiva
    const prevAberFmt = !vessel.gateDry && !vessel.gateReefer
      ? (fmtShort(vessel.prevGateDry) || fmtShort(vessel.prevGateReefer))
      : null;

    if (chegFmt)     rows.push({ label: vessel.dtChegada   ? 'Chegada'    : 'Prev. Cheg.',   value: chegFmt,     actual: !!vessel.dtChegada });
    if (atracFmt)    rows.push({ label: vessel.dtAtracacao  ? 'Atracação'  : 'Prev. Atrac.',  value: atracFmt,    actual: !!vessel.dtAtracacao });
    if (saidaFmt)    rows.push({ label: vessel.dtSaida      ? 'Saída'      : 'Prev. Saída',   value: saidaFmt,    actual: !!vessel.dtSaida });
    if (prevAberFmt) rows.push({ label: 'Prev. Abertura', value: prevAberFmt, actual: false });

    if (rows.length === 0) return null;

    return (
      <div className="flex flex-col gap-px mt-0.5 pl-0.5 border-l border-slate-200">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-1 leading-none">
            <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">
              {row.label}:
            </span>
            <span className={`text-[7px] font-bold whitespace-nowrap ${row.actual ? 'text-slate-500' : 'text-blue-600'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    );
  }, [getVesselForTrip]);

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
    const now = Date.now();

    return propTrips
      .map(serverTrip => {
        const pending = pendingUpdates[serverTrip.id];
        // Se houver uma atualização local feita há menos de STABILITY_DURATION, ela tem prioridade
        if (pending && (now - pending.timestamp) < STABILITY_DURATION) {
          return { ...serverTrip, ...pending.data };
        }
        return serverTrip;
      })
      .filter(trip => {
        const type = trip.type?.toUpperCase() || '';
        if (activeView === 'COLETA') {
          if (type.includes('DEVOLU')) return false;
          if (hiddenTripTypesColeta !== null) {
            if (hiddenTripTypesColeta.includes(type)) return false;
          } else {
            if (!['COLETA', 'CABOTAGEM', 'EXPORTAÇÃO'].includes(type)) return false;
          }
        } else {
          if (type.includes('DEVOLU')) return false;
          if (hiddenTripTypesEntrega !== null) {
            if (hiddenTripTypesEntrega.includes(type)) return false;
          } else {
            if (!['ENTREGA', 'IMPORTAÇÃO'].includes(type)) return false;
          }
        }

        if (finalizingIds.has(trip.id)) return false;

        if (selectedCategoryFilters.length > 0) {
          const tripCat = (trip.category || '').toUpperCase();
          if (!selectedCategoryFilters.includes(tripCat)) return false;
        }

        if (!trip.isRemovedFromOrg) {
          // Viagem agendada ou com data de agendamento definida: permanece visível
          if (trip.isScheduled) return true;
          if (trip.scheduledDateTime || trip.scheduling?.dateTime) return true;
          const dt = trip.dateTime;
          if (dt) {
            const raw = dt.includes('T') ? dt.split('T')[0] : dt.split(' ')[0];
            const normalized = raw.includes('/') ? raw.split('/').reverse().join('-') : raw;
            if (normalized < '2026-04-01') return false;
          }
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dateTime || 0).getTime();
        const dateB = new Date(b.dateTime || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.driver.name || '').localeCompare(b.driver.name || '');
      });
  }, [propTrips, pendingUpdates, finalizingIds, activeView, hiddenTripTypesColeta, hiddenTripTypesEntrega, selectedCategoryFilters]);

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

  const loadDevolucoes = useCallback(async () => {
    const devs = await db.getDevolucoes();
    setDevolucoes(devs);
  }, []);

  useEffect(() => {
    loadDevolucoes();
    if (!supabase) return;
    const ch = supabase
      .channel('org-devolucoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devolucoes' }, loadDevolucoes)
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [loadDevolucoes]);

  const loadLiberacoes = useCallback(async () => {
    const libs = await db.getLiberacoes();
    setLiberacoes(libs);
  }, []);

  useEffect(() => {
    loadLiberacoes();
    if (!supabase) return;
    const ch = supabase
      .channel('org-liberacoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'liberacoes' }, loadLiberacoes)
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [loadLiberacoes]);

  // Subscription direta em trips — sem debounce, todos os usuários recebem imediatamente
  useEffect(() => {
    if (!supabase) return;
    const ch = supabase
      .channel('org-trips-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => onRefresh())
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [onRefresh]);

  const sortedDevolucoes = useMemo(() => {
    return [...devolucoes].sort((a, b) => {
      const pa = DEV_PRIORITY[getDevScheduleStatus(a)];
      const pb = DEV_PRIORITY[getDevScheduleStatus(b)];
      if (pa !== pb) return pb - pa;
      const da = a.scheduledDateTime ? new Date(a.scheduledDateTime).getTime() : Infinity;
      const db = b.scheduledDateTime ? new Date(b.scheduledDateTime).getTime() : Infinity;
      return da - db;
    });
  }, [devolucoes]);

  const sortedLiberacoes = useMemo(() => {
    const libPriority: Record<string, number> = { Pendente: 2, Emitido: 1, Cancelado: 0 };
    return [...liberacoes].sort((a, b) => (libPriority[b.status] ?? 0) - (libPriority[a.status] ?? 0));
  }, [liberacoes]);

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

  const applyStatusToggle = useCallback(async (
    trip: Trip,
    activate: boolean,
    targetStatus: TripStatus,
    errMsg: string,
  ) => {
    const nowIso = new Date().toISOString();
    const history = trip.statusHistory || [];
    let newStatus: TripStatus;
    let newHistory: StatusHistoryEntry[];

    if (activate) {
      newStatus = targetStatus;
      newHistory = [...history, { status: targetStatus, dateTime: trip.dateTime || nowIso, createdAt: nowIso }];
    } else {
      // Remove as entradas desse status e volta ao último status anterior
      newHistory = history.filter(h => h.status !== targetStatus);
      newStatus = newHistory.length ? newHistory[newHistory.length - 1].status : 'Pendente';
    }

    const updated = { ...trip, status: newStatus, statusHistory: newHistory };
    const now = Date.now();
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { data: { ...(prev[trip.id]?.data || {}), status: newStatus, statusHistory: newHistory }, timestamp: now }
    }));
    try {
      await db.saveTrip(updated);
    } catch {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: errMsg, type: 'error' } }));
    }
  }, []);

  const handleToggleFreteMorto = useCallback(async (trip: Trip, activate: boolean) => {
    const nowIso = new Date().toISOString();
    const history = trip.statusHistory || [];
    let newStatus: TripStatus;
    let newHistory: typeof history;

    if (activate) {
      newStatus = 'Frete Morto';
      newHistory = [...history, { status: 'Frete Morto' as TripStatus, dateTime: trip.dateTime || nowIso, createdAt: nowIso }];
    } else {
      newHistory = history.filter(h => h.status !== 'Frete Morto');
      newStatus = newHistory.length ? newHistory[newHistory.length - 1].status : 'Pendente';
    }

    const updated = { ...trip, status: newStatus, statusHistory: newHistory, isRemovedFromColeta: activate };
    const now = Date.now();
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: {
        data: { ...(prev[trip.id]?.data || {}), status: newStatus, statusHistory: newHistory, isRemovedFromColeta: activate },
        timestamp: now,
      }
    }));
    try {
      await db.saveTrip(updated);
    } catch {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar Frete Morto', type: 'error' } }));
    }
  }, []);

  const handleToggleReutilizacao = useCallback((trip: Trip, activate: boolean) =>
    applyStatusToggle(trip, activate, 'Reutilização', 'Erro ao salvar Reutilização'), [applyStatusToggle]);

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

    const existing = selectedTripForScheduling;
    const selectedLoc = locations.find(l => l.id === locationId);

    // Usa o local já existente na viagem quando nenhum novo local foi selecionado
    const resolvedLocationId = locationId || existing.scheduledLocationId || existing.scheduling?.locationId || '';
    const resolvedLoc = selectedLoc || locations.find(l => l.id === resolvedLocationId);
    const resolvedLocationName = resolvedLoc?.name || existing.scheduling?.location || '';
    const resolvedDestination = resolvedLoc ? {
      id: resolvedLoc.id,
      name: resolvedLoc.name,
      legalName: resolvedLoc.legalName,
      cnpj: resolvedLoc.cnpj,
      city: resolvedLoc.city,
      state: resolvedLoc.state
    } : existing.destination;

    const schedulingData = {
      isScheduled: true,
      scheduledLocationId: resolvedLocationId,
      scheduledDateTime: dateTime,
      destination: resolvedDestination,
      scheduling: {
        locationId: resolvedLocationId,
        location: resolvedLocationName,
        dateTime: dateTime ? new Date(dateTime).toISOString() : '',
        obs: existing.scheduling?.obs || ''
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
      // Não reverte pendingUpdates para evitar que o trip desapareça do painel.
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
    // Salva como ISO UTC para consistência com SchedulingEditModal
    const isoDateTime = dateTime ? new Date(dateTime).toISOString() : '';
    // Auto-confirma o agendamento quando uma data é selecionada
    const dateTimeData = {
      scheduledDateTime: dateTime,
      ...(dateTime ? { isScheduled: true } : {}),
      scheduling: {
        locationId: trip.scheduledLocationId || '',
        location: trip.scheduling?.location || '',
        dateTime: isoDateTime,
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
      // Não reverte pendingUpdates para evitar que o trip desapareça do painel.
      // O toast informa o erro e o timeout de 30s faz a limpeza quando necessário.
      console.error("Erro ao salvar data/hora de agendamento:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', {
        detail: { message: 'Erro ao salvar data/hora de agendamento', type: 'error' }
      }));
    }
  }, []);

  const handleSaveDevAgendamento = useCallback(async (devId: string, dateTime: string) => {
    const dev = devolucoes.find(d => d.id === devId);
    if (!dev) return;
    try {
      await db.saveDevolucao({ ...dev, scheduledDateTime: dateTime, status: dateTime ? 'Agendado' : dev.status });
      await loadDevolucoes();
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar agendamento', type: 'error' } }));
    }
  }, [devolucoes, loadDevolucoes]);

  const handleDevComprovanteUpload = useCallback(async (dev: Devolucao, file: File) => {
    setUploadingDevId(dev.id);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const fileName = `comprovante-dev-${dev.os || dev.id}-${Date.now()}.${ext}`;
      const url = await r2Service.upload(file, fileName, `devolucoes/${dev.os || dev.id}`);
      const doc = { id: `agd-${Date.now()}`, type: 'AGENDAMENTO', url, fileName: file.name, uploadDate: new Date().toISOString() };
      await db.saveDevolucao({ ...dev, agendamentoDoc: doc });
      await loadDevolucoes();
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Comprovante enviado com sucesso', type: 'success' } }));
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao enviar comprovante', type: 'error' } }));
    } finally {
      setUploadingDevId(null);
    }
  }, [loadDevolucoes]);

  const handleSaveDevolucaoFromForm = useCallback(async (updated: Devolucao) => {
    await db.saveDevolucao(updated);
    await loadDevolucoes();
    setDevMinutaDev(null);
    window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Minuta salva com sucesso', type: 'success' } }));
  }, [loadDevolucoes]);

  const handleSaveLiberacaoFromForm = useCallback(async (updated: Liberacao) => {
    await db.saveLiberacao(updated);
    await loadLiberacoes();
    setLibMinuta(null);
    window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Liberação salva com sucesso', type: 'success' } }));
  }, [loadLiberacoes]);

  const handleAddDevEntry = useCallback(async () => {
    if (!devAddForm.container.trim()) return;
    setSavingDevAdd(true);
    try {
      const driver = drivers.find(d => d.id === devAddForm.driverId);
      const now = new Date().toISOString();
      const newDev: Devolucao = {
        id: crypto.randomUUID(),
        os: `DEV-${Date.now()}`,
        container: devAddForm.container.trim().toUpperCase(),
        local: devAddForm.local.trim() ? devAddForm.local.trim().toUpperCase() : undefined,
        driver: driver ? {
          id: driver.id,
          name: driver.name,
          plateHorse: driver.plateHorse || undefined,
          plateTrailer: driver.plateTrailer || undefined,
          cpf: driver.cpf || undefined,
        } : undefined,
        scheduledDateTime: devAddForm.dateTime || undefined,
        status: 'Pendente',
        createdAt: now,
      };
      await db.saveDevolucao(newDev);
      await loadDevolucoes();
      setDevAddForm({ container: '', local: '', dateTime: '', driverId: '' });
      setShowDevAddForm(false);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Devolução adicionada com sucesso', type: 'success' } }));
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao adicionar devolução', type: 'error' } }));
    } finally {
      setSavingDevAdd(false);
    }
  }, [devAddForm, drivers, loadDevolucoes]);

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

  const toggleTripType = (type: string) => {
    if (activeView === 'COLETA') {
      setHiddenTripTypesColeta(prev => {
        const currentHidden = prev !== null ? prev : operationTypes.map(t => t.name.toUpperCase()).filter(t => !['COLETA', 'CABOTAGEM', 'EXPORTAÇÃO'].includes(t));
        const next = currentHidden.includes(type) ? currentHidden.filter(t => t !== type) : [...currentHidden, type];
        localStorage.setItem('orgVisibleTripTypesColeta', JSON.stringify(next));
        return next;
      });
    } else {
      setHiddenTripTypesEntrega(prev => {
        const currentHidden = prev !== null ? prev : operationTypes.map(t => t.name.toUpperCase()).filter(t => !['ENTREGA', 'IMPORTAÇÃO'].includes(t));
        const next = currentHidden.includes(type) ? currentHidden.filter(t => t !== type) : [...currentHidden, type];
        localStorage.setItem('orgVisibleTripTypesEntrega', JSON.stringify(next));
        return next;
      });
    }
  };

  const handleFinalizeTrips = () => {
    const readyTrips = trips.filter(t => isTripReadyToFinalize(t));

    if (readyTrips.length === 0) {
      alert("Nenhuma viagem está pronta para limpar. Certifique-se de que as viagens agendadas têm 'NF' e 'Adiantamento' marcados, ou que viagens em Frete Morto têm 'Adiantamento' marcado.");
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
    if (t.status === 'Frete Morto') return !!t.hasAdvance;
    return isTripScheduled(t) && !!t.sentNF && !!t.hasAdvance;
  }, [isTripScheduled]);

  const mapTripToMinuta = useCallback((t: Trip) => ({
    os: t.os || '',
    container: t.container || '',
    tara: t.tara || '',
    seal: t.seal || '',
    booking: t.booking || '',
    ship: t.ship || '',
    tipo: '40HC',
    padrao: 'CARGA GERAL',
    tipoOperacao: t.type || 'EXPORTAÇÃO',
    category: t.category || '',
    driverId: t.driver?.id || '',
    remetenteId: t.customer?.id || '',
    destinatarioId: '',
    date: localDateStr(),
    displayDate: new Date().toLocaleDateString('pt-BR'),
    horarioAgendado: localDateTimeStr(),
    schedulingDate: '',
    schedulingTime: '',
    obs: '',
    nf: '',
    autColeta: '',
    agencia: '',
    embarcador: '',
    genset: '',
  }), []);

  const clean = (s: string) => s.replace(/[\s.\-/()]/g, '');
  const CopyBtn = ({ value }: { value: string }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value).catch(() => {}); }}
      className="p-0.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-all shrink-0"
      title={`Copiar: ${value}`}
    >
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>
  );

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
      render: (t: Trip) => {
        const catColor = categories.find((c: any) => c.name?.toUpperCase() === t.category?.toUpperCase())?.color;
        const typeColor = operationTypes.find((ot: any) => ot.name?.toUpperCase() === t.type?.toUpperCase())?.color;
        return (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="font-black text-slate-900 text-[9px]">{t.os}</span>
                <CopyBtn value={t.os} />
              </div>
              <div className="flex flex-wrap gap-1">
                {t.category && (
                  <span
                    className="text-[6px] px-1 py-0.5 rounded font-black border uppercase"
                    style={catColor ? { backgroundColor: `${catColor}25`, color: catColor, borderColor: `${catColor}60` } : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}
                  >
                    {t.category}
                  </span>
                )}
                {t.type && (
                  <span
                    className="text-[6px] px-1 py-0.5 rounded font-black border uppercase"
                    style={typeColor ? { backgroundColor: `${typeColor}25`, color: typeColor, borderColor: `${typeColor}60` } : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}
                  >
                    {t.type}
                  </span>
                )}
              </div>
              {/* Edit OC button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOcTrip(t); }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[6px] font-black uppercase tracking-tight transition-all border w-fit mt-0.5 bg-white border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400"
                title="Editar Ordem de Coleta"
              >
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Editar OC
              </button>
            </div>
            {pendingUpdates[t.id] && (
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" title="Salvando alterações..."></div>
            )}
          </div>
        );
      }
    },
    {
      key: 'container',
      label: 'Container',
      sortValue: (t: Trip) => t.container || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5 min-w-[120px]">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-black text-blue-600 uppercase">{t.container || '---'}</span>
            {t.container && <CopyBtn value={t.container} />}
          </div>
          {t.tara && (
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">Tara:</span>
              <span className="text-[7px] font-bold text-slate-600">{t.tara}</span>
              <CopyBtn value={t.tara} />
            </div>
          )}
          {t.seal && (
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">Lacre:</span>
              <span className="text-[7px] font-bold text-slate-600">{t.seal}</span>
              <CopyBtn value={t.seal} />
            </div>
          )}
          {t.cva && (
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">CVA:</span>
              <span className="text-[7px] font-bold text-slate-600">{t.cva}</span>
              <CopyBtn value={t.cva} />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'ship',
      label: 'Booking / Navio',
      sortValue: (t: Trip) => t.ship || '',
      render: (t: Trip) => {
        const { name, voyage } = splitShipField(t.ship || '');
        return (
          <div className="flex flex-col gap-1 min-w-[130px]">
            {t.booking && (
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-black text-slate-700 uppercase leading-tight">{t.booking}</span>
                <CopyBtn value={t.booking} />
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-slate-700 uppercase leading-tight">
                {name || '---'}
              </span>
              {voyage && (
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">
                  Viagem: {voyage}
                </span>
              )}
              {t.ship && renderGateTag(t.ship, t.containerType)}
              {t.ship && renderVesselDates(t.ship)}
            </div>
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
          <span className="font-bold text-slate-600 uppercase leading-none text-[9px]">{t.driver.name}</span>
          {t.driver.cpf && (
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-mono text-slate-400">{t.driver.cpf}</span>
              <CopyBtn value={clean(t.driver.cpf)} />
            </div>
          )}
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">Cavalo:</span>
              <span className="text-[7px] bg-slate-100 px-1 py-0.5 rounded font-black text-slate-600 border border-slate-200">{t.driver.plateHorse || '---'}</span>
              {t.driver.plateHorse && <CopyBtn value={clean(t.driver.plateHorse)} />}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">Carreta:</span>
              <span className="text-[7px] bg-slate-100 px-1 py-0.5 rounded font-black text-slate-600 border border-slate-200">{t.driver.plateTrailer || '---'}</span>
              {t.driver.plateTrailer && <CopyBtn value={clean(t.driver.plateTrailer)} />}
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
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-slate-800 uppercase text-[9px]">{t.customer.name}</span>
          <span className="text-[7px] text-slate-400 font-bold uppercase truncate max-w-[120px]">
            {t.customer.legalName || '---'}
          </span>
          {(t.customer.city || t.customer.state) && (
            <span className="text-[7px] text-slate-400 font-bold uppercase flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              {[t.customer.city, t.customer.state].filter(Boolean).join(' - ')}
            </span>
          )}
          {t.customer.cnpj && (
            <div className="flex items-center gap-1">
              <span className="text-[6px] text-slate-400 font-mono">{t.customer.cnpj}</span>
              <CopyBtn value={clean(t.customer.cnpj)} />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'sentNF',
      label: 'NF Enviada',
      render: (t: Trip) => (
        <div className="flex items-center justify-center">
          <ToggleIconBtn
            checked={!!t.sentNF}
            onClick={() => handleToggleNF(t, !t.sentNF)}
            disabled={t.status === 'Frete Morto'}
            loading={'sentNF' in (pendingUpdates[t.id]?.data || {})}
            activeClass="bg-emerald-50 border-emerald-400 text-emerald-600"
            inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-emerald-300 hover:text-emerald-400"
            badgeColor="bg-emerald-500"
            title={t.status === 'Frete Morto' ? 'Bloqueado — viagem em Frete Morto' : (t.sentNF ? 'NF enviada — clique para desmarcar' : 'Marcar NF como enviada')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </ToggleIconBtn>
        </div>
      )
    },
    {
      key: 'isScheduled',
      label: 'Agendado',
      render: (t: Trip) => {
        const hasMinuta = !!t.preStackingFormData;
        const isFreteMorto = t.status === 'Frete Morto';
        const isPending = 'isScheduled' in (pendingUpdates[t.id]?.data || {});
        const isScheduled = isTripScheduled(t);
        return (
          <div className="flex flex-col items-center gap-1">
            <ToggleIconBtn
              checked={isScheduled}
              onClick={() => handleToggleScheduled(t, !isScheduled)}
              disabled={hasMinuta || isFreteMorto}
              loading={isPending}
              activeClass="bg-blue-50 border-blue-400 text-blue-600"
              inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-blue-300 hover:text-blue-400"
              badgeColor="bg-blue-500"
              title={isFreteMorto ? 'Bloqueado — viagem em Frete Morto' : (hasMinuta ? 'Agendamento automático via Minuta' : (isScheduled ? 'Agendado — clique para desmarcar' : 'Marcar como agendado'))}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </ToggleIconBtn>
            {isScheduled && t.sentNF && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-[6px] font-black text-emerald-700 uppercase tracking-tight" title="NF enviada e agendado">
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                </svg>
                NF
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'scheduledLocationId',
      label: 'Local Agendamento',
      render: (t: Trip) => {
        const isFreteMorto = t.status === 'Frete Morto';
        const isReutilizacao = t.status === 'Reutilização';
        return (
          <div className="flex flex-col gap-1.5">
            <LocationSearchableSelect
              trip={t}
              locations={locations}
              onLocationChange={handleLocationChange}
              isScheduled={isTripScheduled(t)}
              isFreteMorto={isFreteMorto}
            />
            {activeView === 'COLETA' ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleFreteMorto(t, !isFreteMorto); }}
                className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all border ${isFreteMorto ? 'bg-slate-200 border-slate-500 text-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                title={isFreteMorto ? 'Frete Morto — clique para reverter' : 'Marcar como Frete Morto'}
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                </svg>
                {isFreteMorto ? 'Frete Morto ✓' : 'Frete Morto'}
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleReutilizacao(t, !isReutilizacao); }}
                className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all border ${isReutilizacao ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
                title={isReutilizacao ? 'Reutilização — clique para reverter' : 'Marcar como Reutilização'}
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                {isReutilizacao ? 'Reutilização ✓' : 'Reutilização'}
              </button>
            )}
          </div>
        );
      }
    },
    {
      key: 'scheduledDateTime',
      label: 'Data/Hora Agend.',
      render: (t: Trip) => {
        const rawDT = t.scheduling?.dateTime || t.scheduledDateTime || '';
        const displayValue = formatToLocalInput(rawDT);
        const hasMinuta = !!t.preStackingFormData;
        return (
          <div className="flex flex-col gap-1.5 min-w-[9rem]">
            <DateTimePicker
              value={displayValue}
              onChange={(v) => handleDateTimeChange(t, v)}
              placeholder="Selecionar..."
              inputClassName={`!px-2 !py-1 !rounded-lg !border !text-[9px] !font-bold !min-w-[9rem] ${isTripScheduled(t) ? '!border-emerald-300 !bg-emerald-50' : '!border-slate-200 !bg-slate-50'}`}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMinutaTrip(t); }}
              className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all border ${hasMinuta ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
              title={hasMinuta ? 'Minuta gerada — clique para reeditar' : 'Gerar Minuta de Pré-Stacking'}
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              {hasMinuta ? 'Minuta ✓' : 'Gerar Minuta'}
            </button>
          </div>
        );
      }
    },
    {
      key: 'hasAdvance',
      label: 'Adiantamento',
      render: (t: Trip) => (
        <div className="flex flex-col items-center gap-1">
          <ToggleIconBtn
            checked={!!t.hasAdvance}
            onClick={() => handleToggleAdvance(t, !t.hasAdvance)}
            loading={'hasAdvance' in (pendingUpdates[t.id]?.data || {})}
            activeClass="bg-amber-50 border-amber-400 text-amber-600"
            inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-amber-300 hover:text-amber-400"
            badgeColor="bg-amber-500"
            title={t.hasAdvance ? 'Adiantamento liberado — clique para bloquear' : 'Liberar adiantamento (70%)'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </ToggleIconBtn>
          {t.hasAdvance && (
            <span className="text-[6px] font-black text-amber-600 uppercase tracking-tight">70% LIB</span>
          )}
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
            onClick={() => setConfirmRemove(t)}
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
  ], [locations, handleToggleNF, handleToggleScheduled, handleLocationChange, handleDateTimeChange, handleToggleAdvance, handleRemoveFromOrg, isTripScheduled, categories, operationTypes, pendingUpdates, renderGateTag, renderVesselDates, mapTripToMinuta, activeView, handleToggleFreteMorto, handleToggleReutilizacao]);

  const handleDeleteDevolucao = useCallback((d: Devolucao) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Devolução',
      message: `Deseja excluir permanentemente a devolução do container ${d.container || d.os}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await db.deleteDevolucao(d.id);
        await loadDevolucoes();
        window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Devolução excluída', type: 'success' } }));
      }
    });
  }, [loadDevolucoes]);

  const handleDeleteLiberacao = useCallback((l: Liberacao) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Liberação',
      message: `Deseja excluir permanentemente a liberação ${l.os}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await db.deleteLiberacao(l.id);
        await loadLiberacoes();
        window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Liberação excluída', type: 'success' } }));
      }
    });
  }, [loadLiberacoes]);

  const devolucoesColumns = useMemo(() => [
    {
      key: 'container',
      label: 'Container / OS',
      sortable: true,
      render: (d: Devolucao) => (
        <div className="flex flex-col gap-0.5 py-0.5">
          <span className="text-[10px] font-black text-slate-800 uppercase">{d.container || '---'}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">{d.os}</span>
        </div>
      ),
    },
    {
      key: 'local',
      label: 'Local / Depósito',
      sortable: true,
      render: (d: Devolucao) => (
        <span className="text-[9px] font-bold text-slate-700 uppercase">{d.local || '---'}</span>
      ),
    },
    {
      key: 'booking',
      label: 'Booking / Navio',
      sortable: true,
      render: (d: Devolucao) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{d.booking || '---'}</span>
          {d.ship && <span className="text-[8px] font-bold text-slate-400 uppercase">{d.ship}</span>}
        </div>
      ),
    },
    {
      key: 'containerType',
      label: 'Tipo / Padrão',
      sortable: true,
      render: (d: Devolucao) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{d.containerType || '---'}</span>
          {d.padrao && <span className="text-[8px] font-bold text-slate-400 uppercase">{d.padrao}</span>}
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Cliente',
      sortable: true,
      sortValue: (d: Devolucao) => d.customer?.legalName || d.customer?.name || '',
      render: (d: Devolucao) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{d.customer?.legalName || d.customer?.name || '---'}</span>
          {d.customer?.city && <span className="text-[8px] font-bold text-slate-400 uppercase">{d.customer.city}{d.customer.state ? `/${d.customer.state}` : ''}</span>}
        </div>
      ),
    },
    {
      key: 'driver',
      label: 'Motorista',
      sortable: true,
      sortValue: (d: Devolucao) => d.driver?.name || '',
      render: (d: Devolucao) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{d.driver?.name || '---'}</span>
          <div className="flex items-center gap-1">
            {d.driver?.plateHorse && <span className="text-[8px] font-bold text-blue-600 uppercase">{d.driver.plateHorse}</span>}
            {d.driver?.plateTrailer && <span className="text-[8px] font-bold text-slate-400 uppercase">{d.driver.plateTrailer}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'scheduledDateTime',
      label: 'Agendamento',
      sortable: true,
      width: 210,
      render: (d: Devolucao) => {
        const dtPickerVal = d.scheduledDateTime
          ? (() => { try { const dt = new Date(d.scheduledDateTime!); const off = dt.getTimezoneOffset()*60000; return new Date(dt.getTime()-off).toISOString().slice(0,16); } catch { return ''; }})()
          : '';
        return (
          <DateTimePicker
            value={dtPickerVal}
            onChange={val => {
              const iso = val ? new Date(val).toISOString() : '';
              handleSaveDevAgendamento(d.id, iso);
            }}
            placeholder="Agendar..."
            inputClassName="text-[9px] py-1.5 rounded-lg border-slate-200"
          />
        );
      },
    },
    {
      key: 'status',
      label: 'Status / Prioridade',
      sortable: true,
      render: (d: Devolucao) => {
        const styles: Record<string, string> = {
          Pendente: 'bg-slate-100 text-slate-600 border-slate-200',
          Agendado: 'bg-amber-50 text-amber-700 border-amber-200',
          Realizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          Cancelado: 'bg-red-50 text-red-700 border-red-200',
        };
        const sched = getDevScheduleStatus(d);
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border w-fit ${styles[d.status] || styles.Pendente}`}>{d.status}</span>
            {sched === 'critico' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border bg-red-600 text-white border-red-700 animate-pulse w-fit">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                +2 dias sem comprovante
              </span>
            )}
            {sched === 'pendente' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border bg-orange-100 text-orange-700 border-orange-300 w-fit">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Sem comprovante
              </span>
            )}
            {sched === 'agendado' && !d.agendamentoDoc && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border bg-blue-50 text-blue-600 border-blue-200 w-fit">
                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Aguardando
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'agendamentoDoc',
      label: 'Comprovante',
      sortable: false,
      render: (d: Devolucao) => {
        const isUploading = uploadingDevId === d.id;
        return (
          <div className="flex flex-col gap-1 items-start">
            {d.agendamentoDoc && (
              <button
                onClick={() => setViewingDoc({ url: d.agendamentoDoc!.url, fileName: d.agendamentoDoc!.fileName })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[8px] font-black text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Visualizar
              </button>
            )}
            <label className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[8px] font-black cursor-pointer transition-colors ${isUploading ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700'}`}>
              {isUploading
                ? <><div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"/><span>Enviando...</span></>
                : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg><span>{d.agendamentoDoc ? 'Substituir' : 'Anexar'}</span></>
              }
              <input type="file" accept=".pdf,image/*" className="hidden" disabled={isUploading} onChange={e => { const file = e.target.files?.[0]; if (file) { handleDevComprovanteUpload(d, file); e.target.value = ''; } }} />
            </label>
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      width: 90,
      render: (d: Devolucao) => (
        <div className="flex items-center gap-1 justify-center">
          <button onClick={() => setDevMinutaDev(d)} className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all" title="Editar minuta">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onClick={() => handleDeleteDevolucao(d)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all" title="Excluir">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      ),
    },
  ], [handleSaveDevAgendamento, handleDevComprovanteUpload, setDevMinutaDev, handleDeleteDevolucao, uploadingDevId]);

  const liberacoesColumns = useMemo(() => [
    {
      key: 'os',
      label: 'OS',
      sortable: true,
      render: (l: Liberacao) => <span className="text-[9px] font-bold text-slate-600 uppercase">{l.os || '---'}</span>,
    },
    {
      key: 'local',
      label: 'Local / Retirada',
      sortable: true,
      render: (l: Liberacao) => <span className="text-[9px] font-bold text-slate-700 uppercase">{l.local || '---'}</span>,
    },
    {
      key: 'booking',
      label: 'Booking / Navio',
      sortable: true,
      render: (l: Liberacao) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{l.booking || '---'}</span>
          {l.ship && <span className="text-[8px] font-bold text-slate-400 uppercase">{l.ship}</span>}
        </div>
      ),
    },
    {
      key: 'containerType',
      label: 'Qtd / Tipo',
      sortable: true,
      render: (l: Liberacao) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700">{l.qtdContainer || '01'}x {l.containerType || '---'}</span>
          {l.padrao && <span className="text-[8px] font-bold text-slate-400 uppercase">{l.padrao}</span>}
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Cliente',
      sortable: true,
      sortValue: (l: Liberacao) => l.customer?.legalName || l.customer?.name || '',
      render: (l: Liberacao) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{l.customer?.legalName || l.customer?.name || '---'}</span>
          {l.customer?.city && <span className="text-[8px] font-bold text-slate-400 uppercase">{l.customer.city}{l.customer.state ? `/${l.customer.state}` : ''}</span>}
        </div>
      ),
    },
    {
      key: 'driver',
      label: 'Motorista',
      sortable: true,
      sortValue: (l: Liberacao) => l.driver?.name || '',
      render: (l: Liberacao) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{l.driver?.name || '---'}</span>
          <div className="flex items-center gap-1">
            {l.driver?.plateHorse && <span className="text-[8px] font-bold text-blue-600 uppercase">{l.driver.plateHorse}</span>}
            {l.driver?.plateTrailer && <span className="text-[8px] font-bold text-slate-400 uppercase">{l.driver.plateTrailer}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (l: Liberacao) => {
        const styles: Record<string, string> = {
          Pendente: 'bg-slate-100 text-slate-600 border-slate-200',
          Emitido:  'bg-emerald-50 text-emerald-700 border-emerald-200',
          Cancelado:'bg-red-50 text-red-700 border-red-200',
        };
        return <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${styles[l.status] || styles.Pendente}`}>{l.status}</span>;
      },
    },
    {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      width: 90,
      render: (l: Liberacao) => (
        <div className="flex items-center gap-1 justify-center">
          <button onClick={() => setLibMinuta(l)} className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-all" title="Editar liberação">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onClick={() => handleDeleteLiberacao(l)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all" title="Excluir">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      ),
    },
  ], [setLibMinuta, handleDeleteLiberacao]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {ocTrip && createPortal(
        <div className="fixed inset-0 z-[400] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="h-14 bg-indigo-700 flex items-center justify-between px-6 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-tight leading-none">Editar Ordem de Coleta</p>
                  <p className="text-white/60 text-[9px] font-bold uppercase mt-0.5">OS: {ocTrip.os}</p>
                </div>
              </div>
              <button
                onClick={() => { setOcTrip(null); onRefresh(); }}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/40 text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <OrdemColetaForm
                drivers={drivers}
                customers={customers}
                ports={ports}
                onClose={() => { setOcTrip(null); onRefresh(); }}
                initialData={ocTrip.ocFormData}
                tripId={ocTrip.id}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {minutaTrip && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex flex-col overflow-y-auto animate-in fade-in duration-300">
          <PreStackingForm
            user={undefined}
            drivers={drivers}
            customers={customers}
            ports={ports}
            onClose={() => { setMinutaTrip(null); onRefresh(); }}
            initialFormData={minutaTrip.preStackingFormData || mapTripToMinuta(minutaTrip)}
          />
        </div>
      )}

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

      <div className="flex flex-col gap-4 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Organização Operacional</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Agendamentos e NF • Dados desde 06/03/2026</p>
            </div>

            <button
              onClick={() => setSettingsModal(true)}
              className="p-4 bg-white text-slate-600 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
              title="Configurações de tipos visíveis"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>

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
              <button
                onClick={() => setActiveView('DEVOLUÇÕES')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'DEVOLUÇÕES' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Devoluções
              </button>
              <button
                onClick={() => setActiveView('LIBERAÇÕES')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'LIBERAÇÕES' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Liberações
              </button>
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

        {categories.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Vínculo:</span>
            <button
              onClick={() => setSelectedCategoryFilters([])}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${selectedCategoryFilters.length === 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600'}`}
            >
              Todas
            </button>
            {categories.map((cat: any) => {
              const nameUp = (cat.name || '').toUpperCase();
              const active = selectedCategoryFilters.includes(nameUp);
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilters(prev =>
                    prev.includes(nameUp) ? prev.filter(c => c !== nameUp) : [...prev, nameUp]
                  )}
                  style={active && cat.color ? { backgroundColor: `${cat.color}20`, color: cat.color, borderColor: `${cat.color}60` } : {}}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${active ? '' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'}`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {settingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configurações</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Selecione quais tipos aparecem em cada visão</p>
              </div>
              <button onClick={() => setSettingsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 pb-2">Coleta / Exportação</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {operationTypes.map((tv: any) => {
                    const type = tv.name.toUpperCase();
                    const isVisible = hiddenTripTypesColeta !== null ? !hiddenTripTypesColeta.includes(type) : ['COLETA', 'CABOTAGEM', 'EXPORTAÇÃO'].includes(type);
                    return (
                      <label key={type} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {
                            setHiddenTripTypesColeta(prev => {
                              const current = prev !== null ? prev : operationTypes.map((t: any) => t.name.toUpperCase()).filter((t: string) => !['COLETA', 'CABOTAGEM', 'EXPORTAÇÃO'].includes(t));
                              const next = current.includes(type) ? current.filter((t: string) => t !== type) : [...current, type];
                              localStorage.setItem('orgVisibleTripTypesColeta', JSON.stringify(next));
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span
                          className="text-[10px] font-black uppercase tracking-widest"
                          style={{ color: tv.color || '#475569' }}
                        >
                          {type}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-black text-emerald-600 uppercase tracking-widest border-b border-slate-100 pb-2">Entrega / Importação</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {operationTypes.map((tv: any) => {
                    const type = tv.name.toUpperCase();
                    const isVisible = hiddenTripTypesEntrega !== null ? !hiddenTripTypesEntrega.includes(type) : ['ENTREGA', 'IMPORTAÇÃO'].includes(type);
                    return (
                      <label key={type} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {
                            setHiddenTripTypesEntrega(prev => {
                              const current = prev !== null ? prev : operationTypes.map((t: any) => t.name.toUpperCase()).filter((t: string) => !['ENTREGA', 'IMPORTAÇÃO'].includes(t));
                              const next = current.includes(type) ? current.filter((t: string) => t !== type) : [...current, type];
                              localStorage.setItem('orgVisibleTripTypesEntrega', JSON.stringify(next));
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span
                          className="text-[10px] font-black uppercase tracking-widest"
                          style={{ color: tv.color || '#475569' }}
                        >
                          {type}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSettingsModal(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {activeView === 'COLETA' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-4">
              <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Coleta</h3>
            </div>
            <SmartOperationTable
              userId={userId}
              componentId="org-coleta-export"
              columns={columns}
              data={trips}
              hideInternalSearch={false}
              getRowStyle={(t: Trip) => {
                if (isTripReadyToFinalize(t)) return { backgroundColor: '#ecfdf5', boxShadow: 'inset 4px 0 0 #10b981' };
                if (t.status === 'Frete Morto') return { backgroundColor: '#f1f5f9', boxShadow: 'inset 4px 0 0 #64748b' };
                if (isTripScheduled(t))       return { backgroundColor: '#fffbeb', boxShadow: 'inset 4px 0 0 #f59e0b' };
                return {};
              }}
            />
          </div>
        ) : activeView === 'ENTREGA' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-4">
              <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Entrega</h3>
            </div>
            <SmartOperationTable
              userId={userId}
              componentId="org-entrega-import"
              columns={columns}
              data={trips}
              hideInternalSearch={false}
              getRowStyle={(t: Trip) => {
                if (t.status === 'Reutilização') return { backgroundColor: '#ecfdf5', boxShadow: 'inset 4px 0 0 #059669' };
                if (isTripReadyToFinalize(t)) return { backgroundColor: '#ecfdf5', boxShadow: 'inset 4px 0 0 #10b981' };
                if (isTripScheduled(t))       return { backgroundColor: '#fffbeb', boxShadow: 'inset 4px 0 0 #f59e0b' };
                return {};
              }}
            />
          </div>
        ) : activeView === 'DEVOLUÇÕES' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-4 flex-wrap">
              <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Devoluções de Vazio</h3>
              <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black rounded-full border border-orange-200">{devolucoes.length}</span>
              {sortedDevolucoes.filter(d => getDevScheduleStatus(d) === 'critico').length > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white text-[8px] font-black rounded-full border border-red-700 animate-pulse">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  {sortedDevolucoes.filter(d => getDevScheduleStatus(d) === 'critico').length} CRÍTICO
                </span>
              )}
              {sortedDevolucoes.filter(d => getDevScheduleStatus(d) === 'pendente').length > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-[8px] font-black rounded-full border border-orange-300">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {sortedDevolucoes.filter(d => getDevScheduleStatus(d) === 'pendente').length} SEM COMPROVANTE
                </span>
              )}
              <button
                onClick={() => {
                  const now = new Date().toISOString();
                  setDevMinutaDev({ id: crypto.randomUUID(), os: `DEV-${Date.now()}`, container: '', status: 'Pendente', createdAt: now });
                }}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                Nova Devolução
              </button>
            </div>
            <SmartOperationTable
              userId={userId}
              componentId="org-devolucoes"
              columns={devolucoesColumns}
              data={sortedDevolucoes}
              hideInternalSearch={false}
              noMaxHeight
              stickyHeaderTop={0}
              getRowStyle={(d: Devolucao) => {
                const s = getDevScheduleStatus(d);
                if (s === 'critico') return { backgroundColor: '#fef2f2', boxShadow: 'inset 4px 0 0 #dc2626' };
                if (s === 'pendente') return { backgroundColor: '#fff7ed', boxShadow: 'inset 4px 0 0 #f97316' };
                if (s === 'agendado') return { backgroundColor: '#eff6ff', boxShadow: 'inset 4px 0 0 #3b82f6' };
                return {};
              }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 ml-4">
              <div className="w-2 h-8 bg-violet-500 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Liberações de Vazio</h3>
              <span className="ml-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-black rounded-full border border-violet-200">{liberacoes.length}</span>
              <button
                onClick={() => {
                  const now = new Date().toISOString();
                  setLibMinuta({ id: crypto.randomUUID(), os: `LIB-${Date.now()}`, status: 'Pendente', createdAt: now });
                }}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-violet-600 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                Nova Liberação
              </button>
            </div>
            <SmartOperationTable
              userId={userId}
              componentId="org-liberacoes"
              columns={liberacoesColumns}
              data={sortedLiberacoes}
              hideInternalSearch={false}
              noMaxHeight
              stickyHeaderTop={0}
              getRowStyle={(l: Liberacao) => {
                if (l.status === 'Pendente') return { backgroundColor: '#f5f3ff', boxShadow: 'inset 4px 0 0 #8b5cf6' };
                if (l.status === 'Emitido') return { backgroundColor: '#f0fdf4', boxShadow: 'inset 4px 0 0 #22c55e' };
                return {};
              }}
            />
          </div>
        )}
      </div>

      {devMinutaDev && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-stretch justify-center p-4 overflow-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden my-auto">
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Minuta de Devolução</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{devMinutaDev.container || devMinutaDev.os}</p>
              </div>
              <button onClick={() => setDevMinutaDev(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <DevolucaoVazioForm
                drivers={drivers}
                customers={customers}
                ports={ports}
                preStackings={preStacking}
                onClose={() => setDevMinutaDev(null)}
                devolucao={devMinutaDev}
                onSave={handleSaveDevolucaoFromForm}
              />
            </div>
          </div>
        </div>
      )}

      {libMinuta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-stretch justify-center p-4 overflow-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden my-auto">
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Liberação de Vazio</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{libMinuta.os}</p>
              </div>
              <button onClick={() => setLibMinuta(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <LiberacaoVazioForm
                drivers={drivers}
                customers={customers}
                ports={ports}
                preStackings={preStacking}
                onClose={() => setLibMinuta(null)}
                liberacao={libMinuta}
                onSave={handleSaveLiberacaoFromForm}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal visualizador de comprovantes */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[400] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setViewingDoc(null); }}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comprovante</p>
                  <p className="text-sm font-black text-slate-800 truncate">{viewingDoc.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadDoc(viewingDoc.url, viewingDoc.fileName)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Baixar
                </button>
                <button onClick={() => setViewingDoc(null)} className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            {/* Conteúdo */}
            <div className="flex-1 overflow-hidden p-6">
              <ImageViewer url={viewingDoc.url} alt={viewingDoc.fileName} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de remoção */}
      {confirmRemove && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 w-full max-w-sm flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Remover do painel</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  A OS <span className="font-black text-blue-700">{confirmRemove.os}</span> será removida deste painel.<br/>A viagem não será excluída do sistema.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 px-4 py-3 rounded-2xl text-[10px] font-black text-slate-500 uppercase hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => { handleRemoveFromOrg(confirmRemove); setConfirmRemove(null); }}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationTab;
