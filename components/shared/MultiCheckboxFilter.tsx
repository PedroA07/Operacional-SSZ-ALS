
import React, { useState, useRef, useEffect } from 'react';

interface FilterOption {
  value: string;
  label: string;
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery(''); // Reseta a busca ao fechar
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

  const displayText = !hasSelection 
    ? 'TODOS' 
    : isAllSelected 
    ? 'TODOS' 
    : `${selectedOptions.length} SELEC.`;

  // Filtra as opções baseada na pesquisa do usuário
  const filteredOptions = options.filter(opt => {
    const text = typeof opt === 'string' ? opt : opt.label;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="relative flex-1 min-w-[150px]" ref={containerRef} style={{ zIndex: isOpen ? 100 : 10 }}>
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">{label}</p>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border-2 rounded-xl transition-all text-xs font-black uppercase ${isOpen ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
      >
        <span className={`truncate mr-2 ${hasSelection && !isAllSelected ? 'text-blue-600' : 'text-slate-700'}`}>
          {displayText}
        </span>
        <svg className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 p-4 animate-in fade-in slide-in-from-top-2 duration-200 min-w-[320px]">
          
          {/* Campo de Pesquisa Interno */}
          <div className="relative mb-4">
             <input 
               type="text" 
               placeholder={`PESQUISAR EM ${label.toUpperCase()}...`}
               className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase outline-none focus:bg-white focus:border-blue-400 transition-all"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               autoFocus
             />
             <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
             </svg>
          </div>

          <div className="flex justify-between items-center px-1 mb-3 pb-3 border-b border-slate-50">
            <button type="button" onClick={() => toggleAll(true)} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Marcar Todos</button>
            <button type="button" onClick={() => toggleAll(false)} className="text-[10px] font-black text-slate-400 uppercase hover:underline">Limpar</button>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const text = typeof opt === 'string' ? opt : opt.label;
              const isSelected = selectedOptions.includes(val);
              
              return (
                <label key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={isSelected}
                    onChange={() => toggleOption(val)}
                  />
                  <span className={`text-[11px] font-bold uppercase truncate transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                    {text}
                  </span>
                </label>
              );
            }) : (
              <div className="py-6 text-center">
                <p className="text-xs font-black text-slate-300 uppercase italic">Nenhum item encontrado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiCheckboxFilter;
