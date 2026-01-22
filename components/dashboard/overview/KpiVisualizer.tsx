import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';
import { statsCalculator, StatGroup } from '../../../utils/statsCalculator';

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

    const stats = statsCalculator.calculateFullDashboardStats(filtered, 'client');
    const driverStats = statsCalculator.calculateFullDashboardStats(filtered, 'driver');

    // Tendência diária
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

    return { stats, driverStats, trend, total: filtered.length, raw: filtered };
  }, [trips, activePeriod]);

  const maxTrend = Math.max(...analytics.trend.map(t => t.count), 1);

  const StatusFunnelItem = ({ label, count, color, total }: any) => {
    const width = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[9px] font-black uppercase">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-700">{count}</span>
        </div>
        <div className="h-4 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
          <div className={`h-full ${color} transition-all duration-1000 shadow-sm`} style={{ width: `${width}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
      
      {/* 1. HEADER KPIs CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
           <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assertividade</p>
              <p className="text-2xl font-black text-slate-800">{analytics.stats.metrics.efficiencyRate}%</p>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
           <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atraso Médio</p>
              <p className="text-2xl font-black text-slate-800">{analytics.stats.metrics.avgDelayMinutes} <span className="text-xs">min</span></p>
           </div>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl flex items-center gap-6 text-white">
           <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Motoristas Ativos</p>
              <p className="text-2xl font-black">{analytics.stats.metrics.activeResources}</p>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
           <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Destino</p>
              <p className="text-lg font-black text-slate-800 uppercase truncate max-w-[120px]">
                {/* Fix: cast Object.entries to solve arithmetic operation type errors */}
                {(Object.entries(analytics.stats.cityDistribution) as [string, number][]).sort((a,b) => b[1]-a[1])[0]?.[0] || '---'}
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 2. GRÁFICO DE TENDÊNCIA AMPLIADO */}
        <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Tendência de Volume</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Evolução diária de ordens de serviço</p>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
                <button 
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activePeriod === p ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-end justify-between gap-6 h-72 px-4 mb-4">
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
                   
                   <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl scale-90 group-hover:scale-100">
                      <p className="text-[11px] font-black whitespace-nowrap">{day.count} OS Geradas</p>
                      <p className="text-[9px] font-bold text-blue-400 whitespace-nowrap mt-1">{day.ok} Concluídas ({Math.round(okHeight)}%)</p>
                   </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. PIPELINE DE STATUS (FUNNEL) */}
        <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Carga no Pipeline</h3>
            <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Volume por estágio atual</p>
          </div>
          
          <div className="flex-1 space-y-6">
             <StatusFunnelItem label="Pendentes" count={analytics.stats.statusCounts['Pendente'] || 0} color="bg-slate-300" total={analytics.total} />
             <StatusFunnelItem label="Em Retirada" count={(analytics.stats.statusCounts['Retirada de vazio'] || 0) + (analytics.stats.statusCounts['Retirada do cheio'] || 0)} color="bg-blue-400" total={analytics.total} />
             <StatusFunnelItem label="Em Viagem" count={analytics.stats.statusCounts['Em viagem'] || 0} color="bg-blue-600" total={analytics.total} />
             <StatusFunnelItem label="No Cliente" count={analytics.stats.statusCounts['Chegou no cliente'] || 0} color="bg-amber-500" total={analytics.total} />
             <StatusFunnelItem label="Finalizando" count={(analytics.stats.statusCounts['Chegou no destino'] || 0) + (analytics.stats.statusCounts['Devolução do cheio'] || 0)} color="bg-indigo-600" total={analytics.total} />
             <StatusFunnelItem label="Concluídas" count={analytics.stats.statusCounts['Viagem concluída'] || 0} color="bg-emerald-500" total={analytics.total} />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
             <p className="text-[11px] font-black text-slate-800 uppercase">Total na Esteira</p>
             <p className="text-xl font-black text-blue-600">{analytics.total}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 4. ANÁLISE DE MODALIDADES (RADIAL CONCEPT) */}
        <div className="lg:col-span-5 bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white flex flex-col relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Distribuição de Modais</h3>
            <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Volume por tipo de operação</p>
          </div>

          <div className="flex-1 flex items-center justify-center py-12">
            <div className="relative w-64 h-64">
               <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                 <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#1e293b" strokeWidth="2"></circle>
                 {(Object.entries(analytics.stats.operationTypes) as [string, StatGroup][]).map(([type, s], idx) => {
                    const totalVal = analytics.total || 1;
                    const dashArray = (s.total / totalVal) * 100;
                    // Calcula offset acumulado
                    const previousTotal = (Object.values(analytics.stats.operationTypes) as StatGroup[])
                      .slice(0, idx)
                      .reduce((acc, curr) => acc + curr.total, 0);
                    const dashOffset = (previousTotal / totalVal) * -100;

                    return (
                      <circle 
                        key={type}
                        cx="18" cy="18" r="15.9" 
                        fill="transparent" 
                        stroke={idx === 0 ? "#2563eb" : idx === 1 ? "#10b981" : idx === 2 ? "#f59e0b" : "#8b5cf6"} 
                        strokeWidth="3" 
                        strokeDasharray={`${dashArray} 100`}
                        strokeDashoffset={dashOffset}
                        className="transition-all duration-1000"
                        strokeLinecap="round"
                      ></circle>
                    );
                 })}
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-5xl font-black tracking-tighter">{analytics.total}</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">OS Total</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-auto border-t border-white/5 pt-8">
             {(Object.entries(analytics.stats.operationTypes) as [string, StatGroup][]).slice(0, 4).map(([type, s], i) => (
               <div key={type} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-emerald-500' : i === 2 ? 'bg-amber-500' : 'bg-purple-500'}`}></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase truncate text-slate-300">{type}</p>
                    <p className="text-sm font-black">{Math.round((s.total / (analytics.total || 1)) * 100)}% <span className="text-[10px] text-slate-500 ml-1">({s.total})</span></p>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* 5. ANÁLISE DE HORÁRIOS DE PICO (HEATMAP STYLE) */}
        <div className="lg:col-span-7 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
           <div className="mb-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Densidade por Horário</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Picos de demanda nas últimas 24h</p>
           </div>

           <div className="grid grid-cols-12 gap-2 h-48">
              {Array.from({ length: 24 }).map((_, hour) => {
                const count = analytics.stats.hourlyDistribution[hour] || 0;
                {/* Fix: cast Object.values to number[] to fix Math.max argument type error */}
                const maxHourCount = Math.max(...(Object.values(analytics.stats.hourlyDistribution) as number[]), 1);
                const intensity = (count / maxHourCount);
                return (
                  <div key={hour} className="flex flex-col items-center gap-3 h-full justify-end">
                     <div 
                       className="w-full rounded-lg transition-all duration-1000 shadow-inner"
                       style={{ 
                         height: `${Math.max(intensity * 100, 5)}%`,
                         backgroundColor: count > 0 ? `rgba(37, 99, 235, ${0.2 + intensity * 0.8})` : '#f1f5f9'
                       }}
                       title={`${hour}h: ${count} OS`}
                     ></div>
                     <span className="text-[8px] font-black text-slate-400">{hour}h</span>
                  </div>
                );
              })}
           </div>

           <div className="mt-12 grid grid-cols-3 gap-6 pt-10 border-t border-slate-50">
              <div className="text-center">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Turno Manhã</p>
                 <p className="text-xl font-black text-slate-800 mt-1">
                   {/* Fix: cast entry value to number in reduction to fix unknown type error */}
                   {(Object.entries(analytics.stats.hourlyDistribution) as [string, number][]).filter(([h]) => Number(h) >= 6 && Number(h) < 12).reduce((a,b) => a+(b[1] as number), 0)}
                 </p>
              </div>
              <div className="text-center border-x border-slate-100">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Turno Tarde</p>
                 <p className="text-xl font-black text-slate-800 mt-1">
                   {/* Fix: cast entry value to number in reduction to fix unknown type error */}
                   {(Object.entries(analytics.stats.hourlyDistribution) as [string, number][]).filter(([h]) => Number(h) >= 12 && Number(h) < 18).reduce((a,b) => a+(b[1] as number), 0)}
                 </p>
              </div>
              <div className="text-center">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Turno Noite</p>
                 <p className="text-xl font-black text-slate-800 mt-1">
                   {/* Fix: cast entry value to number in reduction to fix unknown type error */}
                   {(Object.entries(analytics.stats.hourlyDistribution) as [string, number][]).filter(([h]) => Number(h) >= 18 || Number(h) < 6).reduce((a,b) => a+(b[1] as number), 0)}
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* 6. TOP CIDADES / ROTAS */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
         <div className="flex justify-between items-center mb-10">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Principais Rotas de Atendimento</h3>
            <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Top 10 Cidades</span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Fix: cast Object.entries to [string, number][] to solve arithmetic operation type errors */}
            {(Object.entries(analytics.stats.cityDistribution) as [string, number][])
              .sort((a,b) => b[1]-a[1])
              .slice(0, 10)
              .map(([city, count], idx) => (
                <div key={city} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center group hover:bg-blue-600 transition-all">
                   <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 font-black text-xs shadow-sm mb-4 group-hover:scale-110 transition-transform">
                      {idx + 1}
                   </div>
                   <p className="text-[11px] font-black uppercase text-slate-800 group-hover:text-white truncate w-full">{city}</p>
                   <p className="text-[10px] font-bold text-slate-400 mt-1 group-hover:text-blue-100">{count} Viagens</p>
                </div>
              ))}
         </div>
      </div>

    </div>
  );
};

export default KpiVisualizer;