import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Trip, ColetaTipoViagemOption } from '../../types';
import { db } from '../../utils/storage';
import SmartOperationTable from './operations/SmartOperationTable';
import FeedbackModal from '../shared/FeedbackModal';

interface ColetaDoDiaTabProps {
  userId: string;
  trips: Trip[];
  onRefresh: () => Promise<void>;
}

const ColetaDoDiaTab: React.FC<ColetaDoDiaTabProps> = ({ userId, trips: propTrips, onRefresh }) => {
  const [isLoading, setIsLoading] = useState(propTrips.length === 0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { data: Partial<Trip>, timestamp: number }>>({});
  const [finalizingIds, setFinalizingIds] = useState<Set<string>>(new Set());
  const [tiposViagem, setTiposViagem] = useState<ColetaTipoViagemOption[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const STABILITY_DURATION = 30000;

  useEffect(() => {
    const loadTipos = async () => {
      const tipos = await db.getColetaTiposViagem();
      setTiposViagem(tipos);
    };
    loadTipos();
  }, []);

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
    return propTrips
      .filter(trip => !finalizingIds.has(trip.id))
      .filter(trip => !trip.coletaEmissaoSolicitada)
      .map(serverTrip => {
        const pending = pendingUpdates[serverTrip.id];
        if (pending && (now - pending.timestamp) < STABILITY_DURATION) {
          return { ...serverTrip, ...pending.data };
        }
        return serverTrip;
      });
  }, [propTrips, pendingUpdates, finalizingIds]);

  useEffect(() => {
    if (propTrips.length > 0) setIsLoading(false);
  }, [propTrips]);

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
    setPendingUpdates(prev => ({
      ...prev,
      [trip.id]: { 
        data: { ...(prev[trip.id]?.data || {}), ...data }, 
        timestamp: now 
      }
    }));

    try {
      await db.saveTrip({ ...trip, ...data });
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
  }, []);

  const removePunctuation = (str?: string) => str ? str.replace(/[^\w\s]/gi, '') : '---';

  const columns = useMemo(() => [
    { 
      key: 'coletaTipoViagem', 
      label: 'Tipo de Viagem', 
      render: (t: Trip) => (
        <select
          value={t.coletaTipoViagem || ''}
          onChange={(e) => handleUpdateTrip(t, { coletaTipoViagem: e.target.value })}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:border-blue-500 transition-all"
          style={{
            color: tiposViagem.find(tv => tv.id === t.coletaTipoViagem)?.color || 'inherit',
            borderColor: tiposViagem.find(tv => tv.id === t.coletaTipoViagem)?.color || 'inherit'
          }}
        >
          <option value="">Selecione...</option>
          {tiposViagem.map(tv => (
            <option key={tv.id} value={tv.id} style={{ color: tv.color }}>{tv.name}</option>
          ))}
        </select>
      )
    },
    { 
      key: 'coletaEmailSent', 
      label: 'E-mail', 
      render: (t: Trip) => (
        <div className="flex items-center justify-center gap-2">
          <input 
            type="checkbox" 
            checked={!!t.coletaEmailSent} 
            onChange={(e) => handleUpdateTrip(t, { coletaEmailSent: e.target.checked })}
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
          return (
            <div className="flex flex-col">
              <span className="font-bold text-slate-700 text-[10px]">{d.toLocaleDateString('pt-BR')}</span>
              <span className="text-[8px] text-slate-500">{d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        } catch {
          return <span className="text-[9px] text-slate-400">{dt}</span>;
        }
      }
    },
    { 
      key: 'type', 
      label: 'Tipo Prog.', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase">{t.type}</span>
    },
    { 
      key: 'os', 
      label: 'Nº Programação', 
      render: (t: Trip) => (
        <div className="flex flex-col gap-1">
          <span className="font-black text-slate-900 text-[10px]">{t.os}</span>
          <span className="text-[7px] bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-600 border border-slate-200 w-fit uppercase">{t.category || '---'}</span>
        </div>
      )
    },
    { 
      key: 'booking', 
      label: 'Booking', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase">{t.booking || '---'}</span>
    },
    { 
      key: 'container', 
      label: 'Container', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase">{t.container || '---'}</span>
    },
    { 
      key: 'tara', 
      label: 'Tara', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase">{t.tara || '---'}</span>
    },
    { 
      key: 'seal', 
      label: 'Lacre', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase">{t.seal || '---'}</span>
    },
    { 
      key: 'driverCpf', 
      label: 'CPF Motorista', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px]">{removePunctuation(t.driver.cpf)}</span>
    },
    { 
      key: 'driverName', 
      label: 'Motorista', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase truncate max-w-[120px] block" title={t.driver.name}>{t.driver.name || '---'}</span>
    },
    { 
      key: 'plateHorse', 
      label: 'Placa Veículo', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase">{removePunctuation(t.driver.plateHorse)}</span>
    },
    { 
      key: 'plateTrailer', 
      label: 'Placa Carreta', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase">{removePunctuation(t.driver.plateTrailer)}</span>
    },
    { 
      key: 'customerName', 
      label: 'Local Atendimento', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase truncate max-w-[120px] block" title={t.customer.name}>{t.customer.name || '---'}</span>
    },
    { 
      key: 'customerCity', 
      label: 'Cidade', 
      render: (t: Trip) => <span className="font-bold text-slate-600 text-[9px] uppercase">{t.customer.city || '---'}</span>
    },
    { 
      key: 'navioBU', 
      label: 'Navio BU', 
      render: () => <span className="font-bold text-slate-600 text-[9px] uppercase">SSZ</span>
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
          const promises = readyTrips.map(trip => db.saveTrip({ ...trip, coletaEmissaoSolicitada: true }));
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
    if (t.coletaDocGenerated) return 'bg-emerald-50/50 border-l-4 border-emerald-500 border-dashed line-through opacity-70';
    if (t.coletaEmailSent) return 'bg-blue-50/50 border-l-4 border-blue-400';
    return '';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-[3rem] border border-slate-100 shadow-sm animate-pulse">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Carregando Coleta do Dia...</p>
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
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Coleta do Dia</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Coletas Diárias</p>
          </div>
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

      <div className="animate-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <SmartOperationTable 
            userId={userId} 
            componentId="coleta-dia-table" 
            columns={columns} 
            data={trips} 
            hideInternalSearch={false}
            getRowClassName={getRowClassName}
          />
        </div>
      </div>
    </div>
  );
};

export default ColetaDoDiaTab;
