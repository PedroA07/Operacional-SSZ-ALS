
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

  const StatBadge = ({ value, color, label, size = 'md' }: { value: number, color: string, label: string, size?: 'sm' | 'md' }) => (
    <div className={`flex flex-col items-center px-1.5 py-0.5 rounded-lg border ${color} ${size === 'sm' ? 'min-w-[24px]' : 'min-w-[32px]'}`} title={label}>
      <span className={`${size === 'sm' ? 'text-[5px]' : 'text-[7px]'} font-black uppercase opacity-60 leading-none`}>{label}</span>
      <span className={`${size === 'sm' ? 'text-[8px]' : 'text-[10px]'} font-mono font-black mt-0.5`}>{value}</span>
    </div>
  );

  return (
    <div className="relative flex-1 min-w-[220px]" ref={containerRef}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</p>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-2xl transition-all ${isOpen ? 'border-blue-500 shadow-lg ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="text-blue-500">{icon}</div>
          <span className="text-[10px] font-black uppercase truncate text-slate-700">
            {selectedItems.length === 0 ? `Todos (${stats.entities.length})` : `${selectedItems.length} Selecionados`}
          </span>
        </div>
        <svg className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[420px] bg-white rounded-[2.5rem] shadow-[0_30px_90px_rgba(0,0,0,0.3)] border border-slate-100 z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-5 bg-slate-50 border-b border-slate-100 space-y-4">
             {/* Resumo por Categoria e Tipo */}
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Por Categoria</p>
                   <div className="flex flex-wrap gap-1.5">
                      {/* Fix: casting Object.entries to solve 'Property total does not exist on type unknown' */}
                      {(Object.entries(stats.categories) as [string, StatGroup][]).map(([name, s]) => (
                        <div key={name} className="px-2 py-1 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                           <span className="text-[8px] font-black text-slate-500 uppercase">{name.substring(0,6)}</span>
                           <span className="text-[9px] font-mono font-black text-blue-600">{s.total}</span>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="space-y-2">
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Por Operação</p>
                   <div className="flex flex-wrap gap-1.5">
                      {/* Fix: casting Object.entries to solve 'Property total does not exist on type unknown' */}
                      {(Object.entries(stats.operationTypes) as [string, StatGroup][]).map(([name, s]) => (
                        <div key={name} className="px-2 py-1 bg-white border border-slate-200 rounded-lg flex items-center gap-2">
                           <span className="text-[8px] font-black text-slate-500 uppercase">{name.substring(0,3)}</span>
                           <span className="text-[9px] font-mono font-black text-indigo-600">{s.total}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             
             <input 
               type="text" 
               placeholder="PESQUISAR ENTIDADE..."
               className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold outline-none focus:border-blue-500"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>
          
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-3">
            {filteredData.map(item => (
              <div key={item.name} className="mb-1.5">
                <div 
                  onClick={() => toggleSelect(item.name)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${selectedItems.includes(item.name) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={(e) => toggleExpand(e, item.name)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                      <svg className={`w-3 h-3 transition-transform ${expandedItems.includes(item.name) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
                    </button>
                    <span className="text-[10px] font-black uppercase truncate text-slate-800">{item.name}</span>
                  </div>
                  
                  <div className="flex gap-1 ml-2 shrink-0">
                    <StatBadge value={item.total} color="bg-blue-50 text-blue-600 border-blue-100" label="Os" />
                    <StatBadge value={item.delayed} color="bg-red-50 text-red-600 border-red-100" label="Atr" />
                    <StatBadge value={item.completed} color="bg-emerald-50 text-emerald-600 border-emerald-100" label="Ok" />
                  </div>
                </div>

                {expandedItems.includes(item.name) && (
                  <div className="ml-10 mt-1 space-y-1 pr-2 animate-in slide-in-from-top-2 duration-300">
                    {/* Fix: explicit casting to any for values and subEntities properties to fix unknown property errors */}
                    {(Object.values(item.subEntities) as any[]).map(sub => (
                      <div key={sub.name} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <span className="text-[9px] font-bold uppercase text-slate-500 truncate pr-4">• {sub.name}</span>
                        <div className="flex gap-1 shrink-0">
                          <StatBadge value={sub.total} color="text-blue-600" label="T" size="sm" />
                          <StatBadge value={sub.delayed} color="text-red-600" label="A" size="sm" />
                          <StatBadge value={sub.completed} color="text-emerald-600" label="O" size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
            <button onClick={() => onChange([])} className="text-[8px] font-black text-slate-400 uppercase hover:text-red-500">Limpar Filtros</button>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">ALS High-Precision Analytics</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichEntityFilter;
