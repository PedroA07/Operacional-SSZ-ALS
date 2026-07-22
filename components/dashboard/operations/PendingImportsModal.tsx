import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Customer, Driver, Category, Port, PreStacking, User } from '../../../types';
import { db } from '../../../utils/storage';
import { localDateStr, localDateTimeStr } from '../../../utils/dateHelpers';
import OrdemColetaForm from '../forms/OrdemColetaForm';
import LiberacaoVazioForm from '../forms/LiberacaoVazioForm';
import DevolucaoVazioForm from '../forms/DevolucaoVazioForm';
import TripModal from './TripModal';

interface PendingImportsModalProps {
  user?: User;
  trips: Trip[];
  customers: Customer[];
  drivers: Driver[];
  categories: Category[];
  onClose: () => void;
  onRefresh: () => void;
}

type MinutaKind = 'oc' | 'liberacao' | 'devolucao';

const isImportType = (t?: string) => /ENTREGA|IMPORTA/i.test(t || '');

const PendingImportsModal: React.FC<PendingImportsModalProps> = ({ user, trips, customers, drivers, categories, onClose, onRefresh }) => {
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [activeMinuta, setActiveMinuta] = useState<{ kind: MinutaKind; trip: Trip } | null>(null);
  const [editTrip, setEditTrip] = useState<Trip | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try { const [p, ps] = await Promise.all([db.getPorts(), db.getPreStacking()]); setPorts(p || []); setPreStacking(ps || []); }
      catch (e) { console.error('Erro ao carregar portos:', e); }
    })();
  }, []);

  const pending = trips.filter(t => t.importPendente && !t.isCompleted);

  const removeFromPending = async (trip: Trip) => {
    setBusyId(trip.id);
    try { await db.saveTrip({ ...trip, importPendente: false }); onRefresh(); }
    catch (e) { console.error('Erro ao remover dos pendentes:', e); }
    finally { setBusyId(null); }
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    try { const d = new Date(iso); return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; } catch { return iso; }
  };
  const toInput = (iso?: string) => {
    if (!iso) return localDateTimeStr();
    try { const d = new Date(iso); const off = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - off).toISOString().slice(0, 16); } catch { return localDateTimeStr(); }
  };

  const buildOcInitial = (t: Trip) => {
    const p: any = t.osImportData || {};
    return {
      date: localDateStr(), driverId: '',
      remetenteId: t.customer?.id || '', destinatarioId: t.destination?.id || '',
      os: t.os, container: t.container || '', tara: '', seal: t.seal || '', genset: '',
      booking: t.booking || '', ship: t.ship || '', agencia: t.agencia || '',
      tipo: t.containerType || '40HC', padrao: p.padraoCarga || 'CARGA GERAL',
      tipoOperacao: t.type || '', autColeta: t.autColeta || '', embarcador: t.embarcador || '',
      horarioAgendado: toInput(t.dateTime), obs: '', category: (t.category || '').toUpperCase(),
      osPdfUrl: t.osPdfUrl || '', osImportData: p, displayDate: new Date().toLocaleDateString('pt-BR'),
    };
  };
  const buildLiberacaoInitial = (t: Trip) => {
    const p: any = t.osImportData || {};
    return {
      date: localDateStr(), driverId: '', remetenteId: t.customer?.id || '',
      destinatarioId: t.retiradaVazio?.id || '', booking: t.booking || '', ship: t.ship || '',
      agencia: t.agencia || '', pod: p.pod || '', qtdContainer: '01',
      tipo: t.containerType || '40HC', padrao: p.padraoCarga || 'CARGA GERAL',
      obs: '', manualLocal: t.retiradaVazio?.name || p.retirarVazio || '',
    };
  };
  const buildDevolucaoInitial = (t: Trip) => {
    const p: any = t.osImportData || {};
    return {
      date: localDateStr(), driverId: '', remetenteId: t.customer?.id || '',
      destinatarioId: t.destination?.id || '', container: t.container || '', booking: t.booking || '',
      ship: t.ship || '', agencia: t.agencia || '', pod: p.pod || '', qtdContainer: '01',
      tipo: t.containerType || '40HC', padrao: p.padraoCarga || 'CARGA GERAL',
      obs: '', manualLocal: t.destination?.name || p.entregarVazio || '', agendamentoDateTime: '',
    };
  };

  return createPortal(
    <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-white flex flex-col">
        <div className="px-8 py-5 bg-amber-600 flex items-center justify-between shrink-0 shadow-lg">
          <div>
            <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Operações</p>
            <h2 className="font-black text-white text-sm uppercase tracking-widest">OS Importadas Pendentes ({pending.length})</h2>
            <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">Gere as minutas quando quiser, ou edite a programação</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-50 p-8">
          <div className="max-w-5xl mx-auto space-y-3">
            {pending.length === 0 && (
              <div className="text-center py-20">
                <p className="text-[12px] font-black text-slate-400 uppercase">Nenhuma OS pendente</p>
                <p className="text-[10px] text-slate-400 mt-1">As OS importadas em massa aparecem aqui até você concluí-las.</p>
              </div>
            )}
            {pending.map(t => {
              const isImp = isImportType(t.type);
              return (
                <div key={t.id} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-slate-800">{t.os}</span>
                      <span className="text-[7px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded font-black uppercase">{isImp ? 'ENTREGA / IMPORTAÇÃO' : 'COLETA / EXPORTAÇÃO'}</span>
                      {t.type && <span className="text-[7px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-black uppercase">{t.type}</span>}
                      {t.container && <span className="text-[7px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded font-black uppercase">{t.container}{t.containerType ? ` · ${t.containerType}` : ''}</span>}
                    </div>
                    <button onClick={() => removeFromPending(t)} disabled={busyId === t.id} className="text-[8px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest disabled:opacity-50" title="Concluir — remover da lista de pendentes">
                      {busyId === t.id ? '...' : '✓ Concluir'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5 mt-3">
                    <div><p className="text-[7px] font-black text-slate-400 uppercase">Cliente</p><p className="text-[9px] font-bold text-slate-700 truncate">{t.customer?.name || '—'}</p></div>
                    <div><p className="text-[7px] font-black text-slate-400 uppercase">{isImp ? 'Devolução' : 'Entrega'}</p><p className="text-[9px] font-bold text-slate-700 truncate">{t.destination?.name || '—'}</p></div>
                    <div><p className="text-[7px] font-black text-slate-400 uppercase">{isImp ? 'Retirada do Cheio' : 'Retirada do Vazio'}</p><p className="text-[9px] font-bold text-slate-700 truncate">{(isImp ? t.retiradaCheio : t.retiradaVazio)?.name || '—'}</p></div>
                    <div><p className="text-[7px] font-black text-slate-400 uppercase">Data / Navio</p><p className="text-[9px] font-bold text-slate-700 truncate">{fmtDate(t.dateTime)}{t.ship ? ` · ${t.ship}` : ''}</p></div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button onClick={() => setEditTrip(t)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-black uppercase rounded-lg hover:bg-slate-200 transition-all">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      Editar Programação
                    </button>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">|</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Minutas:</span>
                    <button onClick={() => setActiveMinuta({ kind: 'oc', trip: t })} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[8px] font-black uppercase rounded-lg hover:bg-blue-100 transition-all">Ordem de Coleta</button>
                    {isImp ? (
                      <button onClick={() => setActiveMinuta({ kind: 'devolucao', trip: t })} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[8px] font-black uppercase rounded-lg hover:bg-amber-100 transition-all">Minuta de Devolução</button>
                    ) : (
                      <button onClick={() => setActiveMinuta({ kind: 'liberacao', trip: t })} className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-[8px] font-black uppercase rounded-lg hover:bg-violet-100 transition-all">Liberação de Vazio</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Minuta pré-preenchida */}
      {activeMinuta && createPortal(
        <div className="fixed inset-0 z-[9200] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="px-8 py-5 bg-slate-800 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">{activeMinuta.kind === 'oc' ? 'Ordem de Coleta' : activeMinuta.kind === 'liberacao' ? 'Liberação de Vazio' : 'Minuta de Devolução'}</p>
                <h2 className="font-black text-white text-sm uppercase tracking-widest">OS: {activeMinuta.trip.os}</h2>
              </div>
              <button onClick={() => setActiveMinuta(null)} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {activeMinuta.kind === 'oc' && (
                <OrdemColetaForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={() => setActiveMinuta(null)} initialData={buildOcInitial(activeMinuta.trip)} tripId={activeMinuta.trip.id} osPdfUrl={activeMinuta.trip.osPdfUrl} />
              )}
              {activeMinuta.kind === 'liberacao' && (
                <LiberacaoVazioForm user={user} drivers={drivers} customers={customers} ports={ports} preStackings={preStacking} onClose={() => setActiveMinuta(null)} initialFormData={buildLiberacaoInitial(activeMinuta.trip)} />
              )}
              {activeMinuta.kind === 'devolucao' && (
                <DevolucaoVazioForm user={user} drivers={drivers} customers={customers} ports={ports} preStackings={preStacking} onClose={() => setActiveMinuta(null)} tripId={activeMinuta.trip.id} tripOs={activeMinuta.trip.os} initialFormData={buildDevolucaoInitial(activeMinuta.trip)} />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Editar programação */}
      <TripModal
        isOpen={!!editTrip}
        onClose={() => setEditTrip(null)}
        onSuccess={() => { setEditTrip(null); onRefresh(); }}
        drivers={drivers}
        customers={customers}
        categories={categories}
        editTrip={editTrip}
      />
    </div>,
    document.body
  );
};

export default PendingImportsModal;
