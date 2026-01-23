
import React, { useMemo } from 'react';
import { Trip } from '../../../types';

interface WeeklyTrendChartProps {
  trips: Trip[];
}

const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({ trips }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { label: string; value: number }[] = [];
    
    // Detectamos o agrupamento baseado no volume de dias nas trips
    // Se cobrir mais de 31 dias, agrupamos por mês, senão por dia
    const dates = trips.map(t => new Date(t.dateTime).getTime());
    const minDate = dates.length ? Math.min(...dates) : now.getTime();
    const diffDays = (now.getTime() - minDate) / (1000 * 60 * 60 * 24);

    if (diffDays <= 7) {
      // Últimos 7 dias
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = trips.filter(t => t.dateTime.startsWith(dateStr)).length;
        data.push({ label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), value: count });
      }
    } else if (diffDays <= 31) {
      // Últimas 4 semanas
      for (let i = 3; i >= 0; i--) {
        const start = new Date();
        start.setDate(now.getDate() - (i * 7 + 7));
        const end = new Date();
        end.setDate(now.getDate() - (i * 7));
        const count = trips.filter(t => {
          const dt = new Date(t.dateTime);
          return dt >= start && dt <= end;
        }).length;
        data.push({ label: `S${4-i}`, value: count });
      }
    } else {
      // Últimos 6 meses
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const count = trips.filter(t => {
          const dt = new Date(t.dateTime);
          return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
        }).length;
        data.push({ label: monthNames[d.getMonth()], value: count });
      }
    }
    return data;
  }, [trips]);

  const maxVal = Math.max(...chartData.map(d => d.value), 5);
  const height = 140;
  const width = 400;
  const padding = 20;

  const points = chartData.map((d, i) => {
    const x = (i * (width / (chartData.length - 1 || 1)));
    const y = height - (d.value / maxVal) * (height - padding * 2) - padding;
    return { x, y };
  });

  const dPath = points.length > 1 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  const areaPath = points.length > 1 ? `${dPath} L ${points[points.length-1].x},${height} L 0,${height} Z` : '';

  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo de Movimentação</h4>
          <p className="text-sm font-black text-slate-800 uppercase mt-1">Cargas no Período Selecionado</p>
        </div>
      </div>
      
      <div className="flex-1 relative min-h-[140px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#flowGrad)" className="transition-all duration-700" />
          <path d={dPath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-700" />
          {points.map((p, i) => (
            <g key={i} className="group/point">
              <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#2563eb" strokeWidth="3" />
              <text x={p.x} y={p.y - 15} textAnchor="middle" className="text-[10px] font-black fill-blue-600 opacity-0 group-hover/point:opacity-100 transition-opacity">{chartData[i].value}</text>
            </g>
          ))}
        </svg>
      </div>
      
      <div className="flex justify-between mt-6 border-t border-slate-50 pt-4">
        {chartData.map((d, i) => (
          <span key={i} className="text-[8px] font-black text-slate-300 uppercase italic">{d.label}</span>
        ))}
      </div>
    </div>
  );
};

export default WeeklyTrendChart;
