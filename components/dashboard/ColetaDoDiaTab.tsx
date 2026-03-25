import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Trip, ColetaTipoViagemOption, EmailTemplate } from '../../types';
import { db } from '../../utils/storage';
import SmartOperationTable from './operations/SmartOperationTable';
import FeedbackModal from '../shared/FeedbackModal';
import { Mail, Settings, Send, X, Copy } from 'lucide-react';
import EmailGeneratorModal from './email/EmailGeneratorModal';

interface ColetaDoDiaTabProps {
  userId: string;
  trips: Trip[];
  emailTemplates: EmailTemplate[];
  onRefresh: () => Promise<void>;
}

const ColetaDoDiaTab: React.FC<ColetaDoDiaTabProps> = ({ userId, trips: propTrips, emailTemplates: propTemplates, onRefresh }) => {
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { data: Partial<Trip>, timestamp: number }>>({});
  const [finalizingIds, setFinalizingIds] = useState<Set<string>>(new Set());
  const [tiposViagem, setTiposViagem] = useState<ColetaTipoViagemOption[]>([]);
  const [defaultTipoViagemId, setDefaultTipoViagemId] = useState<string>('');
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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const STABILITY_DURATION = 30000;

  useEffect(() => {
    setEmailTemplates(propTemplates);
  }, [propTemplates]);

  useEffect(() => {
    const loadTipos = async () => {
      const tipos = await db.getColetaTiposViagem();
      setTiposViagem(tipos);
      
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
      .filter(trip => {
        const dt = trip.scheduledDateTime || trip.dateTime;
        if (!dt) return false;
        const tripDateStr = dt.includes('T') ? dt.split('T')[0] : dt;
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
        if (!startDate && !endDate) return normalizedTripDate >= '2026-03-16';
        
        return true;
      })
      .map(serverTrip => {
        const pending = pendingUpdates[serverTrip.id];
        if (pending && (now - pending.timestamp) < STABILITY_DURATION) {
          return { ...serverTrip, ...pending.data };
        }
        return serverTrip;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduledDateTime || a.dateTime || 0).getTime();
        const dateB = new Date(b.scheduledDateTime || b.dateTime || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.driver.name || '').localeCompare(b.driver.name || '');
      });
  }, [propTrips, pendingUpdates, finalizingIds, hiddenTripTypes, startDate, endDate]);

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

  const handleSaveSettings = () => {
    localStorage.setItem('coletaDefaultTemplateId', selectedTemplateId);
    localStorage.setItem('coletaHiddenTripTypes', JSON.stringify(hiddenTripTypes));
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
          <select
            value={selectedValue}
            onChange={(e) => handleUpdateTrip(t, { coletaTipoViagem: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:border-blue-500 transition-all"
            style={{
              color: selectedColor,
              borderColor: selectedColor
            }}
          >
            <option value="">Selecione...</option>
            {tiposViagem.map(tv => (
              <option key={tv.id} value={tv.id} style={{ color: tv.color }}>{tv.name}</option>
            ))}
          </select>
        );
      }
    },
    { 
      key: 'coletaEmailSent', 
      label: 'E-mail', 
      sortable: false,
      render: (t: Trip) => (
        <div className="flex items-center justify-center gap-2">
          <input 
            type="checkbox" 
            checked={!!t.coletaEmailSent} 
            onChange={(e) => {
              const checked = e.target.checked;
              const updateData: Partial<Trip> = { coletaEmailSent: checked };
              if (checked) {
                updateData.sentNF = true;
              }
              handleUpdateTrip(t, updateData);
            }}
            className="w-4 h-4 rounded-md border-2 border-slate-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
          />
          {pendingUpdates[t.id]?.data.hasOwnProperty('coletaEmailSent') && (
            <div className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
      )
    },
    { 
      key: 'coletaDocGenerated', 
      label: 'Doc Originário', 
      sortable: false,
      render: (t: Trip) => (
        <div className="flex items-center justify-center gap-2">
          <input 
            type="checkbox" 
            checked={!!t.coletaDocGenerated} 
            onChange={(e) => handleUpdateTrip(t, { coletaDocGenerated: e.target.checked })}
            className="w-4 h-4 rounded-md border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer"
          />
          {pendingUpdates[t.id]?.data.hasOwnProperty('coletaDocGenerated') && (
            <div className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
      )
    },
    { 
      key: 'dateTime', 
      label: 'Data/Hora', 
      render: (t: Trip) => {
        const dt = t.scheduledDateTime || t.dateTime;
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
      render: (t: Trip) => (
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-black text-slate-900 text-[10px]">{t.os}</span>
            <span className="text-[7px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-600 border border-slate-200 w-fit uppercase">{t.category || '---'}</span>
          </div>
          <button
            onClick={() => setEmailSendModal({ isOpen: true, trip: t })}
            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
            title="Enviar E-mail"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>
      )
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
          <span className="font-black text-slate-900 text-[10px] uppercase whitespace-normal break-words">{t.driver.name || '---'}</span>
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
  ], [tiposViagem, handleUpdateTrip, pendingUpdates]);

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

  const getRowClassName = (t: Trip) => {
    let classes = 'transition-all duration-300 ';
    if (t.coletaDocGenerated) classes += 'line-through opacity-60 ';
    return classes;
  };

  const getRowStyle = (t: Trip) => {
    const typeId = t.coletaTipoViagem || defaultTipoViagemId;
    const type = tiposViagem.find(tv => tv.id === typeId);
    const typeColor = type?.color || '#cbd5e1'; // slate-300 default

    const style: React.CSSProperties = {
      borderLeftWidth: '6px',
      borderLeftStyle: 'solid',
      borderLeftColor: typeColor,
    };

    if (t.coletaDocGenerated) {
      // Verde suave para concluído (Doc Gerado)
      style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
      style.borderLeftStyle = 'dashed';
    } else if (t.coletaEmailSent) {
      // Azul suave para e-mail enviado
      style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
    } else if (typeColor) {
      // Cor do tipo com 10% de opacidade
      const hexToRgba = (hex: string, alpha: number) => {
        try {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } catch (e) { return hex; }
      };
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

          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            {tiposViagem.map(tv => {
              const type = tv.name.toUpperCase();
              const isVisible = !hiddenTripTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleTripType(type)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    isVisible
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {type}
                </button>
              );
            })}
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
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

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
                  <select 
                    value={selectedTemplateId} 
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecione um modelo...</option>
                    {emailTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-[9px] font-medium text-slate-400 ml-1">
                    Crie ou edite modelos na aba "Administrativo &gt; Modelos de E-mail".
                  </p>
                </div>
              </div>

              {/* Filtro de Tipos de Programação */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-2">Tipos de Programação Visíveis</h4>
                <p className="text-[10px] font-medium text-slate-400">Selecione os tipos de viagem que você deseja ver neste painel:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {tiposViagem.map(tv => {
                    const type = tv.name.toUpperCase();
                    return (
                      <label key={type} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                        <input 
                          type="checkbox"
                          checked={!hiddenTripTypes.includes(type)}
                          onChange={() => toggleTripType(type)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{type}</span>
                      </label>
                    );
                  })}
                </div>
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
