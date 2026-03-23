
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
  const [sealStats, setSealStats] = useState({ used: 0, available: 0, total: 0 });
  const [carrierStats, setCarrierStats] = useState<{ carrier: string; available: number; total: number }[]>([]);
  const [customStatuses, setCustomStatuses] = useState<any[]>([]);
  const [isLoadingSeals, setIsLoadingSeals] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const statuses = await db.getCustomStatuses();
      setCustomStatuses(statuses);
    };
    loadData();
  }, []);

  useEffect(() => {
    const countSeals = async () => {
      setIsLoadingSeals(true);
      try {
        let used = 0;
        let available = 0;
        const statsMap: Record<string, { used: number; available: number }> = {};

        for (const batch of sealBatches) {
          const records = await db.getSealRecords(batch.id);
          const batchUsed = records.filter(r => r.containerNumber && r.containerNumber.trim() !== '').length;
          const batchAvail = records.length - batchUsed;
          
          used += batchUsed;
          available += batchAvail;

          const carrier = batch.carrier || 'N/A';
          if (!statsMap[carrier]) {
            statsMap[carrier] = { used: 0, available: 0 };
          }
          statsMap[carrier].used += batchUsed;
          statsMap[carrier].available += batchAvail;
        }
        
        setSealStats({ used, available, total: used + available });
        
        const statsArray = Object.entries(statsMap).map(([carrier, stats]) => ({
          carrier,
          available: stats.available,
          total: stats.used + stats.available
        })).sort((a, b) => b.available - a.available);
        
        setCarrierStats(statsArray);
      } catch (e) {
        console.error("Erro no processamento de estoque:", e);
      } finally {
        setIsLoadingSeals(false);
      }
    };
    if (sealBatches.length > 0) countSeals();
    else {
      setSealStats({ used: 0, available: 0, total: 0 });
      setCarrierStats([]);
    }
  }, [sealBatches]);

  const avantidaStats = React.useMemo(() => {
    const total = avantidaRecords.length;
    const verified = avantidaRecords.filter(r => r.verified).length;
    const pending = total - verified;
    return { total, verified, pending };
  }, [avantidaRecords]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER PRINCIPAL */}
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
                    {isSyncing ? 'Sincronizando dados...' : `Última atualização: ${lastSyncTime}`}
                 </p>
              </div>
           </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           <button onClick={() => setViewMode('CARDS')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === 'CARDS' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>Monitoramento</button>
           <button onClick={() => setViewMode('ANALYTICS')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === 'ANALYTICS' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>Analytics</button>
        </div>
      </div>

      {viewMode === 'CARDS' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TripsYesterday trips={trips} customStatuses={customStatuses} />
            <TripsToday trips={trips} customStatuses={customStatuses} />
            <TripsTomorrow trips={trips} />
          </div>

          {/* MONITORES ADMINISTRATIVOS */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-10">
                <div className="w-36 h-36 shrink-0 relative flex items-center justify-center">
                   <DonutChart 
                     data={{ "CONFERIDO": avantidaStats.verified, "PENDENTE": avantidaStats.pending }} 
                     total={avantidaStats.total} 
                     colors={['#10b981', '#f59e0b']}
                   />
                </div>
                <div className="flex-1 w-full space-y-5">
                   <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Auditoria Avantida</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Verificação de Lançamentos de Reuso</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 group hover:bg-emerald-100 transition-colors">
                         <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Verificados</p>
                         <p className="text-3xl font-black text-emerald-700 mt-1">{avantidaStats.verified}</p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-3xl border-amber-100 group hover:bg-amber-100 transition-colors">
                         <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Pendentes</p>
                         <p className="text-3xl font-black text-amber-700 mt-1">{avantidaStats.pending}</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-slate-950 p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col sm:flex-row items-center gap-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                   <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                </div>
                <div className="w-36 h-36 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] flex flex-col items-center justify-center text-white shadow-2xl shrink-0 border border-white/10">
                   {isLoadingSeals ? (
                     <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <>
                        <span className="text-[10px] font-black uppercase opacity-60 mb-1">Disponíveis</span>
                        <span className="text-5xl font-black leading-none">{sealStats.available}</span>
                        <span className="text-[8px] font-black uppercase mt-2 tracking-widest">Unidades</span>
                     </>
                   )}
                </div>
                <div className="flex-1 w-full space-y-6">
                   <div className="flex justify-between items-center">
                      <div>
                         <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Estoque de Lacres</h3>
                         <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Movimentação Imediata</p>
                      </div>
                      <div className="text-right">
                         <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-slate-400 uppercase border border-white/5">{sealBatches.length} Lotes</span>
                      </div>
                   </div>
                   <div className="space-y-4 max-h-[180px] overflow-y-auto pr-2">
                      {carrierStats.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                          {carrierStats.map((stat, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-8 bg-blue-500 rounded-full"></div>
                                <div>
                                  <p className="text-[9px] font-black text-white uppercase tracking-wider">{stat.carrier}</p>
                                  <p className="text-[7px] text-slate-500 font-bold uppercase">Disponível: {stat.available} / {stat.total}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-blue-400 leading-none">{stat.available}</p>
                                <p className="text-[7px] font-black text-slate-500 uppercase mt-1">Unid.</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                             <div className="flex justify-between text-[8px] font-black uppercase tracking-widest px-1">
                                <span className="text-slate-500">Utilizados: {sealStats.used}</span>
                                <span className="text-blue-400">Total: {sealStats.total}</span>
                             </div>
                             <div className="h-3 bg-white/5 rounded-full overflow-hidden flex border border-white/5">
                                <div className="h-full bg-slate-700 transition-all duration-1000" style={{ width: `${(sealStats.used / (sealStats.total || 1)) * 100}%` }}></div>
                                <div className="h-full bg-blue-500 animate-pulse transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(sealStats.available / (sealStats.total || 1)) * 100}%` }}></div>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                <p className="text-[7px] font-black text-slate-500 uppercase">Saíram p/ Viagem</p>
                                <p className="text-lg font-black text-white">{sealStats.used}</p>
                             </div>
                             <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                <p className="text-[7px] font-black text-slate-500 uppercase">Prontos p/ Uso</p>
                                <p className="text-lg font-black text-blue-400">{sealStats.available}</p>
                             </div>
                          </div>
                        </>
                      )}
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TripsThisWeek trips={trips} customStatuses={customStatuses} />
            <TripsThisMonth trips={trips} customStatuses={customStatuses} />
            <TripsThisYear trips={trips} customStatuses={customStatuses} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-8">
                <DriverStatusCards trips={trips} drivers={drivers} customStatuses={customStatuses} />
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
