
import React, { useMemo, useState, useEffect } from 'react';
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
  const [coreCategory, setCoreCategory] = useState<string>('');

  const [cardFilters, setCardFilters] = useState({
    client: { cat: 'TODAS', type: 'TODOS' },
    driver: { cat: 'TODAS', type: 'TODOS' },
    city: { cat: 'TODAS', type: 'TODOS' },
    terminal: { cat: 'TODAS', type: 'TODOS' }
  });

  // Normalização ALS: Resolve duplicidades e erros de busca por caracteres especiais
  const strictNormalize = (str: string) => {
    if (!str) return '';
    let norm = str.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
    
    if (norm === 'INDUSTRIAS' || norm === 'INDUSTRIA') return 'INDÚSTRIA';
    if (norm === 'ALIANCAS' || norm === 'ALIANCA') return 'ALIANÇA';
    
    return norm;
  };

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

    // Extração normalizada para evitar categorias fantasmas ou duplicadas
    const categories = Array.from(
      new Set(
        filtered
          .map(t => strictNormalize(t.category))
          .filter(c => c && c !== 'GERAL' && c !== 'NENHUM')
      )
    ).sort();

    const types = Array.from(
      new Set(filtered.map(t => t.type?.trim().toUpperCase()).filter(Boolean))
    ).sort();

    const mixStats = statsCalculator.calculateFullDashboardStats(filtered, 'client');
    
    // Normaliza contagens para o Donut
    const normalizedCategoryCounts: Record<string, number> = {};
    Object.entries(mixStats.categoryCounts).forEach(([cat, count]) => {
      const norm = strictNormalize(cat);
      if (norm && norm !== 'GERAL') {
        normalizedCategoryCounts[norm] = (normalizedCategoryCounts[norm] || 0) + count;
      }
    });

    const typeCounts: Record<string, number> = {};
    filtered.forEach(t => {
      const type = (t.type || 'OUTROS').toUpperCase();
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return { 
      filtered, 
      categories, 
      types, 
      mixStats: { ...mixStats, categoryCounts: normalizedCategoryCounts }, 
      typeCounts, 
      total: filtered.length 
    };
  }, [trips, activePeriod]);

  useEffect(() => {
    if (availableData.categories.length > 0) {
      if (!coreCategory || !availableData.categories.includes(coreCategory)) {
        setCoreCategory(availableData.categories[0]);
      }
    }
  }, [availableData.categories, coreCategory]);

  const coreStats = useMemo(() => {
    if (!coreCategory) return { total: 0, typeDistribution: {} };
    const subset = availableData.filtered.filter(t => strictNormalize(t.category) === coreCategory);
    const typeDistribution: Record<string, number> = {};
    subset.forEach(t => {
      const type = (t.type || 'OUTROS').toUpperCase();
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });
    return { total: subset.length, typeDistribution };
  }, [availableData.filtered, coreCategory]);

  const getFilteredStatsForCard = (cardKey: keyof typeof cardFilters) => {
    let subset = availableData.filtered;
    const f = cardFilters[cardKey];
    if (f.cat !== 'TODAS') subset = subset.filter(t => strictNormalize(t.category) === strictNormalize(f.cat));
    if (f.type !== 'TODOS') subset = subset.filter(t => t.type?.toUpperCase() === f.type.toUpperCase());
    return statsCalculator.calculateFullDashboardStats(subset, cardKey === 'driver' ? 'driver' : 'client');
  };

  const CardFilters = ({ cardKey }: { cardKey: keyof typeof cardFilters }) => (
    <div className="grid grid-cols-2 gap-2 mb-6 pt-4 border-t border-slate-50">
      <select 
        className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[9px] font-black uppercase outline-none"
        value={cardFilters[cardKey].cat}
        onChange={(e) => setCardFilters({...cardFilters, [cardKey]: { ...cardFilters[cardKey], cat: e.target.value }})}
      >
        <option value="TODAS">CATEGORIAS</option>
        {availableData.categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select 
        className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-[9px] font-black uppercase outline-none"
        value={cardFilters[cardKey].type}
        onChange={(e) => setCardFilters({...cardFilters, [cardKey]: { ...cardFilters[cardKey], type: e.target.value }})}
      >
        <option value="TODOS">MODALIDADES</option>
        {availableData.types.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  );

  const RankingCard = ({ title, cardKey, colorClass = 'bg-blue-600', kpiKey }: any) => {
    const data = getFilteredStatsForCard(cardKey);
    const items = useMemo(() => {
      if (cardKey === 'city') return Object.entries(data.clientCityDistribution).map(([name, total]) => ({ name, total, subLabel: 'LOCALIDADE' }));
      if (cardKey === 'terminal') return Object.entries(data.terminalDistribution).map(([name, info]: [string, any]) => ({ name, total: info.total, subLabel: info.location }));
      return data.entities;
    }, [data, cardKey]);

    const sorted = [...items].sort((a, b) => b.total - a.total).slice(0, 5);
    const maxVal = items.length > 0 ? Math.max(...items.map((i: any) => i.total)) : 1;

    return (
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
           <div className="flex items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">{title}</h3>
              {kpiKey && <KpiInfoIcon kpiKey={kpiKey} />}
           </div>
        </div>
        <CardFilters cardKey={cardKey} />
        <div className="space-y-6 flex-1">
          {sorted.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="min-w-0">
                  <span className="text-[11px] font-black text-slate-900 uppercase truncate block">{item.name}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{item.subLabel}</span>
                </div>
                <span className="text-lg font-black text-slate-800 font-mono pl-4">{item.total}</span>
              </div>
              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div className={`h-full ${colorClass} transition-all duration-1000`} style={{ width: `${(item.total / maxVal) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      <div className="bg-white p-8 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
           </div>
           <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">ALS Intelligence Hub</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Análise de Performance Operacional</p></div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
             <button key={p} onClick={() => setActivePeriod(p)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activePeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mês' : 'Ano'}</button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { key: 'ASSERTIVIDADE', label: 'Assertividade', val: `${availableData.mixStats.metrics.efficiencyRate}%`, color: 'bg-blue-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
          { key: 'LEAD_TIME', label: 'Lead Time Médio', val: `${availableData.mixStats.metrics.avgLeadTimeHrs}h`, color: 'bg-indigo-600', icon: 'M12 8v4l3 3' },
          { key: 'PRODUTIVIDADE', label: 'Produtividade', val: availableData.mixStats.metrics.productivityPerDriver, color: 'bg-emerald-500', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0z' },
          { key: 'FILA_ATIVA', label: 'Fila Ativa', val: availableData.mixStats.metrics.activeResources, color: 'bg-slate-900', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z' }
        ].map((item) => (
          <div key={item.key} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm group">
             <div className="flex items-center justify-between">
                <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p><p className="text-3xl font-black text-slate-800 leading-none tracking-tighter mt-1">{item.val}</p></div>
                <div className={`w-14 h-14 ${item.color} rounded-[1.4rem] flex items-center justify-center text-white shadow-xl`}><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d={item.icon}/></svg></div>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 p-10 rounded-[4rem] shadow-2xl relative overflow-hidden">
         <div className="relative z-10 flex flex-col items-center">
            <h3 className="text-blue-400 text-xs font-black uppercase tracking-[0.4em] mb-6">Análise de Núcleo Setorial</h3>
            <select 
              className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase outline-none focus:border-blue-500 transition-all cursor-pointer min-w-[280px]"
              value={coreCategory}
              onChange={e => setCoreCategory(e.target.value)}
            >
              {availableData.categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
              {availableData.categories.length === 0 && <option value="">Sem dados registrados</option>}
            </select>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-16 w-full mt-12">
               <div className="w-64 h-64 rounded-full border-[12px] border-blue-600/20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xl shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Setor</span>
                  <span className="text-7xl font-black text-white tracking-tighter">{coreStats.total}</span>
               </div>
               <div className="flex-1 grid grid-cols-2 gap-6 w-full max-w-2xl">
                  {Object.entries(coreStats.typeDistribution).map(([type, count]) => (
                    <div key={type} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex flex-col items-center">
                       <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{type}</p>
                       <p className="text-xl font-black text-white font-mono">{count}</p>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RankingCard title="Maiores Clientes" cardKey="client" colorClass="bg-blue-600" kpiKey="PERFORMANCE_ENTIDADES" />
        <RankingCard title="Performance Motoristas" cardKey="driver" colorClass="bg-emerald-500" kpiKey="PERFORMANCE_ENTIDADES" />
      </div>
    </div>
  );
};

export default KpiVisualizer;
