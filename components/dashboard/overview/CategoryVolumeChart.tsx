
import React, { useMemo } from 'react';
import { Trip } from '../../../types';

interface CategoryVolumeChartProps {
  trips: Trip[];
}

const CategoryVolumeChart: React.FC<CategoryVolumeChartProps> = ({ trips }) => {
  const stats = useMemo(() => {
    const active = trips.filter(t => t.status !== 'Viagem cancelada');
    const counts: Record<string, number> = {};
    active.forEach(t => {
      const cat = t.category || 'Geral';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [trips]);

  const maxCount = Math.max(...stats.map(s => s.count), 1);

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="mb-6">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mix de Carteira</h4>
        <p className="text-xs font-black text-slate-800 uppercase mt-0.5">Volume por Divisão</p>
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-center">
        {stats.map((item, i) => {
          const percentage = (item.count / maxCount) * 100;
          const colors = ['bg-blue-600', 'bg-indigo-500', 'bg-emerald-500', 'bg-slate-800'];
          
          return (
            <div key={item.name} className="space-y-1.5">
              <div className="flex justify-between items-end px-1">
                <span className="text-[9px] font-black text-slate-600 uppercase truncate pr-4">{item.name}</span>
                <span className="text-[10px] font-mono font-black text-slate-800">{item.count}</span>
              </div>
              <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                <div 
                  className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-1000 shadow-sm`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
        {stats.length === 0 && (
          <p className="text-[9px] font-black text-slate-300 uppercase italic text-center py-10">Sem movimentação registrada</p>
        )}
      </div>
    </div>
  );
};

export default CategoryVolumeChart;
