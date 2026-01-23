
import React, { useState, useRef, useEffect } from 'react';
import { EntitySummary, DashboardStats, StatGroup } from '../../../utils/statsCalculator';

interface RichEntityFilterProps {
  label: string;
  stats: DashboardStats;
  selectedItems: string[];
  onChange: (items: string[]) => void;
  icon?: React.ReactNode;
}

const RichEntityFilter: React.FC<RichEntityFilterProps> = ({ label, stats, selectedItems, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setExpandedItems(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleSelect = (name: string) => {
    const next = selectedItems.includes(name) ? selectedItems.filter(i => i !== name) : [...selectedItems, name];
    onChange(next);
  };

  const filteredData = stats.entities.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  const StatBadge = ({ value, color, label, size = 'md' }: { value: number | string, color: string, label: string, size?: 'sm' | 'md' }) => (
    <div className={`flex flex-col items-center px-2 py-1 rounded-lg border ${color} ${size === 'sm' ? 'min-w-[28px]' : 'min-w-[36px]'}`} title={label}>
      <span className={`${size === 'sm' ? 'text-[5px]' : 'text-[7px]'} font-black uppercase opacity-60 leading-none`}>{label}</span>
      <span className={`${size === 'sm' ? 'text-[9px]' : 'text-[11px]'} font-mono font-black mt-0.5`}>{value}</span>
    </div>
  );

  return (
    <div className="relative flex-1 min-w-[220px]" ref={containerRef}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</p>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-5 py-3.5 bg-white border-2 rounded-2xl transition-all ${isOpen ? 'border-blue-500 shadow-xl ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
      >
        <div className="flex items-center gap-3 truncate">
          <div className="text-blue-500">{icon}</div>
          <span className="text-[10px] font-black uppercase truncate text-slate-700">
            {selectedItems.length === 0 ? `Ver Todos (${stats.entities.length})` : `${selectedItems.length} Marcados`}
          </span>
        </div>
        <svg className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-[460px] bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-slate-100 z-[300] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4">
             <div className="flex justify-between items-end">
                <div>
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Análise de Performance</p>
                   <h4 className="text-xs font-black text-slate-800 uppercase">Resumo Operacional</h4>
                </div>
                <div className="flex gap-2">
                   {/* Explicitly casting Object.entries to fix "Property 'total' does not exist on type 'unknown'" error */}
                   {(Object.entries(stats.operationTypes) as [string, StatGroup][]).slice(0,2).map(([type, s]) => (
                     <div key={type} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[8px] font-black text-blue-600 uppercase">{type}: {s.total}</div>
                   ))}
                </div>
             </div>
             
             <input 
               type="text" 
               placeholder="FILTRAR POR NOME OU DOCUMENTO..."
               className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold outline-none focus:border-blue-500 shadow-sm"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4 space-y-2">
            {filteredData.map(item => (
              <div key={item.name} className="group/item">
                <div 
                  onClick={() => toggleSelect(item.name)}
                  className={`flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all border ${selectedItems.includes(item.name) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button 
                      onClick={(e) => toggleExpand(e, item.name)} 
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${expandedItems.includes(item.name) ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      <svg className={`w-4 h-4 transition-transform ${expandedItems.includes(item.name) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
                    </button>
                    <div className="min-w-0">
                       <span className="text-[11px] font-black uppercase truncate text-slate-800 block leading-none">{item.name}</span>
                       <span className="text-[8px] font-black text-slate-400 uppercase mt-1 block tracking-tighter">{item.subLabel}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5 ml-4 shrink-0">
                    <StatBadge value={item.total} color="bg-blue-50 text-blue-600 border-blue-100" label="T" />
                    <StatBadge value={item.completed} color="bg-emerald-50 text-emerald-600 border-emerald-100" label="OK" />
                    <StatBadge value={item.delayed} color="bg-red-50 text-red-600 border-red-100" label="ATR" />
                  </div>
                </div>

                {expandedItems.includes(item.name) && (
                  <div className="ml-14 mt-2 space-y-1.5 pr-2 mb-4 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Vínculos Diretos ({Object.keys(item.subEntities).length})</p>
                    {Object.values(item.subEntities).map((sub: any) => (
                      <div key={sub.name} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 hover:bg-white transition-colors">
                        <div className="min-w-0 flex-1 pr-3">
                           <span className="text-[10px] font-black uppercase text-slate-600 truncate block">{sub.name}</span>
                           <div className="flex gap-2 mt-0.5">
                              {Array.from(sub.opTypes as Set<string>).map(type => (
                                <span key={type} className="text-[6px] font-black text-blue-400">{type}</span>
                              ))}
                           </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <StatBadge value={sub.total} color="text-slate-400" label="T" size="sm" />
                          <StatBadge value={sub.completed} color="text-emerald-500" label="O" size="sm" />
                          <StatBadge value={sub.delayed} color="text-red-500" label="A" size="sm" />
                          <StatBadge value={sub.canceled} color="text-slate-300" label="C" size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <button onClick={() => onChange([])} className="text-[9px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors">Resetar Filtros</button>
            <span className="text-[8px] font-black text-blue-300 uppercase tracking-[0.3em] italic">ALS High-Precision Analytics</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichEntityFilter;
