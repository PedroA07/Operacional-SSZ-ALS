import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Trip, ColetaTipoViagemOption, EmailTemplate, ColetaOpConfig, ColetaDocOriginarioRule } from '../../types';
import { db } from '../../utils/storage';
import SmartOperationTable from './operations/SmartOperationTable';
import FeedbackModal from '../shared/FeedbackModal';
import { Mail, Settings, Send, X, Copy } from 'lucide-react';
import EmailGeneratorModal from './email/EmailGeneratorModal';
import CustomSelect from '../shared/CustomSelect';

interface ColetaDoDiaTabProps {
  userId: string;
  trips: Trip[];
  emailTemplates: EmailTemplate[];
  onRefresh: () => Promise<void>;
}

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

const ColetaDoDiaTab: React.FC<ColetaDoDiaTabProps> = ({ userId, trips: propTrips, emailTemplates: propTemplates, onRefresh }) => {
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { data: Partial<Trip>, timestamp: number }>>({});
  const [finalizingIds, setFinalizingIds] = useState<Set<string>>(new Set());
  const [tiposViagem, setTiposViagem] = useState<ColetaTipoViagemOption[]>([]);
  const [defaultTipoViagemId, setDefaultTipoViagemId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  const [settingsModal, setSettingsModal] = useState(false);
  const [emailSendModal, setEmailSendModal] = useState<{ isOpen: boolean; trip?: Trip }>({ isOpen: false });
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(propTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [hiddenTripTypes, setHiddenTripTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('coletaHiddenTripTypes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [copied, setCopied] = useState(false);
  const [activeOpTab, setActiveOpTab] = useState<string>('TODOS');
  const [allCustomers, setAllCustomers] = useState<{ id: string; name: string }[]>([]);
  // coletaOpConfig: keyed by op type id
  const [coletaOpConfig, setColetaOpConfig] = useState<Record<string, ColetaOpConfig>>({});
  // settings panel expanded op type
  const [settingsExpandedOp, setSettingsExpandedOp] = useState<string | null>(null);

  const STABILITY_DURATION = 30000;

  useEffect(() => {
    setEmailTemplates(propTemplates);
  }, [propTemplates]);

  useEffect(() => {
    const loadTipos = async () => {
      const [tipos, cats, opTypes, custs] = await Promise.all([
        db.getColetaTiposViagem(),
        db.getCategories(),
        db.getOperationTypes(),
        db.getCustomers(),
      ]);
      setTiposViagem(tipos);
      setCategories(cats);
      setOperationTypes(opTypes);
      setAllCustomers((custs as any[]).map(c => ({ id: c.id, name: c.name })));
      // Extrai config.coleta de cada tipo de operação
      const cfg: Record<string, ColetaOpConfig> = {};
      (opTypes as any[]).forEach(ot => {
        if (ot.config?.coleta) cfg[ot.id] = ot.config.coleta;
      });
      setColetaOpConfig(cfg);
      
      const templates = propTemplates;
      const savedTemplateId = localStorage.getItem('coletaDefaultTemplateId');
      if (savedTemplateId && templates.some(t => t.id === savedTemplateId)) {
        setSelectedTemplateId(savedTemplateId);
      } else {
        const coletaTemplate = templates.find(t => t.name === 'Modelo Coleta' || t.config?.isColetaDefault);
        if (coletaTemplate) {
          setSelectedTemplateId(coletaTemplate.id);
        }
      }
    };
    loadTipos();
    
    const savedDefault = localStorage.getItem('defaultColetaTipoViagem');
    if (savedDefault) setDefaultTipoViagemId(savedDefault);
  }, [propTemplates]);

  useEffect(() => {
    const toRemove: string[] = [];
    Object.entries(pendingUpdates).forEach(([id, pending]) => {
      const serverTrip = propTrips.find(t => t.id === id);
      if (serverTrip) {
        const matches = Object.entries(pending.data).every(([key, value]) => {
          const serverValue = serverTrip[key as keyof Trip];
          return serverValue === value;
        });
        if (matches) toRemove.push(id);
      }
    });

    if (toRemove.length > 0) {
      setPendingUpdates(prev => {
        const next = { ...prev };
        toRemove.forEach(id => delete next[id]);
        return next;
      });
    }
  }, [propTrips, pendingUpdates]);

  const trips = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return propTrips
      .filter(trip => !finalizingIds.has(trip.id))
      .filter(trip => !trip.coletaEmissaoSolicitada && !trip.isRemovedFromColeta)
      .filter(trip => !hiddenTripTypes.includes(trip.type?.toUpperCase() || ''))
      .filter(trip => activeOpTab === 'TODOS' || trip.type?.toUpperCase() === activeOpTab)
      .filter(trip => {
        const dt = trip.dateTime;
        if (!dt) return true;
        const raw = dt.includes('T') ? dt.split('T')[0] : dt.split(' ')[0];
        const normalized = raw.includes('/') ? raw.split('/').reverse().join('-') : raw;
        return normalized >= '2026-04-01';
      })
      .map(serverTrip => {
        const pending = pendingUpdates[serverTrip.id];
        if (pending && (now - pending.timestamp) < STABILITY_DURATION) {
          return { ...serverTrip, ...pending.data };
        }
        return serverTrip;
      })
      .sort((a, b) => {
        // NF enviada → topo (pronto para coleta)
        const aNF = !!a.sentNF;
        const bNF = !!b.sentNF;
        if (aNF !== bNF) return aNF ? -1 : 1;
        const dateA = new Date(a.dateTime || 0).getTime();
        const dateB = new Date(b.dateTime || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.driver.name || '').localeCompare(b.driver.name || '');
      });
  }, [propTrips, pendingUpdates, finalizingIds, hiddenTripTypes]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPendingUpdates(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (now - next[id].timestamp > 30000) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Trips sem filtro de aba (para contar por tipo nas abas)
  const allFilteredTrips = useMemo(() => {
    const now = Date.now();
    return propTrips
      .filter(trip => !finalizingIds.has(trip.id))
      .filter(trip => !trip.coletaEmissaoSolicitada && !trip.isRemovedFromColeta)
      .filter(trip => !hiddenTripTypes.includes(trip.type?.toUpperCase() || ''))
      .filter(trip => {
        const dt = trip.dateTime;
        if (!dt) return true;
        const raw = dt.includes('T') ? dt.split('T')[0] : dt.split(' ')[0];
        const normalized = raw.includes('/') ? raw.split('/').reverse().join('-') : raw;
        return normalized >= '2026-04-01';
      })
      .map(serverTrip => {
        const pending = pendingUpdates[serverTrip.id];
        if (pending && (now - pending.timestamp) < STABILITY_DURATION) return { ...serverTrip, ...pending.data };
        return serverTrip;
      });
  }, [propTrips, pendingUpdates, finalizingIds, hiddenTripTypes]);

  const handleUpdateTrip = useCallback(async (trip: Trip, data: Partial<Trip>) => {
    const now = Date.now();
    
    // Se está atualizando algo e o tipo de viagem não está definido, salva o padrão junto
    const updateData = { ...data };
    if (!trip.coletaTipoViagem && !data.hasOwnProperty('coletaTipoViagem') && defaultTipoViagemId) {
      updateData.coletaTipoViagem = defaultTipoViagemId;
    }

    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { 
        data: { ...(prev[trip.id]?.data || {}), ...updateData }, 
        timestamp: now 
      }
    }));

    try {
      await db.saveTrip({ ...trip, ...updateData });
    } catch (error) {
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[trip.id];
        return next;
      });
      console.error("Erro ao atualizar viagem:", error);
      window.dispatchEvent(new CustomEvent('als_show_toast', { 
        detail: { message: 'Erro ao salvar alterações', type: 'error' } 
      }));
    }
  }, [defaultTipoViagemId]);

  const removePunctuation = (str?: string) => str ? str.replace(/[^\w\s]/gi, '') : '---';

  const handleSaveSettings = async () => {
    localStorage.setItem('coletaDefaultTemplateId', selectedTemplateId);
    localStorage.setItem('coletaHiddenTripTypes', JSON.stringify(hiddenTripTypes));
    // Salva config.coleta em cada tipo de operação
    for (const ot of operationTypes) {
      if (coletaOpConfig[ot.id] !== undefined) {
        await db.saveOperationType({
          ...ot,
          config: { ...(ot.config || {}), coleta: coletaOpConfig[ot.id] }
        });
      }
    }
    setSettingsModal(false);
    window.dispatchEvent(new CustomEvent('als_show_toast', {
      detail: { message: 'Configurações salvas!', type: 'success' }
    }));
  };

  const activeTemplate = useMemo(() => {
    return emailTemplates.find(t => t.id === selectedTemplateId) || emailTemplates[0] || { subject: '', body: '' };
  }, [emailTemplates, selectedTemplateId]);

  const replacePlaceholders = (text: string, trip: Trip) => {
    if (!text) return '';
    return text
      .replace(/{os}/g, trip.os || '')
      .replace(/{booking}/g, trip.booking || '')
      .replace(/{ship}/g, trip.ship || '')
      .replace(/{container}/g, trip.container || '')
      .replace(/{tara}/g, trip.tara || '')
      .replace(/{seal}/g, trip.seal || '')
      .replace(/{bu}/g, trip.bu || 'SSZ')
      .replace(/{driver_name}/g, trip.driver.name || '')
      .replace(/{driver_cpf}/g, trip.driver.cpf || '')
      .replace(/{plate_horse}/g, trip.driver.plateHorse || '')
      .replace(/{plate_trailer}/g, trip.driver.plateTrailer || '')
      .replace(/{customer_name}/g, trip.customer.name || '')
      .replace(/{customer_city}/g, trip.customer.city || '')
      .replace(/{customer_cnpj}/g, trip.customer.cnpj || '');
  };

  const columns = useMemo(() => [
    { 
      key: 'coletaTipoViagem', 
      label: 'Tipo de Viagem', 
      sortable: false,
      render: (t: Trip) => {
        const selectedValue = t.coletaTipoViagem || defaultTipoViagemId || '';
        const selectedColor = tiposViagem.find(tv => tv.id === selectedValue)?.color || 'inherit';
        
        return (
          <CustomSelect
            value={selectedValue}
            onChange={(v) => handleUpdateTrip(t, { coletaTipoViagem: v })}
            placeholder="Selecione..."
            options={tiposViagem.map(tv => ({ value: tv.id, label: tv.name, color: tv.color }))}
            inputClassName="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:border-blue-500 transition-all"
          />
        );
      }
    },
    {
      key: 'coletaEmailSent',
      label: 'E-mail',
      sortable: false,
      render: (t: Trip) => (
        <div className="flex items-center justify-center">
          <ToggleIconBtn
            checked={!!t.coletaEmailSent}
            onClick={() => {
              const checked = !t.coletaEmailSent;
              const updateData: Partial<Trip> = { coletaEmailSent: checked };
              if (checked) updateData.sentNF = true;
              handleUpdateTrip(t, updateData);
            }}
            loading={'coletaEmailSent' in (pendingUpdates[t.id]?.data || {})}
            activeClass="bg-blue-50 border-blue-400 text-blue-600"
            inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-blue-300 hover:text-blue-400"
            badgeColor="bg-blue-500"
            title={t.coletaEmailSent ? 'E-mail enviado — clique para desmarcar' : 'Marcar e-mail como enviado'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </ToggleIconBtn>
        </div>
      )
    },
    {
      key: 'coletaDocGenerated',
      label: 'Doc Originário',
      sortable: false,
      render: (t: Trip) => (
        <div className="flex items-center justify-center">
          <ToggleIconBtn
            checked={!!t.coletaDocGenerated}
            onClick={() => handleUpdateTrip(t, { coletaDocGenerated: !t.coletaDocGenerated })}
            loading={'coletaDocGenerated' in (pendingUpdates[t.id]?.data || {})}
            activeClass="bg-emerald-50 border-emerald-400 text-emerald-600"
            inactiveClass="bg-white border-slate-200 text-slate-300 hover:border-emerald-300 hover:text-emerald-400"
            badgeColor="bg-emerald-500"
            title={t.coletaDocGenerated ? 'Doc. originário gerado — clique para desmarcar' : 'Marcar doc. originário como gerado'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </ToggleIconBtn>
        </div>
      )
    },
    { 
      key: 'dateTime', 
      label: 'Data/Hora', 
      render: (t: Trip) => {
        const dt = t.dateTime;
        if (!dt) return <span className="text-[9px] text-slate-400">---</span>;
        try {
          const d = new Date(dt);
          if (isNaN(d.getTime())) return <span className="text-[9px] text-slate-400">{dt}</span>;
          
          const extenso = new Intl.DateTimeFormat('pt-BR', { 
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }).format(d);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tripDate = new Date(d);
          tripDate.setHours(0, 0, 0, 0);

          let colorClass = 'text-slate-700 bg-slate-100 border-slate-200';
          if (tripDate < today) {
            colorClass = 'text-red-700 bg-red-100 border-red-300';
          } else if (tripDate > today) {
            colorClass = 'text-blue-700 bg-blue-100 border-blue-300';
          }

          return (
            <div className={`px-2 py-1 rounded-md border font-black text-[10px] text-center ${colorClass}`}>
              {extenso}
            </div>
          );
        } catch {
          return <span className="text-[9px] text-slate-400">{dt}</span>;
        }
      }
    },
    {
      key: 'os',
      label: 'OS / E-mail',
      sortValue: (t: Trip) => t.os,
      render: (t: Trip) => {
        const catColor = categories.find((c: any) => c.name?.toUpperCase() === t.category?.toUpperCase())?.color;
        const typeColor = operationTypes.find(ot => ot.name?.toUpperCase() === t.type?.toUpperCase())?.color;
        const nfReady = !!t.sentNF && !t.coletaEmailSent && !t.coletaDocGenerated;
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                {nfReady && (
                  <span className="relative flex h-2.5 w-2.5 shrink-0" title="NF enviada — pronto para coleta">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                )}
                <span className={`font-black text-[10px] ${nfReady ? 'text-emerald-700' : 'text-slate-900'}`}>{t.os}</span>
              </div>
              {nfReady && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-[7px] font-black text-emerald-700 uppercase tracking-tight w-fit">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Pronto p/ Coleta
                </span>
              )}
              <div className="flex flex-wrap gap-1">
                <span
                  className="text-[7px] px-1.5 py-0.5 rounded font-black border w-fit uppercase"
                  style={catColor ? { backgroundColor: `${catColor}25`, color: catColor, borderColor: `${catColor}60` } : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}
                >
                  {t.category || '---'}
                </span>
                {t.type && (
                  <span
                    className="text-[7px] px-1.5 py-0.5 rounded font-black border w-fit uppercase"
                    style={typeColor ? { backgroundColor: `${typeColor}25`, color: typeColor, borderColor: `${typeColor}60` } : { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' }}
                  >
                    {t.type}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setEmailSendModal({ isOpen: true, trip: t })}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
              title="Enviar E-mail"
            >
              <Mail className="w-4 h-4" />
            </button>
          </div>
        );
      }
    },
    { 
      key: 'bookingNavioBU', 
      label: 'Booking / Navio / BU', 
      sortValue: (t: Trip) => t.booking || t.ship || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-slate-900 text-[10px]">{t.booking || '---'}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold text-slate-500 uppercase">{t.ship || '---'}</span>
            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1 rounded">SSZ</span>
          </div>
        </div>
      )
    },
    { 
      key: 'containerTaraLacre', 
      label: 'Container / Tara / Lacre', 
      sortValue: (t: Trip) => t.container || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-slate-900 text-[10px]">{t.container || '---'}</span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold text-slate-500">T: {t.tara || '---'}</span>
            <span className="text-[8px] font-bold text-emerald-600">L: {t.seal || '---'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'driverInfo',
      label: 'Motorista / Veículo',
      sortValue: (t: Trip) => t.driver?.name || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-slate-900 text-[10px] uppercase">{t.driver.name || '---'}</span>
            {t.sentNF && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-[7px] font-black text-emerald-700 uppercase tracking-tight shrink-0"
                title="Motorista enviou a nota fiscal"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                NF
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[8px] font-medium text-slate-500">{removePunctuation(t.driver.cpf)}</span>
            <span className="text-[8px] font-black text-slate-700 bg-slate-100 px-1 rounded">{removePunctuation(t.driver.plateHorse)}</span>
            <span className="text-[8px] font-black text-slate-700 bg-slate-100 px-1 rounded">{removePunctuation(t.driver.plateTrailer)}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'customerInfo', 
      label: 'Local Atendimento / Cidade', 
      sortValue: (t: Trip) => t.customer?.name || '',
      render: (t: Trip) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-slate-900 text-[10px] uppercase whitespace-normal break-words" title={t.customer.name}>
            {t.customer.legalName ? `${t.customer.legalName} (${t.customer.name})` : t.customer.name || '---'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-medium text-slate-400">{t.customer.cnpj || '---'}</span>
            <span className="text-[8px] font-black text-slate-600 uppercase">{t.customer.city || '---'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (t: Trip) => (
        <button
          onClick={() => {
            if (window.confirm('Deseja remover esta viagem do painel de Coleta do Dia?')) {
              handleUpdateTrip(t, { isRemovedFromColeta: true });
            }
          }}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Remover do painel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )
    }
  ], [tiposViagem, handleUpdateTrip, pendingUpdates, categories, operationTypes]);

  const handleEmissaoSolicitada = () => {
    const readyTrips = trips.filter(t => t.coletaEmailSent && t.coletaDocGenerated);

    if (readyTrips.length === 0) {
      alert("Nenhuma viagem está pronta para emissão. Certifique-se de que 'E-mail' e 'Doc Originário' estão marcados.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Solicitar Emissão?",
      message: `Você está prestes a solicitar a emissão de ${readyTrips.length} viagens. Elas serão removidas deste painel. Deseja continuar?`,
      onConfirm: async () => {
        setIsFinalizing(true);
        const finalizingIdsArray = readyTrips.map(t => t.id);
        
        setFinalizingIds(prev => {
          const next = new Set(prev);
          finalizingIdsArray.forEach(id => next.add(id));
          return next;
        });
        
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        try {
          const promises = readyTrips.map(trip => db.saveTrip({ 
            ...trip, 
            coletaEmissaoSolicitada: true
          }));
          await Promise.all(promises);
          onRefresh();
        } catch (error) {
          setFinalizingIds(prev => {
            const next = new Set(prev);
            finalizingIdsArray.forEach(id => next.delete(id));
            return next;
          });
          console.error("Erro ao solicitar emissão:", error);
          alert("Erro inesperado ao solicitar emissão.");
        } finally {
          setIsFinalizing(false);
        }
      }
    });
  };

  const getDocOriginarioText = (t: Trip): string => {
    const opType = operationTypes.find(ot => ot.name.toUpperCase() === t.type?.toUpperCase());
    if (!opType) return `Doc. originário gerado, gentileza seguir com a emissão do CT-e:\n${t.os}`;
    const cfg = coletaOpConfig[opType.id];
    // Verifica regra por cliente
    const clientRule = cfg?.docOriginarioByCustomer?.find(r => r.customerId === t.customer?.id);
    const baseText = clientRule?.text || cfg?.docOriginarioText ||
      'Doc. originário gerado, gentileza seguir com a emissão do CT-e:\n{os}';
    return baseText.replace(/\{os\}/g, t.os).replace(/\{booking\}/g, t.booking || '').replace(/\{container\}/g, t.container || '').replace(/\{ship\}/g, t.ship || '');
  };

  const handleCopyDocOriginario = () => {
    const docTrips = trips.filter(t => t.coletaDocGenerated);
    if (docTrips.length === 0) {
      window.dispatchEvent(new CustomEvent('als_show_toast', {
        detail: { message: 'Nenhuma OS com Doc. Originário marcado.', type: 'error' }
      }));
      return;
    }
    // Agrupa por tipo de operação para usar texto correto
    const lines = docTrips.map(t => getDocOriginarioText(t));
    const text = [...new Set(lines)].length === 1
      ? lines[0]
      : docTrips.map(t => `[${t.type || ''}] ${getDocOriginarioText(t)}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.dispatchEvent(new CustomEvent('als_show_toast', {
        detail: { message: `${docTrips.length} OS(s) copiadas!`, type: 'success' }
      }));
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const getRowClassName = (t: Trip) => {
    let classes = 'transition-all duration-300 ';
    if (t.coletaDocGenerated) classes += 'line-through opacity-60 ';
    return classes;
  };

  const getRowStyle = (t: Trip) => {
    const typeId = t.coletaTipoViagem || defaultTipoViagemId;
    const type = tiposViagem.find(tv => tv.id === typeId);
    const typeColor = type?.color || '#cbd5e1';

    const hexToRgba = (hex: string, alpha: number) => {
      try {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } catch (e) { return hex; }
    };

    const style: React.CSSProperties = {
      borderLeftWidth: '6px',
      borderLeftStyle: 'solid',
      borderLeftColor: typeColor,
    };

    if (t.coletaDocGenerated) {
      style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
      style.borderLeftStyle = 'dashed';
    } else if (t.coletaEmailSent) {
      style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
    } else if (t.sentNF) {
      // NF confirmada — pronta para coleta: destaque emerald com borda pulsante
      style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
      style.borderLeftColor = '#10b981';
      style.borderLeftWidth = '6px';
      style.outline = '1.5px solid rgba(16, 185, 129, 0.35)';
      style.outlineOffset = '-1px';
    } else {
      style.backgroundColor = hexToRgba(typeColor, 0.08);
    }

    return style;
  };

  const toggleTripType = (type: string) => {
    setHiddenTripTypes(prev => {
      const next = prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type];
      
      // Salva automaticamente
      localStorage.setItem('coletaHiddenTripTypes', JSON.stringify(next));
      return next;
    });
  };

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
        <div className="flex items-center gap-4 flex-wrap">
          <button 
            onClick={() => setSettingsModal(true)}
            className="p-4 bg-white text-slate-600 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            title="Configurações da Coleta do Dia"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div></div>

          <button
            onClick={handleCopyDocOriginario}
            disabled={trips.filter(t => t.coletaDocGenerated).length === 0}
            className={`px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2 border ${copied ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50'}`}
            title="Copiar OS com Doc. Originário marcado para WhatsApp"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar Doc. Orig. ({trips.filter(t => t.coletaDocGenerated).length})
              </>
            )}
          </button>

          <button
            onClick={handleEmissaoSolicitada}
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
              Emissão Solicitada ({trips.filter(t => t.coletaEmailSent && t.coletaDocGenerated).length})
            </>
          )}
        </button>
      </div>
    </div>

      {/* Abas por tipo de operação */}
      {operationTypes.filter(ot => !hiddenTripTypes.includes(ot.name.toUpperCase())).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {/* Aba "Todos" */}
          <button
            onClick={() => setActiveOpTab('TODOS')}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
              activeOpTab === 'TODOS'
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
            }`}
          >
            Todos
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${activeOpTab === 'TODOS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {allFilteredTrips.length}
            </span>
          </button>

          {operationTypes
            .filter(ot => !hiddenTripTypes.includes(ot.name.toUpperCase()))
            .map(ot => {
              const typeName = ot.name.toUpperCase();
              const count = allFilteredTrips.filter(t => t.type?.toUpperCase() === typeName).length;
              const isActive = activeOpTab === typeName;
              return (
                <button
                  key={typeName}
                  onClick={() => setActiveOpTab(typeName)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                    isActive ? 'text-white shadow-lg' : 'bg-white border-slate-200 hover:border-slate-400'
                  }`}
                  style={isActive
                    ? { backgroundColor: ot.color || '#1e293b', borderColor: ot.color || '#1e293b', color: '#fff' }
                    : { color: ot.color || '#475569' }
                  }
                >
                  {typeName}
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      <div className="animate-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <SmartOperationTable
            userId={userId}
            componentId="coleta-dia-table"
            columns={columns}
            data={trips}
            hideInternalSearch={false}
            getRowClassName={getRowClassName}
            getRowStyle={getRowStyle}
          />
        </div>
      </div>

      {/* Modal de Configurações */}
      {settingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Configurações da Coleta</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Personalize sua visualização e e-mails</p>
              </div>
              <button onClick={() => setSettingsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Seleção de Template de E-mail */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">Modelo de E-mail</h4>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o Modelo Padrão</label>
                  <CustomSelect
                    value={selectedTemplateId}
                    onChange={v => setSelectedTemplateId(v)}
                    placeholder="Selecione um modelo..."
                    options={emailTemplates.map(t => ({ value: t.id, label: t.name }))}
                    inputClassName="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[9px] font-medium text-slate-400 ml-1">
                    Crie ou edite modelos na aba "Administrativo &gt; Modelos de E-mail".
                  </p>
                </div>
              </div>

              {/* Abas visíveis */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">Abas Visíveis</h4>
                <p className="text-[10px] font-medium text-slate-400">Selecione quais tipos aparecem como aba no painel:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {operationTypes.map((ot: any) => {
                    const type = ot.name.toUpperCase();
                    return (
                      <label key={type} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input type="checkbox" checked={!hiddenTripTypes.includes(type)} onChange={() => toggleTripType(type)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: ot.color || '#475569' }}>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Configuração por tipo de operação */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">Configuração por Tipo de Operação</h4>
                {operationTypes.map((ot: any) => {
                  const typeCfg: ColetaOpConfig = coletaOpConfig[ot.id] || {};
                  const isExpanded = settingsExpandedOp === ot.id;
                  const updateTypeCfg = (patch: Partial<ColetaOpConfig>) => {
                    setColetaOpConfig(prev => ({ ...prev, [ot.id]: { ...typeCfg, ...patch } }));
                  };

                  return (
                    <div key={ot.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSettingsExpandedOp(isExpanded ? null : ot.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'bg-white hover:bg-slate-50'}`}
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ot.color || '#94a3b8' }} />
                        <span className="flex-1 text-[11px] font-black text-slate-700 uppercase">{ot.name}</span>
                        {typeCfg.emailRequired && <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">E-mail obrig.</span>}
                        {typeCfg.docOriginarioText && <span className="text-[8px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">Doc. custom.</span>}
                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                      </button>

                      {isExpanded && (
                        <div className="p-4 space-y-4 bg-white">
                          {/* Toggle e-mail obrigatório */}
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div onClick={() => updateTypeCfg({ emailRequired: !typeCfg.emailRequired })}
                              className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${typeCfg.emailRequired ? 'bg-blue-600' : 'bg-slate-200'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${typeCfg.emailRequired ? 'left-5' : 'left-0.5'}`} />
                            </div>
                            <span className="text-[11px] font-black text-slate-600 uppercase">Requer envio de e-mail</span>
                          </label>

                          {/* Texto padrão doc originário */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                              Texto do Doc. Originário <span className="font-normal">— variáveis: {'{os}'}, {'{booking}'}, {'{container}'}, {'{ship}'}</span>
                            </label>
                            <textarea
                              rows={3}
                              value={typeCfg.docOriginarioText || ''}
                              onChange={e => updateTypeCfg({ docOriginarioText: e.target.value })}
                              placeholder={`Ex: Solicito emissão CT-e ref. OS {os}, booking {booking}.`}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-medium text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                          </div>

                          {/* Textos por cliente */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Texto por Cliente (exceções)</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const rules = typeCfg.docOriginarioByCustomer || [];
                                  updateTypeCfg({ docOriginarioByCustomer: [...rules, { customerId: '', customerName: '', text: '' }] });
                                }}
                                className="text-[9px] font-black text-blue-600 uppercase hover:text-blue-700 flex items-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                                Adicionar
                              </button>
                            </div>
                            {(typeCfg.docOriginarioByCustomer || []).map((rule: ColetaDocOriginarioRule, rIdx: number) => (
                              <div key={rIdx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <select
                                  value={rule.customerId}
                                  onChange={e => {
                                    const cust = allCustomers.find(c => c.id === e.target.value);
                                    const rules = [...(typeCfg.docOriginarioByCustomer || [])];
                                    rules[rIdx] = { ...rule, customerId: e.target.value, customerName: cust?.name || '' };
                                    updateTypeCfg({ docOriginarioByCustomer: rules });
                                  }}
                                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                >
                                  <option value="">Selecionar cliente...</option>
                                  {allCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <textarea
                                  rows={2}
                                  value={rule.text}
                                  onChange={e => {
                                    const rules = [...(typeCfg.docOriginarioByCustomer || [])];
                                    rules[rIdx] = { ...rule, text: e.target.value };
                                    updateTypeCfg({ docOriginarioByCustomer: rules });
                                  }}
                                  placeholder={`Texto para ${rule.customerName || 'este cliente'}...`}
                                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const rules = [...(typeCfg.docOriginarioByCustomer || [])];
                                    rules.splice(rIdx, 1);
                                    updateTypeCfg({ docOriginarioByCustomer: rules });
                                  }}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button onClick={() => setSettingsModal(false)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Cancelar</button>
              <button onClick={handleSaveSettings} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Salvar Configurações</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Envio de E-mail */}
      {emailSendModal.isOpen && emailSendModal.trip && activeTemplate && (activeTemplate as EmailTemplate).id ? (
        <EmailGeneratorModal
          isOpen={emailSendModal.isOpen}
          onClose={() => setEmailSendModal({ isOpen: false })}
          template={activeTemplate as EmailTemplate}
          trips={propTrips}
          initialTrip={emailSendModal.trip}
        />
      ) : emailSendModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-800 mb-2">Nenhum Modelo Encontrado</h3>
            <p className="text-sm text-slate-600 mb-6">Crie um modelo de e-mail na aba Administrativo &gt; Modelos de E-mail para utilizar esta função.</p>
            <div className="flex justify-end">
              <button onClick={() => setEmailSendModal({ isOpen: false })} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColetaDoDiaTab;
