
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';
import { statsCalculator, StatGroup, EntitySummary } from '../../../utils/statsCalculator';

// Fix: Moved BarChartRow outside and typed it as React.FC to properly support standard React props like 'key'
interface BarChartRowProps {
  entity: EntitySummary;
  maxVal: number;
  colorClass: string;
}

const BarChartRow: React.FC<BarChartRowProps> = ({ entity, maxVal, colorClass }) => {
  const percentage = (entity.total / maxVal) * 100;
  const okRate = entity.total > 0 ? Math.round((entity.completed / entity.total) * 100) : 0;
  
  return (
    <div className="space-y-2 group">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-black text-slate-700 uppercase truncate">{entity.name}</span>
          <span className="text-[8px] font-bold text-slate-400">({entity.total} OS)</span>
        </div>
        <span className={`text-[9px] font-black ${okRate > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{okRate}% OK</span>
      </div>
      <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 flex">
        <div 
          className={`h-full ${colorClass} transition-all duration-1000 ease-out flex justify-end items-center px-1`}
          style={{ width: `${percentage}%` }}
        >
          <div className="h-1 w-1 bg-white/40 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

interface KpiVisualizerProps {
  trips: Trip[];
  drivers: Driver[];
}

const KpiVisualizer: React.FC<KpiVisualizerProps> = ({ trips, drivers }) => {
  const [activePeriod, setActivePeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');

  const analytics = useMemo(() => {
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

    const clientStats = statsCalculator.calculateFullDashboardStats(filtered, 'client');
    const driverStats = statsCalculator.calculateFullDashboardStats(filtered, 'driver');

    // Tendência diária (últimos 7 dias)
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

    return { 
      clientStats, 
      driverStats, 
      trend, 
      total: filtered.length,
      metrics: clientStats.metrics,
      operationTypes: clientStats.operationTypes,
      hourlyDistribution: clientStats.hourlyDistribution
    };
  }, [trips, activePeriod]);

  const maxTrend = Math.max(...analytics.trend.map(t => t.count), 1);
  const topClients = analytics.clientStats.entities.slice(0, 10);
  const topDrivers = analytics.driverStats.entities.slice(0, 10);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
      
      {/* 1. RESUMO EXECUTIVO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Eficiência Global', val: `${analytics.metrics.efficiencyRate}%`, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: 'bg-blue-600' },
          { label: 'Atraso Médio', val: `${analytics.metrics.avgDelayMinutes}m`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-indigo-600' },
          { label: 'Volume Ativo', val: analytics.metrics.activeResources, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10', color: 'bg-emerald-600' },
          { label: 'Total Período', val: analytics.total, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2', color: 'bg-slate-900' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
             <div className={`w-12 h-12 ${kpi.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d={kpi.icon}/></svg>
             </div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{kpi.label}</p>
                <p className="text-xl font-black text-slate-800">{kpi.val}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 2. GRÁFICO DE TENDÊNCIA */}
        <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Fluxo Semanal</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Comparativo de entrada vs conclusão</p>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
                <button 
                  key={p} onClick={() => setActivePeriod(p)}
                  className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activePeriod === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-end justify-between gap-6 h-64 px-4 mb-4">
            {analytics.trend.map((day, i) => {
              const height = (day.count / (maxTrend || 1)) * 100;
              const okHeight = day.count > 0 ? (day.ok / day.count) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                   <div className="w-full flex flex-col justify-end bg-slate-50/50 rounded-2xl overflow-hidden h-full border border-slate-100 transition-all hover:border-blue-300">
                      <div 
                        className="w-full bg-blue-600/10 relative transition-all duration-1000 ease-out flex flex-col justify-end"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                         <div 
                           className="w-full bg-blue-600 transition-all duration-1000 delay-300 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                           style={{ height: `${okHeight}%` }}
                         ></div>
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-slate-400 uppercase mt-5 group-hover:text-blue-600 transition-colors">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. DISTRIBUIÇÃO DE MODAIS */}
        <div className="lg:col-span-4 bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white flex flex-col relative overflow-hidden">
          <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Modalidades</h3>
          <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Participação por tipo de carga</p>
          
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="relative w-48 h-48">
               <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                 <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#1e293b" strokeWidth="3"></circle>
                 {(Object.entries(analytics.operationTypes) as [string, StatGroup][]).map(([type, s], idx) => {
                    const totalVal = analytics.total || 1;
                    const dashArray = (s.total / totalVal) * 100;
                    const previousTotal = (Object.values(analytics.operationTypes) as StatGroup[])
                      .slice(0, idx)
                      .reduce((acc, curr) => acc + curr.total, 0);
                    const dashOffset = (previousTotal / totalVal) * -100;
                    return (
                      <circle 
                        key={type} cx="18" cy="18" r="15.9" fill="transparent" 
                        stroke={idx === 0 ? "#2563eb" : idx === 1 ? "#10b981" : idx === 2 ? "#f59e0b" : "#8b5cf6"} 
                        strokeWidth="3.5" strokeDasharray={`${dashArray} 100`} strokeDashoffset={dashOffset}
                        className="transition-all duration-1000" strokeLinecap="round"
                      ></circle>
                    );
                 })}
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-black">{analytics.total}</p>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">OS TOTAL</p>
               </div>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-white/5">
             {(Object.entries(analytics.operationTypes) as [string, StatGroup][]).slice(0, 3).map(([type, s], i) => (
               <div key={type} className="flex items-center justify-between text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <span className="text-slate-400">{type}</span>
                  </div>
                  <span className="text-white">{s.total}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 4. RANKING TOP CLIENTES */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-10">
             <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Top 10 Clientes</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ranking por volume de movimentação</p>
             </div>
             <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
             </div>
          </div>
          <div className="space-y-6">
            {topClients.map((client) => (
              <BarChartRow key={client.name} entity={client} maxVal={topClients[0].total} colorClass="bg-blue-600" />
            ))}
          </div>
        </div>

        {/* 5. RANKING TOP MOTORISTAS */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-10">
             <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Alta Produtividade</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Motoristas com maior volume concluído</p>
             </div>
             <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
             </div>
          </div>
          <div className="space-y-6">
            {topDrivers.map((driver) => (
              <BarChartRow key={driver.name} entity={driver} maxVal={topDrivers[0].total} colorClass="bg-emerald-500" />
            ))}
          </div>
        </div>
      </div>

      {/* 6. HEATMAP HORÁRIO */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="mb-10">
           <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Mapa de Calor Operacional</h3>
           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Concentração de demandas por faixa horária</p>
        </div>
        <div className="grid grid-cols-12 md:grid-cols-24 gap-1.5">
           {Array.from({ length: 24 }).map((_, hour) => {
             const count = (analytics.hourlyDistribution as Record<number, number>)[hour] || 0;
             const maxHour = Math.max(...(Object.values(analytics.hourlyDistribution) as number[]), 1);
             const intensity = count / maxHour;
             return (
               <div key={hour} className="flex flex-col items-center gap-3">
                  <div 
                    className="w-full aspect-square rounded-lg transition-all duration-700"
                    style={{ 
                      backgroundColor: count === 0 ? '#f1f5f9' : `rgba(37, 99, 235, ${0.1 + intensity * 0.9})`,
                      boxShadow: count > (maxHour * 0.8) ? '0 0 15px rgba(37, 99, 235, 0.3)' : 'none'
                    }}
                    title={`${hour}h: ${count} OS`}
                  ></div>
                  <span className="text-[8px] font-black text-slate-400">{hour}h</span>
               </div>
             );
           })}
        </div>
      </div>

    </div>
  );
};

export default KpiVisualizer;
