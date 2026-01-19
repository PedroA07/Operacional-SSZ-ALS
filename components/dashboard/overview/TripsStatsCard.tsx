
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
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-500 group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-5xl font-black tracking-tighter ${isIndigo ? 'text-indigo-600' : 'text-slate-800'}`}>{count}</p>
          </div>
        </div>
        <div className={`p-3 rounded-2xl ${isIndigo ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="2.5"/></svg>
        </div>
      </div>

      <div className="mt-8 flex-1 flex flex-col justify-end space-y-5">
        <div className="space-y-2">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50 pb-1">Modalidades Ativas</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(typeCounts).length > 0 ? Object.entries(typeCounts).map(([type, c]) => (
              <div key={type} className="flex justify-between items-center bg-slate-50/50 px-2 py-1.5 rounded-lg border border-slate-100/50">
                <span className="text-[9px] font-bold text-slate-400 uppercase truncate pr-1">{type.substring(0, 3)}</span>
                <span className="text-[10px] font-black text-slate-700">{c}</span>
              </div>
            )) : <p className="text-[8px] text-slate-300 italic uppercase">Sem dados</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-red-50/50 p-2.5 rounded-2xl border border-red-100/50 text-center">
             <p className="text-[7px] font-black text-red-400 uppercase tracking-tighter">Atrasos</p>
             <p className="text-lg font-black text-red-600">{delays}</p>
          </div>
          <div className="bg-emerald-50/50 p-2.5 rounded-2xl border border-emerald-100/50 text-center">
             <p className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">Concl.</p>
             <p className="text-lg font-black text-emerald-600">{completed}</p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
             <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Canc.</p>
             <p className="text-lg font-black text-slate-700">{canceled}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripsStatsCard;
