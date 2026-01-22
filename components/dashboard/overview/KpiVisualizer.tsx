
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';
import { statsCalculator } from '../../../utils/statsCalculator';
import KpiInfoIcon from './KpiInfoIcon';
import DonutChart from './DonutChart';

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

    const typeCounts: Record<string, number> = {};
    filtered.forEach(t => {
      const type = t.type || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return { 
      clientStats, 
      driverStats, 
      total: filtered.length,
      metrics: clientStats.metrics,
      typeCounts,
      cities: clientStats.cityDistribution,
      clientCities: clientStats.clientCityDistribution,
      terminals: clientStats.terminalDistribution
    };
  }, [trips, activePeriod]);

  const RankingCard = ({ title, data, type = 'Maiores', colorClass = 'bg-blue-600', kpiKey }: any) => {
    const [localLimit, setLocalLimit] = useState(5);
    
    const items = Array.isArray(data) 
      ? data 
      : (Object.entries(data) as [string, number][]).map(([name, total]) => ({ name, total }));

    const sortedData = type === 'Maiores' 
      ? [...items].sort((a, b) => b.total - a.total).slice(0, localLimit)
      : [...items].sort((a, b) => a.total - b.total).filter(i => i.total > 0).slice(0, localLimit);

    const maxVal = items.length > 0 ? Math.max(...items.map((i: any) => i.total)) : 1;

    return (
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-full transition-all hover:border-blue-100">
        <div className="flex justify-between items-start mb-8">
           <div className="flex items-center">
              <h3 className={`text-sm font-black uppercase tracking-widest ${type === 'Maiores' ? 'text-slate-800' : 'text-amber-600'}`}>
                {type} {title}
              </h3>
              {kpiKey && <KpiInfoIcon kpiKey={kpiKey} />}
           </div>
           
           {/* Seletor de Quantidade Individual */}
           <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {[5, 10, 15].map(v => (
                <button 
                  key={v} onClick={() => setLocalLimit(v)}
                  className={`w-7 h-6 rounded flex items-center justify-center text-[8px] font-black transition-all ${localLimit === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {v}
                </button>
              ))}
           </div>
        </div>
        <div className="space-y-5 flex-1">
          {sortedData.map((item) => (
            <div key={item.name} className="space-y-1.5 group">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-slate-600 truncate max-w-[240px] group-hover:text-slate-900 transition-colors">{item.name}</span>
                <span className="text-slate-900 font-mono">{item.total}</span>
              </div>
              <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100 group-hover:border-blue-100 transition-all">
                <div 
                  className={`h-full ${type === 'Maiores' ? colorClass : 'bg-amber-400'} transition-all duration-1000 ease-out shadow-sm`} 
                  style={{ width: `${(item.total / maxVal) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
          {sortedData.length === 0 && (
            <div className="py-20 text-center">
               <p className="text-[10px] font-black text-slate-300 uppercase italic">Sem registros no período</p>
            </div>
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
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
           </div>
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">ALS Analytics BI</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sincronização de Performance em Tempo Real</p>
           </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
             <button 
               key={p} onClick={() => setActivePeriod(p)}
               className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activePeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               {p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mês' : 'Ano'}
             </button>
           ))}
        </div>
      </div>

      {/* 1. INDICADORES CHAVE (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { key: 'ASSERTIVIDADE', label: 'Assertividade', val: `${analytics.metrics.efficiencyRate}%`, color: 'bg-blue-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
          { key: 'LEAD_TIME', label: 'Lead Time Médio', val: `${analytics.metrics.avgLeadTimeHrs}h`, color: 'bg-indigo-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { key: 'PRODUTIVIDADE', label: 'Produtividade', val: analytics.metrics.productivityPerDriver, color: 'bg-emerald-500', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { key: 'FILA_ATIVA', label: 'Fila Ativa', val: analytics.metrics.activeResources, color: 'bg-slate-900', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10' }
        ].map((item) => (
          <div key={item.key} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
             <div className="flex flex-col">
                <div className="flex items-center mb-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.label}</p>
                  <KpiInfoIcon kpiKey={item.key as any} />
                </div>
                <p className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{item.val}</p>
             </div>
             <div className={`w-14 h-14 ${item.color} rounded-[1.4rem] flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform`}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d={item.icon}/></svg>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 2. MIX DE MODALIDADES */}
        <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Mix de Modalidades</h3>
                 <KpiInfoIcon kpiKey="MODALIDADES" />
              </div>
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeWidth="2.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
              </div>
           </div>
           <DonutChart data={analytics.typeCounts} total={analytics.total} />
        </div>

        {/* 3. PÓLOS COMERCIAIS */}
        <div className="lg:col-span-7 bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white flex flex-col relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-5">
              <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
           </div>
           <div className="flex justify-between items-center mb-10 relative z-10">
              <div className="flex items-center">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Pólos Comerciais (Origem)</h3>
                <KpiInfoIcon kpiKey="CIDADES_CLIENTES" />
              </div>
              <span className="text-[9px] font-black bg-white/10 px-3 py-1.5 rounded-full uppercase border border-white/5">Localização do Faturamento</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 relative z-10">
              {(Object.entries(analytics.clientCities) as [string, number][])
                .sort((a,b) => b[1] - a[1])
                .slice(0, 10)
                .map(([city, count], idx) => (
                <div key={city} className="flex items-center justify-between border-b border-white/5 pb-3 group hover:border-blue-500/50 transition-colors">
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-600 font-mono">#{(idx+1).toString().padStart(2, '0')}</span>
                      <span className="text-[11px] font-black uppercase tracking-tight truncate max-w-[140px] group-hover:text-blue-200 transition-colors">{city}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-blue-400">{count}</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* 4. RANKINGS DE CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Clientes (Volume)" data={analytics.clientStats.entities} type="Maiores" colorClass="bg-blue-600" kpiKey="PERFORMANCE_ENTIDADES" />
        <RankingCard title="Clientes (Volume)" data={analytics.clientStats.entities} type="Menores" kpiKey="PERFORMANCE_ENTIDADES" />
      </div>

      {/* 5. RANKINGS DE MOTORISTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Motoristas (Viagens)" data={analytics.driverStats.entities} type="Maiores" colorClass="bg-emerald-500" kpiKey="PERFORMANCE_ENTIDADES" />
        <RankingCard title="Motoristas (Viagens)" data={analytics.driverStats.entities} type="Menores" kpiKey="PERFORMANCE_ENTIDADES" />
      </div>

      {/* 6. RANKINGS DE TERMINAIS (DESTINO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Terminais / Portos" data={analytics.terminals} type="Maiores" colorClass="bg-indigo-600" kpiKey="TERMINAIS" />
        <RankingCard title="Terminais / Portos" data={analytics.terminals} type="Menores" kpiKey="TERMINAIS" />
      </div>

    </div>
  );
};

export default KpiVisualizer;
