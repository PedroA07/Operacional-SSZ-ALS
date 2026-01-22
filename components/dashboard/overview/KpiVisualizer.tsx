
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';
import { statsCalculator, StatGroup, EntitySummary } from '../../../utils/statsCalculator';

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
      statusCounts: clientStats.statusCounts,
      opTypes: clientStats.operationTypes,
      hours: clientStats.hourlyDistribution,
      cities: clientStats.cityDistribution
    };
  }, [trips, activePeriod]);

  const maxTrend = Math.max(...analytics.trend.map(t => t.count), 1);

  const StatCard = ({ label, value, sub, icon, color }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d={icon}/></svg>
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1.5">{sub}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
      
      {/* 1. KEY PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Assertividade" 
          value={`${analytics.metrics.efficiencyRate}%`} 
          sub="Viagens concluídas"
          color="bg-blue-600"
          icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
        <StatCard 
          label="Lead Time Médio" 
          value={`${analytics.metrics.avgLeadTimeHrs}h`} 
          sub="Ciclo total da OS"
          color="bg-indigo-600"
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <StatCard 
          label="Produtividade" 
          value={analytics.metrics.productivityPerDriver} 
          sub="Viagens / Motorista"
          color="bg-emerald-500"
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
        <StatCard 
          label="Fila Ativa" 
          value={analytics.metrics.activeResources} 
          sub="OS em andamento"
          color="bg-slate-900"
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 2. OPERATIONAL PIPELINE (FUNNEL) */}
        <div className="lg:col-span-4 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Carga no Pipeline</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Onde estão as cargas agora?</p>
          </div>
          
          <div className="flex-1 space-y-5">
            {[
              { label: 'Pendentes', key: 'Pendente', color: 'bg-slate-200' },
              { label: 'Retiradas', key: 'Retirada de vazio', color: 'bg-blue-300' },
              { label: 'Em Viagem', key: 'Em viagem', color: 'bg-blue-600' },
              { label: 'No Cliente', key: 'Chegou no cliente', color: 'bg-amber-500' },
              { label: 'Finais', key: 'Devolução do cheio', color: 'bg-indigo-600' },
              { label: 'Concluídas', key: 'Viagem concluída', color: 'bg-emerald-500' },
            ].map(item => {
              const count = analytics.statusCounts[item.key] || 0;
              const width = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
              return (
                <div key={item.key} className="space-y-1.5 group">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">{item.label}</span>
                    <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">{count}</span>
                  </div>
                  <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className={`h-full ${item.color} transition-all duration-1000 shadow-sm`} 
                      style={{ width: `${Math.max(width, count > 0 ? 5 : 0)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. TENDÊNCIA DE VOLUME (GRÁFICO AMPLIADO) */}
        <div className="lg:col-span-8 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Fluxo Operacional Diário</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Entrada vs. Conclusão (Últimos 7 dias)</p>
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
              const height = (day.count / maxTrend) * 100;
              const okHeight = day.count > 0 ? (day.ok / day.count) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                   <div className="w-full flex flex-col justify-end bg-slate-50 rounded-2xl overflow-hidden h-full border border-slate-100 group-hover:border-blue-200 transition-all">
                      <div 
                        className="w-full bg-blue-600/10 relative transition-all duration-1000 ease-out flex flex-col justify-end"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      >
                         <div 
                           className="w-full bg-blue-600 transition-all duration-1000 delay-300"
                           style={{ height: `${okHeight}%` }}
                         ></div>
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-slate-400 uppercase mt-5 group-hover:text-blue-600 transition-colors">{day.label}</span>
                   
                   <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl scale-90 group-hover:scale-100">
                      <p className="text-[11px] font-black whitespace-nowrap">{day.count} OS Criadas</p>
                      <p className="text-[9px] font-bold text-blue-400 whitespace-nowrap mt-1">{day.ok} Finalizadas</p>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 4. PERFORMANCE POR CLIENTE (TOP 10) */}
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Ranking de Clientes</h3>
              <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">Volume e Eficiência</span>
           </div>
           <div className="space-y-6">
              {analytics.clientStats.entities.slice(0, 8).map((entity) => (
                <div key={entity.name} className="space-y-2 group">
                   <div className="flex justify-between items-center px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-700 uppercase truncate max-w-[180px]">{entity.name}</span>
                        <span className="text-[9px] font-black text-blue-500">({entity.total})</span>
                      </div>
                      <span className={`text-[10px] font-black ${entity.efficiency >= 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{entity.efficiency}% OK</span>
                   </div>
                   <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 group-hover:border-blue-200 transition-colors">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-1000 ease-out"
                        style={{ width: `${(entity.total / analytics.clientStats.entities[0].total) * 100}%` }}
                      ></div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* 5. PERFORMANCE DA EQUIPE (TOP 10) */}
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Alta Performance: Motoristas</h3>
              <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase">Maior Entrega</span>
           </div>
           <div className="space-y-6">
              {analytics.driverStats.entities.slice(0, 8).map((entity) => (
                <div key={entity.name} className="space-y-2 group">
                   <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-black text-slate-700 uppercase truncate max-w-[180px]">{entity.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-mono font-bold text-slate-400">{entity.total} VIAGENS</span>
                        <span className="text-[10px] font-black text-emerald-600">{entity.efficiency}%</span>
                      </div>
                   </div>
                   <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 group-hover:border-emerald-200 transition-colors">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${(entity.total / analytics.driverStats.entities[0].total) * 100}%` }}
                      ></div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* 6. HEATMAP E DESTINOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* HEATMAP HORÁRIO */}
        <div className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
           <div className="mb-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Mapa de Calor Horário</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Concentração de demandas nas 24h do dia</p>
           </div>
           <div className="grid grid-cols-12 gap-2 h-40 items-end">
              {Array.from({ length: 24 }).map((_, hour) => {
                const count = analytics.hours[hour] || 0;
                /* Fix: cast Object.values(analytics.hours) to number[] to ensure compatibility with Math.max */
                const max = Math.max(...(Object.values(analytics.hours) as number[]), 1);
                const intensity = count / max;
                return (
                  <div key={hour} className="flex flex-col items-center gap-3">
                    <div 
                      className="w-full rounded-lg transition-all duration-1000"
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
        </div>

        {/* TOP DESTINOS */}
        <div className="lg:col-span-5 bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl flex flex-col overflow-hidden">
           <div className="mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Principais Rotas</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Cidades com maior volume de destino</p>
           </div>
           <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {(Object.entries(analytics.cities) as [string, number][])
                .sort((a,b) => b[1] - a[1])
                .slice(0, 5)
                .map(([city, count], idx) => (
                <div key={city} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                   <div className="flex items-center gap-4">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                      <span className="text-[11px] font-black uppercase tracking-tight truncate max-w-[140px]">{city}</span>
                   </div>
                   <div className="text-right">
                      <p className="text-[11px] font-black">{count} OS</p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase">Volume Total</p>
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
