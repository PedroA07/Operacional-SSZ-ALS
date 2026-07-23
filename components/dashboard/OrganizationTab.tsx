import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Port, PreStacking, TripStatus, StatusHistoryEntry, TerminalVessel, Driver, Customer, Devolucao, Liberacao, OrgAuditEntry, EmailTemplate, ColetaTipoViagemOption } from '../../types';
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
import RetiradaCheioForm from './forms/RetiradaCheioForm';
import EmailGeneratorModal from './email/EmailGeneratorModal';
import CteAttachmentsModal from './emissoes/CteAttachmentsModal';
import { localDateStr, localDateTimeStr, formatDateTimePtBR } from '../../utils/dateHelpers';
import { r2Service } from '../../utils/r2Service';

interface OrganizationTabProps {
  userId: string;
  trips: Trip[];
  ports: Port[];
  preStacking: PreStacking[];
  drivers: Driver[];
  customers: Customer[];
  onRefresh: () => void;
  standalone?: boolean;   // modo tela cheia (aba dedicada) — enxuga o cabeçalho
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

// Seleção da Retirada do Cheio (Entrega/Import): terminal pré-stacking, porto ou cliente
interface RetiradaCheioOption {
  id: string;
  name: string;
  legalName?: string;
  cnpj?: string;
  city?: string;
  state?: string;
  kind: string;
}

const RetiradaCheioSelect: React.FC<{
  trip: Trip;
  options: RetiradaCheioOption[];
  onSelect: (trip: Trip, option: RetiradaCheioOption | null) => void;
  field?: 'retiradaCheio' | 'retiradaVazio';
  label?: string;
}> = ({ trip, options, onSelect, field = 'retiradaCheio', label }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const value = trip[field];
  const titulo = label || (field === 'retiradaVazio' ? 'Retirada do Vazio:' : 'Retirada do Cheio:');

  const filtered = useMemo(() => {
    if (!search) return options;
    const s = search.toLowerCase();
    return options.filter(o =>
      o.name?.toLowerCase().includes(s) ||
      o.legalName?.toLowerCase().includes(s) ||
      o.cnpj?.includes(s) ||
      o.city?.toLowerCase().includes(s)
    );
  }, [search, options]);

  // Sugestão: campo "Retirar Cheio/Vazio" da OS
  const sugestao = field === 'retiradaVazio'
    ? (trip.osImportData?.retirarVazio || '')
    : (trip.osImportData?.retirarCheio || trip.osImportData?.embarcador || trip.osImportData?.cliente || '');

  return (
    <div className="relative min-w-[170px]">
      {!isSearching ? (
        <div
          onClick={() => setIsSearching(true)}
          className={`w-full border rounded-lg px-2 py-1.5 cursor-pointer transition-all ${value ? 'bg-cyan-50 border-cyan-300 shadow-sm hover:border-cyan-500' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm'}`}
        >
          {value ? (
            <div className="space-y-0.5">
              <div className="flex justify-between items-start gap-1">
                <p className="text-[9px] font-black text-slate-800 uppercase break-words flex-1 leading-tight">{value.name}</p>
                {value.kind && <span className="text-[6px] px-1 py-0.5 bg-cyan-100 text-cyan-700 border border-cyan-200 rounded font-black uppercase whitespace-nowrap">{value.kind}</span>}
              </div>
              {value.legalName && <p className="text-[7px] text-slate-400 font-bold uppercase break-words leading-tight">{value.legalName}</p>}
              {(value.city || value.state) && (
                <p className="text-[7px] text-slate-400 font-bold uppercase">{[value.city, value.state].filter(Boolean).join('/')}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-cyan-500 uppercase tracking-tighter">{titulo}</span>
              <p className="text-[8px] font-black text-slate-400 uppercase break-words leading-tight">
                {sugestao ? `Sugestão (OS): ${sugestao}` : 'Selecionar local...'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute top-0 left-0 w-full z-50 bg-white border-2 border-cyan-500 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <input
            autoFocus
            type="text"
            placeholder="TERMINAL, PORTO OU CLIENTE..."
            className="w-full px-2 py-2 text-[9px] font-black uppercase border-b border-slate-100 outline-none bg-slate-50/50 focus:bg-white transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
          />
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <div
              onClick={() => { onSelect(trip, null); setIsSearching(false); }}
              className="px-2 py-1.5 hover:bg-red-50 cursor-pointer text-[8px] font-black text-red-500 border-b border-slate-50 transition-colors"
            >
              LIMPAR SELEÇÃO
            </div>
            {filtered.length > 0 ? filtered.map(o => (
              <div
                key={`${o.kind}-${o.id}`}
                onMouseDown={() => { onSelect(trip, o); setIsSearching(false); }}
                className="px-2 py-1.5 hover:bg-cyan-50 cursor-pointer border-b border-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start gap-1">
                  <p className="text-[8px] font-black text-slate-700 uppercase leading-tight flex-1">{o.name}</p>
                  <span className="text-[6px] px-1 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded font-black uppercase whitespace-nowrap">{o.kind}</span>
                </div>
                {(o.city || o.state) && <p className="text-[6px] text-slate-400 font-bold uppercase">{[o.city, o.state].filter(Boolean).join('/')}</p>}
              </div>
            )) : (
              <p className="px-2 py-2 text-[8px] text-slate-400 font-bold uppercase">Nenhum local encontrado</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

type DevScheduleStatus = 'critico' | 'pendente' | 'agendado' | 'normal';

function getDevScheduleStatus(d: Devolucao): DevScheduleStatus {
  // Terminal sem agendamento não exige data nem comprovante — nunca alerta
  if (d.semAgendamento) return 'normal';
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

// Compara pares de campos e retorna só os que mudaram (para a auditoria)
function diffAuditFields(pairs: { field: string; from?: any; to?: any }[]): { field: string; from?: string; to?: string }[] {
  return pairs
    .filter(p => String(p.from ?? '').trim() !== String(p.to ?? '').trim())
    .map(p => ({ field: p.field, from: String(p.from ?? '').trim(), to: String(p.to ?? '').trim() }));
}

// Classifica um tipo de operação por palavra-chave para saber a que visão ele
// pertence por padrão. Reconhece nomes compostos como "COLETA CABOTAGEM" e
// "ENTREGA CABOTAGEM" — que antes sumiam do painel por não baterem exatamente
// com os nomes curtos ('COLETA', 'CABOTAGEM', 'EXPORTAÇÃO', 'ENTREGA'...).
const isColetaViewType = (typeRaw: string): boolean => {
  const t = (typeRaw || '').toUpperCase();
  if (t.includes('DEVOLU')) return false;
  if (/ENTREGA|IMPORTA/.test(t)) return false;
  return /COLETA|EXPORTA|CABOTAGEM/.test(t);
};
const isEntregaViewType = (typeRaw: string): boolean => {
  const t = (typeRaw || '').toUpperCase();
  if (t.includes('DEVOLU')) return false;
  return /ENTREGA|IMPORTA/.test(t);
};

const OrganizationTab: React.FC<OrganizationTabProps> = ({ userId, trips: propTrips, ports, preStacking, drivers, customers, onRefresh, standalone = false }) => {
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
  // Minuta de Devolução aberta a partir de uma viagem de Entrega/Import
  const [devMinutaTrip, setDevMinutaTrip] = useState<Trip | null>(null);
  const [uploadingDevId, setUploadingDevId] = useState<string | null>(null);
  const [uploadingTripDoc, setUploadingTripDoc] = useState<string | null>(null); // `${tripId}:agend` | `${tripId}:reut`
  const [viewingDoc, setViewingDoc] = useState<{ url: string; fileName: string } | null>(null);
  const [cteAttachTripId, setCteAttachTripId] = useState<string | null>(null);

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
  // Gerar minuta de retirada (vazio → Liberação; cheio → Retirada) a partir da viagem
  const [retiradaGerar, setRetiradaGerar] = useState<{ trip: Trip; kind: 'liberacao' | 'retirada' } | null>(null);
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
  const [newOcOpen, setNewOcOpen] = useState(false);   // Ordem de Coleta de uma nova programação (em branco)

  // ─── Coleta do Dia (status de envio de e-mail / doc originário) ─────────────
  const [tiposViagem, setTiposViagem] = useState<ColetaTipoViagemOption[]>([]);
  const [defaultColetaTipoViagemId, setDefaultColetaTipoViagemId] = useState<string>('');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [coletaTemplateId, setColetaTemplateId] = useState<string>('');
  const [emailSendModal, setEmailSendModal] = useState<{ isOpen: boolean; trip?: Trip }>({ isOpen: false });

  // ─── Auditoria ───────────────────────────────────────────────────────────
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditEntries, setAuditEntries] = useState<OrgAuditEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAreaFilter, setAuditAreaFilter] = useState<string>('');

  const getAuditUser = useCallback((): { name: string; id: string } => {
    try {
      const saved = sessionStorage.getItem('als_active_session');
      if (saved) {
        const u = JSON.parse(saved);
        return { name: u.displayName || u.username || 'Sistema', id: u.id || '' };
      }
    } catch { /* sessão indisponível */ }
    return { name: 'Sistema', id: userId || '' };
  }, [userId]);

  const logAudit = useCallback((
    area: string,
    action: string,
    description: string,
    entityLabel?: string,
    changes?: { field: string; from?: string; to?: string }[],
    entityId?: string,
  ) => {
    const u = getAuditUser();
    db.saveOrgAudit({ area, action, description, entityLabel, entityId, changes, userName: u.name, userId: u.id })
      .catch(e => console.error('[logAudit]', e));
  }, [getAuditUser]);

  const openAudit = useCallback(async () => {
    setIsAuditOpen(true);
    setIsLoadingAudit(true);
    try {
      setAuditEntries(await db.getOrgAuditLog(500));
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  // Constantes de estabilidade
  const STABILITY_DURATION = 30000; // Aumentado para 30s pois agora temos auto-limpeza ao confirmar

  // Auto-limpeza de atualizações que já foram confirmadas pelo servidor
  useEffect(() => {
    const fetchTypes = async () => {
      const [types, cats, coletaTipos, templates] = await Promise.all([
        db.getOperationTypes(),
        db.getCategories(),
        db.getColetaTiposViagem(),
        db.getEmailTemplates(),
      ]);
      setOperationTypes(types);
      setCategories(cats);
      setTiposViagem(coletaTipos);
      setEmailTemplates(templates);

      // Mesma resolução de modelo padrão usada na aba Coleta do Dia
      const savedTemplateId = localStorage.getItem('coletaDefaultTemplateId');
      if (savedTemplateId && templates.some(t => t.id === savedTemplateId)) {
        setColetaTemplateId(savedTemplateId);
      } else {
        const coletaTemplate = templates.find(t => t.name === 'Modelo Coleta' || t.config?.isColetaDefault);
        if (coletaTemplate) setColetaTemplateId(coletaTemplate.id);
      }
    };
    fetchTypes();

    const savedDefault = localStorage.getItem('defaultColetaTipoViagem');
    if (savedDefault) setDefaultColetaTipoViagemId(savedDefault);
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
            if (!isColetaViewType(type)) return false;
          }
        } else {
          if (type.includes('DEVOLU')) return false;
          if (hiddenTripTypesEntrega !== null) {
            if (hiddenTripTypesEntrega.includes(type)) return false;
          } else {
            if (!isEntregaViewType(type)) return false;
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
      logAudit(activeView, 'NF', checked ? 'NF marcada como enviada' : 'NF desmarcada', trip.os, undefined, trip.id);
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
  }, [activeView, logAudit]);

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
      logAudit(activeView, 'STATUS', activate ? `Status alterado para ${targetStatus}` : `Status ${targetStatus} removido (voltou para ${newStatus})`, trip.os, [{ field: 'Status', from: trip.status, to: newStatus }], trip.id);
    } catch {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: errMsg, type: 'error' } }));
    }
  }, [activeView, logAudit]);

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
      logAudit(activeView, 'STATUS', activate ? 'Frete Morto ativado' : `Frete Morto removido (voltou para ${newStatus})`, trip.os, [{ field: 'Status', from: trip.status, to: newStatus }], trip.id);
    } catch {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar Frete Morto', type: 'error' } }));
    }
  }, [activeView, logAudit]);

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
        logAudit(activeView, 'AGENDAMENTO', 'Agendamento removido', trip.os, [{ field: 'Agendamento', from: trip.scheduledDateTime || trip.scheduling?.dateTime || '', to: '' }], trip.id);
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
  }, [activeView, logAudit]);

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
      },
      // Se a nota ainda não foi marcada, auto-marca ao confirmar agendamento
      ...(!existing.sentNF ? { sentNF: true } : {})
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
      logAudit(activeView, 'AGENDAMENTO', `Agendamento confirmado: ${resolvedLocationName || 'local não informado'}`, existing.os, [
        { field: 'Local', from: existing.scheduling?.location || '', to: resolvedLocationName },
        { field: 'Data/Hora', from: existing.scheduledDateTime || '', to: dateTime },
      ], existing.id);
    } catch (error) {
      // Não reverte pendingUpdates para evitar que o trip desapareça do painel.
      console.error("Erro ao salvar agendamento:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', {
        detail: { message: 'Erro ao salvar agendamento', type: 'error' }
      }));
    }
  }, [selectedTripForScheduling, locations, activeView, logAudit]);

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
      logAudit(activeView, 'LOCAL', `Local de agendamento alterado para ${selectedLoc?.name || '—'}`, trip.os, [{ field: 'Local', from: trip.scheduling?.location || trip.destination?.name || '', to: selectedLoc?.name || '' }], trip.id);
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
  }, [locations, activeView, logAudit]);

  const handleDateTimeChange = useCallback(async (trip: Trip, dateTime: string) => {
    // Salva como ISO UTC para consistência com SchedulingEditModal
    const isoDateTime = dateTime ? new Date(dateTime).toISOString() : '';

    // Ao confirmar a data/hora, confirma junto o local sugerido (programação)
    // quando nenhum local foi selecionado manualmente. A sugestão segue a mesma
    // regra exibida na coluna "Local Agendamento": destino → cliente.
    const suggestedLocationId = trip.destination?.id || trip.customer?.id || '';
    const resolvedLocationId = trip.scheduledLocationId || trip.scheduling?.locationId || (dateTime ? suggestedLocationId : '');
    const resolvedLoc = locations.find(l => l.id === resolvedLocationId);
    const resolvedLocationName = resolvedLoc?.name || trip.scheduling?.location || trip.destination?.name || '';
    const resolvedDestination = resolvedLoc ? {
      id: resolvedLoc.id,
      name: resolvedLoc.name,
      legalName: resolvedLoc.legalName,
      cnpj: resolvedLoc.cnpj,
      city: resolvedLoc.city,
      state: resolvedLoc.state
    } : trip.destination;

    // Auto-confirma o agendamento quando uma data é selecionada
    const dateTimeData = {
      scheduledDateTime: dateTime,
      ...(dateTime ? { isScheduled: true, scheduledLocationId: resolvedLocationId, destination: resolvedDestination } : {}),
      // Agendamento confirmado implica nota enviada — auto-marca se esqueceram
      ...(dateTime && !trip.sentNF ? { sentNF: true } : {}),
      scheduling: {
        locationId: resolvedLocationId,
        location: resolvedLocationName,
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
      logAudit(activeView, 'AGENDAMENTO', 'Data/hora de agendamento alterada', trip.os, [
        { field: 'Data/Hora', from: trip.scheduledDateTime || '', to: dateTime },
        ...(dateTime && resolvedLocationName && !trip.scheduledLocationId ? [{ field: 'Local', from: trip.scheduling?.location || '', to: resolvedLocationName }] : []),
      ], trip.id);
    } catch (error) {
      // Não reverte pendingUpdates para evitar que o trip desapareça do painel.
      // O toast informa o erro e o timeout de 30s faz a limpeza quando necessário.
      console.error("Erro ao salvar data/hora de agendamento:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', {
        detail: { message: 'Erro ao salvar data/hora de agendamento', type: 'error' }
      }));
    }
  }, [activeView, logAudit, locations]);

  // Cancela o agendamento gerado automaticamente pela minuta de Pré-Stacking.
  // Quando uma minuta é emitida, a viagem é agendada automaticamente e o toggle
  // "Agendado" fica bloqueado — então este é o único caminho para reverter um
  // agendamento feito por engano, liberando a viagem para novo agendamento manual.
  const handleCancelMinutaScheduling = useCallback((trip: Trip) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Agendamento da Minuta?',
      message: `A minuta de Pré-Stacking e o agendamento automático da OS ${trip.os} serão removidos, liberando a viagem para novo agendamento manual. A viagem permanece no painel. Deseja continuar?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        const schedulingData = {
          preStackingFormData: null,
          isScheduled: false,
          scheduledLocationId: '',
          scheduledDateTime: '',
          scheduling: trip.scheduling ? { ...trip.scheduling, locationId: '', location: '', dateTime: '' } : null,
        };

        const now = Date.now();
        setPendingUpdates(prev => ({
          ...prev,
          [trip.id]: {
            data: { ...(prev[trip.id]?.data || {}), ...schedulingData },
            timestamp: now,
          },
        }));

        try {
          await db.saveTrip({ ...trip, ...schedulingData });
          logAudit(activeView, 'AGENDAMENTO', 'Agendamento de minuta cancelado', trip.os, [{ field: 'Agendamento (Minuta)', from: trip.scheduledDateTime || trip.scheduling?.dateTime || '', to: '' }], trip.id);
          window.dispatchEvent(new CustomEvent('als_show_toast', {
            detail: { message: 'Agendamento da minuta cancelado', type: 'success' }
          }));
        } catch (error) {
          setPendingUpdates(prev => {
            const next = { ...prev };
            delete next[trip.id];
            return next;
          });
          console.error("Erro ao cancelar agendamento da minuta:", error);
          window.dispatchEvent(new CustomEvent('als_show_toast', {
            detail: { message: 'Erro ao cancelar agendamento da minuta', type: 'error' }
          }));
        }
      },
    });
  }, [activeView, logAudit]);

  // Marca/desmarca "terminal sem agendamento" — pergunta antes de mudar a cobrança
  const handleToggleDevSemAgendamento = useCallback((dev: Devolucao) => {
    const ativar = !dev.semAgendamento;
    setConfirmModal({
      isOpen: true,
      title: ativar ? 'Terminal sem agendamento?' : 'Voltar a exigir comprovante?',
      message: ativar
        ? `O terminal "${dev.local || '—'}" não exige agendamento nem comprovante para a baixa do vazio do container ${dev.container || dev.os}? Os alertas de comprovante serão desativados para esta devolução.`
        : `Voltar a exigir agendamento e comprovante para a devolução do container ${dev.container || dev.os}?`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const u = getAuditUser();
        const ok = await db.saveDevolucao({ ...dev, semAgendamento: ativar, userName: u.name, userId: u.id });
        if (ok) {
          await loadDevolucoes();
          logAudit('DEVOLUCAO', 'AGENDAMENTO', ativar ? 'Marcada como terminal sem agendamento (comprovante não exigido)' : 'Voltou a exigir agendamento/comprovante', dev.container || dev.os, undefined, dev.id);
        } else {
          window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar', type: 'error' } }));
        }
      }
    });
  }, [loadDevolucoes, logAudit, getAuditUser]);

  const handleSaveDevAgendamento = useCallback(async (devId: string, dateTime: string) => {
    const dev = devolucoes.find(d => d.id === devId);
    if (!dev) return;
    try {
      const u = getAuditUser();
      await db.saveDevolucao({ ...dev, scheduledDateTime: dateTime, status: dateTime ? 'Agendado' : dev.status, userName: u.name, userId: u.id });
      await loadDevolucoes();
      logAudit('DEVOLUCAO', 'AGENDAMENTO', dateTime ? 'Agendamento de devolução definido' : 'Agendamento de devolução removido', dev.container || dev.os, [{ field: 'Data/Hora', from: dev.scheduledDateTime || '', to: dateTime }], dev.id);
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar agendamento', type: 'error' } }));
    }
  }, [devolucoes, loadDevolucoes, logAudit, getAuditUser]);

  const handleDevComprovanteUpload = useCallback(async (dev: Devolucao, file: File) => {
    setUploadingDevId(dev.id);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const fileName = `comprovante-dev-${dev.os || dev.id}-${Date.now()}.${ext}`;
      const url = await r2Service.upload(file, fileName, `devolucoes/${dev.os || dev.id}`);
      const doc = { id: `agd-${Date.now()}`, type: 'AGENDAMENTO', url, fileName: file.name, uploadDate: new Date().toISOString() };
      const u = getAuditUser();
      await db.saveDevolucao({ ...dev, agendamentoDoc: doc, userName: u.name, userId: u.id });
      await loadDevolucoes();
      logAudit('DEVOLUCAO', 'COMPROVANTE', `Comprovante de agendamento enviado (${file.name})`, dev.container || dev.os, undefined, dev.id);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Comprovante enviado com sucesso', type: 'success' } }));
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao enviar comprovante', type: 'error' } }));
    } finally {
      setUploadingDevId(null);
    }
  }, [loadDevolucoes, logAudit, getAuditUser]);

  // ── Fluxo de retiradas: local (cheio p/ entrega, vazio p/ coleta) + data/hora ──
  const makeRetiradaChangeHandler = (field: 'retiradaCheio' | 'retiradaVazio') =>
    async (trip: Trip, option: RetiradaCheioOption | null) => {
      const value = option ? {
        id: option.id, name: option.name, legalName: option.legalName,
        cnpj: option.cnpj, city: option.city, state: option.state, kind: option.kind,
      } : undefined;
      const rotulo = field === 'retiradaVazio' ? 'Retirada do vazio' : 'Retirada do cheio';
      const now = Date.now();
      setPendingUpdates(prev => ({ ...prev, [trip.id]: { data: { ...(prev[trip.id]?.data || {}), [field]: value }, timestamp: now } }));
      try {
        await db.saveTrip({ ...trip, [field]: value || null } as any);
        logAudit(activeView, 'RETIRADA', `${rotulo} ${option ? `definida: ${option.name} (${option.kind})` : 'removida'}`, trip.os, [{ field: rotulo, from: (trip[field]?.name) || '', to: option?.name || '' }], trip.id);
      } catch {
        setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
        window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: `Erro ao salvar ${rotulo.toLowerCase()}`, type: 'error' } }));
      }
    };
  const handleRetiradaCheioChange = useCallback(makeRetiradaChangeHandler('retiradaCheio'), [activeView, logAudit]);
  const handleRetiradaVazioChange = useCallback(makeRetiradaChangeHandler('retiradaVazio'), [activeView, logAudit]);

  // Marca a retirada como realizada (registra a data/hora atual) ou desfaz
  const handleMarcarRetirada = useCallback(async (trip: Trip, field: 'retiradaCheioRealizadaEm' | 'retiradaVazioRealizadaEm') => {
    const jaFeita = !!trip[field];
    const iso = jaFeita ? '' : new Date().toISOString();
    const now = Date.now();
    setPendingUpdates(prev => ({ ...prev, [trip.id]: { data: { ...(prev[trip.id]?.data || {}), [field]: iso || undefined }, timestamp: now } }));
    try {
      await db.saveTrip({ ...trip, [field]: iso || null } as any);
      logAudit(activeView, 'RETIRADA', jaFeita ? 'Retirada desmarcada' : 'Retirada marcada como realizada', trip.os, undefined, trip.id);
    } catch {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao marcar retirada', type: 'error' } }));
    }
  }, [activeView, logAudit]);

  // Data/hora de agendamento da retirada (cheio/vazio)
  const handleRetiradaDataChange = useCallback(async (trip: Trip, field: 'retiradaCheioData' | 'retiradaVazioData', dateTime: string) => {
    const iso = dateTime ? new Date(dateTime).toISOString() : '';
    const now = Date.now();
    setPendingUpdates(prev => ({ ...prev, [trip.id]: { data: { ...(prev[trip.id]?.data || {}), [field]: iso || undefined }, timestamp: now } }));
    try {
      await db.saveTrip({ ...trip, [field]: iso || null } as any);
      logAudit(activeView, 'RETIRADA', dateTime ? 'Data/hora da retirada definida' : 'Data/hora da retirada removida', trip.os, undefined, trip.id);
    } catch {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar data da retirada', type: 'error' } }));
    }
  }, [activeView, logAudit]);

  const handleTripAgendamentoUpload = useCallback(async (trip: Trip, file: File) => {
    // Data/hora do agendamento é obrigatória antes de anexar o comprovante
    if (!trip.scheduledDateTime && !trip.scheduling?.dateTime) {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Defina a data/hora do agendamento antes de anexar o comprovante', type: 'error' } }));
      return;
    }
    setUploadingTripDoc(`${trip.id}:agend`);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const fileName = `agendamento-${trip.os || trip.id}-${Date.now()}.${ext}`;
      const url = await r2Service.upload(file, fileName, `agendamentos/${trip.os || trip.id}`);
      const doc = { id: `agd-${Date.now()}`, url, fileName: file.name, uploadDate: new Date().toISOString() };
      await db.saveTrip({ ...trip, agendamentoAnexo: doc, isScheduled: true } as any);
      logAudit(activeView, 'COMPROVANTE', `Comprovante de agendamento anexado (${file.name})`, trip.os, undefined, trip.id);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Agendamento anexado com sucesso', type: 'success' } }));
      onRefresh();
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao anexar agendamento', type: 'error' } }));
    } finally {
      setUploadingTripDoc(null);
    }
  }, [activeView, logAudit, onRefresh]);

  const handleReutComprovanteUpload = useCallback(async (trip: Trip, file: File) => {
    setUploadingTripDoc(`${trip.id}:reut`);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const fileName = `reutilizacao-${trip.os || trip.id}-${Date.now()}.${ext}`;
      const url = await r2Service.upload(file, fileName, `reutilizacoes/${trip.os || trip.id}`);
      const doc = { id: `reut-${Date.now()}`, url, fileName: file.name, uploadDate: new Date().toISOString() };
      await db.saveTrip({ ...trip, reutilizacaoComprovante: doc } as any);
      logAudit(activeView, 'COMPROVANTE', `Comprovante de reutilização anexado (${file.name})`, trip.os, undefined, trip.id);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Comprovante de reutilização anexado', type: 'success' } }));
      onRefresh();
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao anexar comprovante de reutilização', type: 'error' } }));
    } finally {
      setUploadingTripDoc(null);
    }
  }, [activeView, logAudit, onRefresh]);

  // ── CT-e Emitido (Coleta/Export e Entrega/Import) ───────────────────────
  const handleToggleCteEmitido = useCallback(async (trip: Trip, checked: boolean) => {
    const now = Date.now();
    // Não pode existir CT-e sem Doc. Originário — ao marcar o CT-e, marca o Doc. também
    const alsoDoc = checked && !trip.coletaDocGenerated;
    const data: Partial<Trip> = { cteEmitido: checked, ...(alsoDoc ? { coletaDocGenerated: true } : {}) };
    setPendingUpdates(prev => ({ ...prev, [trip.id]: { data: { ...(prev[trip.id]?.data || {}), ...data }, timestamp: now } }));
    try {
      await db.saveTrip({ ...trip, ...data } as any);
      logAudit(activeView, 'CTE', checked ? 'CT-e marcado como emitido' : 'CT-e emitido desmarcado', trip.os, undefined, trip.id);
      if (alsoDoc) logAudit(activeView, 'COLETA', 'Doc. originário marcado automaticamente (CT-e emitido)', trip.os, undefined, trip.id);
    } catch {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar CT-e emitido', type: 'error' } }));
    }
  }, [activeView, logAudit]);

  const handleCteEmitidoUpload = useCallback(async (trip: Trip, files: File[]) => {
    if (files.length === 0) return;
    setUploadingTripDoc(`${trip.id}:cte`);
    try {
      const novos: NonNullable<Trip['cteEmitidoAnexos']> = [];
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'pdf';
        const fileName = `cte-emitido-${trip.os || trip.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const url = await r2Service.upload(file, fileName, `cte-emitido/${trip.os || trip.id}`);
        novos.push({ id: `cte-anx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, url, fileName: file.name, uploadDate: new Date().toISOString() });
      }
      // Anexar já marca o CT-e como emitido (o anexo continua opcional) e, como
      // não pode existir CT-e sem Doc. Originário, marca o Doc. também.
      const anexos = [...(trip.cteEmitidoAnexos || []), ...novos];
      await db.saveTrip({ ...trip, cteEmitidoAnexos: anexos, cteEmitido: true, coletaDocGenerated: true } as any);
      logAudit(activeView, 'CTE', `${novos.length} PDF(s) do CT-e emitido anexado(s)`, trip.os, undefined, trip.id);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'PDF(s) do CT-e anexado(s)', type: 'success' } }));
      onRefresh();
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao anexar PDF do CT-e', type: 'error' } }));
    } finally {
      setUploadingTripDoc(null);
    }
  }, [activeView, logAudit, onRefresh]);

  const handleRemoveCteEmitidoAnexo = useCallback(async (trip: Trip, anexoId: string) => {
    try {
      const anexos = (trip.cteEmitidoAnexos || []).filter(a => a.id !== anexoId);
      await db.saveTrip({ ...trip, cteEmitidoAnexos: anexos } as any);
      logAudit(activeView, 'CTE', 'PDF do CT-e emitido removido', trip.os, undefined, trip.id);
      onRefresh();
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao remover PDF do CT-e', type: 'error' } }));
    }
  }, [activeView, logAudit, onRefresh]);

  // Emissões de CT-e (anexar/visualizar CT-e e NF) — mesmo modal da aba Emissões
  const handleCteAttachmentsUpdate = useCallback(async (trip: Trip, data: Partial<Trip>) => {
    const now = Date.now();
    setPendingUpdates(prev => ({ ...prev, [trip.id]: { data: { ...(prev[trip.id]?.data || {}), ...data }, timestamp: now } }));
    try {
      await db.saveTrip({ ...trip, ...data });
      logAudit(activeView, 'CTE', 'Anexos de CT-e/NF atualizados', trip.os, undefined, trip.id);
    } catch {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar anexos de CT-e', type: 'error' } }));
    }
  }, [activeView, logAudit]);

  const handleSaveDevolucaoFromForm = useCallback(async (updated: Devolucao) => {
    const old = devMinutaDev;
    await db.saveDevolucao(updated);
    await loadDevolucoes();
    setDevMinutaDev(null);
    const changes = old ? diffAuditFields([
      { field: 'Container',  from: old.container,          to: updated.container },
      { field: 'Booking',    from: old.booking,            to: updated.booking },
      { field: 'Navio',      from: old.ship,               to: updated.ship },
      { field: 'Armador',    from: old.agencia,            to: updated.agencia },
      { field: 'POD',        from: old.pod,                to: updated.pod },
      { field: 'Tipo',       from: old.containerType,      to: updated.containerType },
      { field: 'Local',      from: old.local,              to: updated.local },
      { field: 'Motorista',  from: old.driver?.name,       to: updated.driver?.name },
      { field: 'Cliente',    from: old.customer?.name,     to: updated.customer?.name },
      { field: 'Agendamento',from: old.scheduledDateTime,  to: updated.scheduledDateTime },
      { field: 'Obs',        from: old.obs,                to: updated.obs },
    ]) : [];
    logAudit('DEVOLUCAO', 'EDICAO', changes.length ? 'Minuta de devolução editada' : 'Minuta de devolução salva (sem alterações)', updated.container || updated.os, changes, updated.id);
    window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Minuta salva com sucesso', type: 'success' } }));
  }, [loadDevolucoes, devMinutaDev, logAudit]);

  const handleSaveLiberacaoFromForm = useCallback(async (updated: Liberacao) => {
    const old = libMinuta;
    await db.saveLiberacao(updated);
    await loadLiberacoes();
    setLibMinuta(null);
    const changes = old ? diffAuditFields([
      { field: 'Booking',   from: old.booking,        to: updated.booking },
      { field: 'Navio',     from: old.ship,           to: updated.ship },
      { field: 'Armador',   from: old.agencia,        to: updated.agencia },
      { field: 'POD',       from: old.pod,            to: updated.pod },
      { field: 'Tipo',      from: old.containerType,  to: updated.containerType },
      { field: 'Qtd',       from: old.qtdContainer,   to: updated.qtdContainer },
      { field: 'Local',     from: old.local,          to: updated.local },
      { field: 'Motorista', from: old.driver?.name,   to: updated.driver?.name },
      { field: 'Cliente',   from: old.customer?.name, to: updated.customer?.name },
      { field: 'Obs',       from: old.obs,            to: updated.obs },
    ]) : [];
    logAudit('LIBERACAO', 'EDICAO', changes.length ? 'Liberação de vazio editada' : 'Liberação salva (sem alterações)', updated.booking || updated.os, changes, updated.id);
    window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Liberação salva com sucesso', type: 'success' } }));
  }, [loadLiberacoes, libMinuta, logAudit]);

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
      const u = getAuditUser();
      await db.saveDevolucao({ ...newDev, userName: u.name, userId: u.id });
      await loadDevolucoes();
      logAudit('DEVOLUCAO', 'CRIACAO', 'Devolução criada manualmente', newDev.container, undefined, newDev.id);
      setDevAddForm({ container: '', local: '', dateTime: '', driverId: '' });
      setShowDevAddForm(false);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Devolução adicionada com sucesso', type: 'success' } }));
    } catch {
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao adicionar devolução', type: 'error' } }));
    } finally {
      setSavingDevAdd(false);
    }
  }, [devAddForm, drivers, loadDevolucoes, logAudit, getAuditUser]);

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
    } else {
      logAudit(activeView, 'ADIANTAMENTO', checked ? 'Adiantamento liberado' : 'Adiantamento bloqueado', trip.os, undefined, trip.id);
    }
  }, [activeView, logAudit]);

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
      logAudit(activeView, 'LIMPEZA', 'Viagem limpa do painel', trip.os, undefined, trip.id);
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
  }, [activeView, logAudit]);

  // Resolve o tipo de viagem efetivo da coleta (mesma regra da aba Coleta do Dia)
  const resolveEffectiveTripTypeId = useCallback((t: Trip): string | null => {
    if (t.coletaTipoViagem) return t.coletaTipoViagem;
    const opType = operationTypes.find((ot: any) => ot.name?.toUpperCase() === t.type?.toUpperCase());
    const rules: { tripTypeId: string; isDefault?: boolean; customerIds?: string[] }[] = opType?.config?.tripTypeRules || [];
    const explicit = rules.find(r => r.customerIds?.length && r.customerIds.includes(t.customer.id));
    const fallback = rules.find(r => r.isDefault) || rules.find(r => !r.customerIds?.length);
    return (explicit || fallback)?.tripTypeId || defaultColetaTipoViagemId || null;
  }, [operationTypes, defaultColetaTipoViagemId]);

  // Tipos de viagem sem e-mail (ex.: BL DE LONGO CUSTO) usam Doc. Originário no lugar
  const isColetaSemEmail = useCallback((t: Trip): boolean => {
    const name = tiposViagem.find(tv => tv.id === resolveEffectiveTripTypeId(t))?.name?.toUpperCase();
    return name === 'BL DE LONGO CUSTO';
  }, [tiposViagem, resolveEffectiveTripTypeId]);

  // MERCOSUL: a coleta é confirmada no sistema "OK" (não por e-mail)
  const isMercosul = useCallback((t: Trip): boolean => {
    return (t.category || '').toUpperCase().includes('MERCOSUL');
  }, []);

  const activeColetaTemplate = useMemo(() => {
    return emailTemplates.find(t => t.id === coletaTemplateId) || emailTemplates[0] || null;
  }, [emailTemplates, coletaTemplateId]);

  // Marca/desmarca o e-mail da coleta como enviado (mesma semântica da aba Coleta do Dia)
  const handleToggleColetaEmail = useCallback(async (trip: Trip, checked: boolean) => {
    const now = Date.now();
    const updateData: Partial<Trip> = { coletaEmailSent: checked };
    if (checked && !trip.sentNF) updateData.sentNF = true;

    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { data: { ...(prev[trip.id]?.data || {}), ...updateData }, timestamp: now }
    }));

    try {
      await db.saveTrip({ ...trip, ...updateData });
      logAudit(activeView, 'COLETA', checked ? 'E-mail da coleta marcado como enviado' : 'E-mail da coleta desmarcado', trip.os, undefined, trip.id);
    } catch (error) {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      console.error('Erro ao salvar status do e-mail da coleta:', error);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar status do e-mail', type: 'error' } }));
    }
  }, [activeView, logAudit]);

  // Marca/desmarca o Doc. Originário como gerado
  const handleToggleColetaDoc = useCallback(async (trip: Trip, checked: boolean) => {
    const now = Date.now();
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { data: { ...(prev[trip.id]?.data || {}), coletaDocGenerated: checked }, timestamp: now }
    }));

    try {
      await db.saveTrip({ ...trip, coletaDocGenerated: checked });
      logAudit(activeView, 'COLETA', checked ? 'Doc. originário marcado como gerado' : 'Doc. originário desmarcado', trip.os, undefined, trip.id);
    } catch (error) {
      setPendingUpdates(prev => { const next = { ...prev }; delete next[trip.id]; return next; });
      console.error('Erro ao salvar Doc. Originário:', error);
      window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Erro ao salvar Doc. Originário', type: 'error' } }));
    }
  }, [activeView, logAudit]);

  const toggleTripType = (type: string) => {
    if (activeView === 'COLETA') {
      setHiddenTripTypesColeta(prev => {
        const currentHidden = prev !== null ? prev : operationTypes.map(t => t.name.toUpperCase()).filter(t => !isColetaViewType(t));
        const next = currentHidden.includes(type) ? currentHidden.filter(t => t !== type) : [...currentHidden, type];
        localStorage.setItem('orgVisibleTripTypesColeta', JSON.stringify(next));
        return next;
      });
    } else {
      setHiddenTripTypesEntrega(prev => {
        const currentHidden = prev !== null ? prev : operationTypes.map(t => t.name.toUpperCase()).filter(t => !isEntregaViewType(t));
        const next = currentHidden.includes(type) ? currentHidden.filter(t => t !== type) : [...currentHidden, type];
        localStorage.setItem('orgVisibleTripTypesEntrega', JSON.stringify(next));
        return next;
      });
    }
  };

  const handleFinalizeTrips = () => {
    const readyTrips = trips.filter(t => isTripReadyToFinalize(t));

    if (readyTrips.length === 0) {
      alert(activeView === 'ENTREGA'
        ? "Nenhuma viagem está concluída para limpar. Na Entrega/Import a viagem conclui quando a baixa do vazio é confirmada via status, está agendada ou o container foi reutilizado — e o CT-e precisa estar marcado como emitido."
        : "Nenhuma viagem está pronta para limpar. É obrigatório que o CT-e esteja marcado como emitido e que as viagens agendadas tenham 'NF' e 'Adiantamento' marcados. Viagens em Frete Morto não têm CT-e — basta o 'Adiantamento' marcado.");
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
            logAudit(activeView, 'LIMPEZA', `${tripsToFinalize.length} viagens finalizadas e limpas do painel`, tripsToFinalize.map(t => t.os).join(', ').slice(0, 200));
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

  // Baixa do vazio confirmada via status: a própria viagem foi concluída
  // (status "Viagem concluída" ou "Devolução do cheio"), OU há uma devolução
  // vinculada à viagem (mesma OS ou mesmo container) com status Agendado/Realizado
  const hasBaixaConfirmada = useCallback((t: Trip) => {
    // Quando a viagem está concluída, a baixa do vazio já foi efetivada
    if (t.status === 'Viagem concluída' || t.status === 'Devolução do cheio') return true;
    const os = (t.os || '').trim().toUpperCase();
    const cont = (t.container || '').replace(/\s/g, '').toUpperCase();
    return devolucoes.some(d => {
      if (d.status !== 'Agendado' && d.status !== 'Realizado') return false;
      const dOs = (d.os || '').trim().toUpperCase();
      const dCont = (d.container || '').replace(/\s/g, '').toUpperCase();
      return (os && dOs === os) || (cont && dCont === cont);
    });
  }, [devolucoes]);

  // Entrega/Import: a viagem está concluída quando a baixa do vazio foi
  // confirmada via status, ou está agendada, ou o container foi reutilizado
  const isEntregaConcluida = useCallback((t: Trip) =>
    t.status === 'Reutilização' || isTripScheduled(t) || hasBaixaConfirmada(t),
  [isTripScheduled, hasBaixaConfirmada]);

  const isTripReadyToFinalize = useCallback((t: Trip) => {
    // Frete Morto não tem CT-e — pode limpar só com o adiantamento marcado
    if (t.status === 'Frete Morto') return !!t.hasAdvance;
    // Nos demais casos, só permite limpar/finalizar com o CT-e emitido
    if (!t.cteEmitido) return false;
    if (activeView === 'ENTREGA') return isEntregaConcluida(t);
    return isTripScheduled(t) && !!t.sentNF && !!t.hasAdvance;
  }, [isTripScheduled, activeView, isEntregaConcluida]);

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

  // Locais possíveis para a retirada do cheio: terminais pré-stacking, portos e clientes
  const retiradaOptions = useMemo<RetiradaCheioOption[]>(() => [
    ...preStacking.map((p: any) => ({ id: p.id, name: p.name, legalName: p.legalName, cnpj: p.cnpj, city: p.city, state: p.state, kind: 'PRÉ-STACKING' })),
    ...ports.map((p: any) => ({ id: p.id, name: p.name, legalName: p.legalName, cnpj: p.cnpj, city: p.city, state: p.state, kind: 'PORTO' })),
    ...customers.map((c: any) => ({ id: c.id, name: c.name, legalName: c.legalName, cnpj: c.cnpj, city: c.city, state: c.state, kind: 'CLIENTE' })),
  ], [ports, preStacking, customers]);

  // Controles de status (realizada + data/hora) e botão Gerar da retirada
  const renderRetiradaStatus = (t: Trip, kind: 'vazio' | 'cheio') => {
    const realizadaField = kind === 'vazio' ? 'retiradaVazioRealizadaEm' : 'retiradaCheioRealizadaEm';
    const realizadaEm = t[realizadaField];
    const gerarKind = kind === 'vazio' ? 'liberacao' : 'retirada';
    const gerarLabel = kind === 'vazio' ? 'Gerar Liberação' : 'Gerar Retirada';
    return (
      <>
        <button
          onClick={(e) => { e.stopPropagation(); handleMarcarRetirada(t, realizadaField); }}
          className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border transition-all ${realizadaEm ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
          title={realizadaEm ? 'Retirada realizada — clique para desmarcar' : 'Marcar retirada como realizada (registra data/hora)'}
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          {realizadaEm ? 'Realizada ✓' : 'Marcar Retirada'}
        </button>
        {realizadaEm && (
          <p className="text-[7px] font-black text-emerald-600 uppercase text-center">
            {new Date(realizadaEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setRetiradaGerar({ trip: t, kind: gerarKind }); }}
          className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 transition-all"
          title={`${gerarLabel} pré-preenchida`}
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          {gerarLabel}
        </button>
      </>
    );
  };

  const columns = useMemo(() => [
    // Entrega/Import: 1ª coluna = retirada do CHEIO (terminal/porto/cliente) + agendamento
    ...(activeView === 'ENTREGA' ? [{
      key: 'retiradaCheio',
      label: 'Retirada do Cheio',
      sortValue: (t: Trip) => t.retiradaCheio?.name || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-1.5 min-w-[170px]">
          <RetiradaCheioSelect trip={t} options={retiradaOptions} onSelect={handleRetiradaCheioChange} field="retiradaCheio" />
          <DateTimePicker
            value={formatToLocalInput(t.retiradaCheioData || '')}
            onChange={(v) => handleRetiradaDataChange(t, 'retiradaCheioData', v)}
            placeholder="Agendar retirada..."
            inputClassName="!px-2 !py-1 !rounded-lg !border !text-[9px] !font-bold !border-slate-200 !bg-slate-50"
          />
          {t.retiradaCheio && renderRetiradaStatus(t, 'cheio')}
        </div>
      )
    }] : []),
    // Coleta/Export: 1ª coluna = retirada do VAZIO (porto/pré-stacking) ou Reutilização + agendamento
    ...(activeView === 'COLETA' ? [{
      key: 'retiradaVazio',
      label: 'Retirada do Vazio / Reut.',
      sortValue: (t: Trip) => t.retiradaVazio?.name || '',
      render: (t: Trip) => {
        const isReut = t.status === 'Reutilização';
        return (
          <div className="flex flex-col gap-1.5 min-w-[170px]">
            {isReut ? (
              // Reutilização: destaca o cliente e mostra o tipo (coleta/entrega) embaixo
              <div className="w-full rounded-xl border-2 border-emerald-400 bg-emerald-50 px-2.5 py-2 shadow-sm">
                <span className="text-[7px] font-black text-emerald-600 uppercase tracking-tighter flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Reutilização — Cliente
                </span>
                <p className="text-[11px] font-black text-emerald-800 uppercase leading-tight break-words mt-0.5">{t.customer?.name || '—'}</p>
                <span className="inline-block mt-1 text-[7px] px-1.5 py-0.5 bg-emerald-600 text-white rounded font-black uppercase">
                  {isEntregaViewType(t.type || '') ? 'ENTREGA' : 'COLETA'}
                </span>
              </div>
            ) : (
              <>
                <RetiradaCheioSelect trip={t} options={retiradaOptions} onSelect={handleRetiradaVazioChange} field="retiradaVazio" />
                <DateTimePicker
                  value={formatToLocalInput(t.retiradaVazioData || '')}
                  onChange={(v) => handleRetiradaDataChange(t, 'retiradaVazioData', v)}
                  placeholder="Agendar retirada..."
                  inputClassName="!px-2 !py-1 !rounded-lg !border !text-[9px] !font-bold !border-slate-200 !bg-slate-50"
                />
                {t.retiradaVazio && renderRetiradaStatus(t, 'vazio')}
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleReutilizacao(t, !isReut); }}
              className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all border ${isReut ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
              title={isReut ? 'Reutilização — clique para reverter (usar retirada de vazio)' : 'Marcar como Reutilização (container reaproveitado, sem retirada de vazio)'}
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              {isReut ? 'Reutilização ✓' : 'Reutilização'}
            </button>
          </div>
        );
      }
    }] : []),
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
      // Cliente conforme o tipo: coleta/export = Local de Coleta; entrega/import = Local de Entrega
      label: activeView === 'ENTREGA' ? 'Local de Entrega' : 'Local de Coleta',
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
    ...(activeView === 'COLETA' ? [{
      key: 'coletaEmail',
      label: 'Coletas',
      sortable: false,
      render: (t: Trip) => {
        const isFreteMorto = t.status === 'Frete Morto';
        const isBL = isColetaSemEmail(t);
        const isMerc = isMercosul(t);
        const cteCount = t.emissaoCteAttachments?.length || 0;
        // Emissões de CT-e: anexar e visualizar CT-e e NF (mesmo modal da aba Emissões)
        const cteEmissoesBtn = (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCteAttachTripId(t.id); }}
            className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border transition-all ${cteCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-white border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400'}`}
            title="Emissões de CT-e — anexar e visualizar CT-e e NF (PDF/XML)"
          >
            <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
            </svg>
            {cteCount > 0 ? `CT-e / NF (${cteCount})` : 'Emissões CT-e'}
          </button>
        );
        // BL DE LONGO CUSTO: sem e-mail — mostra o ícone de BL no lugar do botão
        if (isBL) {
          return (
            <div className="flex flex-col items-center gap-1 min-w-[110px]">
              <div className="flex items-start justify-center gap-2">
                {/* Ícone de BL — apenas ícone (não é botão) */}
                <div className="flex flex-col items-center gap-0.5" title="BL de Longo Custo — sem e-mail">
                  <div className="w-9 h-9 flex items-center justify-center text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <span className="text-[6px] font-black uppercase tracking-tight text-slate-500">BL</span>
                </div>
                {/* Doc. Originário */}
                <div className="flex flex-col items-center gap-0.5">
                  <ToggleIconBtn
                    checked={!!t.coletaDocGenerated}
                    onClick={() => handleToggleColetaDoc(t, !t.coletaDocGenerated)}
                    disabled={isFreteMorto}
                    loading={'coletaDocGenerated' in (pendingUpdates[t.id]?.data || {})}
                    activeClass="bg-emerald-50 border-emerald-400 text-emerald-600"
                    inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-emerald-300 hover:text-emerald-400"
                    badgeColor="bg-emerald-500"
                    title={isFreteMorto ? 'Bloqueado — viagem em Frete Morto' : (t.coletaDocGenerated ? 'Doc. originário gerado — clique para desmarcar' : 'Marcar doc. originário como gerado')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </ToggleIconBtn>
                  <span className="text-[6px] font-black uppercase tracking-tight text-emerald-600">Doc Orig.</span>
                </div>
              </div>
              {cteEmissoesBtn}
            </div>
          );
        }

        // Tipos com e-mail: e-mail da coleta e doc. originário lado a lado, na mesma coluna
        return (
          <div className="flex flex-col items-center gap-1 min-w-[124px]">
            <div className="flex items-start justify-center gap-2">
              {/* Coleta: MERCOSUL confirma no sistema OK (botão OK); demais por e-mail */}
              <div className="flex flex-col items-center gap-0.5">
                <ToggleIconBtn
                  checked={!!t.coletaEmailSent}
                  onClick={() => handleToggleColetaEmail(t, !t.coletaEmailSent)}
                  disabled={isFreteMorto}
                  loading={'coletaEmailSent' in (pendingUpdates[t.id]?.data || {})}
                  activeClass={isMerc ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-blue-50 border-blue-400 text-blue-600'}
                  inactiveClass={isMerc ? 'bg-white border-slate-200 text-slate-300 hover:border-emerald-300 hover:text-emerald-400' : 'bg-white border-slate-200 text-slate-300 hover:border-blue-300 hover:text-blue-400'}
                  badgeColor={isMerc ? 'bg-emerald-500' : 'bg-blue-500'}
                  title={isFreteMorto ? 'Bloqueado — viagem em Frete Morto' : isMerc ? (t.coletaEmailSent ? 'Coleta confirmada no sistema OK — clique para desmarcar' : 'MERCOSUL: marcar coleta feita no sistema OK') : (t.coletaEmailSent ? 'E-mail da coleta enviado — clique para desmarcar' : 'Marcar e-mail da coleta como enviado')}
                >
                  {isMerc ? (
                    <span className="text-[11px] font-black leading-none">OK</span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  )}
                </ToggleIconBtn>
                <span className={`text-[6px] font-black uppercase tracking-tight ${isMerc ? 'text-emerald-600' : 'text-blue-600'}`}>{isMerc ? 'OK' : 'E-mail'}</span>
              </div>
              {/* Doc. Originário */}
              <div className="flex flex-col items-center gap-0.5">
                <ToggleIconBtn
                  checked={!!t.coletaDocGenerated}
                  onClick={() => handleToggleColetaDoc(t, !t.coletaDocGenerated)}
                  disabled={isFreteMorto}
                  loading={'coletaDocGenerated' in (pendingUpdates[t.id]?.data || {})}
                  activeClass="bg-emerald-50 border-emerald-400 text-emerald-600"
                  inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-emerald-300 hover:text-emerald-400"
                  badgeColor="bg-emerald-500"
                  title={isFreteMorto ? 'Bloqueado — viagem em Frete Morto' : (t.coletaDocGenerated ? 'Doc. originário gerado — clique para desmarcar' : 'Marcar doc. originário como gerado')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </ToggleIconBtn>
                <span className="text-[6px] font-black uppercase tracking-tight text-emerald-600">Doc Orig.</span>
              </div>
            </div>
            {isFreteMorto ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[6px] font-black text-slate-500 uppercase tracking-tight" title="Bloqueado — viagem em Frete Morto">
                Frete Morto
              </span>
            ) : isMerc ? null : t.coletaEmailSent ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-[6px] font-black text-blue-700 uppercase tracking-tight">
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                </svg>
                Enviada
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEmailSendModal({ isOpen: true, trip: t }); }}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all border bg-white border-blue-200 text-blue-500 hover:bg-blue-50 hover:border-blue-400"
                title="Enviar e-mail da coleta"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Enviar E-mail
              </button>
            )}
            {cteEmissoesBtn}
          </div>
        );
      }
    }] : []),
    {
      key: 'cteEmitido',
      label: 'CT-e Emitido',
      render: (t: Trip) => {
        const checked = !!t.cteEmitido;
        const anexos = t.cteEmitidoAnexos || [];
        const isUploading = uploadingTripDoc === `${t.id}:cte`;
        return (
          <div className="flex flex-col items-center gap-1 min-w-[110px]">
            <ToggleIconBtn
              checked={checked}
              onClick={() => handleToggleCteEmitido(t, !checked)}
              loading={'cteEmitido' in (pendingUpdates[t.id]?.data || {})}
              activeClass="bg-indigo-50 border-indigo-400 text-indigo-600"
              inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400"
              badgeColor="bg-indigo-500"
              title={checked ? 'CT-e emitido — clique para desmarcar' : 'Marcar CT-e como emitido'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </ToggleIconBtn>
            {anexos.map(a => (
              <div key={a.id} className="w-full flex items-center gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); setViewingDoc({ url: a.url, fileName: a.fileName }); }}
                  className="flex-1 flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-tight border bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all min-w-0"
                  title={`Ver ${a.fileName}`}
                >
                  <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  <span className="truncate">{a.fileName}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveCteEmitidoAnexo(t, a.id); }}
                  className="p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
                  title="Remover este PDF"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
            <label
              onClick={(e) => e.stopPropagation()}
              className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border cursor-pointer transition-all ${isUploading ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400'}`}
              title="Anexar um ou mais PDFs do CT-e (opcional)"
            >
              {isUploading
                ? <><div className="w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>Enviando...</>
                : <><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>{anexos.length > 0 ? 'Anexar Mais' : 'Anexar PDF'}</>}
              <input type="file" accept=".pdf,application/pdf" multiple className="hidden" disabled={isUploading} onChange={e => { const fs = Array.from(e.target.files || []); if (fs.length) { handleCteEmitidoUpload(t, fs); e.target.value = ''; } }} />
            </label>

            {/* Entrega/Import: Doc Originário + Emissões (anexar/ver CT-e e NF) na mesma coluna */}
            {activeView === 'ENTREGA' && (() => {
              const docChecked = !!t.coletaDocGenerated;
              const cteCount = t.emissaoCteAttachments?.length || 0;
              return (
                <div className="w-full flex flex-col items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100">
                  <span className="text-[6px] font-black text-slate-400 uppercase tracking-tight">Doc Originário</span>
                  <ToggleIconBtn
                    checked={docChecked}
                    onClick={() => handleToggleColetaDoc(t, !docChecked)}
                    loading={'coletaDocGenerated' in (pendingUpdates[t.id]?.data || {})}
                    activeClass="bg-emerald-50 border-emerald-400 text-emerald-600"
                    inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-emerald-300 hover:text-emerald-400"
                    badgeColor="bg-emerald-500"
                    title={docChecked ? 'Doc. originário gerado — clique para desmarcar' : 'Marcar doc. originário como gerado'}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </ToggleIconBtn>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCteAttachTripId(t.id); }}
                    className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border transition-all ${cteCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-white border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400'}`}
                    title="Emissões de CT-e — anexar e visualizar CT-e e NF (PDF/XML) e os dados"
                  >
                    <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    {cteCount > 0 ? `CT-e / NF (${cteCount})` : 'Emissões CT-e'}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }
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
            {activeView === 'ENTREGA' && isEntregaConcluida(t) && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-[6px] font-black text-white uppercase tracking-tight"
                title={`Viagem concluída — ${t.status === 'Reutilização' ? 'container reutilizado' : hasBaixaConfirmada(t) ? 'baixa do vazio confirmada' : 'agendada'}`}
              >
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                </svg>
                Concluída
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'scheduledLocationId',
      // Entrega/Import: ao finalizar a entrega, o vazio é devolvido em um
      // terminal pré-stacking (Baixa Vazio) ou o container é reutilizado
      label: activeView === 'ENTREGA' ? 'Baixa Vazio' : 'Local Agendamento',
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
            {activeView === 'ENTREGA' && isReutilizacao && (
              <div className="flex flex-col gap-1">
                {t.reutilizacaoComprovante && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewingDoc({ url: t.reutilizacaoComprovante!.url, fileName: t.reutilizacaoComprovante!.fileName }); }}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-all"
                    title={`Ver comprovante de reutilização (${t.reutilizacaoComprovante.fileName})`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Ver Comprovante
                  </button>
                )}
                <label
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border cursor-pointer transition-all ${uploadingTripDoc === `${t.id}:reut` ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400'}`}
                  title="Anexar comprovante de reutilização — fica visível em Devoluções/Reut"
                >
                  {uploadingTripDoc === `${t.id}:reut`
                    ? <><div className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/>Enviando...</>
                    : <><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>{t.reutilizacaoComprovante ? 'Substituir' : 'Anexar Comprov. Reut.'}</>}
                  <input type="file" accept=".pdf,image/*" className="hidden" disabled={uploadingTripDoc === `${t.id}:reut`} onChange={e => { const f = e.target.files?.[0]; if (f) { handleReutComprovanteUpload(t, f); e.target.value = ''; } }} />
                </label>
              </div>
            )}
            {activeView === 'ENTREGA' && !isReutilizacao && (t.status === 'Viagem concluída' || t.status === 'Devolução do cheio') && (
              <span
                className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 border border-emerald-500 text-[7px] font-black text-emerald-700 uppercase tracking-tight"
                title={`Baixa do vazio confirmada — viagem com status "${t.status}"`}
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                Baixa Confirmada
              </span>
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
              onClick={(e) => { e.stopPropagation(); activeView === 'ENTREGA' ? setDevMinutaTrip(t) : setMinutaTrip(t); }}
              className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all border ${hasMinuta ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
              title={activeView === 'ENTREGA' ? 'Gerar Minuta de Devolução de Vazio (data/hora obrigatória)' : (hasMinuta ? 'Minuta gerada — clique para reeditar' : 'Gerar Minuta de Pré-Stacking')}
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              {activeView === 'ENTREGA' ? 'Minuta Devolução' : (hasMinuta ? 'Minuta ✓' : 'Gerar Minuta')}
            </button>
            {hasMinuta && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCancelMinutaScheduling(t); }}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all border bg-white border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400"
                title="Cancelar o agendamento gerado pela minuta (ex.: emitida por engano)"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Cancelar Agend.
              </button>
            )}
            {/* Entrega/Import sem minuta de devolução: anexa o comprovante do
                agendamento (a data/hora acima é obrigatória antes de anexar) */}
            {activeView === 'ENTREGA' && !hasMinuta && (
              <>
                {t.agendamentoAnexo && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setViewingDoc({ url: t.agendamentoAnexo!.url, fileName: t.agendamentoAnexo!.fileName }); }}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 transition-all"
                    title={`Ver agendamento anexado (${t.agendamentoAnexo.fileName})`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    Ver Agendamento
                  </button>
                )}
                <label
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight border cursor-pointer transition-all ${uploadingTripDoc === `${t.id}:agend` ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-blue-200 text-blue-500 hover:bg-blue-50 hover:border-blue-400'}`}
                  title="Anexar comprovante de agendamento (quando não há minuta de devolução) — exige data/hora preenchida"
                >
                  {uploadingTripDoc === `${t.id}:agend`
                    ? <><div className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>Enviando...</>
                    : <><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>{t.agendamentoAnexo ? 'Substituir Anexo' : 'Anexar Agendamento'}</>}
                  <input type="file" accept=".pdf,image/*" className="hidden" disabled={uploadingTripDoc === `${t.id}:agend`} onChange={e => { const f = e.target.files?.[0]; if (f) { handleTripAgendamentoUpload(t, f); e.target.value = ''; } }} />
                </label>
              </>
            )}
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
  ], [locations, handleToggleNF, handleToggleScheduled, handleLocationChange, handleDateTimeChange, handleCancelMinutaScheduling, handleToggleAdvance, handleRemoveFromOrg, isTripScheduled, categories, operationTypes, pendingUpdates, renderGateTag, renderVesselDates, mapTripToMinuta, activeView, handleToggleFreteMorto, handleToggleReutilizacao, tiposViagem, isColetaSemEmail, isMercosul, handleToggleColetaEmail, handleToggleColetaDoc, retiradaOptions, handleRetiradaCheioChange, handleRetiradaVazioChange, handleRetiradaDataChange, handleMarcarRetirada, handleTripAgendamentoUpload, handleReutComprovanteUpload, uploadingTripDoc, isEntregaConcluida, hasBaixaConfirmada, handleToggleCteEmitido, handleCteEmitidoUpload, handleRemoveCteEmitidoAnexo]);

  const handleDeleteDevolucao = useCallback((d: Devolucao) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Devolução',
      message: `Deseja excluir permanentemente a devolução do container ${d.container || d.os}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await db.deleteDevolucao(d.id);
        await loadDevolucoes();
        logAudit('DEVOLUCAO', 'EXCLUSAO', 'Devolução excluída', d.container || d.os, undefined, d.id);
        window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Devolução excluída', type: 'success' } }));
      }
    });
  }, [loadDevolucoes, logAudit]);

  const handleDeleteLiberacao = useCallback((l: Liberacao) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Liberação',
      message: `Deseja excluir permanentemente a liberação ${l.os}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await db.deleteLiberacao(l.id);
        await loadLiberacoes();
        logAudit('LIBERACAO', 'EXCLUSAO', 'Liberação excluída', l.booking || l.os, undefined, l.id);
        window.dispatchEvent(new CustomEvent('als_show_toast', { detail: { message: 'Liberação excluída', type: 'success' } }));
      }
    });
  }, [loadLiberacoes, logAudit]);

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
            {d.semAgendamento && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border bg-slate-100 text-slate-600 border-slate-300 w-fit" title="Terminal pré-stacking sem agendamento — comprovante não exigido">
                Sem agendamento (terminal)
              </span>
            )}
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
            {d.semAgendamento && !d.agendamentoDoc && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border bg-slate-100 text-slate-500 border-slate-300" title="Terminal sem agendamento — comprovante não exigido">
                Não exigido
              </span>
            )}
            <label className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[8px] font-black cursor-pointer transition-colors ${isUploading ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700'}`}>
              {isUploading
                ? <><div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"/><span>Enviando...</span></>
                : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg><span>{d.agendamentoDoc ? 'Substituir' : 'Anexar'}</span></>
              }
              <input type="file" accept=".pdf,image/*" className="hidden" disabled={isUploading} onChange={e => { const file = e.target.files?.[0]; if (file) { handleDevComprovanteUpload(d, file); e.target.value = ''; } }} />
            </label>
            <button
              onClick={() => handleToggleDevSemAgendamento(d)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[7px] font-black uppercase transition-colors ${d.semAgendamento ? 'bg-slate-200 border-slate-400 text-slate-700 hover:bg-slate-300' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-600'}`}
              title={d.semAgendamento ? 'Voltar a exigir agendamento/comprovante' : 'Marcar como terminal sem agendamento (não exige comprovante) — será pedida confirmação'}
            >
              {d.semAgendamento ? 'Sem agendamento ✓' : 'Terminal sem agend.?'}
            </button>
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
  ], [handleSaveDevAgendamento, handleDevComprovanteUpload, setDevMinutaDev, handleDeleteDevolucao, uploadingDevId, handleToggleDevSemAgendamento]);

  // Reutilizações: viagens de entrega/import marcadas como Reutilização, com o
  // comprovante anexado — visíveis na aba Devoluções/Reut
  const reutTrips = useMemo(
    () => propTrips.filter(t => t.status === 'Reutilização'),
    [propTrips]
  );

  const reutColumns = useMemo(() => [
    {
      key: 'container',
      label: 'Container / OS',
      sortable: true,
      sortValue: (t: Trip) => t.container || t.os,
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5 py-0.5">
          <span className="text-[10px] font-black text-slate-800 uppercase">{t.container || '---'}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">{t.os}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      sortable: true,
      sortValue: (t: Trip) => t.type || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-black text-slate-600 uppercase">{t.type || '---'}</span>
          {t.containerType && <span className="text-[8px] font-bold text-slate-400 uppercase">{t.containerType}</span>}
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Cliente',
      sortable: true,
      sortValue: (t: Trip) => t.customer?.name || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{t.customer?.name || '---'}</span>
          {t.customer?.city && <span className="text-[8px] font-bold text-slate-400 uppercase">{t.customer.city}{t.customer.state ? `/${t.customer.state}` : ''}</span>}
        </div>
      ),
    },
    {
      key: 'driver',
      label: 'Motorista',
      sortable: true,
      sortValue: (t: Trip) => t.driver?.name || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-slate-700 uppercase">{t.driver?.name || '---'}</span>
          <div className="flex items-center gap-1">
            {t.driver?.plateHorse && <span className="text-[8px] font-bold text-blue-600 uppercase">{t.driver.plateHorse}</span>}
            {t.driver?.plateTrailer && <span className="text-[8px] font-bold text-slate-400 uppercase">{t.driver.plateTrailer}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'dateTime',
      label: 'Data da Viagem',
      sortable: true,
      sortValue: (t: Trip) => t.dateTime || '',
      render: (t: Trip) => (
        <span className="text-[9px] font-bold text-slate-600">{formatDateTimePtBR(t.dateTime) || '---'}</span>
      ),
    },
    {
      key: 'reutComprovante',
      label: 'Comprovante Reutilização',
      sortable: false,
      render: (t: Trip) => {
        const isUploading = uploadingTripDoc === `${t.id}:reut`;
        return (
          <div className="flex flex-col gap-1 items-start">
            {t.reutilizacaoComprovante ? (
              <button
                onClick={() => setViewingDoc({ url: t.reutilizacaoComprovante!.url, fileName: t.reutilizacaoComprovante!.fileName })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[8px] font-black text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Visualizar
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border bg-orange-100 text-orange-700 border-orange-300">
                Sem comprovante
              </span>
            )}
            <label className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[8px] font-black cursor-pointer transition-colors ${isUploading ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'}`}>
              {isUploading
                ? <><div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/><span>Enviando...</span></>
                : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg><span>{t.reutilizacaoComprovante ? 'Substituir' : 'Anexar'}</span></>}
              <input type="file" accept=".pdf,image/*" className="hidden" disabled={isUploading} onChange={e => { const f = e.target.files?.[0]; if (f) { handleReutComprovanteUpload(t, f); e.target.value = ''; } }} />
            </label>
          </div>
        );
      },
    },
  ], [uploadingTripDoc, handleReutComprovanteUpload]);

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
      {(ocTrip || newOcOpen) && createPortal(
        <div className="fixed inset-0 z-[400] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="px-8 py-5 bg-blue-600 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Organização Operacional</p>
                <h2 className="font-black text-white text-sm uppercase tracking-widest">Ordem de Coleta</h2>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">{ocTrip ? `OS: ${ocTrip.os}` : 'Nova Programação'}</p>
              </div>
              <button
                onClick={() => { setOcTrip(null); setNewOcOpen(false); onRefresh(); }}
                className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <OrdemColetaForm
                drivers={drivers}
                customers={customers}
                ports={ports}
                onClose={() => { setOcTrip(null); setNewOcOpen(false); onRefresh(); }}
                initialData={ocTrip?.ocFormData}
                tripId={ocTrip?.id}
                osPdfUrl={ocTrip?.osPdfUrl}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {minutaTrip && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="px-8 py-5 bg-emerald-600 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Organização Operacional</p>
                <h2 className="font-black text-white text-sm uppercase tracking-widest">Minuta / Pré-Stacking</h2>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">OS: {minutaTrip.os}</p>
              </div>
              <button onClick={() => { setMinutaTrip(null); onRefresh(); }} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <PreStackingForm
                user={undefined}
                drivers={drivers}
                customers={customers}
                ports={ports}
                onClose={() => { setMinutaTrip(null); onRefresh(); }}
                initialFormData={minutaTrip.preStackingFormData || mapTripToMinuta(minutaTrip)}
              />
            </div>
          </div>
        </div>,
        document.body
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

      <div className={`flex flex-col gap-4 bg-white border border-slate-200 shadow-sm ${standalone ? 'p-4 rounded-2xl' : 'p-8 rounded-[3rem]'}`}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6 flex-wrap">
            {!standalone && (
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Organização Operacional</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Agendamentos e NF • Dados desde 06/03/2026</p>
              </div>
            )}

            <button
              onClick={() => setSettingsModal(true)}
              className="p-4 bg-white text-slate-600 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
              title="Configurações de tipos visíveis"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>

            <button
              onClick={openAudit}
              className="flex items-center gap-2 p-4 bg-white text-slate-600 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95"
              title="Auditoria de alterações"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
              <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Auditoria</span>
            </button>

            {new URLSearchParams(window.location.search).get('view') !== 'organizacao' && (
              <button
                onClick={() => window.open(`${window.location.origin}${window.location.pathname}?view=organizacao`, '_blank')}
                className="flex items-center gap-2 p-4 bg-white text-slate-600 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95"
                title="Abrir a tabela em tela cheia numa nova guia"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Tela Cheia</span>
              </button>
            )}

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
                Devoluções/Reut
              </button>
              <button
                onClick={() => setActiveView('LIBERAÇÕES')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'LIBERAÇÕES' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Liberações
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
          {activeView === 'COLETA' && (
            <button
              onClick={() => setNewOcOpen(true)}
              className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
              title="Gerar uma Ordem de Coleta de uma nova programação (em branco)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Fazer OC
            </button>
          )}

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
                    const isVisible = hiddenTripTypesColeta !== null ? !hiddenTripTypesColeta.includes(type) : isColetaViewType(type);
                    return (
                      <label key={type} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {
                            setHiddenTripTypesColeta(prev => {
                              const current = prev !== null ? prev : operationTypes.map((t: any) => t.name.toUpperCase()).filter((t: string) => !isColetaViewType(t));
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
                    const isVisible = hiddenTripTypesEntrega !== null ? !hiddenTripTypesEntrega.includes(type) : isEntregaViewType(type);
                    return (
                      <label key={type} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {
                            setHiddenTripTypesEntrega(prev => {
                              const current = prev !== null ? prev : operationTypes.map((t: any) => t.name.toUpperCase()).filter((t: string) => !isEntregaViewType(t));
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
              forceVisibleKeys={['retiradaVazio', 'cteEmitido']}
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
              forceVisibleKeys={['retiradaCheio', 'cteEmitido']}
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

            {/* Reutilizações — containers reutilizados (sem devolução de vazio) */}
            <div className="flex items-center gap-3 ml-4 pt-4 flex-wrap">
              <div className="w-2 h-8 bg-emerald-600 rounded-full"></div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Reutilizações</h3>
              <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full border border-emerald-200">{reutTrips.length}</span>
              {reutTrips.filter(t => !t.reutilizacaoComprovante).length > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 text-[8px] font-black rounded-full border border-orange-300">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {reutTrips.filter(t => !t.reutilizacaoComprovante).length} SEM COMPROVANTE
                </span>
              )}
            </div>
            {reutTrips.length > 0 ? (
              <SmartOperationTable
                userId={userId}
                componentId="org-reutilizacoes"
                columns={reutColumns}
                data={reutTrips}
                hideInternalSearch={false}
                noMaxHeight
                stickyHeaderTop={0}
                getRowStyle={(t: Trip) => {
                  if (!t.reutilizacaoComprovante) return { backgroundColor: '#fff7ed', boxShadow: 'inset 4px 0 0 #f97316' };
                  return { backgroundColor: '#ecfdf5', boxShadow: 'inset 4px 0 0 #059669' };
                }}
              />
            ) : (
              <p className="ml-4 text-[10px] text-slate-400 font-bold uppercase">
                Nenhuma reutilização — marque "Reutilização" na visão Entrega/Import para listar aqui.
              </p>
            )}
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

      {devMinutaDev && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="px-8 py-5 bg-amber-600 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Organização Operacional</p>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">Minuta de Devolução</h3>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">{devMinutaDev.container || devMinutaDev.os}</p>
              </div>
              <button onClick={() => setDevMinutaDev(null)} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
        </div>,
        document.body
      )}

      {devMinutaTrip && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="px-8 py-5 bg-amber-600 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Organização Operacional</p>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">Minuta de Devolução</h3>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">OS: {devMinutaTrip.os}</p>
              </div>
              <button onClick={() => { setDevMinutaTrip(null); loadDevolucoes(); onRefresh(); }} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <DevolucaoVazioForm
                drivers={drivers}
                customers={customers}
                ports={ports}
                preStackings={preStacking}
                onClose={() => { setDevMinutaTrip(null); loadDevolucoes(); onRefresh(); }}
                tripId={devMinutaTrip.id}
                tripOs={devMinutaTrip.os}
                onAgendamentoSave={(_, dateTime) => handleDateTimeChange(devMinutaTrip, dateTime)}
                initialFormData={{
                  date: localDateStr(),
                  driverId: devMinutaTrip.driver?.id || '',
                  remetenteId: devMinutaTrip.customer?.id || '',
                  destinatarioId: '',
                  container: devMinutaTrip.container || '',
                  booking: devMinutaTrip.booking || '',
                  ship: devMinutaTrip.ship || '',
                  agencia: devMinutaTrip.agencia || '',
                  pod: 'SANTOS',
                  qtdContainer: '01',
                  tipo: devMinutaTrip.containerType || '40HC',
                  padrao: 'CARGA GERAL',
                  obs: '',
                  manualLocal: '',
                  agendamentoDateTime: formatToLocalInput(devMinutaTrip.scheduledDateTime || devMinutaTrip.scheduling?.dateTime || ''),
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Gerar minuta de retirada (vazio → Liberação de Vazio; cheio → Retirada de Cheio) */}
      {retiradaGerar && createPortal(
        <div className="fixed inset-0 z-[9050] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="px-8 py-5 bg-slate-700 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Organização Operacional</p>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">{retiradaGerar.kind === 'liberacao' ? 'Liberação de Vazio' : 'Retirada de Cheio'}</h3>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">OS: {retiradaGerar.trip.os}</p>
              </div>
              <button onClick={() => setRetiradaGerar(null)} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {retiradaGerar.kind === 'liberacao' ? (
                <LiberacaoVazioForm
                  drivers={drivers}
                  customers={customers}
                  ports={ports}
                  preStackings={preStacking}
                  onClose={() => setRetiradaGerar(null)}
                  initialFormData={{
                    date: localDateStr(),
                    driverId: retiradaGerar.trip.driver?.id || '',
                    remetenteId: retiradaGerar.trip.customer?.id || '',
                    destinatarioId: retiradaGerar.trip.retiradaVazio?.id || '',
                    booking: retiradaGerar.trip.booking || '',
                    ship: retiradaGerar.trip.ship || '',
                    agencia: retiradaGerar.trip.agencia || '',
                    pod: 'SANTOS',
                    qtdContainer: '01',
                    tipo: retiradaGerar.trip.containerType || '40HC',
                    padrao: 'CARGA GERAL',
                    obs: '',
                    manualLocal: retiradaGerar.trip.retiradaVazio?.name || '',
                  }}
                />
              ) : (
                <RetiradaCheioForm
                  drivers={drivers}
                  customers={customers}
                  ports={ports}
                  onClose={() => setRetiradaGerar(null)}
                  initialFormData={{
                    date: localDateStr(),
                    displayDate: new Date().toLocaleDateString('pt-BR'),
                    driverId: retiradaGerar.trip.driver?.id || '',
                    clienteId: retiradaGerar.trip.customer?.id || '',
                    terminalId: retiradaGerar.trip.retiradaCheio?.id || '',
                    container: retiradaGerar.trip.container || '',
                    tipo: retiradaGerar.trip.containerType || '40HC',
                    ship: retiradaGerar.trip.ship || '',
                    agencia: retiradaGerar.trip.agencia || '',
                    pod: 'SANTOS',
                    booking: retiradaGerar.trip.booking || '',
                    obs: '',
                    manualTerminal: retiradaGerar.trip.retiradaCheio?.name || '',
                  }}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {libMinuta && createPortal(
        <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">
            <div className="px-8 py-5 bg-slate-700 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Organização Operacional</p>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">Liberação de Vazio</h3>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">{libMinuta.os}</p>
              </div>
              <button onClick={() => setLibMinuta(null)} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
        </div>,
        document.body
      )}

      {/* Modal de Auditoria */}
      {isAuditOpen && createPortal(
        <div className="fixed inset-0 z-[9100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Organização Operacional</p>
                <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest">Auditoria de Alterações</h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Registro de cada ação por usuário</p>
              </div>
              <button onClick={() => setIsAuditOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 rounded-full transition-all shadow-sm active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            {/* Filtros */}
            <div className="px-8 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap shrink-0">
              <input
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="BUSCAR POR OS, CONTAINER, USUÁRIO..."
                className="flex-1 min-w-[200px] px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 text-[10px] font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
              />
              <div className="flex gap-1.5 flex-wrap">
                {['', 'COLETA', 'ENTREGA', 'DEVOLUCAO', 'LIBERACAO'].map(area => (
                  <button
                    key={area || 'todas'}
                    onClick={() => setAuditAreaFilter(area)}
                    className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${auditAreaFilter === area ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'}`}
                  >
                    {area || 'Todas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (() => {
                const term = auditSearch.trim().toUpperCase();
                const filtered = auditEntries.filter(e => {
                  if (auditAreaFilter && e.area !== auditAreaFilter) return false;
                  if (!term) return true;
                  return [e.entityLabel, e.userName, e.description, e.action].some(v => (v || '').toUpperCase().includes(term));
                });
                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum registro encontrado</p>
                    </div>
                  );
                }
                const areaColors: Record<string, string> = {
                  COLETA: 'bg-blue-50 text-blue-700 border-blue-200',
                  ENTREGA: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  DEVOLUCAO: 'bg-amber-50 text-amber-700 border-amber-200',
                  LIBERACAO: 'bg-slate-100 text-slate-700 border-slate-300',
                };
                return (
                  <div className="divide-y divide-slate-50">
                    {filtered.map(entry => (
                      <div key={entry.id} className="px-8 py-4 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border ${areaColors[entry.area] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {entry.area}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{entry.action}</span>
                              {entry.entityLabel && (
                                <span className="text-[10px] font-black text-slate-800 uppercase">{entry.entityLabel}</span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-slate-600 mt-1">{entry.description}</p>
                            {entry.changes && entry.changes.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {entry.changes.map((c, i) => (
                                  <div key={i} className="flex items-center gap-2 text-[9px] font-bold">
                                    <span className="text-slate-400 uppercase tracking-wider shrink-0">{c.field}:</span>
                                    <span className="text-red-400 line-through truncate max-w-[180px]">{c.from || '—'}</span>
                                    <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                                    <span className="text-emerald-600 truncate max-w-[180px]">{c.to || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1.5 justify-end">
                              <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                              </div>
                              <span className="text-[9px] font-black text-slate-700 uppercase">{entry.userName}</span>
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 mt-1">{formatDateTimePtBR(entry.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
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

      {/* Modal de Envio de E-mail da Coleta */}
      {emailSendModal.isOpen && emailSendModal.trip && activeColetaTemplate && activeColetaTemplate.id ? (
        <EmailGeneratorModal
          isOpen={emailSendModal.isOpen}
          onClose={() => setEmailSendModal({ isOpen: false })}
          template={activeColetaTemplate}
          trips={propTrips}
          initialTrip={emailSendModal.trip}
        />
      ) : emailSendModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-800 mb-2">Nenhum Modelo Encontrado</h3>
            <p className="text-sm text-slate-600 mb-6">Crie um modelo de e-mail na aba Administrativo &gt; Modelos de E-mail para utilizar esta função.</p>
            <div className="flex justify-end">
              <button onClick={() => setEmailSendModal({ isOpen: false })} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Emissões de CT-e (anexar/visualizar CT-e e NF) */}
      {cteAttachTripId && (() => {
        const attachTrip = trips.find(t => t.id === cteAttachTripId);
        if (!attachTrip) return null;
        return (
          <CteAttachmentsModal
            trip={attachTrip}
            onClose={() => setCteAttachTripId(null)}
            onUpdate={handleCteAttachmentsUpdate}
          />
        );
      })()}

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
