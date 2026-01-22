
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
  
  // Filtros Globais de Categoria para o Novo Gráfico Central
  const [coreCategory, setCoreCategory] = useState<string>('');

  // Estados de Filtro por Card (Combinações)
  const [filters, setFilters] = useState({
    client: { cat: 'TODAS', type: 'TODOS' },
    driver: { cat: 'TODAS', type: 'TODOS' },
    city: { cat: 'TODAS', type: 'TODOS' },
    terminal: { cat: 'TODAS', type: 'TODOS' }
  });

  const availableData = useMemo(() => {
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

    const categories = Array.from(new Set(trips.map(t => t.category))).filter(Boolean).sort();
    const types = Array.from(new Set(trips.map(t => t.type))).filter(Boolean).sort();

    if (!coreCategory && categories.length > 0) setCoreCategory(categories[0]);

    return { filtered, categories, types };
  }, [trips, activePeriod]);

  // Cálculo do Category Core Analysis
  const coreStats = useMemo(() => {
    const subset = availableData.filtered.filter(t => t.category === coreCategory);
    const total = subset.length;
    const typeDistribution: Record<string, number> = {};
    subset.forEach(t => {
      const type = (t.type || 'OUTROS').toUpperCase();
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    return { total, typeDistribution };
  }, [availableData.filtered, coreCategory]);

  const getFilteredStats = (cardKey: keyof typeof filters) => {
    let subset = availableData.filtered;
    const f = filters[cardKey];
    if (f.cat !== 'TODAS') subset = subset.filter(t => t.category === f.cat);
    if (f.type !== 'TODOS') subset = subset.filter(t => t.type === f.type);
    return statsCalculator.calculateFullDashboardStats(subset, cardKey === 'driver' ? 'driver' : 'client');
  };

  const CardFilters = ({ cardKey }: { cardKey: keyof typeof filters }) => (
    <div className="grid grid-cols-2 gap-2 mb-6 pt-4 border-t border-slate-50">
      <div className="space-y-1">
        <p className="text-[7px] font-black text-slate-400 uppercase ml-1">Filtrar Categoria</p>
        <select 
          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[9px] font-black uppercase outline-none focus:border-blue-300 transition-all"
          value={filters[cardKey].cat}
          onChange={(e) => setFilters({...filters, [cardKey]: { ...filters[cardKey], cat: e.target.value }})}
        >
          <option value="TODAS">TODAS AS CATEGORIAS</option>
          {availableData.categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <p className="text-[7px] font-black text-slate-400 uppercase ml-1">Filtrar Modalidade</p>
        <select 
          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[9px] font-black uppercase outline-none focus:border-blue-300 transition-all"
          value={filters[cardKey].type}
          onChange={(e) => setFilters({...filters, [cardKey]: { ...filters[cardKey], type: e.target.value }})}
        >
          <option value="TODOS">TODOS OS TIPOS</option>
          {availableData.types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );

  const RankingCard = ({ title, cardKey, colorClass = 'bg-blue-600', kpiKey }: any) => {
    const [limit, setLimit] = useState(5);
    const data = getFilteredStats(cardKey);
    
    const items = useMemo(() => {
      if (cardKey === 'city') {
        // Explicitly cast Object.entries to ensure type safety for arithmetic operations
        return (Object.entries(data.cityDistribution) as [string, number][]).map(([name, total]) => ({ name, total, document: '', subLabel: 'LOCALIDADE' }));
      }
      if (cardKey === 'terminal') {
        // Explicitly cast Object.entries to ensure type safety for accessing info properties
        return (Object.entries(data.terminalDistribution) as [string, any][]).map(([name, info]) => ({ name, total: info.total, document: '', subLabel: info.location }));
      }
      return data.entities;
    }, [data, cardKey]);

    const sorted = [...items].sort((a, b) => b.total - a.total).slice(0, limit);
    const maxVal = items.length > 0 ? Math.max(...items.map((i: any) => i.total)) : 1;

    return (
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-full transition-all hover:border-blue-100">
        <div className="flex justify-between items-start mb-2">
           <div className="flex items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">{title}</h3>
              {kpiKey && <KpiInfoIcon kpiKey={kpiKey} />}
           </div>
           <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {[5, 10, 15].map(v => (
                <button key={v} onClick={() => setLimit(v)} className={`w-7 h-6 rounded flex items-center justify-center text-[8px] font-black transition-all ${limit === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{v}</button>
              ))}
           </div>
        </div>

        <CardFilters cardKey={cardKey} />

        <div className="space-y-6 flex-1">
          {sorted.map((item) => (
            <div key={item.name} className="space-y-2 group">
              <div className="flex justify-between items-end">
                <div className="min-w-0">
                  <span className="text-[11px] font-black text-slate-900 uppercase truncate block leading-none">{item.name}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    {item.document && <span className="text-[8px] font-mono font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">{item.document}</span>}
                    {item.subLabel && <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">{item.subLabel}</span>}
                  </div>
                </div>
                <span className="text-lg font-black text-slate-800 font-mono leading-none pl-4">{item.total}</span>
              </div>
              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 group-hover:border-blue-100 transition-all">
                <div className={`h-full ${colorClass} transition-all duration-1000 ease-out`} style={{ width: `${(item.total / maxVal) * 100}%` }}></div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <p className="text-center py-10 text-[9px] font-black text-slate-300 uppercase italic">Sem dados para esta combinação</p>}
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
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">ALS Intelligence Hub</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Análise Multidimensional de Performance</p>
           </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
             <button key={p} onClick={() => setActivePeriod(p)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activePeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mês' : 'Ano'}</button>
           ))}
        </div>
      </div>

      {/* NOVO GRÁFICO: CATEGORY CORE ANALYSIS */}
      <div className="bg-slate-900 p-10 rounded-[4rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
            <svg className="w-64 h-64 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
         </div>

         <div className="relative z-10 flex flex-col items-center">
            <div className="flex flex-col items-center mb-10">
               <h3 className="text-blue-400 text-xs font-black uppercase tracking-[0.4em] mb-4">Análise de Núcleo por Categoria</h3>
               <select 
                 className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase outline-none focus:border-blue-500 transition-all cursor-pointer"
                 value={coreCategory}
                 onChange={e => setCoreCategory(e.target.value)}
               >
                 {availableData.categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
               </select>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-center gap-16 w-full">
               {/* Centro */}
               <div className="relative">
                  <div className="w-64 h-64 rounded-full border-[12px] border-blue-600/20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl shadow-[0_0_100px_rgba(37,99,235,0.2)] animate-pulse">
                     <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total OS</span>
                     <span className="text-7xl font-black text-white tracking-tighter">{coreStats.total}</span>
                  </div>
                  {/* Partículas decorativas circulares */}
                  <div className="absolute inset-[-20px] rounded-full border border-white/5 animate-[spin_20s_linear_infinite]"></div>
                  <div className="absolute inset-[-40px] rounded-full border border-white/5 animate-[spin_30s_linear_infinite_reverse]"></div>
               </div>

               {/* Mini-Pulses (Tipos de Operação) */}
               <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-2xl">
                  {/* Fixed type error in arithmetic operation by explicitly casting Object.entries values to numbers. */}
                  {(Object.entries(coreStats.typeDistribution) as [string, number][]).map(([type, count]) => (
                    <div key={type} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex flex-col items-center text-center group hover:bg-white/10 transition-all">
                       <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <span className="text-xs font-black">{coreStats.total > 0 ? Math.round((count/coreStats.total)*100) : 0}%</span>
                       </div>
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{type}</p>
                       <p className="text-xl font-black text-white font-mono">{count}</p>
                    </div>
                  ))}
                  {Object.keys(coreStats.typeDistribution).length === 0 && (
                    <div className="col-span-full py-10 text-center text-slate-600 font-black uppercase text-[10px] italic">Nenhuma movimentação para {coreCategory} no período</div>
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* INDICADORES CHAVE (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { key: 'ASSERTIVIDADE', label: 'Assertividade', val: `${getFilteredStats('client').metrics.efficiencyRate}%`, color: 'bg-blue-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
          { key: 'LEAD_TIME', label: 'Lead Time Médio', val: `${getFilteredStats('client').metrics.avgLeadTimeHrs}h`, color: 'bg-indigo-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { key: 'PRODUTIVIDADE', label: 'Produtividade', val: getFilteredStats('client').metrics.productivityPerDriver, color: 'bg-emerald-500', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          { key: 'FILA_ATIVA', label: 'Fila Ativa', val: getFilteredStats('client').metrics.activeResources, color: 'bg-slate-900', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10' }
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
          </div>
        ))}
      </div>

      {/* RANKINGS COM SELETORES DE COMBINAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Maiores Clientes" cardKey="client" colorClass="bg-blue-600" kpiKey="PERFORMANCE_ENTIDADES" />
        <RankingCard title="Maiores Motoristas" cardKey="driver" colorClass="bg-emerald-500" kpiKey="PERFORMANCE_ENTIDADES" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Pólos de Origem (Cidades)" cardKey="city" colorClass="bg-slate-900" kpiKey="CIDADES_CLIENTES" />
        <RankingCard title="Fluxo por Terminal" cardKey="terminal" colorClass="bg-indigo-600" kpiKey="TERMINAIS" />
      </div>

    </div>
  );
};

export default KpiVisualizer;
