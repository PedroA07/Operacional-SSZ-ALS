
import React, { useMemo, useState } from 'react';
import { Trip, Driver, Category } from '../../../types';
import { statsCalculator, EntitySummary } from '../../../utils/statsCalculator';
import KpiInfoIcon from './KpiInfoIcon';
import DonutChart from './DonutChart';

interface KpiVisualizerProps {
  trips: Trip[];
  drivers: Driver[];
}

const KpiVisualizer: React.FC<KpiVisualizerProps> = ({ trips, drivers }) => {
  const [activePeriod, setActivePeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');
  const [cityLimit, setCityLimit] = useState(10);
  
  // Filtros locais para os cards de Clientes
  const [clientCategoryFilter, setClientCategoryFilter] = useState<string>('TODAS');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('TODOS');

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

    // Stats filtrados especificamente para os rankings de Clientes (Baseado nos filtros de Categoria/Tipo)
    let tripsForClientRanking = filtered;
    if (clientCategoryFilter !== 'TODAS') {
      tripsForClientRanking = tripsForClientRanking.filter(t => t.category === clientCategoryFilter);
    }
    if (clientTypeFilter !== 'TODOS') {
      tripsForClientRanking = tripsForClientRanking.filter(t => t.type === clientTypeFilter);
    }
    const filteredClientStats = statsCalculator.calculateFullDashboardStats(tripsForClientRanking, 'client');

    const typeCounts: Record<string, number> = {};
    filtered.forEach(t => {
      const type = (t.type || 'OUTROS').toUpperCase();
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const categories = Array.from(new Set(trips.map(t => t.category))).filter(Boolean);
    const types = Array.from(new Set(trips.map(t => t.type))).filter(Boolean);

    return { 
      clientStats, 
      driverStats,
      filteredClientStats,
      total: filtered.length,
      metrics: clientStats.metrics,
      typeCounts,
      categoryCounts: clientStats.categoryCounts,
      clientCities: clientStats.clientCityDistribution,
      terminals: clientStats.terminalDistribution,
      availableCategories: categories,
      availableTypes: types
    };
  }, [trips, activePeriod, clientCategoryFilter, clientTypeFilter]);

  const RankingCard = ({ title, data, type = 'Maiores', colorClass = 'bg-blue-600', kpiKey, isClientCard = false }: any) => {
    const [localLimit, setLocalLimit] = useState(5);
    
    const items = useMemo(() => {
      if (Array.isArray(data)) return data; 
      return (Object.entries(data) as [string, any][]).map(([name, info]) => ({
        name,
        total: typeof info === 'number' ? info : info.total,
        document: typeof info === 'number' ? '' : '',
        subLabel: typeof info === 'number' ? '' : info.location
      }));
    }, [data]);

    const sortedData = useMemo(() => {
      const sorted = type === 'Maiores' 
        ? [...items].sort((a, b) => b.total - a.total)
        : [...items].sort((a, b) => a.total - b.total).filter(i => i.total > 0);
      return sorted.slice(0, localLimit);
    }, [items, type, localLimit]);

    const maxVal = items.length > 0 ? Math.max(...items.map((i: any) => i.total)) : 1;

    return (
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-full transition-all hover:border-blue-100">
        <div className="flex flex-col gap-6 mb-8">
           <div className="flex justify-between items-start">
              <div className="flex items-center">
                 <h3 className={`text-sm font-black uppercase tracking-widest ${type === 'Maiores' ? 'text-slate-800' : 'text-amber-600'}`}>
                   {type} {title}
                 </h3>
                 {kpiKey && <KpiInfoIcon kpiKey={kpiKey} />}
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                 {[5, 10, 15].map(v => (
                   <button key={v} onClick={() => setLocalLimit(v)} className={`w-7 h-6 rounded flex items-center justify-center text-[8px] font-black transition-all ${localLimit === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{v}</button>
                 ))}
              </div>
           </div>

           {/* Filtros Internos para Clientes */}
           {isClientCard && (
             <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                <div className="space-y-1">
                   <p className="text-[7px] font-black text-slate-400 uppercase ml-1">Categoria</p>
                   <select 
                     className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[9px] font-bold uppercase outline-none focus:border-blue-300"
                     value={clientCategoryFilter}
                     onChange={(e) => setClientCategoryFilter(e.target.value)}
                   >
                     <option value="TODAS">TODAS</option>
                     {analytics.availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <p className="text-[7px] font-black text-slate-400 uppercase ml-1">Modalidade</p>
                   <select 
                     className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[9px] font-bold uppercase outline-none focus:border-blue-300"
                     value={clientTypeFilter}
                     onChange={(e) => setClientTypeFilter(e.target.value)}
                   >
                     <option value="TODOS">TODOS</option>
                     {analytics.availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>
             </div>
           )}
        </div>

        <div className="space-y-6 flex-1">
          {sortedData.map((item) => (
            <div key={item.name} className="space-y-2 group">
              <div className="flex justify-between items-end">
                <div className="min-w-0">
                  <span className="text-[11px] font-black text-slate-900 uppercase truncate block leading-none">{item.name}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    {item.document && (
                      <span className="text-[8px] font-mono font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">{item.document}</span>
                    )}
                    {item.subLabel && (
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[150px]">{item.subLabel}</span>
                    )}
                  </div>
                </div>
                <span className="text-lg font-black text-slate-800 font-mono leading-none pl-4">{item.total}</span>
              </div>
              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 group-hover:border-blue-100 transition-all">
                <div className={`h-full ${type === 'Maiores' ? colorClass : 'bg-amber-400'} transition-all duration-1000 ease-out shadow-sm`} style={{ width: `${(item.total / maxVal) * 100}%` }}></div>
              </div>
            </div>
          ))}
          {sortedData.length === 0 && (
             <p className="text-center py-10 text-[9px] font-black text-slate-300 uppercase italic">Sem registros para os filtros selecionados</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-32">
      
      {/* CABEÇALHO DE CONTROLES BI */}
      <div className="bg-white p-8 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
           </div>
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">ALS Analytics BI</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Inteligência Operacional de Alta Performance</p>
           </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
             <button key={p} onClick={() => setActivePeriod(p)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activePeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mês' : 'Ano'}</button>
           ))}
        </div>
      </div>

      {/* 1. INDICADORES CHAVE (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { key: 'ASSERTIVIDADE', label: 'Assertividade', val: `${analytics.metrics.efficiencyRate}%`, color: 'bg-blue-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', target: null },
          { key: 'LEAD_TIME', label: 'Lead Time Médio', val: `${analytics.metrics.avgLeadTimeHrs}h`, color: 'bg-indigo-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', target: null },
          { key: 'PRODUTIVIDADE', label: 'Produtividade', val: analytics.metrics.productivityPerDriver, color: 'bg-emerald-500', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', target: analytics.metrics.productivityTarget },
          { key: 'FILA_ATIVA', label: 'Fila Ativa', val: analytics.metrics.activeResources, color: 'bg-slate-900', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10', target: null }
        ].map((item) => (
          <div key={item.key} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
             <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                      <KpiInfoIcon kpiKey={item.key as any} />
                    </div>
                    <p className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{item.val}</p>
                </div>
                <div className={`w-14 h-14 ${item.color} rounded-[1.4rem] flex items-center justify-center text-white shadow-xl group-hover:rotate-6 transition-transform`}>
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d={item.icon}/></svg>
                </div>
             </div>
             {item.target && (
                <div className="mt-6 space-y-2">
                   <div className="flex justify-between text-[8px] font-black uppercase">
                      <span className="text-slate-400">Máximo sugerido: {item.target}</span>
                      <span className="text-emerald-500">{Math.round((item.val as number / item.target) * 100)}% de Eficiência</span>
                   </div>
                   <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (item.val as number / item.target) * 100)}%` }}></div>
                   </div>
                </div>
             )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 2. GRÁFICOS DE PIZZA (DONUTS) */}
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-12">
           <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">Mix de Modalidades</h3>
                  <KpiInfoIcon kpiKey="MODALIDADES" />
                </div>
                <span className="text-[9px] font-bold text-slate-300 uppercase">Volume por Operação</span>
              </div>
              <DonutChart data={analytics.typeCounts} total={analytics.total} colors={['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe']} />
           </div>

           <div className="pt-10 border-t border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600">Fatia por Categoria</h3>
                  <KpiInfoIcon kpiKey="PERFORMANCE_ENTIDADES" />
                </div>
                <span className="text-[9px] font-bold text-slate-300 uppercase">Vínculos Estratégicos</span>
              </div>
              <DonutChart data={analytics.categoryCounts} total={analytics.total} colors={['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe']} />
           </div>
        </div>

        {/* 3. PÓLOS COMERCIAIS */}
        <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white flex flex-col relative overflow-hidden h-full">
           <div className="absolute top-0 right-0 p-10 opacity-5">
              <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
           </div>
           <div className="flex justify-between items-center mb-10 relative z-10">
              <div className="flex items-center">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Origem de Faturamento</h3>
                <KpiInfoIcon kpiKey="CIDADES_CLIENTES" />
              </div>
              
              <div className="flex gap-1 bg-white/10 p-1 rounded-lg">
                {[5, 10, 15].map(v => (
                  <button 
                    key={v} onClick={() => setCityLimit(v)}
                    className={`w-7 h-6 rounded flex items-center justify-center text-[8px] font-black transition-all ${cityLimit === v ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
           </div>
           <div className="grid grid-cols-1 gap-y-4 relative z-10 overflow-y-auto custom-scrollbar pr-4">
              {(Object.entries(analytics.clientCities) as [string, number][])
                .sort((a,b) => b[1] - a[1])
                .slice(0, cityLimit)
                .map(([city, count], idx) => (
                <div key={city} className="flex items-center justify-between border-b border-white/5 pb-3 group hover:border-blue-500/50 transition-colors">
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-600 font-mono w-4">{(idx+1)}</span>
                      <span className="text-[11px] font-black uppercase tracking-tight truncate max-w-[200px] group-hover:text-blue-200 transition-colors">{city}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-blue-400">{count} OS</span>
                      <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500/50" style={{ width: `${(count / (Math.max(1, ...Object.values(analytics.clientCities) as number[]))) * 100}%` }}></div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Clientes (Volume)" data={analytics.filteredClientStats.entities} type="Maiores" colorClass="bg-blue-600" kpiKey="PERFORMANCE_ENTIDADES" isClientCard={true} />
        <RankingCard title="Clientes (Volume)" data={analytics.filteredClientStats.entities} type="Menores" kpiKey="PERFORMANCE_ENTIDADES" isClientCard={true} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Motoristas (Viagens)" data={analytics.driverStats.entities} type="Maiores" colorClass="bg-emerald-500" kpiKey="PERFORMANCE_ENTIDADES" />
        <RankingCard title="Motoristas (Viagens)" data={analytics.driverStats.entities} type="Menores" kpiKey="PERFORMANCE_ENTIDADES" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Terminais / Portos" data={analytics.terminals} type="Maiores" colorClass="bg-indigo-600" kpiKey="TERMINAIS" />
        <RankingCard title="Terminais / Portos" data={analytics.terminals} type="Menores" kpiKey="TERMINAIS" />
      </div>

    </div>
  );
};

export default KpiVisualizer;
