
import React from 'react';
import { KPI_DEFINITIONS } from '../../../constants/KpiDefinitions';

interface KpiInfoIconProps {
  kpiKey: keyof typeof KPI_DEFINITIONS;
}

const KpiInfoIcon: React.FC<KpiInfoIconProps> = ({ kpiKey }) => {
  const info = KPI_DEFINITIONS[kpiKey];

  return (
    <div className="relative group/info ml-2 inline-block">
      <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] font-black text-slate-400 cursor-help group-hover/info:bg-blue-600 group-hover/info:text-white group-hover/info:border-blue-600 transition-all">
        ?
      </div>
      
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-5 bg-slate-900 text-white rounded-2xl shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-[100] border border-white/10 scale-95 group-hover/info:scale-100 origin-bottom pointer-events-none">
        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">{info.title}</h5>
        <p className="text-[10px] text-slate-300 leading-relaxed mb-3">{info.description}</p>
        <div className="bg-black/30 p-3 rounded-xl">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Cálculo:</p>
          <code className="text-[9px] font-mono text-blue-200 block leading-tight">{info.formula}</code>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
};

export default KpiInfoIcon;
