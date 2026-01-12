
import React, { useState, useRef, useEffect } from 'react';
import { maskCNPJ, maskCPF } from '../../utils/masks';

interface AutocompleteItem {
  id: string;
  mainText: string;    // Razão Social ou Nome
  subText?: string;     // Nome Fantasia
  document?: string;    // CNPJ ou CPF
  location?: string;    // Cidade - UF
  originalData: any;
}

interface AutocompleteSearchProps {
  label: string;
  placeholder: string;
  data: any[];
  onSelect: (item: any) => void;
  mapToAutocomplete: (item: any) => AutocompleteItem;
  icon?: React.ReactNode;
  required?: boolean;
  initialValue?: string;
}

const AutocompleteSearch: React.FC<AutocompleteSearchProps> = ({ 
  label, placeholder, data, onSelect, mapToAutocomplete, icon, required, initialValue = ''
}) => {
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<AutocompleteItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (val.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchNorm = val.toLowerCase().trim();
    const filtered = data
      .map(mapToAutocomplete)
      .filter(item => {
        return (
          item.mainText.toLowerCase().includes(searchNorm) ||
          item.subText?.toLowerCase().includes(searchNorm) ||
          item.document?.replace(/\D/g, '').includes(searchNorm) ||
          item.location?.toLowerCase().includes(searchNorm)
        );
      })
      .slice(0, 8); // Limita para performance e estética

    setResults(filtered);
    setIsOpen(true);
  };

  const handleSelectItem = (item: AutocompleteItem) => {
    setQuery(item.subText || item.mainText);
    onSelect(item.originalData);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
          {icon || <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>}
        </div>
        
        <input
          type="text"
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-slate-50 bg-white text-[11px] font-bold uppercase focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm placeholder:text-slate-300"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length > 0 && setIsOpen(true)}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-72 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectItem(item)}
                className="w-full text-left p-4 rounded-2xl hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100 group flex flex-col"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-700">
                    {item.mainText}
                  </span>
                  {item.document && (
                    <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      {item.document.length > 11 ? maskCNPJ(item.document) : maskCPF(item.document)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-1">
                   <p className="text-[9px] font-bold text-slate-500 uppercase italic">
                     {item.subText && item.subText !== item.mainText ? `FAN: ${item.subText}` : ''}
                   </p>
                   {item.location && (
                     <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-400"></div>
                        <span className="text-[8px] font-black text-slate-400 uppercase group-hover:text-blue-500">
                          {item.location}
                        </span>
                     </div>
                   )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutocompleteSearch;
