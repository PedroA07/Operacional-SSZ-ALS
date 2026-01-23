import React, { useMemo } from 'react';
import { Trip } from '../../../types';

interface CategoryTrendChartProps {
  trips: Trip[];
}

const CategoryTrendChart: React.FC<CategoryTrendChartProps> = ({ trips }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    // Explicitly type categories to avoid 'unknown' index type errors
    const categories: string[] = Array.from(new Set(trips.map(t => t.category || 'GERAL'))).slice(0, 5);
    const labels: string[] = [];
    const series: Record<string, number[]> = {};

    // Initializing series keys
    categories.forEach(cat => series[cat] = []);

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));

      categories.forEach(cat => {
        const count = trips.filter(t => 
          t.category === cat && 
          t.dateTime.startsWith(dateStr) && 
          t.status !== 'Viagem cancelada'
        ).length;
        // Accessing series with cat which is now guaranteed to be string
        series[cat].push(count);
      });
    }

    return { labels, series, categories };
  }, [trips]);

  // Cast flat array to number[] to satisfy Math.max parameter type
  const maxVal = Math.max(...(Object.values(chartData.series).flat() as number[]), 5);
  const height = 180;
  const width = 500;
  const padding = 20;
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const getPath = (data: number[]) => {
    const points = data.map((val, i) => {
      const x = (i * (width / (data.length - 1 || 1)));
      const y = height - (val / maxVal) * (height - padding * 2) - padding;
      return { x, y };
    });
    return points.length > 1 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  };

  return (
    <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col h-full animate-in fade-in duration-700">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Fluxo de Produção</h4>
          <p className="text-sm font-black text-white uppercase mt-1">Comparativo por Categoria</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-end max-w-[200px]">
           {chartData.categories.map((cat, i) => (
             <div key={cat} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                <span className="text-[7px] font-black text-slate-500 uppercase">{cat}</span>
             </div>
           ))}
        </div>
      </div>
      
      <div className="flex-1 relative min-h-[180px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {chartData.categories.map((cat, idx) => (
            <path 
              key={cat}
              d={getPath(chartData.series[cat])} 
              fill="none" 
              stroke={colors[idx % colors.length]} 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="transition-all duration-1000 opacity-80 hover:opacity-100 hover:stroke-white"
            />
          ))}
        </svg>
      </div>
      
      <div className="flex justify-between mt-6 border-t border-white/5 pt-4">
        {chartData.labels.map((l, i) => (
          <span key={i} className="text-[8px] font-black text-slate-600 uppercase italic">{l}</span>
        ))}
      </div>
    </div>
  );
};

export default CategoryTrendChart;