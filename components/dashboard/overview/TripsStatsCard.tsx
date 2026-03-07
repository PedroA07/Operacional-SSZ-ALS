
import React from 'react';

interface TripsStatsCardProps {
  title: string;
  count: number;
  typeCounts: { [key: string]: number };
  delays: number;
  canceled: number;
  completed: number;
  variantColor: 'indigo' | 'slate';
}

const TripsStatsCard: React.FC<TripsStatsCardProps> = ({ title, count, typeCounts, delays, canceled, completed, variantColor }) => {
  const isIndigo = variantColor === 'indigo';
  
  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-500 group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={`text-6xl font-black tracking-tighter ${isIndigo ? 'text-indigo-600' : 'text-slate-800'}`}>{count}</p>
          </div>
        </div>
        <div className={`p-4 rounded-2xl ${isIndigo ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      <div className="mt-10 flex-1 flex flex-col justify-end space-y-6">
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50 pb-2">Distribuição Operacional</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(typeCounts).length > 0 ? Object.entries(typeCounts).map(([type, c]) => (
              <div key={type} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100/50">
                <span className="text-[11px] font-bold text-slate-500 uppercase truncate pr-2">{type}</span>
                <span className="text-xs font-black text-slate-800">{c}</span>
              </div>
            )) : <p className="text-[10px] text-slate-300 italic uppercase py-2">Sem movimentação</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-center">
             <p className="text-[10px] font-black text-red-400 uppercase tracking-tight">Atrasos</p>
             <p className="text-xl font-black text-red-600 leading-none mt-1">{delays}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-tight">Concl.</p>
             <p className="text-xl font-black text-emerald-600 leading-none mt-1">{completed}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Canc.</p>
             <p className="text-xl font-black text-slate-600 leading-none mt-1">{canceled}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripsStatsCard;
