
import React from 'react';
import { Trip } from '../../../types';

interface TripsStatsCardProps {
  title: string;
  count: number;
  typeCounts: { [key: string]: number };
  delays: number;
  canceled: number;
  variantColor: 'indigo' | 'slate';
}

const TripsStatsCard: React.FC<TripsStatsCardProps> = ({ title, count, typeCounts, delays, canceled, variantColor }) => {
  const isIndigo = variantColor === 'indigo';
  
  return (
    <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-lg transition-all duration-500">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={`text-5xl font-black tracking-tighter ${isIndigo ? 'text-indigo-600' : 'text-slate-800'}`}>{count}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[7px] font-black text-slate-300 uppercase">Modalidades</p>
          <div className="flex flex-col gap-1">
            {Object.entries(typeCounts).map(([type, c]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase">{type.slice(0, 3)}</span>
                <span className="text-[10px] font-black text-slate-800">{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[7px] font-black text-slate-300 uppercase">Ocorrências</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-red-50 p-1.5 rounded-lg border border-red-100">
               <span className="text-[8px] font-black text-red-600 uppercase">Atrasos</span>
               <span className="text-[10px] font-black text-red-700">{delays}</span>
            </div>
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-lg border border-slate-200">
               <span className="text-[8px] font-black text-slate-500 uppercase">Cancel.</span>
               <span className="text-[10px] font-black text-slate-600">{canceled}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripsStatsCard;
