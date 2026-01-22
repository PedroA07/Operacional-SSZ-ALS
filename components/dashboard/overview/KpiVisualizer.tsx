
import React, { useMemo, useState } from 'react';
import { Trip, Driver } from '../../../types';
import { statsCalculator, StatGroup, EntitySummary } from '../../../utils/statsCalculator';
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

    // Distribuição de Tipos (Donut)
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
      cities: clientStats.cityDistribution
    };
  }, [trips, activePeriod]);

  const RankingCard = ({ title, data, type = 'Top', colorClass = 'bg-blue-600', kpiKey }: any) => {
    const sortedData = type === 'Top' 
      ? [...data].sort((a, b) => b.total - a.total).slice(0, 5)
      : [...data].sort((a, b) => a.total - b.total).filter(i => i.total > 0).slice(0, 5);

    const maxVal = data.length > 0 ? Math.max(...data.map((i: any) => i.total)) : 1;

    return (
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center">
              <h3 className={`text-sm font-black uppercase tracking-widest ${type === 'Top' ? 'text-slate-800' : 'text-amber-600'}`}>
                {type} 5 {title}
              </h3>
              {kpiKey && <KpiInfoIcon kpiKey={kpiKey} />}
           </div>
           <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${type === 'Top' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
             {type === 'Top' ? 'Alta Volumetria' : 'Baixa Volumetria'}
           </span>
        </div>
        <div className="space-y-6 flex-1">
          {sortedData.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-slate-600 truncate max-w-[200px]">{item.name}</span>
                <span className="text-slate-900">{item.total} OS</span>
              </div>
              <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div 
                  className={`h-full ${type === 'Top' ? colorClass : 'bg-amber-400'} transition-all duration-1000`} 
                  style={{ width: `${(item.total / maxVal) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
          {sortedData.length === 0 && <p className="text-center text-slate-300 font-bold uppercase text-[10px] py-10">Sem dados</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
      
      {/* 1. KEY PERFORMANCE INDICATORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { key: 'ASSERTIVIDADE', label: 'Assertividade', val: `${analytics.metrics.efficiencyRate}%`, color: 'bg-blue-600' },
          { key: 'LEAD_TIME', label: 'Lead Time Médio', val: `${analytics.metrics.avgLeadTimeHrs}h`, color: 'bg-indigo-600' },
          { key: 'PRODUTIVIDADE', label: 'Produtividade', val: analytics.metrics.productivityPerDriver, color: 'bg-emerald-500' },
          { key: 'FILA_ATIVA', label: 'Fila Ativa', val: analytics.metrics.activeResources, color: 'bg-slate-900' }
        ].map((item) => (
          <div key={item.key} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
             <div className="flex flex-col">
                <div className="flex items-center mb-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.label}</p>
                  <KpiInfoIcon kpiKey={item.key as any} />
                </div>
                <p className="text-2xl font-black text-slate-800 leading-none">{item.val}</p>
             </div>
             <div className={`w-10 h-10 ${item.color} rounded-xl shadow-lg`}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 2. TIPOS DE VIAGEM (DONUT) */}
        <div className="lg:col-span-5 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Mix de Modalidades</h3>
                 <KpiInfoIcon kpiKey="MODALIDADES" />
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                 {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
                   <button 
                     key={p} onClick={() => setActivePeriod(p)}
                     className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${activePeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                   >
                     {p === 'WEEK' ? 'Sem' : p === 'MONTH' ? 'Mês' : 'Ano'}
                   </button>
                 ))}
              </div>
           </div>
           <DonutChart data={analytics.typeCounts} total={analytics.total} />
        </div>

        {/* 3. RANKING DE CIDADES (CLIENTES) */}
        <div className="lg:col-span-7 bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white flex flex-col">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Distribuição Regional (Clientes)</h3>
              <span className="text-[8px] font-black bg-white/5 px-3 py-1 rounded-full uppercase">Top 10 Cidades</span>
           </div>
           <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              {/* Fix: cast Object.entries to [string, number][] to fix arithmetic errors during sort */}
              {(Object.entries(analytics.cities) as [string, number][]).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([city, count], idx) => (
                <div key={city} className="flex items-center justify-between border-b border-white/5 pb-2">
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-600 font-mono">#{(idx+1).toString().padStart(2, '0')}</span>
                      <span className="text-[11px] font-black uppercase tracking-tight truncate max-w-[140px]">{city}</span>
                   </div>
                   <span className="text-[11px] font-black text-blue-400">{count}</span>
                </div>
              ))}
           </div>
           <p className="mt-auto text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center pt-8 italic">Dados baseados no endereço fiscal dos contratantes</p>
        </div>
      </div>

      {/* 4. RANKINGS TOP & BOTTOM (CLIENTES) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Clientes" data={analytics.clientStats.entities} type="Top" colorClass="bg-blue-600" kpiKey="PERFORMANCE_ENTIDADES" />
        <RankingCard title="Clientes" data={analytics.clientStats.entities} type="Bottom" kpiKey="PERFORMANCE_ENTIDADES" />
      </div>

      {/* 5. RANKINGS TOP & BOTTOM (MOTORISTAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Motoristas" data={analytics.driverStats.entities} type="Top" colorClass="bg-emerald-500" kpiKey="PERFORMANCE_ENTIDADES" />
        <RankingCard title="Motoristas" data={analytics.driverStats.entities} type="Bottom" kpiKey="PERFORMANCE_ENTIDADES" />
      </div>

    </div>
  );
};

export default KpiVisualizer;
