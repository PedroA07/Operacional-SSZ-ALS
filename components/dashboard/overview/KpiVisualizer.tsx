
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';
// Added StatGroup import to assist with type casting for Object.entries
import { statsCalculator, StatGroup } from '../../../utils/statsCalculator';

interface KpiVisualizerProps {
  trips: Trip[];
  drivers: Driver[];
}

const KpiVisualizer: React.FC<KpiVisualizerProps> = ({ trips, drivers }) => {
  const [activePeriod, setActivePeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');

  const analyticsData = useMemo(() => {
    const now = new Date();
    let filtered = trips;

    if (activePeriod === 'WEEK') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
      startOfWeek.setHours(0,0,0,0);
      filtered = trips.filter(t => new Date(t.dateTime) >= startOfWeek);
    } else if (activePeriod === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = trips.filter(t => new Date(t.dateTime) >= startOfMonth);
    }

    const stats = statsCalculator.calculateFullDashboardStats(filtered, 'client');
    const driverStats = statsCalculator.calculateFullDashboardStats(filtered, 'driver');

    // Preparar dados para o gráfico de tendência (últimos 7 dias)
    const trend = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toLocaleDateString('en-CA');
      const dayTrips = filtered.filter(t => t.dateTime.startsWith(dayStr));
      return {
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        count: dayTrips.length,
        ok: dayTrips.filter(t => t.status === 'Viagem concluída').length
      };
    });

    return { stats, driverStats, trend, total: filtered.length };
  }, [trips, activePeriod]);

  const maxTrend = Math.max(...analyticsData.trend.map(t => t.count), 1);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* GRÁFICO DE TENDÊNCIA (VOLUME DIÁRIO) */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Fluxo Operacional</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Volume de OS nos últimos 7 dias</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
                <button 
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${activePeriod === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-end justify-between gap-4 h-64 px-4">
            {analyticsData.trend.map((day, i) => {
              const height = (day.count / maxTrend) * 100;
              const okHeight = day.count > 0 ? (day.ok / day.count) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                   <div className="w-full flex flex-col justify-end bg-slate-50 rounded-2xl overflow-hidden h-48 border border-slate-100 group-hover:border-blue-200 transition-all">
                      <div 
                        className="w-full bg-blue-600/20 relative transition-all duration-1000 ease-out"
                        style={{ height: `${height}%` }}
                      >
                         <div 
                           className="absolute bottom-0 left-0 w-full bg-blue-600 transition-all duration-1000 delay-300"
                           style={{ height: `${okHeight}%` }}
                         ></div>
                      </div>
                   </div>
                   <span className="text-[9px] font-black text-slate-400 uppercase mt-4 group-hover:text-blue-600 transition-colors">{day.label}</span>
                   
                   {/* Tooltip */}
                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                      <p className="text-[10px] font-black">{day.count} OS <span className="text-blue-400">({day.ok} OK)</span></p>
                   </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STATUS SPLIT (DONUT CHART) */}
        <div className="lg:col-span-4 bg-slate-900 p-8 rounded-[3rem] text-white flex flex-col shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Eficiência Geral</h3>
            <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Status da fila selecionada</p>
          </div>

          <div className="flex-1 flex items-center justify-center py-10">
             <div className="relative w-48 h-48">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#1e293b" strokeWidth="3.5"></circle>
                  {/* Fixed typing for Object.entries to resolve 's.total' property not found on type unknown */}
                  {(Object.entries(analyticsData.stats.operationTypes) as [string, StatGroup][]).map(([type, s], idx) => {
                    // Cálculo simplificado para demonstração visual ALS
                    const dashArray = (s.total / analyticsData.total) * 100;
                    return (
                      <circle 
                        key={type}
                        cx="18" cy="18" r="15.9" 
                        fill="transparent" 
                        stroke={idx === 0 ? "#2563eb" : idx === 1 ? "#10b981" : "#f59e0b"} 
                        strokeWidth="3.8" 
                        strokeDasharray={`${dashArray} 100`}
                        strokeDashoffset={-idx * 25}
                        className="transition-all duration-1000"
                      ></circle>
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <p className="text-4xl font-black">{analyticsData.total}</p>
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total OS</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
             {/* Fixed typing for Object.entries to resolve 's.total' property not found on type unknown */}
             {(Object.entries(analyticsData.stats.operationTypes) as [string, StatGroup][]).slice(0, 4).map(([type, s], i) => (
               <div key={type} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase truncate">{type}</p>
                    <p className="text-[10px] font-mono text-slate-500">{Math.round((s.total/analyticsData.total)*100)}%</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* TOP CLIENTES */}
         <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Ranking Clientes</h3>
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Top Performers</span>
            </div>
            <div className="space-y-6">
               {analyticsData.stats.entities.slice(0, 5).map((entity, i) => (
                 <div key={entity.name} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                       <span className="text-[10px] font-black text-slate-700 uppercase">{entity.name}</span>
                       <span className="text-[10px] font-mono font-black text-slate-400">{entity.total} OS</span>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                       <div 
                         className="h-full bg-blue-600 transition-all duration-1000 ease-out flex justify-end px-2 items-center"
                         style={{ width: `${(entity.total / analyticsData.stats.entities[0].total) * 100}%` }}
                       >
                         <div className="h-1 w-1 bg-white/50 rounded-full"></div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* TOP MOTORISTAS */}
         <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Equipe em Destaque</h3>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">Maior Volume</span>
            </div>
            <div className="space-y-6">
               {analyticsData.driverStats.entities.slice(0, 5).map((entity, i) => (
                 <div key={entity.name} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                       <span className="text-[10px] font-black text-slate-700 uppercase">{entity.name}</span>
                       <span className="text-[10px] font-mono font-black text-slate-400">{entity.total} OS</span>
                    </div>
                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                       <div 
                         className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                         style={{ width: `${(entity.total / analyticsData.driverStats.entities[0].total) * 100}%` }}
                       ></div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default KpiVisualizer;
