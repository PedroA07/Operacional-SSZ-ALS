
import React, { useState, useEffect } from 'react';
import { Trip, Driver, User, AvantidaRecord, SealBatch } from '../../types';
import { db } from '../../utils/storage';
import TripsYesterday from './overview/TripsYesterday';
import TripsToday from './overview/TripsToday';
import TripsTomorrow from './overview/TripsTomorrow';
import TripsThisWeek from './overview/TripsThisWeek';
import TripsThisMonth from './overview/TripsThisMonth';
import TripsThisYear from './overview/TripsThisYear';
import DelayedTrips from './overview/DelayedTrips';
import DriverStatusCards from './overview/DriverStatusCards';
import RecentActivitiesCard from './overview/RecentActivitiesCard';
import KpiVisualizer from './overview/KpiVisualizer';
import DonutChart from './overview/DonutChart';

interface OverviewTabProps {
  trips: Trip[];
  drivers: Driver[];
  avantidaRecords: AvantidaRecord[];
  sealBatches: SealBatch[];
  onRefresh: () => Promise<void>;
  lastSyncTime: string;
  isSyncing: boolean;
  user: User;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ 
  trips, drivers, avantidaRecords, sealBatches, onRefresh, lastSyncTime, isSyncing, user 
}) => {
  const [viewMode, setViewMode] = useState<'CARDS' | 'ANALYTICS'>('CARDS');
  const [totalUnusedSeals, setTotalUnusedSeals] = useState<number>(0);
  const [isLoadingSeals, setIsLoadingSeals] = useState(false);

  // Efeito para contar cada unidade de lacre disponível em todos os lotes
  useEffect(() => {
    const countSeals = async () => {
      setIsLoadingSeals(true);
      try {
        let count = 0;
        // Percorre cada lote para buscar seus registros individuais
        for (const batch of sealBatches) {
          const records = await db.getSealRecords(batch.id);
          // Soma apenas lacres que NÃO tem container (Unidades em estoque)
          count += records.filter(r => !r.containerNumber || r.containerNumber.trim() === '').length;
        }
        setTotalUnusedSeals(count);
      } catch (e) {
        console.error("Erro ao processar estoque de lacres:", e);
      } finally {
        setIsLoadingSeals(false);
      }
    };
    if (sealBatches.length > 0) countSeals();
  }, [sealBatches]);

  // Estatísticas Avantida
  const avantidaStats = React.useMemo(() => {
    const total = avantidaRecords.length;
    const verified = avantidaRecords.filter(r => r.verified).length;
    const pending = total - verified;
    return { total, verified, pending };
  }, [avantidaRecords]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER DE MONITORAMENTO */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-blue-600/10 text-blue-600 rounded-[1.8rem] flex items-center justify-center shadow-inner shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
           </div>
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Painel de Performance ALS</h2>
              <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`}></div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {isSyncing ? 'Sincronizando...' : `Última atualização: ${lastSyncTime}`}
                 </p>
              </div>
           </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           <button onClick={() => setViewMode('CARDS')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === 'CARDS' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>Cards</button>
           <button onClick={() => setViewMode('ANALYTICS')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === 'ANALYTICS' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>Analytics</button>
        </div>
      </div>

      {viewMode === 'CARDS' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TripsYesterday trips={trips} />
            <TripsToday trips={trips} />
            <TripsTomorrow trips={trips} />
          </div>

          {/* NOVOS MONITORES ADMINISTRATIVOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             
             {/* MONITOR AVANTIDA */}
             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex items-center gap-10">
                <div className="w-32 h-32 shrink-0">
                   <DonutChart 
                     data={{ "CONFERIDO": avantidaStats.verified, "PENDENTE": avantidaStats.pending }} 
                     total={avantidaStats.total} 
                     colors={['#10b981', '#f59e0b']}
                   />
                </div>
                <div className="flex-1 space-y-4">
                   <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Auditoria Avantida</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status de Verificação Financeira</p>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                         <p className="text-[8px] font-black text-emerald-600 uppercase">Verificados</p>
                         <p className="text-xl font-black text-emerald-700">{avantidaStats.verified}</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-2xl border-amber-100">
                         <p className="text-[8px] font-black text-amber-600 uppercase">Pendentes</p>
                         <p className="text-xl font-black text-amber-700">{avantidaStats.pending}</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* MONITOR DE LACRES (CONTAGEM UNITÁRIA) */}
             <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/5 shadow-2xl flex items-center gap-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                </div>
                
                <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex flex-col items-center justify-center text-white shadow-xl rotate-3 shrink-0">
                   {isLoadingSeals ? (
                     <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <>
                        <span className="text-3xl font-black">{totalUnusedSeals}</span>
                        <span className="text-[7px] font-black uppercase">Unidades</span>
                     </>
                   )}
                </div>

                <div className="flex-1 space-y-3">
                   <div>
                      <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Estoque de Lacres</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Disponibilidade Real Imediata</p>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between items-end">
                         <span className="text-[9px] font-black text-slate-500 uppercase">Capacidade Total</span>
                         <span className="text-xs font-black text-white">{sealBatches.length} Lotes Ativos</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 animate-pulse w-full"></div>
                      </div>
                      <p className="text-[7px] text-slate-600 font-black uppercase tracking-[0.2em] italic">Monitoramento de Insumos ALS</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TripsThisWeek trips={trips} />
            <TripsThisMonth trips={trips} />
            <TripsThisYear trips={trips} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-8">
                <DriverStatusCards trips={trips} drivers={drivers} />
             </div>
             <div className="lg:col-span-4 space-y-8">
                <DelayedTrips trips={trips} />
                <RecentActivitiesCard user={user} />
             </div>
          </div>
        </>
      ) : (
        <KpiVisualizer trips={trips} drivers={drivers} />
      )}
    </div>
  );
};

export default OverviewTab;
