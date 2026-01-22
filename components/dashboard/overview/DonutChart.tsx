
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
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative w-full aspect-square max-w-[140px] flex items-center justify-center">
        <svg viewBox="0 0 44 44" className="w-full h-full transform -rotate-90 overflow-visible">
          {entries.map(([label, value], idx) => {
            const percentage = total > 0 ? (value / total) * 100 : 0;
            // Garante que se houver valor, o traço mínimo seja visível
            const strokeDash = `${percentage} ${100 - percentage}`;
            const strokeOffset = -currentOffset;
            currentOffset += percentage;

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
          <span className="text-2xl font-black text-slate-800 leading-none">{total}</span>
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-tight mt-1">Lançamentos</span>
        </div>
      </div>
      
      {/* Mini-legenda compacta abaixo do gráfico para evitar cortes laterais */}
      <div className="flex flex-wrap justify-center gap-3 mt-4 w-full xl:hidden">
        {entries.map(([label, value], idx) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
            <span className="text-[8px] font-black text-slate-500 uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
