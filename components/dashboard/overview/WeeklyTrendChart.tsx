
import React from 'react';
import { Trip } from '../../../types';

interface WeeklyTrendChartProps {
  trips: Trip[];
}

const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({ trips }) => {
  const last7Days = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const data = last7Days.map(date => {
    return trips.filter(t => t.dateTime.startsWith(date) && t.status !== 'Viagem cancelada').length;
  });

  const maxVal = Math.max(...data, 5);
  const height = 120;
  const width = 400;
  const padding = 20;

  // Gerar pontos para o SVG
  const points = data.map((val, i) => {
    const x = (i * (width / (data.length - 1)));
    const y = height - (val / maxVal) * (height - padding);
    return { x, y };
  });

  const dPath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaPath = `${dPath} L ${points[points.length-1].x},${height} L 0,${height} Z`;

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fluxo de Carga</h4>
          <p className="text-xs font-black text-slate-800 uppercase mt-0.5">Últimos 7 Dias</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
           <span className="text-[8px] font-black text-blue-600 uppercase">Real-time</span>
        </div>
      </div>
      
      <div className="flex-1 relative mt-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <line x1="0" y1={height} x2={width} y2={height} stroke="#f1f5f9" strokeWidth="1" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
          
          {/* Área e Linha */}
          <path d={areaPath} fill="url(#grad)" />
          <path d={dPath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Pontos */}
          {points.map((p, i) => (
            <g key={i} className="group/point">
              <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[14px] font-black fill-slate-800 opacity-0 group-hover/point:opacity-100 transition-opacity">{data[i]}</text>
            </g>
          ))}
        </svg>
      </div>
      
      <div className="flex justify-between mt-4 px-1">
        {last7Days.map((date, i) => (
          <span key={i} className="text-[7px] font-black text-slate-300 uppercase italic">
            {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
          </span>
        ))}
      </div>
    </div>
  );
};

import { useMemo } from 'react';
export default WeeklyTrendChart;
