
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User, Driver, Customer, Port, Trip, TripStatus, Category, OperationDefinition, PreStacking, CustomStatus, SILProgramacao } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { db } from '../../utils/storage';
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
      if (importedOs.has(osKey)) continue;

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
      } : trip.customer;

      const newType     = sil.tipoProgramado ? mapType(sil.tipoProgramado) : '';
      const newStatus   = sil.situacao ? mapStatus(sil.situacao) : null;
      const newDateTime = sil.previsaoAtendimento ? parseDate(sil.previsaoAtendimento) : '';

      const updated: Trip = {
        ...trip,
        driver:        driverRef,
        customer:      customerRef,
        type:          newType || trip.type,
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
      newOs.add(osKey);
      updateCount++;
    }

    setImportedOs(prev => { const n = new Set(prev); newOs.forEach(o => n.add(o)); return n; });
    setLastSilImport({ linked: updateCount, unlinked: unmatched.length });
    setIsSilImporterOpen(false);
    onRefresh();
  }, [drivers, customers, operationTypes, importedOs, user, onRefresh]);

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
    operationTypes
  ), [user, onRefresh, onDeleteTrip, drivers, trips, categories, operationTypes]);

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
    <div className="space-y-8 animate-in fade-in duration-300">
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

      <>
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="flex-1 w-full"><CategoryNavigation availableOps={availableOps} onNavigate={setActiveView} /></div>
        <div className="flex items-end gap-3 w-full lg:w-auto">
          <button
            onClick={() => setIsSilImporterOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#001e50] text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-950 transition-all shadow-lg shrink-0"
          >
            <span className="text-[7px] font-black italic bg-white text-[#001e50] px-1.5 py-0.5 rounded leading-none">SIL</span>
            Importar Programações
          </button>
          <OperationRegisterAction user={user} drivers={drivers} customers={customers} categories={categories} onSuccess={onRefresh} variant="dark" />
        </div>
      </div>

      <div className="pt-8 border-t border-slate-200 space-y-4">
        <div className="bg-white px-6 py-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">

          {/* Linha 1: abas de status + botão nova guia */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 overflow-x-auto shrink-0">
              {['geral', 'ativas', 'concluida', 'cancelada'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveStatusTab(tab as any)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeStatusTab === tab ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                >
                  {tab === 'ativas' ? 'Fila Ativa' : tab === 'concluida' ? 'Concluídas' : tab === 'cancelada' ? 'Canceladas' : 'Visão Geral'}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const state = { activeStatusTab, searchQuery, startDate, endDate, density, filterTypes, filterClientNames, filterDriverNames, _ts: Date.now() };
                localStorage.setItem('als_ops_newtab_state', JSON.stringify(state));
                window.open(window.location.href.split('?')[0] + '?view=ops', '_blank');
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shrink-0"
              title="Abrir tabela em nova aba do navegador"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Nova Guia
            </button>
          </div>

          {/* Linha 2: busca + datas inline */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[180px] relative group">
              <input
                type="text"
                placeholder="BUSCAR OS, CONTAINER, MOTORISTA..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-slate-100 bg-slate-50 text-[10px] font-black uppercase focus:border-blue-500 focus:bg-white transition-all outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">De</span>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Data inicial..."
                maxDate={endDate || undefined}
                className="w-40"
                inputClassName="py-2.5 text-[10px]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-black text-slate-400 uppercase whitespace-nowrap">Até</span>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Data final..."
                minDate={startDate || undefined}
                className="w-40"
                inputClassName="py-2.5 text-[10px]"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 text-[9px] font-black uppercase transition-all shrink-0"
                title="Limpar datas"
              >✕</button>
            )}
          </div>

          {/* Linha 3: modalidades + filtros de cliente/motorista */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterTypes([])}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${filterTypes.length === 0 ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
            >
              Todas
            </button>
            {operationTypes.map(op => (
              <button
                key={op.id}
                onClick={() => setFilterTypes(prev => prev.includes(op.name) ? prev.filter(t => t !== op.name) : [...prev, op.name])}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${filterTypes.includes(op.name) ? 'bg-slate-900 border-slate-900 text-white shadow' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
              >
                {op.name}
              </button>
            ))}
            <div className="w-px h-5 bg-slate-200 mx-0.5 hidden sm:block" />
            <OperationFilters selectedTypes={[]} onTypesChange={() => {}} selectedClients={filterClientNames} onClientsChange={setFilterClientNames} selectedDrivers={filterDriverNames} onDriversChange={setFilterDriverNames} customers={customers} drivers={drivers} hideModality />
          </div>

        </div>

        <div className={density === 'compact' ? 'table-compact' : ''}>
           <SmartOperationTable
             userId={user.id}
             componentId="ops-global"
             title={`Painel Operacional Sincronizado`}
             columns={columns}
             data={filteredTrips}
             hideInternalSearch
             noMaxHeight={noMaxHeight}
             onRowClick={(t) => { setSelectedTrip(t); setIsTripDetailsOpen(true); }}
             defaultVisibleKeys={['dateTime', 'os_status', 'driver', 'equipment', 'ship_booking', 'customer', 'destination_sch', 'finance', 'actions']}
           />
        </div>
      </div>
      </>

      <DocumentViewerModal isOpen={isDocViewerOpen} onClose={() => setIsDocViewerOpen(false)} url={previewDocData.url} title={previewDocData.title} />
      <DriverLocationModal isOpen={isLocationModalOpen} onClose={() => { setIsLocationModalOpen(false); setLocationDriverId(null); }} driverId={locationDriverId} />
      <SchedulingEditModal isOpen={isSchedulingModalOpen} onClose={() => { setIsSchedulingModalOpen(false); setSelectedTrip(null); }} trip={selectedTrip} onSuccess={onRefresh} preStackingUnits={[...ports, ...preStacking]} />
      {isHistoryModalOpen && selectedTrip && <StatusHistoryManagerModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} trip={selectedTrip} allTrips={trips} user={user} onSuccess={onRefresh} />}
      
      {isOCFormOpen && selectedTrip && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="h-14 bg-blue-600 flex items-center justify-between px-6 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-tight leading-none">Ordem de Coleta</p>
                  <p className="text-white/60 text-[9px] font-bold uppercase mt-0.5">OS: {selectedTrip.os}</p>
                </div>
              </div>
              <button onClick={() => { setIsOCFormOpen(false); onRefresh(); }} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/40 text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
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
            <div className="h-14 bg-slate-800 flex items-center justify-between px-6 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-tight leading-none">Minuta / Pré-Stacking</p>
                  <p className="text-white/60 text-[9px] font-bold uppercase mt-0.5">OS: {selectedTrip.os}</p>
                </div>
              </div>
              <button onClick={() => { setIsMinutaFormOpen(false); onRefresh(); }} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/40 text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
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

      {isStatusModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-6">
             <div className="text-center">
               <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Registro de Status</p>
               <p className="text-xl font-black text-slate-800 uppercase">OS: {selectedTrip.os}</p>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status</label>
                  <CustomSelect
                    value={tempStatus}
                    onChange={v => setTempStatus(v as TripStatus)}
                    options={availableStatusesForSelectedTrip.map(opt => ({ value: opt.value, label: opt.label }))}
                    inputClassName="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora Real</label>
                  <input type="datetime-local" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={statusTime} onChange={e => setStatusTime(e.target.value)} />
                </div>
             </div>
             <div className="grid gap-3 pt-4">
                <button disabled={isSavingStatus} onClick={handleUpdateStatus} className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700">Confirmar Registro</button>
                <button onClick={() => setIsStatusModalOpen(false)} className="w-full text-center text-[10px] font-black text-slate-400 uppercase py-3">Cancelar</button>
             </div>
          </div>
        </div>
      )}

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
