
import React, { useState, useRef, useEffect } from 'react';
import { Driver } from '../../../types';

interface DriverVinculosCellProps {
  driver: Driver;
}

const DriverVinculosCell: React.FC<DriverVinculosCellProps> = ({ driver }) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Agrupa clientes por categoria
  const groupedOps = (driver.operations || []).reduce((acc, op) => {
    if (!acc[op.category]) acc[op.category] = [];
    acc[op.category].push(op.client);
    return acc;
  }, {} as Record<string, string[]>);

  const categories = Object.keys(groupedOps);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (categories.length === 0) {
    return <span className="text-[8px] text-slate-300 font-bold uppercase italic">Sem vínculos ativos</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5 max-w-[250px]" ref={dropdownRef}>
      {categories.map((cat) => (
        <div key={cat} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenCategory(openCategory === cat ? null : cat);
            }}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 group/cat ${
              openCategory === cat
                ? 'bg-blue-600 border-blue-700 text-white shadow-lg'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-tight">{cat}</span>
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black ${
              openCategory === cat ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
            }`}>
              {groupedOps[cat].length}
            </div>
            <svg 
              className={`w-2.5 h-2.5 transition-transform ${openCategory === cat ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeWidth="4" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openCategory === cat && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-slate-100 p-2 z-[200] animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="px-2 py-1.5 border-b border-slate-50 mb-1">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Clientes Vinculados</p>
              </div>
              <div className="max-h-32 overflow-y-auto custom-scrollbar">
                {groupedOps[cat].map((client, idx) => (
                  <div key={idx} className="px-2.5 py-2 hover:bg-slate-50 rounded-lg text-[9px] font-bold text-slate-700 uppercase truncate">
                    • {client}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DriverVinculosCell;
