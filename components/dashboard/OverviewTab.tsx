
import React, { useState, useMemo } from 'react';
import { Trip, Driver, User, AvantidaRecord, SealBatch } from '../../types';
import { statsCalculator, CrossReferenceResult } from '../../utils/statsCalculator';
import WeeklyTrendChart from './overview/WeeklyTrendChart';
import CategoryVolumeChart from './overview/CategoryVolumeChart';

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

type TimePeriod = 'YESTERDAY' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'MONTH' | 'YEAR';

const OverviewTab: React.FC<OverviewTabProps> = ({ trips, drivers, isSyncing, lastSyncTime }) => {
  const [period, setPeriod] = useState<TimePeriod>('TODAY');
  const [viewType, setViewType] = useState<'client' | 'driver'>('client');
  const [search, setSearch] = useState('');

  const filteredTrips = useMemo(() => {
    const { start, end } = statsCalculator.getPeriodDates(period);
    return trips.filter(t => {
      const d = new Date(t.dateTime).getTime();
      return d >= start.getTime() && d <= end.getTime();
    });
  }, [trips, period]);

  const results = useMemo(() => {
    const base = statsCalculator.calculateCrossReference(filteredTrips, viewType);
    if (!search) return base;
    return base.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.subLabel.toLowerCase().includes(search.toLowerCase()));
  }, [filteredTrips, viewType, search]);

  const periods = [
    { id: 'YESTERDAY', label: 'Ontem' },
    { id: 'TODAY', label: 'Hoje' },
    { id: 'TOMORROW', label: 'Amanhã' },
    { id: 'WEEK', label: 'Semana' },
    { id: 'MONTH', label: 'Mês' },
    { id: 'YEAR', label: 'Ano' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      {/* 1. CABEÇALHO E FILTROS DE TEMPO */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic">ALS</div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Análise Operacional</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isSyncing ? 'Sincronizando...' : `Sinc: ${lastSyncTime}`}</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
            {periods.map(p => (
              <button 
                key={p.id} 
                onClick={() => setPeriod(p.id as TimePeriod)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${period === p.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. FILTROS DE ENTIDADE */}
        <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-50">
          <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
             <button onClick={() => setViewType('client')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${viewType === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Por Clientes</button>
             <button onClick={() => setViewType('driver')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${viewType === 'driver' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Por Equipe</button>
          </div>
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder={`BUSCAR ${viewType === 'client' ? 'CLIENTE' : 'MOTORISTA'}...`}
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>
          </div>
        </div>
      </div>

      {/* 3. DASHBOARD DE VOLUMETRIA (VISÃO GRÁFICA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <WeeklyTrendChart trips={filteredTrips} />
         <CategoryVolumeChart trips={filteredTrips} />
      </div>

      {/* 4. LISTA DE RESULTADOS DETALHADA */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Detalhamento Operacional ({results.length})</h3>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {results.map(item => (
            <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-500 group">
              <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white font-black text-xl italic shadow-lg ${viewType === 'client' ? 'bg-slate-900' : 'bg-blue-600'}`}>
                    {item.name[0]}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800 uppercase leading-none">{item.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">{item.subLabel}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <StatBadge label="Total" value={item.total} color="bg-blue-50 text-blue-600 border-blue-100" />
                  <StatBadge label="Atrasos" value={item.delayed} color="bg-red-50 text-red-600 border-red-100" />
                  <StatBadge label="Concluídas" value={item.completed} color="bg-emerald-50 text-emerald-600 border-emerald-100" />
                  <StatBadge label="Canceladas" value={item.canceled} color="bg-slate-100 text-slate-400 border-slate-200" />
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{viewType === 'client' ? 'Motoristas Alocados' : 'Clientes Atendidos'}</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {item.relatedEntities.map(sub => (
                        <div key={sub.id} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-blue-200 transition-all">
                           <div className="flex justify-between items-start mb-4">
                              <div className="min-w-0">
                                 <p className="text-[11px] font-black text-slate-800 uppercase truncate">{sub.name}</p>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{sub.subLabel}</p>
                              </div>
                              <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black font-mono">{sub.total}</span>
                           </div>
                           <div className="flex gap-2 mb-4">
                              {Object.entries(sub.opTypes).map(([type, count]) => (
                                <span key={type} className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded text-[7px] font-black uppercase">{type}: {count}</span>
                              ))}
                           </div>
                           <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-4">
                              <div className="text-center"><p className="text-[6px] font-black text-red-400 uppercase">Atr</p><p className="text-[10px] font-black text-red-600">{sub.delayed}</p></div>
                              <div className="text-center"><p className="text-[6px] font-black text-emerald-400 uppercase">Ok</p><p className="text-[10px] font-black text-emerald-600">{sub.completed}</p></div>
                              <div className="text-center"><p className="text-[6px] font-black text-slate-400 uppercase">Can</p><p className="text-[10px] font-black text-slate-600">{sub.canceled}</p></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          ))}

          {results.length === 0 && (
             <div className="py-32 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma movimentação para o período de {period}</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatBadge = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`px-5 py-2.5 rounded-2xl border text-center min-w-[100px] ${color}`}>
     <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
     <p className="text-xl font-black font-mono leading-none">{value}</p>
  </div>
);

export default OverviewTab;
