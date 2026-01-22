
import React, { useState, useRef, useEffect } from 'react';
import { EntitySummary } from '../../../utils/statsCalculator';

interface RichEntityFilterProps {
  label: string;
  data: EntitySummary[];
  selectedItems: string[];
  onChange: (items: string[]) => void;
  icon?: React.ReactNode;
}

const RichEntityFilter: React.FC<RichEntityFilterProps> = ({ label, data, selectedItems, onChange, icon }) => {
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

  const filteredData = data.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  const StatBadge = ({ value, color, label }: { value: number, color: string, label: string }) => (
    <div className={`flex flex-col items-center px-1.5 py-0.5 rounded-lg border ${color} min-w-[32px]`} title={label}>
      <span className="text-[7px] font-black uppercase opacity-60 leading-none">{label}</span>
      <span className="text-[10px] font-mono font-black mt-0.5">{value}</span>
    </div>
  );

  return (
    <div className="relative flex-1 min-w-[200px]" ref={containerRef}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</p>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-2xl transition-all ${isOpen ? 'border-blue-500 shadow-lg ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="text-blue-500">{icon}</div>
          <span className="text-[10px] font-black uppercase truncate text-slate-700">
            {selectedItems.length === 0 ? `Todos (${data.length})` : `${selectedItems.length} Selecionados`}
          </span>
        </div>
        <svg className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] border border-slate-100 z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
             <input 
               type="text" 
               placeholder="PESQUISAR..."
               className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold outline-none focus:border-blue-500"
               value={search}
               onChange={e => setSearch(e.target.value)}
               autoFocus
             />
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
            {filteredData.map(item => (
              <div key={item.name} className="mb-1">
                <div 
                  onClick={() => toggleSelect(item.name)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${selectedItems.includes(item.name) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={(e) => toggleExpand(e, item.name)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400">
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
                  <div className="ml-8 mt-1 space-y-1 pr-2 animate-in slide-in-from-top-2 duration-300">
                    {/* // Explicitly casting subEntities values to EntitySummary[] to resolve TypeScript unknown type errors */}
                    {(Object.values(item.subEntities) as EntitySummary[]).map((sub: EntitySummary) => (
                      <div key={sub.name} className="flex items-center justify-between p-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <span className="text-[9px] font-bold uppercase text-slate-500 truncate pr-4">• {sub.name}</span>
                        <div className="flex gap-1 shrink-0 scale-90 origin-right">
                          <span className="text-[9px] font-black text-blue-600 px-1">{sub.total}</span>
                          <span className="text-[9px] font-black text-red-600 px-1">{sub.delayed}</span>
                          <span className="text-[9px] font-black text-emerald-600 px-1">{sub.completed}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
            <button onClick={() => onChange([])} className="text-[8px] font-black text-slate-400 uppercase hover:text-red-500">Limpar Filtro</button>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ALS Data Engine</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichEntityFilter;
