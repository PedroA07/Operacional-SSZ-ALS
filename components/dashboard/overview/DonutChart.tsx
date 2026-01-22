
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
    <div className="flex flex-col md:flex-row items-center gap-6 w-full">
      <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
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
          <span className="text-xl font-black text-slate-800">{total}</span>
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tight">Total</span>
        </div>
      </div>

      <div className="flex-1 space-y-2 w-full">
        {entries.map(([label, value], idx) => (
          <div key={label} className="flex items-center justify-between group rounded-xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }}></div>
              <span className="text-[9px] font-black text-slate-500 uppercase truncate pr-2">{label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-black text-slate-800 text-right">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
