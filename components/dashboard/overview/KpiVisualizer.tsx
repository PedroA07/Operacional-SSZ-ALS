import React, { useMemo, useState, useEffect } from 'react';
import { Trip, Driver } from '../../../types';
// Added StatGroup and TerminalSummary to imports for type casting
import { statsCalculator, StatGroup, TerminalSummary } from '../../../utils/statsCalculator';
import KpiInfoIcon from './KpiInfoIcon';
import DonutChart from './DonutChart';

interface KpiVisualizerProps {
  trips: Trip[];
  drivers: Driver[];
}

const KpiVisualizer: React.FC<KpiVisualizerProps> = ({ trips, drivers }) => {
  const [activePeriod, setActivePeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('WEEK');
  const [coreCategory, setCoreCategory] = useState<string>('');

  // Estados de controle para os rankings (Top vs Bottom)
  const [rankModes, setRankModes] = useState<Record<string, 'TOP' | 'BOTTOM'>>({
    client: 'TOP',
    driver: 'TOP',
    terminal: 'TOP'
  });

  const availableData = useMemo(() => {
    const now = new Date();
    let filtered = trips.filter(t => t.status !== 'Viagem cancelada');

    if (activePeriod === 'WEEK') {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
      startOfWeek.setHours(0,0,0,0);
      filtered = filtered.filter(t => new Date(t.dateTime) >= startOfWeek);
    } else if (activePeriod === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(t => new Date(t.dateTime) >= startOfMonth);
    }

    const stats = statsCalculator.calculateFullDashboardStats(filtered, 'client');
    const driverStats = statsCalculator.calculateFullDashboardStats(filtered, 'driver');

    return { 
      filtered, 
      stats,
      driverStats,
      total: filtered.length 
    };
  }, [trips, activePeriod]);

  const categories = useMemo(() => {
    return Array.from(new Set(availableData.filtered.map(t => t.category))).filter(Boolean).sort();
  }, [availableData.filtered]);

  useEffect(() => {
    if (categories.length > 0 && (!coreCategory || !categories.includes(coreCategory))) {
      setCoreCategory(categories[0]);
    }
  }, [categories, coreCategory]);

  const toggleRank = (key: string) => {
    setRankModes(prev => ({ ...prev, [key]: prev[key] === 'TOP' ? 'BOTTOM' : 'TOP' }));
  };

  const RankingCard = ({ title, items, modeKey, colorClass }: any) => {
    const mode = rankModes[modeKey];
    const sorted = [...items].sort((a, b) => mode === 'TOP' ? b.total - a.total : a.total - b.total).slice(0, 5);
    const maxVal = items.length > 0 ? Math.max(...items.map((i: any) => i.total)) : 1;

    return (
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-full group">
        <div className="flex justify-between items-center mb-8">
           <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">{title}</h3>
              <p className="text-sm font-black text-slate-800 uppercase mt-0.5">{mode === 'TOP' ? 'Maiores Volumes' : 'Menores Volumes'}</p>
           </div>
           <button 
             onClick={() => toggleRank(modeKey)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${mode === 'TOP' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}
           >
              {mode === 'TOP' ? 'Ver Menores' : 'Ver Maiores'}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" strokeWidth="3"/></svg>
           </button>
        </div>

        <div className="space-y-6 flex-1">
          {sorted.map((item) => (
            <div key={item.name} className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-black text-slate-800 uppercase truncate block">{item.name}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase">{item.subLabel || 'IDENTIFICADO'}</span>
                </div>
                <div className="flex flex-col items-end pl-4">
                  <span className="text-lg font-black text-slate-900 font-mono leading-none">{item.total}</span>
                  <span className="text-[7px] font-bold text-slate-300 uppercase">Viagens</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                <div 
                  className={`h-full ${colorClass} rounded-full transition-all duration-1000 shadow-sm`} 
                  style={{ width: `${(item.total / maxVal) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
             <p className="text-center py-20 text-[10px] font-black text-slate-300 uppercase italic">Dados insuficientes p/ Ranking</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      {/* HEADER ANALYTICS */}
      <div className="bg-white p-8 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
           </div>
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">ALS Intelligence Portal</h2>
              <div className="flex items-center gap-2 mt-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Base de Dados em Tempo Real</p>
              </div>
           </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           {(['WEEK', 'MONTH', 'YEAR'] as const).map(p => (
             <button key={p} onClick={() => setActivePeriod(p)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${activePeriod === p ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{p === 'WEEK' ? 'Semana' : p === 'MONTH' ? 'Mês' : 'Ano'}</button>
           ))}
        </div>
      </div>

      {/* DISTRIBUIÇÕES POR DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-12">
            <div className="w-48 h-48 shrink-0 relative">
               <DonutChart data={availableData.stats.categoryCounts} total={availableData.total} colors={['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#0f172a']} />
            </div>
            <div className="flex-1 space-y-6 w-full">
               <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Mix de Categorias</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Concentração Setorial</p>
               </div>
               <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {Object.entries(availableData.stats.categoryCounts).map(([cat, count], idx) => (
                    <div key={cat} className="flex items-center justify-between border-b border-slate-50 pb-1">
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#0f172a'][idx % 5] }}></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase">{cat}</span>
                       </div>
                       <span className="text-[10px] font-mono font-black text-slate-800">{count}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-12">
            <div className="w-48 h-48 shrink-0 relative">
               <DonutChart 
                 // Explicitly casting Object.entries to solve 'Property total does not exist on type unknown'
                 data={Object.fromEntries((Object.entries(availableData.stats.operationTypes) as [string, StatGroup][]).map(([k,v]) => [k, v.total]))} 
                 total={availableData.total} 
                 colors={['#1e40af', '#3b82f6', '#93c5fd', '#bfdbfe', '#dbeafe']} 
               />
            </div>
            <div className="flex-1 space-y-6 w-full">
               <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Modalidades</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Perfil da Operação</p>
               </div>
               <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {/* Explicitly casting Object.entries to solve 'Property total does not exist on type unknown' */}
                  {(Object.entries(availableData.stats.operationTypes) as [string, StatGroup][]).map(([type, stats], idx) => (
                    <div key={type} className="flex items-center justify-between border-b border-slate-50 pb-1">
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#1e40af', '#3b82f6', '#93c5fd', '#bfdbfe', '#dbeafe'][idx % 5] }}></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase">{type}</span>
                       </div>
                       <span className="text-[10px] font-mono font-black text-slate-800">{stats.total}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* RANKINGS COMPACTOS MAIORES/MENORES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <RankingCard 
          title="Ranking Clientes" 
          items={availableData.stats.entities} 
          modeKey="client" 
          colorClass="bg-blue-600" 
        />
        <RankingCard 
          title="Performance Motoristas" 
          items={availableData.driverStats.entities} 
          modeKey="driver" 
          colorClass="bg-indigo-500" 
        />
        <RankingCard 
          title="Fluxo de Terminais" 
          // Explicitly casting Object.entries to [string, TerminalSummary][] to resolve total and location property errors
          items={(Object.entries(availableData.stats.terminalDistribution) as [string, TerminalSummary][]).map(([name, info]) => ({ name, total: info.total, subLabel: info.location }))} 
          modeKey="terminal" 
          colorClass="bg-slate-900" 
        />
      </div>

      {/*KPIs ESPECÍFICOS SETORIAIS */}
      <div className="bg-slate-950 p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-20 opacity-5 group-hover:scale-110 transition-transform">
            <svg className="w-80 h-80 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
         </div>
         <div className="relative z-10 flex flex-col items-center">
            <h3 className="text-blue-500 text-[11px] font-black uppercase tracking-[0.5em] mb-8">Raio-X de Núcleo Operacional</h3>
            <div className="flex bg-white/5 p-2 rounded-[2.5rem] border border-white/10 mb-12">
               {categories.slice(0, 4).map(c => (
                 <button key={c} onClick={() => setCoreCategory(c)} className={`px-10 py-4 rounded-[2rem] text-[10px] font-black uppercase transition-all ${coreCategory === c ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>{c}</button>
               ))}
               {categories.length === 0 && <span className="px-10 py-4 text-slate-600 text-[10px] font-black uppercase italic">Nenhuma Categoria Ativa</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 w-full max-w-5xl">
               <div className="flex flex-col items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-[12px] border-blue-600/20 flex flex-col items-center justify-center bg-black shadow-[0_0_80px_rgba(37,99,235,0.2)]">
                     <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Total Setor</span>
                     <span className="text-6xl font-black text-white tracking-tighter">
                        {availableData.filtered.filter(t => t.category === coreCategory).length}
                     </span>
                  </div>
                  <p className="mt-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Volume Global {coreCategory}</p>
               </div>

               <div className="col-span-2 grid grid-cols-2 gap-6">
                  {Object.entries(
                    availableData.filtered
                      .filter(t => t.category === coreCategory)
                      .reduce((acc, t) => {
                        const type = (t.type || 'OUTROS').toUpperCase();
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="bg-white/5 border border-white/10 p-6 rounded-[2.2rem] flex flex-col justify-between group hover:bg-white/10 transition-colors">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{type}</p>
                       <p className="text-3xl font-black text-white mt-4 font-mono">{count}</p>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default KpiVisualizer;