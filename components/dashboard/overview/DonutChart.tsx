import React from 'react';

interface DonutChartProps {
  data: Record<string, number>;
  total: number;
  colors?: string[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data, total, colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] }) => {
  // Explicitly casting Object.entries to ensure values are treated as numbers for arithmetic operations
  const entries = (Object.entries(data) as [string, number][]).sort((a, b) => b[1] - a[1]);

  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative w-full aspect-square flex items-center justify-center">
        <svg viewBox="0 0 44 44" className="w-full h-full transform -rotate-90 overflow-visible">
          {entries.map(([label, value], idx) => {
            // value is now correctly inferred as number due to casting above
            const percentage = total > 0 ? (value / total) * 100 : 0;
            const strokeDash = `${percentage} ${100 - percentage}`;
            const strokeOffset = -currentOffset;
            currentOffset += percentage;

            if (percentage === 0) return null;

            return (
              <circle
                key={label}
                cx="22" cy="22" r="15.915"
                fill="transparent"
                stroke={colors[idx % colors.length]}
                strokeWidth="6"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-in-out"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-3xl font-black text-slate-800 leading-none">{total}</span>
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tight mt-1">Movimentos</span>
        </div>
      </div>
    </div>
  );
};

export default DonutChart;