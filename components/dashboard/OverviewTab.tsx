
import React from 'react';

interface OverviewTabProps {
  vwCount: number;
  driversCount: number;
  routesCount: number;
  loadingInsight: boolean;
  aiInsight: string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ 
  vwCount, 
  driversCount, 
  routesCount, 
  loadingInsight, 
  aiInsight 
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Cargas VW</p>
          <p className="text-3xl font-bold text-slate-700">{vwCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Motoristas</p>
          <p className="text-3xl font-bold text-slate-700">{driversCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Trajetos Ativos</p>
          <p className="text-3xl font-bold text-slate-700">{routesCount}</p>
        </div>
      </div>
      <div className="bg-slate-800 p-8 rounded-2xl text-white shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <p className="text-xs font-bold text-blue-300 uppercase mb-2 tracking-widest">Insight Operacional</p>
        <p className="text-lg font-light italic text-slate-100 leading-relaxed max-w-2xl">
          "{loadingInsight ? 'Sincronizando com a rede...' : aiInsight}"
        </p>
      </div>
    </div>
  );
};

export default OverviewTab;
