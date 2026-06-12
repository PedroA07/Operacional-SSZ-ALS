
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, PreStacking, CustomStatus, SILProgramacao, TerminalVessel, Devolucao } from '../../types';
import { detectContainerReuse } from '../../utils/containerReuseService';
import SmartOperationTable from './operations/SmartOperationTable';
import { db, supabase } from '../../utils/storage';
import OperationRegisterAction from './operations/OperationRegisterAction';
import SchedulingEditModal from './operations/SchedulingEditModal';
import DriverDocsViewerModal from './operations/DriverDocsViewerModal';
import DocumentViewerModal from './operations/DocumentViewerModal';
import DriverLocationModal from './operations/DriverLocationModal';
import GenericOperationView from './operations/GenericOperationView';
import OperationFilters from './operations/OperationFilters';
import DateRangeFilter from './operations/DateRangeFilter';
import CategoryNavigation from './operations/CategoryNavigation';
import DatePicker from '../shared/DatePicker';
import CategoryControl from './operations/CategoryControl';
import CategoryManagerModal from './operations/CategoryManagerModal';
import OrdemColetaForm from './forms/OrdemColetaForm';
import PreStackingForm from './forms/PreStackingForm';
import StatusHistoryManagerModal from './operations/StatusHistoryManagerModal';
import TripModal from './operations/TripModal';
import TripDetailsViewerModal from './operations/TripDetailsViewerModal';
import { getOperationTableColumns } from './operations/OperationTableColumns';
import { statusService } from '../../utils/statusService';
import CustomSelect from '../shared/CustomSelect';
import SILExcelImporter from './operations/SILExcelImporter';

interface OperationsTabProps {
  user: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  trips: Trip[];
  categories: Category[];
  preStacking: PreStacking[];
  availableOps: OperationDefinition[];
  activeView: { type: 'list' | 'category' | 'client', id?: string, categoryName?: string, clientName?: string };
  setActiveView: (view: any) => void;
  onDeleteTrip: (id: string) => void;
  onRefresh: () => void;
  noMaxHeight?: boolean; // quando true, tabela expande livremente (scroll da página)
}

const OperationsTab: React.FC<OperationsTabProps> = ({
  user, drivers, customers, ports, trips, categories, preStacking, availableOps, activeView, setActiveView, onDeleteTrip, onRefresh, noMaxHeight = false
}) => {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isDriverDocsModalOpen, setIsDriverDocsModalOpen] = useState(false);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [isOCFormOpen, setIsOCFormOpen] = useState(false);
  const [isMinutaFormOpen, setIsMinutaFormOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isTripDetailsOpen, setIsTripDetailsOpen] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [previewDocData, setPreviewDocData] = useState({ url: '', title: '' });
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [locationDriverId, setLocationDriverId] = useState<string | null>(null);
  
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSilImporterOpen, setIsSilImporterOpen] = useState(false);
  const [importedOs, setImportedOs] = useState<Set<string>>(new Set());
  const [lastSilImport, setLastSilImport] = useState<{ linked: number; unlinked: number } | null>(null);
  const [terminalVessels, setTerminalVessels] = useState<TerminalVessel[]>([]);
  const [devolucoes, setDevolucoes] = useState<Devolucao[]>([]);

  // Carrega terminal_vessels do Supabase (atualiza a cada 5 min)
  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('terminal_vessels').select('*');
      if (data) {
        setTerminalVessels(data.map((r: any) => ({
          terminal:      r.terminal,
          navio:         r.navio,
          situacao:      r.situacao,
          viagem:        r.viagem        ?? undefined,
          armador:       r.armador       ?? undefined,
          berco:         r.berco         ?? undefined,
          rap:           r.rap           ?? undefined,
          servico:       r.servico       ?? undefined,
          gateDry:     (r.terminal === 'EMBRAPORT' ? r.dead_line_str : r.gate_dry)     ?? undefined,
          gateReefer:  (r.terminal === 'EMBRAPORT' ? undefined       : r.gate_reefer)  ?? undefined,
          deadLineStr: (r.terminal === 'EMBRAPORT' ? r.gate_dry      : r.dead_line_str) ?? undefined,
          dtPrevChegada: r.dt_prev_chegada ?? undefined,
          dtChegada:     r.dt_chegada    ?? undefined,
          dtPrevAtrac:   r.dt_prev_atrac ?? undefined,
          dtAtracacao:   r.dt_atracacao  ?? undefined,
          dtPrevSaida:   r.dt_prev_saida ?? undefined,
          dtSaida:       r.dt_saida      ?? undefined,
        })));
      }
    };
    load();
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // Extrai { name, voyage } de um campo de navio como "MSC YAMUNA VI 621N" ou "NAVIO/VIAGEM"
  const splitShipField = useCallback((raw: string): { name: string; voyage: string } => {
    if (!raw) return { name: '', voyage: '' };
    // Separador explícito: / ou |
    const explicitMatch = raw.match(/^([^/|]+)[/|](.*)$/);
    if (explicitMatch) return { name: explicitMatch[1].trim(), voyage: explicitMatch[2].trim() };
    // Sufixo numérico no final (ex: "MSC YAMUNA VI 621N" → voyage="621N")
    const suffixMatch = raw.match(/^(.*?)\s+(\d+[A-Z]?)$/);
    if (suffixMatch) return { name: suffixMatch[1].trim(), voyage: suffixMatch[2].trim() };
    return { name: raw.trim(), voyage: '' };
  }, []);

  // Retorna a tag de gate para uma viagem, usando navio + viagem + tipo de contêiner
  const getGateTag = useCallback((trip: Trip): React.ReactNode => {
    const shipRaw = trip.ship;
    if (!shipRaw || terminalVessels.length === 0) return null;
    const norm = (s: string) =>
      s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

    // Extrai nome e viagem do campo ship
    const { name, voyage } = splitShipField(shipRaw);
    const query = norm(name || shipRaw);
    if (query.length < 3) return null;

    const words = query.split(' ').filter((w: string) => w.length > 2);
    const isMatch = (v: TerminalVessel) => {
      const vn = norm(v.navio);
      if (vn === query) return true;
      if (vn.includes(query) || query.includes(vn)) return true;
      return words.length >= 2 && words.every((w: string) => vn.includes(w));
    };
    const matches = terminalVessels.filter(isMatch);
    if (matches.length === 0) return null;

    // 1) Prefere match exato por viagem
    let vessel: TerminalVessel | undefined;
    if (voyage) {
      const vNorm = voyage.trim().toUpperCase();
      vessel = matches.find(v => (v.viagem || '').trim().toUpperCase() === vNorm);
    }
    // 2) Prefere o que tem gate data
    if (!vessel) vessel = matches.find(v => v.gateDry || v.gateReefer);
    // 3) Prefere o que tem deadline
    if (!vessel) vessel = matches.find(v => v.deadLineStr);
    // 4) Primeiro match
    if (!vessel) vessel = matches[0];

    const parseDate = (s?: string) => {
      if (!s || s === '-' || s === '—') return null;
      if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
        const p = s.split(/[/\s:]/);
        return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]), Number(p[3] ?? 0), Number(p[4] ?? 0));
      }
      const d = new Date(s); return isNaN(d.getTime()) ? null : d;
    };

    const now = new Date();
    // Seleciona o gate correto com base no tipo de contêiner
    const isReefer = /reefer|rf\b|refriger/i.test(trip.containerType || '');
    const gateStr = isReefer
      ? (vessel.gateReefer || vessel.gateDry)
      : (vessel.gateDry    || vessel.gateReefer);
    const gateDt = parseDate(gateStr);
    const deadDt = parseDate(vessel.deadLineStr);

    if (!gateDt) return null;

    const fmt = (d: Date) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    if (gateDt > now) {
      return (
        <span className="inline-flex items-center gap-0.5 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-red-500/10 text-red-600 border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-500"/>
          Gate Fechado
          <span className="font-bold text-red-400 normal-case ml-0.5">• Abre {fmt(gateDt)}</span>
        </span>
      );
    }
    if (deadDt && deadDt < now) {
      return (
        <span className="inline-flex items-center gap-0.5 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-pink-500/10 text-pink-600 border-pink-500/30">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-pink-500"/>
          Gate Encerrado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 font-black uppercase rounded-full border text-[7px] px-1.5 py-0.5 bg-green-500/10 text-green-700 border-green-500/30">
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-500"/>
        Gate Aberto
        {deadDt && <span className="font-bold text-orange-500 normal-case ml-0.5">• Enc. {fmt(deadDt)}</span>}
      </span>
    );
  }, [terminalVessels, splitShipField]);

  const handleSetPriority = async (trip: Trip) => {
    if (isSavingStatus) return;
    setIsSavingStatus(true);
    try {
      const otherDriverPriorityTrips = trips.filter(t => 
        t.driver.id === trip.driver.id && 
        t.id !== trip.id && 
        t.isPriority
      );

      for (const t of otherDriverPriorityTrips) {
        await db.saveTrip({ ...t, isPriority: false }, user);
      }

      await db.saveTrip({ ...trip, isPriority: !trip.isPriority }, user);
      onRefresh();
    } catch (e) {
      alert("Erro ao definir prioridade.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Lazy initializers leem estado salvo quando aberto como nova guia
  const getSavedState = () => {
    try {
      const raw = localStorage.getItem('als_ops_newtab_state');
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (Date.now() - (state._ts || 0) > 15000) return null; // expira em 15s
      return state;
    } catch { return null; }
  };

  const today = new Date().toLocaleDateString('en-CA');
  const [activeStatusTab, setActiveStatusTab] = useState<'geral' | 'ativas' | 'concluida' | 'cancelada'>(() => getSavedState()?.activeStatusTab || 'geral');
  const [searchQuery, setSearchQuery] = useState<string>(() => getSavedState()?.searchQuery || '');
  const [startDate, setStartDate] = useState<string>(() => getSavedState()?.startDate ?? today);
  const [endDate, setEndDate] = useState<string>(() => getSavedState()?.endDate ?? today);
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => getSavedState()?.density || 'compact');
  const [filterTypes, setFilterTypes] = useState<string[]>(() => getSavedState()?.filterTypes || []);
  const [filterClientNames, setFilterClientNames] = useState<string[]>(() => getSavedState()?.filterClientNames || []);
  const [filterDriverNames, setFilterDriverNames] = useState<string[]>(() => getSavedState()?.filterDriverNames || []);
  const [selectedScheduling, setSelectedScheduling] = useState<string>('TODOS');

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const statuses = await db.getCustomStatuses();
        setCustomStatuses(statuses);
        
        const opTypes = await db.getOperationTypes();
        if (opTypes && opTypes.length > 0) {
          setOperationTypes(opTypes);
        } else {
          setOperationTypes([
            {id: '1', name: 'EXPORTAÇÃO'},
            {id: '2', name: 'IMPORTAÇÃO'},
            {id: '3', name: 'COLETA'},
            {id: '4', name: 'ENTREGA'},
            {id: '5', name: 'CABOTAGEM'}
          ]);
        }
      } catch (error) {
        console.error('Erro ao buscar status personalizados:', error);
      }
    };
    fetchStatuses();
  }, []);

  useEffect(() => {
    db.getDevolucoes().then(setDevolucoes).catch(() => {});
  }, []);

  const formatISOToInput = (isoString?: string) => {
    const date = isoString ? new Date(isoString) : new Date();
    if (isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleOpenStatusEditor = (t: Trip, s: TripStatus) => {
    setSelectedTrip(t);
    setTempStatus(s);
    setStatusTime(formatISOToInput());
    setIsStatusModalOpen(true);
  };

  const availableStatusesForSelectedTrip = useMemo(() => {
    if (!selectedTrip) return [];
    return statusService.getCustomOptions(selectedTrip, customStatuses);
  }, [selectedTrip, customStatuses]);

  const handleUpdateStatus = async () => {
    if (!selectedTrip || isSavingStatus) return;
    setIsSavingStatus(true);
    
    try {
      let eventTime = new Date().toISOString();
      if (statusTime) {
        const parsedDate = new Date(statusTime);
        if (!isNaN(parsedDate.getTime())) {
          eventTime = parsedDate.toISOString();
        }
      }

      const isCompleted = statusService.isTripCompleted(tempStatus, selectedTrip, customStatuses);

      let autoSchedulingData: Partial<Trip> = {};
      // Se a viagem chegou ao status final mas ainda não tem agendamento confirmado,
      // confirma automaticamente com o destino original e a data/hora deste status
      if (isCompleted && !selectedTrip.isScheduled && !selectedTrip.preStackingFormData) {
        const destId = selectedTrip.destination?.id || selectedTrip.customer?.id || '';
        const destName = selectedTrip.destination?.name || selectedTrip.customer?.name || '';
        autoSchedulingData = {
          isScheduled: true,
          scheduledLocationId: destId,
          scheduledDateTime: eventTime.substring(0, 16),
          scheduling: {
            locationId: destId,
            location: destName,
            dateTime: eventTime,
            obs: 'Agendamento confirmado automaticamente ao finalizar viagem'
          }
        };
      }

      const updatedTrip: Trip = {
        ...selectedTrip,
        ...autoSchedulingData,
        status: tempStatus,
        statusTime: eventTime,
        isCompleted: isCompleted,
        statusHistory: [{ status: tempStatus, dateTime: eventTime, createdAt: new Date().toISOString() }, ...(selectedTrip.statusHistory || [])]
      };

      if (await db.saveTrip(updatedTrip, user)) {
        setIsStatusModalOpen(false);
        onRefresh();
      }
    } catch (e: any) { 
      alert(`Erro ao salvar status: ${e.message || 'Erro desconhecido'}`); 
      console.error("Erro ao salvar status:", e);
    } finally { 
      setIsSavingStatus(false); 
    }
  };

  const handleSilImport = useCallback(async (
    matched: { sil: SILProgramacao; trip: Trip }[],
    unmatched: SILProgramacao[]
  ) => {
    const norm = (s: string) =>
      s.trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');

    const driverByName  = new Map<string, Driver>();
    const driverByCpf   = new Map<string, Driver>();
    const driverByPlate = new Map<string, Driver>();
    drivers.forEach(d => {
      if (d.name)         driverByName.set(norm(d.name), d);
      if (d.cpf)          driverByCpf.set(norm(d.cpf), d);
      if (d.plateHorse)   driverByPlate.set(norm(d.plateHorse), d);
      if (d.plateTrailer) driverByPlate.set(norm(d.plateTrailer), d);
    });

    const customerByNameCity = new Map<string, Customer>();
    const customerByName     = new Map<string, Customer>();
    customers.forEach(c => {
      if (!c.name) return;
      customerByName.set(norm(c.name), c);
      if (c.city) customerByNameCity.set(`${norm(c.name)}|${norm(c.city)}`, c);
    });

    const mapType = (sil: string): string => {
      if (!sil) return '';
      const silN = norm(sil);
      const exact = operationTypes.find(t => norm(t.name) === silN);
      if (exact) return exact.name;
      const silWords = silN.split(' ');
      let best = { score: 0, name: '' };
      for (const t of operationTypes) {
        const score = silWords.filter(w => norm(t.name).includes(w)).length;
        if (score > best.score) best = { score, name: t.name };
      }
      return best.score > 0 ? best.name : sil.toUpperCase();
    };

    const mapCategory = (typeName: string): string => {
      if (!typeName) return '';
      const opType = operationTypes.find(
        (ot: any) => ot.name?.toUpperCase() === typeName.toUpperCase()
      );
      if (!opType?.config?.defaultCategoryId) return '';
      const cat = categories.find(c => c.id === opType.config!.defaultCategoryId);
      return cat?.name || '';
    };

    const mapStatus = (sit: string): TripStatus | null => {
      const s = sit.toLowerCase();
      if (s.includes('encerr') || s.includes('conclu') || s.includes('finaliz')) return 'Viagem concluída';
      if (s.includes('viagem')) return 'Em viagem';
      return null;
    };

    const parseDate = (s: string): string => {
      if (!s) return '';
      const [datePart, timePart] = s.trim().split(' ');
      const dp = datePart.split('/');
      if (dp.length !== 3) return '';
      const [d, m, y] = dp;
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${timePart || '00:00'}`;
    };

    let updateCount = 0;
    const newOs = new Set<string>();

    for (const { sil, trip } of matched) {
      const osKey = trip.os.trim().toLowerCase();

      const matchedDriver =
        driverByName.get(norm(sil.nomeMotorista)) ||
        driverByCpf.get(norm(sil.cpfMotorista)) ||
        driverByPlate.get(norm(sil.placaVeiculo));
      const driverRef = matchedDriver ? {
        id: matchedDriver.id,
        name: matchedDriver.name,
        plateHorse: matchedDriver.plateHorse,
        plateTrailer: matchedDriver.plateTrailer,
        status: matchedDriver.status,
        cpf: matchedDriver.cpf,
        phone: matchedDriver.phone,
      } : trip.driver;

      const matchedCustomer =
        customerByNameCity.get(`${norm(sil.nomeLocalAtendimento)}|${norm(sil.cidadeAtendimento)}`) ||
        customerByName.get(norm(sil.nomeLocalAtendimento));
      const customerRef = matchedCustomer ? {
        id: matchedCustomer.id,
        name: matchedCustomer.name,
        legalName: matchedCustomer.legalName,
        cnpj: matchedCustomer.cnpj,
        city: matchedCustomer.city,
        state: matchedCustomer.state,
      } : sil.nomeLocalAtendimento
        ? { id: trip.customer?.id || '', name: sil.nomeLocalAtendimento, city: sil.cidadeAtendimento || trip.customer?.city || '' }
        : trip.customer;

      const newType     = sil.tipoProgramado ? mapType(sil.tipoProgramado) : '';
      const newStatus   = sil.situacao ? mapStatus(sil.situacao) : null;
      const newDateTime = sil.previsaoAtendimento ? parseDate(sil.previsaoAtendimento) : '';

      const resolvedType = newType || trip.type;
      const updated: Trip = {
        ...trip,
        driver:        driverRef,
        customer:      customerRef,
        type:          resolvedType,
        category:      trip.category || mapCategory(resolvedType),
        ...(newDateTime ? { dateTime: newDateTime } : {}),
        ...(newStatus   ? { status: newStatus }   : {}),
        booking:       sil.booking        || trip.booking,
        container:     sil.container      || trip.container,
        containerType: sil.tipoContainer  || trip.containerType,
        ship:          sil.navio          || trip.ship,
        bu:            sil.bl             || trip.bu,
        embarcador:    sil.embarcador     || trip.embarcador,
        tara:          sil.taraEspecifica || trip.tara,
        seal:          sil.lacre1         || trip.seal,
      };

      await db.saveTrip(updated, user);
      updateCount++;
    }

    let createCount = 0;
    for (const sil of unmatched) {
      const osKey = sil.numeroProgramacao.trim().toLowerCase();
      if (importedOs.has(osKey)) continue;

      const matchedDriver =
        driverByName.get(norm(sil.nomeMotorista)) ||
        driverByCpf.get(norm(sil.cpfMotorista)) ||
        driverByPlate.get(norm(sil.placaVeiculo));

      const matchedCustomer =
        customerByNameCity.get(`${norm(sil.nomeLocalAtendimento)}|${norm(sil.cidadeAtendimento)}`) ||
        customerByName.get(norm(sil.nomeLocalAtendimento));

      const newTrip: import('../../types').Trip = {
        id: crypto.randomUUID(),
        os: sil.numeroProgramacao.trim().toUpperCase(),
        booking: sil.booking || '',
        ship: sil.navio || '',
        bu: sil.bl || '',
        embarcador: sil.embarcador || '',
        container: sil.container || '',
        containerType: sil.tipoContainer || '',
        tara: sil.taraEspecifica || '',
        seal: sil.lacre1 || '',
        type: mapType(sil.tipoProgramado),
        category: mapCategory(mapType(sil.tipoProgramado)),
        status: 'Pendente',
        dateTime: parseDate(sil.previsaoAtendimento) || new Date().toISOString().slice(0, 16),
        isLate: false,
        statusHistory: [],
        balancePayment: { status: 'AGUARDANDO_DOCS' },
        advancePayment: { status: 'BLOQUEADO' },
        driver: matchedDriver ? {
          id: matchedDriver.id,
          name: matchedDriver.name,
          plateHorse: matchedDriver.plateHorse,
          plateTrailer: matchedDriver.plateTrailer,
          status: matchedDriver.status,
          cpf: matchedDriver.cpf,
          phone: matchedDriver.phone,
        } : { id: '', name: sil.nomeMotorista || '', plateHorse: sil.placaVeiculo || '', plateTrailer: sil.placaCarreta || '', status: '' },
        customer: matchedCustomer ? {
          id: matchedCustomer.id,
          name: matchedCustomer.name,
          legalName: matchedCustomer.legalName,
          cnpj: matchedCustomer.cnpj,
          city: matchedCustomer.city,
          state: matchedCustomer.state,
        } : { id: '', name: sil.nomeLocalAtendimento || '', city: sil.cidadeAtendimento || '' },
      };

      await db.saveTrip(newTrip, user);
      newOs.add(osKey);
      createCount++;
    }

    // Corrigir trips existentes sem categoria cujo tipo permite inferir
    const tripsToFix = trips.filter(t => !t.category && t.type);
    for (const t of tripsToFix) {
      const cat = mapCategory(t.type);
      if (!cat) continue;
      await db.saveTrip({ ...t, category: cat }, user);
    }

    setImportedOs(prev => { const n = new Set(prev); newOs.forEach(o => n.add(o)); return n; });
    setLastSilImport({ linked: updateCount + createCount, unlinked: 0 });
    setIsSilImporterOpen(false);
    onRefresh();
  }, [drivers, customers, operationTypes, categories, trips, importedOs, user, onRefresh]);

  const filteredTrips = useMemo(() => {
    let result = [...trips];
    if (activeStatusTab === 'ativas') {
      result = result.filter(t => {
        const isComp = t.isCompleted || statusService.isTripCompleted(t.status, t, customStatuses);
        return !isComp && t.status !== 'Viagem cancelada';
      });
    } else if (activeStatusTab === 'concluida') {
      result = result.filter(t => t.isCompleted || statusService.isTripCompleted(t.status, t, customStatuses));
    } else if (activeStatusTab === 'cancelada') {
      result = result.filter(t => t.status === 'Viagem cancelada');
    } else if (activeStatusTab === 'geral') {
      result = result.filter(t => t.status !== 'Viagem cancelada');
    }

    if (filterTypes.length > 0) result = result.filter(t => filterTypes.includes(t.type?.toUpperCase()));
    if (filterClientNames.length > 0) result = result.filter(t => filterClientNames.includes(t.customer?.name));
    if (filterDriverNames.length > 0) result = result.filter(t => filterDriverNames.includes(t.driver?.name));
    
    if (startDate || endDate) {
      result = result.filter(t => {
        const tripDate = t.dateTime ? t.dateTime.substring(0, 10) : '';
        if (startDate && tripDate < startDate) return false;
        if (endDate && tripDate > endDate) return false;
        return true;
      });
    }

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
  }, [trips, activeStatusTab, filterTypes, filterClientNames, filterDriverNames, startDate, endDate, searchQuery, customStatuses]);

  const reuseMap = useMemo(
    () => detectContainerReuse(trips, devolucoes),
    [trips, devolucoes]
  );

  const handleMarkReuse = useCallback(async (trip: Trip) => {
    const now = new Date().toISOString();
    const updated: Trip = {
      ...trip,
      status: 'Reutilização',
      statusHistory: [
        { status: 'Reutilização', dateTime: now, createdAt: now },
        ...(trip.statusHistory || []),
      ],
    };
    await db.saveTrip(updated, user);
    onRefresh();
  }, [user, onRefresh]);

  const columns = useMemo(() => getOperationTableColumns(
    handleOpenStatusEditor,
    (t) => { setSelectedTrip(t); setIsTripModalOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsOCFormOpen(true); }, 
    (t) => { setSelectedTrip(t); setIsMinutaFormOpen(true); }, 
    (url, title) => { setPreviewDocData({ url, title }); setIsDocViewerOpen(true); },
    async (id) => onDeleteTrip(id),
    onRefresh,
    (t) => { setSelectedTrip(t); setIsSchedulingModalOpen(true); },
    user,
    (id) => { setLocationDriverId(id); setIsLocationModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsDriverDocsModalOpen(true); },
    (t) => { setSelectedTrip(t); setIsHistoryModalOpen(true); },
    handleSetPriority,
    drivers,
    categories,
    operationTypes,
    getGateTag,
    reuseMap,
    handleMarkReuse
  ), [user, onRefresh, onDeleteTrip, drivers, trips, categories, operationTypes, getGateTag, reuseMap, handleMarkReuse]);

  if (activeView.type !== 'list') {
    return (
      <GenericOperationView 
        user={user} type={activeView.type === 'category' ? 'category' : 'client'} 
        categoryName={activeView.categoryName || ''} clientName={activeView.clientName} 
        drivers={drivers} customers={customers} availableOps={availableOps} onNavigate={setActiveView}
        onLocateDriver={(id) => { setLocationDriverId(id); setIsLocationModalOpen(true); }} allTrips={trips} categories={categories}
        onDeleteTrip={onDeleteTrip}
        density={density}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Banner SIL import */}
      {lastSilImport && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span className="text-[10px] font-black text-emerald-700 uppercase">
            <span className="italic text-[8px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded mr-2">SIL</span>
            {lastSilImport.linked} programaç{lastSilImport.linked !== 1 ? 'ões' : 'ão'} importada{lastSilImport.linked !== 1 ? 's' : ''} e vinculadas
            {lastSilImport.unlinked > 0 && ` · ${lastSilImport.unlinked} sem OS no sistema`}
          </span>
          <button onClick={() => setLastSilImport(null)} className="ml-auto text-emerald-400 hover:text-emerald-700 transition-colors text-sm leading-none">✕</button>
        </div>
      )}

      {/* Topo: categorias + ações */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div className="flex-1 w-full min-w-0">
          <CategoryNavigation availableOps={availableOps} onNavigate={setActiveView} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSilImporterOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            <span className="text-[7px] font-black italic bg-slate-700 text-white px-1.5 py-0.5 rounded leading-none">SIL</span>
            Importar
          </button>
          <OperationRegisterAction user={user} drivers={drivers} customers={customers} categories={categories} onSuccess={onRefresh} variant="dark" />
        </div>
      </div>

      {/* Painel de controle */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">

        {/* Faixa de abas de status */}
        <div className="px-5 py-3 bg-slate-900 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1">
            {([
              { key: 'geral',     label: 'Visão Geral',   dot: 'bg-slate-400' },
              { key: 'ativas',    label: 'Fila Ativa',    dot: 'bg-blue-400' },
              { key: 'concluida', label: 'Concluídas',    dot: 'bg-emerald-400' },
              { key: 'cancelada', label: 'Canceladas',    dot: 'bg-red-400' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveStatusTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeStatusTab === tab.key
                    ? 'bg-white text-slate-900 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeStatusTab === tab.key ? tab.dot : 'bg-current opacity-40'}`} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{filteredTrips.length} registros</span>
            <button
              onClick={() => {
                const state = { activeStatusTab, searchQuery, startDate, endDate, density, filterTypes, filterClientNames, filterDriverNames, _ts: Date.now() };
                localStorage.setItem('als_ops_newtab_state', JSON.stringify(state));
                window.open(window.location.href.split('?')[0] + '?view=ops', '_blank');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-[8px] font-black uppercase text-white/60 hover:text-white hover:bg-white/20 transition-all"
              title="Abrir em nova guia"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              Nova guia
            </button>
          </div>
        </div>

        {/* Controles de filtro */}
        <div className="px-5 py-4 space-y-3 border-b border-slate-100">

          {/* Busca + período */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px] relative group">
              <input
                type="text"
                placeholder="Buscar OS, container, motorista..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[10px] font-black uppercase focus:border-blue-500 focus:bg-white transition-all outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="De..." maxDate={endDate || undefined} className="w-28" inputClassName="py-0 bg-transparent border-0 text-[9px] font-black uppercase outline-none" />
              <span className="text-slate-300 text-[9px]">→</span>
              <DatePicker value={endDate} onChange={setEndDate} placeholder="Até..." minDate={startDate || undefined} className="w-28" inputClassName="py-0 bg-transparent border-0 text-[9px] font-black uppercase outline-none" />
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-slate-300 hover:text-red-500 transition-colors ml-1 text-xs leading-none">✕</button>
              )}
            </div>
          </div>

          {/* Tipos de operação + filtros avançados */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterTypes([])}
              className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all border ${filterTypes.length === 0 ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'}`}
            >
              Todos
            </button>
            {operationTypes.map(op => (
              <button
                key={op.id}
                onClick={() => setFilterTypes(prev => prev.includes(op.name) ? prev.filter(t => t !== op.name) : [...prev, op.name])}
                className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all border ${filterTypes.includes(op.name) ? 'bg-slate-800 border-slate-800 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-700'}`}
                style={filterTypes.includes(op.name) && op.color ? { backgroundColor: op.color, borderColor: op.color } : undefined}
              >
                {op.name}
              </button>
            ))}
            <div className="w-px h-4 bg-slate-200 mx-0.5 hidden sm:block" />
            <OperationFilters selectedTypes={[]} onTypesChange={() => {}} selectedClients={filterClientNames} onClientsChange={setFilterClientNames} selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} customers={customers} drivers={drivers} hideModality />
          </div>
        </div>

        {/* Tabela */}
        <div className={density === 'compact' ? 'table-compact' : ''}>
          <SmartOperationTable
            userId={user.id}
            componentId="ops-global"
            title="Painel Operacional Sincronizado"
            columns={columns}
            data={filteredTrips}
            hideInternalSearch
            noMaxHeight={noMaxHeight}
            onRowClick={(t) => { setSelectedTrip(t); setIsTripDetailsOpen(true); }}
            defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'ship_booking', 'customer', 'destination_sch', 'finance', 'actions']}
          />
        </div>
      </div>

      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />
      <DriverLocationModal isOpen={isLocationModalOpen} onClose={() => { setIsLocationModalOpen(false); setLocationDriverId(null); }} driverId={locationDriverId} />
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={onRefresh} preStackingUnits={[...ports, ...preStacking]} />
      {isHistoryModalOpen && selectedTrip && <StatusHistoryManagerModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} trip={selectedTrip} allTrips={trips} user={user} onSuccess={onRefresh} />}
      
      {isOCFormOpen && selectedTrip && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="px-8 py-5 bg-blue-600 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Operações</p>
                <h2 className="font-black text-white text-sm uppercase tracking-widest">Ordem de Coleta</h2>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">OS: {selectedTrip.os}</p>
              </div>
              <button onClick={() => { setIsOCFormOpen(false); onRefresh(); }} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <OrdemColetaForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsOCFormOpen(false); onRefresh(); }} initialData={selectedTrip.ocFormData} tripId={selectedTrip.id} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {isMinutaFormOpen && selectedTrip && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="px-8 py-5 bg-emerald-600 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Operações</p>
                <h2 className="font-black text-white text-sm uppercase tracking-widest">Minuta / Pré-Stacking</h2>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">OS: {selectedTrip.os}</p>
              </div>
              <button onClick={() => { setIsMinutaFormOpen(false); onRefresh(); }} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <PreStackingForm drivers={drivers} customers={customers} ports={ports} onClose={() => { setIsMinutaFormOpen(false); onRefresh(); }} initialOS={selectedTrip.os} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {isTripModalOpen && (
        <TripModal isOpen={isTripModalOpen} onClose={() => setIsTripModalOpen(false)} onSuccess={onRefresh} drivers={drivers} customers={customers} categories={categories} editTrip={selectedTrip} />
      )}

      {isTripDetailsOpen && selectedTrip && (
        <TripDetailsViewerModal isOpen={isTripDetailsOpen} onClose={() => setIsTripDetailsOpen(false)} trip={selectedTrip} user={user} onManageHistory={() => setIsHistoryModalOpen(true)} />
      )}

      {isDriverDocsModalOpen && selectedTrip && (
        <DriverDocsViewerModal isOpen={isDriverDocsModalOpen} onClose={() => setIsDriverDocsModalOpen(false)} trip={selectedTrip} user={user} onSuccess={onRefresh} />
      )}

      {isCategoryModalOpen && (
        <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} categories={categories} onSuccess={onRefresh} actingUser={user} />
      )}

      {isStatusModalOpen && selectedTrip && (() => {
        const specialValues = new Set(['Cancelado', 'Frete Morto', 'Reutilização']);
        const specialOpts   = availableStatusesForSelectedTrip.filter(o => specialValues.has(o.value));
        const normalOpts    = availableStatusesForSelectedTrip.filter(o => !specialValues.has(o.value));
        const specialColorMap: Record<string, { bg: string; border: string; text: string }> = {
          'Cancelado':    { bg: 'bg-red-600',     border: 'border-red-700',     text: 'text-white' },
          'Frete Morto':  { bg: 'bg-amber-500',   border: 'border-amber-600',   text: 'text-white' },
          'Reutilização': { bg: 'bg-emerald-600', border: 'border-emerald-700', text: 'text-white' },
        };
        return (
          <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-8 pt-8 pb-4 border-b border-slate-100">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Registro de Status</p>
                <p className="text-xl font-black text-slate-800 uppercase">OS: {selectedTrip.os}</p>
              </div>

              <div className="flex divide-x divide-slate-100 flex-1">
                {/* Coluna principal — status normais */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fluxo Operacional</p>
                  <div className="grid grid-cols-1 gap-2">
                    {normalOpts.map(opt => {
                      const isSelected = tempStatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setTempStatus(opt.value as TripStatus)}
                          className={`w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]'
                              : 'bg-white border-slate-100 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${opt.color}`} />
                          {opt.label}
                          {isSelected && <svg className="w-3.5 h-3.5 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3.5" d="M5 13l4 4L19 7"/></svg>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Coluna lateral — ações especiais */}
                <div className="w-52 p-6 space-y-3 bg-slate-50 flex flex-col">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ações Especiais</p>
                  {specialOpts.map(opt => {
                    const isSelected = tempStatus === opt.value;
                    const cfg = specialColorMap[opt.value] ?? { bg: 'bg-slate-600', border: 'border-slate-700', text: 'text-white' };
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTempStatus(opt.value as TripStatus)}
                        className={`w-full py-4 px-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all shadow-sm flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? `${cfg.bg} ${cfg.border} ${cfg.text} shadow-lg scale-[1.03] ring-2 ring-offset-2 ring-current`
                            : `bg-white ${cfg.border} ${cfg.text.replace('text-white','text-slate-700')} hover:${cfg.bg} hover:${cfg.text} hover:shadow-md`
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${cfg.bg} border-2 border-white shadow`} />
                        {opt.label}
                      </button>
                    );
                  })}

                  <div className="flex-1" />

                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Data/Hora</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 bg-white font-black text-slate-800 text-[10px]"
                      value={statusTime}
                      onChange={e => setStatusTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-slate-100 flex gap-3">
                <button
                  disabled={isSavingStatus}
                  onClick={handleUpdateStatus}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {isSavingStatus ? 'Salvando…' : 'Confirmar Registro'}
                </button>
                <button
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase hover:text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {isSilImporterOpen && (
        <SILExcelImporter
          isOpen={isSilImporterOpen}
          onClose={() => setIsSilImporterOpen(false)}
          trips={trips}
          importedOs={importedOs}
          onImport={handleSilImport}
        />
      )}

      <style>{`
        .table-compact table td { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; font-size: 9px !important; }
        .table-compact table th { padding-top: 0.6rem !important; padding-bottom: 0.6rem !important; }
      `}</style>
    </div>
  );
};

export default OperationsTab;
