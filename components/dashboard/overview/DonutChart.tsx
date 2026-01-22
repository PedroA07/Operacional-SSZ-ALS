
import React from 'react';

interface DonutChartProps {
  data: Record<string, number>;
  total: number;
  colors?: string[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data, total, colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] }) => {
  const entries = (Object.entries(data) as [string, number][]).sort((a, b) => b[1] - a[1]);

  let currentOffset = 0;

  return (
    <div className="flex flex-col md:flex-row items-center gap-10">
      <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
        {/* viewBox 44x44 com círculos em 22,22 r=15.9 permite strokeWidth 6 sem cortar */}
        <svg viewBox="0 0 44 44" className="w-full h-full transform -rotate-90 overflow-visible">
          {entries.map(([label, value], idx) => {
            const percentage = total > 0 ? (value / total) * 100 : 0;
            const strokeDash = `${percentage} ${100 - percentage}`;
            const strokeOffset = -currentOffset;
            currentOffset += percentage;

            return (
              <circle
                key={label}
                cx="22" cy="22" r="15.915"
                fill="transparent"
                stroke={colors[idx % colors.length]}
                strokeWidth="5.5"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-in-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-slate-800">{total}</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Movimentações</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 w-full">
        {entries.map(([label, value], idx) => (
          <div key={label} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2.5 h-2.5 rounded-md shrink-0" style={{ backgroundColor: colors[idx % colors.length] }}></div>
              <span className="text-[10px] font-black text-slate-600 uppercase truncate pr-2">{label}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-mono font-bold text-blue-500">{total > 0 ? Math.round((value / total) * 100) : 0}%</span>
              <span className="text-[11px] font-black text-slate-800 w-8 text-right">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
