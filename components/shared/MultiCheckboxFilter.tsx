
import React, { useState, useRef, useEffect } from 'react';

export interface FilterStats {
  completed: number;
  delayed: number;
  canceled: number;
  total: number;
  details?: {
    label: string;
    subLabel: string;
    items: string[];
  };
}

interface FilterOption {
  value: string;
  label: string;
  stats?: FilterStats;
}

interface MultiCheckboxFilterProps {
  label: string;
  options: (string | FilterOption)[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
}

const MultiCheckboxFilter: React.FC<MultiCheckboxFilterProps> = ({ label, options, selectedOptions, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState<FilterOption | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleAll = (select: boolean) => {
    if (!select) {
      onChange([]);
      return;
    }
    const allValues = options.map(opt => typeof opt === 'string' ? opt : opt.value);
    onChange(allValues);
  };

  const toggleOption = (val: string) => {
    if (selectedOptions.includes(val)) {
      onChange(selectedOptions.filter(o => o !== val));
    } else {
      onChange([...selectedOptions, val]);
    }
  };

  const isAllSelected = selectedOptions.length === options.length && options.length > 0;
  const hasSelection = selectedOptions.length > 0;

  const filteredOptions = options.filter(opt => {
    const text = typeof opt === 'string' ? opt : opt.label;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="relative flex-1 min-w-[150px]" ref={containerRef} style={{ zIndex: isOpen ? 100 : 10 }}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</p>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl transition-all text-[10px] font-black uppercase ${isOpen ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
      >
        <span className={`truncate mr-2 ${hasSelection && !isAllSelected ? 'text-blue-600' : 'text-slate-700'}`}>
          {!hasSelection ? 'TODOS' : isAllSelected ? 'TODOS' : `${selectedOptions.length} SELEC.`}
        </span>
        <svg className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] border border-slate-100 p-4 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[340px]">
          <div className="relative mb-4">
             <input 
               type="text" 
               placeholder={`PESQUISAR...`}
               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-blue-400 transition-all"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               autoFocus
             />
             <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          <div className="flex justify-between items-center px-1 mb-3 pb-3 border-b border-slate-50">
            <button type="button" onClick={() => toggleAll(true)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Marcar Todos</button>
            <button type="button" onClick={() => toggleAll(false)} className="text-[9px] font-black text-slate-400 uppercase hover:underline">Limpar</button>
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredOptions.map((opt, idx) => {
              const option = typeof opt === 'string' ? { value: opt, label: opt } : opt;
              const isSelected = selectedOptions.includes(option.value);
              
              return (
                <div 
                  key={idx} 
                  className="relative group/item"
                  onMouseEnter={(e) => {
                    if (option.stats) {
                      setHoveredItem(option);
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <label className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border border-transparent ${isSelected ? 'bg-blue-50/50 border-blue-100' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={isSelected}
                        onChange={() => toggleOption(option.value)}
                      />
                      <span className={`text-[10px] font-black uppercase truncate ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                        {option.label}
                      </span>
                    </div>

                    {option.stats && (
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                         {option.stats.delayed > 0 && <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-red-100">{option.stats.delayed}</span>}
                         {option.stats.completed > 0 && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black border border-emerald-100">{option.stats.completed}</span>}
                         {option.stats.canceled > 0 && <span className="bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded text-[8px] font-black border border-slate-200">{option.stats.canceled}</span>}
                      </div>
                    )}
                  </label>

                  {/* Hover Detail Dropdown (Tooltip Inteligente) */}
                  {hoveredItem?.value === option.value && hoveredItem?.stats && (
                    <div className="fixed z-[500] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                         style={{ 
                           top: mousePos.y - 10, 
                           left: mousePos.x + 20,
                           maxWidth: '280px'
                         }}>
                       <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 space-y-4">
                          <div className="flex justify-between items-start gap-4">
                             <div className="min-w-0">
                                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Resumo Detalhado</p>
                                <h5 className="text-[11px] font-black uppercase truncate mt-0.5">{hoveredItem.label}</h5>
                             </div>
                             <div className="bg-blue-600 text-white px-2 py-1 rounded-lg text-[10px] font-black">{hoveredItem.stats.total} OS</div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                             <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                <p className="text-[7px] font-black text-slate-400 uppercase">Concluídas</p>
                                <p className="text-sm font-black text-emerald-400">{hoveredItem.stats.completed}</p>
                             </div>
                             <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                <p className="text-[7px] font-black text-slate-400 uppercase">Atrasos</p>
                                <p className="text-sm font-black text-red-400">{hoveredItem.stats.delayed}</p>
                             </div>
                          </div>

                          {hoveredItem.stats.details && hoveredItem.stats.details.items.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                               <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                                 {hoveredItem.stats.details.label} ({hoveredItem.stats.details.items.length})
                               </p>
                               <div className="flex flex-wrap gap-1">
                                  {hoveredItem.stats.details.items.slice(0, 4).map((item, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-[7px] font-black uppercase text-blue-200">
                                      {item.split(' ')[0]}
                                    </span>
                                  ))}
                                  {hoveredItem.stats.details.items.length > 4 && <span className="text-[7px] text-slate-500 font-bold">+{hoveredItem.stats.details.items.length - 4}</span>}
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiCheckboxFilter;
