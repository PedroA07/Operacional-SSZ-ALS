
import React, { useState, useRef, useEffect } from 'react';
import { AutocompleteItem } from '../../utils/searchService';

interface AutocompleteSearchProps {
  label: string;
  placeholder: string;
  data: any[];
  onSelect: (item: any) => void;
  onChange?: (value: string) => void;
  mapToAutocomplete: (item: any) => AutocompleteItem;
  icon?: React.ReactNode;
  required?: boolean;
  initialValue?: string;
  /** Habilita a ação "Cadastrar na hora" quando o item buscado não é encontrado. Recebe o texto digitado. */
  onQuickAdd?: (query: string) => void;
  /** Rótulo da ação de cadastro (ex.: "Cadastrar novo cliente"). */
  quickAddLabel?: string;
  /** Habilita o botão de editar em cada resultado. Recebe a entidade original. */
  onEdit?: (entity: any) => void;
}

// Iniciais para o avatar quando não há foto
const getInitials = (text?: string) =>
  (text || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const AutocompleteSearch: React.FC<AutocompleteSearchProps> = ({
  label, placeholder, data, onSelect, onChange, mapToAutocomplete, icon, required, initialValue = '',
  onQuickAdd, quickAddLabel = 'Cadastrar na hora', onEdit
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
    if (onChange) onChange(val);
    if (val.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchNorm = val.toLowerCase().trim();
    const filtered = data
      // Um registro com dado inválido (ex.: sem CPF/telefone) não pode derrubar
      // a lista inteira — mapeia de forma segura e descarta o que falhar.
      .map(item => { try { return mapToAutocomplete(item); } catch { return null; } })
      .filter((item): item is AutocompleteItem => !!item)
      .filter(item => {
        return (
          item.mainText?.toLowerCase().includes(searchNorm) ||
          item.subText?.toLowerCase().includes(searchNorm) ||
          item.document?.replace(/\D/g, '').includes(searchNorm) ||
          item.location?.toLowerCase().includes(searchNorm) ||
          item.details?.plateHorse?.toLowerCase().includes(searchNorm)
        );
      });

    // Remove duplicados por id (ex.: item recém-editado presente em duas listas)
    const seen = new Set<string>();
    const deduped = filtered.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 6);

    setResults(deduped);
    setIsOpen(true);
  };

  const handleSelectItem = (item: AutocompleteItem) => {
    const val = item.type === 'DRIVER' ? item.mainText : (item.subText || item.mainText);
    setQuery(val);
    if (onChange) onChange(val);
    onSelect(item.originalData);
    setIsOpen(false);
  };

  const handleQuickAdd = () => {
    if (onQuickAdd) onQuickAdd(query.trim());
    setIsOpen(false);
  };

  const showDropdown = isOpen && (results.length > 0 || (!!onQuickAdd && query.trim().length > 0));

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
          {icon || <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>}
        </div>
        
        <input
          type="text"
          placeholder={placeholder}
          className="w-full pl-12 pr-5 py-4 rounded-[1.5rem] border-2 border-slate-50 bg-white text-[12px] font-bold uppercase focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm placeholder:text-slate-300"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length > 0 && setIsOpen(true)}
        />
      </div>

      {showDropdown && (
        <div className="absolute z-[100] w-full mt-3 bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.18)] border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          {results.length === 0 && onQuickAdd && (
            <div className="p-3">
              <button
                type="button"
                onClick={handleQuickAdd}
                className="w-full flex items-center gap-3 p-4 rounded-[1.8rem] bg-blue-50/60 border border-dashed border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg group-active:scale-90 transition-transform">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-blue-700 uppercase leading-tight">{quickAddLabel}</p>
                  {query.trim() && (
                    <p className="text-[9px] font-bold text-blue-400 uppercase truncate mt-0.5">"{query.trim()}"</p>
                  )}
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Não encontrado · cadastre sem fechar o formulário</p>
                </div>
              </button>
            </div>
          )}
          {results.length > 0 && (
          <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-3 space-y-2">
            {results.map((item) => {
              const photo = item.type === 'DRIVER' ? item.originalData?.photo : undefined;
              const avatarTheme = item.type === 'DRIVER'
                ? 'from-blue-500 to-blue-600'
                : item.type === 'CUSTOMER'
                  ? 'from-indigo-500 to-indigo-600'
                  : item.type === 'PORT'
                    ? 'from-emerald-500 to-emerald-600'
                    : 'from-slate-500 to-slate-600';
              return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectItem(item)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSelectItem(item); }}
                className="w-full text-left p-4 rounded-[1.8rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group flex gap-3.5 items-start cursor-pointer"
              >
                {/* Avatar / Foto */}
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-sm ring-1 ring-slate-200/60">
                  {photo ? (
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${avatarTheme}`}>
                      {item.type === 'DRIVER'
                        ? <span className="text-[12px] font-black text-white">{getInitials(item.mainText)}</span>
                        : (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        )}
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex justify-between items-start w-full gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-black text-slate-900 uppercase leading-tight block whitespace-normal break-words group-hover:text-blue-600 transition-colors">
                        {item.mainText}
                      </span>
                      {item.type !== 'DRIVER' && item.subText && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 block whitespace-normal break-words">
                          FAN: {item.subText}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.document && (
                        <span className="text-[9px] font-mono font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          {item.document}
                        </span>
                      )}
                      {onEdit && (item.type === 'DRIVER' || item.type === 'CUSTOMER' || item.type === 'PORT') && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEdit(item.originalData); setIsOpen(false); }}
                          title="Editar cadastro"
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 bg-slate-100 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Layout Condicional para Motorista */}
                  {item.type === 'DRIVER' ? (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/30 flex flex-col">
                        <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-1">Equipamento</span>
                        <span className="text-[10px] font-mono font-bold text-blue-700">{item.details?.plateHorse} / {item.details?.plateTrailer}</span>
                      </div>
                      <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/30 flex flex-col">
                        <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-1">Contato Direto</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-700">{item.location}</span>
                      </div>
                    </div>
                  ) : item.location ? (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                        {item.location}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              );
            })}
          </div>
          )}
          {results.length > 0 && onQuickAdd ? (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="w-full bg-slate-50 hover:bg-blue-50 p-3.5 border-t border-slate-100 flex items-center justify-center gap-2 transition-all group"
            >
              <svg className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              <p className="text-[8px] font-black text-blue-500 group-hover:text-blue-600 uppercase tracking-[0.2em]">Não é nenhum destes? {quickAddLabel}</p>
            </button>
          ) : (
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">ALS Inteligência de Dados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteSearch;
