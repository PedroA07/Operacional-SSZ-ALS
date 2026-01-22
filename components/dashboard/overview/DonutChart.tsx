
import React from 'react';

interface DonutChartProps {
  data: Record<string, number>;
  total: number;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, total }) => {
  // Fix: cast Object.entries to [string, number][] to resolve arithmetic operation errors
  const entries = (Object.entries(data) as [string, number][]).sort((a, b) => b[1] - a[1]);
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

  let currentOffset = 0;

  return (
    <div className="flex items-center gap-8">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {entries.map(([label, value], idx) => {
            const percentage = (value / total) * 100;
            const strokeDash = `${percentage} ${100 - percentage}`;
            const strokeOffset = -currentOffset;
            currentOffset += percentage;

            return (
              <circle
                key={label}
                cx="18" cy="18" r="15.915"
                fill="transparent"
                stroke={colors[idx % colors.length]}
                strokeWidth="4"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-1000"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-800">{total}</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {entries.map(([label, value], idx) => (
          <div key={label} className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
              <span className="text-[10px] font-black text-slate-600 uppercase truncate max-w-[100px]">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-slate-400">{Math.round((value / total) * 100)}%</span>
              <span className="text-[10px] font-black text-slate-800">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
