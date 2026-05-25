import React, {
  useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo,
} from 'react';

// ── Cache de cidades IBGE (módulo-level, compartilhado entre instâncias) ──────
interface IbgeCity {
  id: number;
  nome: string;
  microrregiao?: { mesorregiao: { UF: { sigla: string } } };
}
interface CityEntry { label: string; norm: string; }

const accentFree = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

let _cities: CityEntry[] | null = null;
let _fetching = false;

function ensureCitiesLoaded() {
  if (_cities !== null || _fetching) return;
  _fetching = true;
  fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
    .then(r => r.json())
    .then((data: IbgeCity[]) => {
      _cities = data
        .filter(c => c.microrregiao?.mesorregiao?.UF?.sigla)
        .map(c => {
          const city = c.nome.toUpperCase();
          const uf   = c.microrregiao!.mesorregiao.UF.sigla;
          return { label: `${city} - ${uf}`, norm: accentFree(c.nome) + ' ' + uf };
        });
    })
    .catch(() => { _cities = []; })
    .finally(() => {
      _fetching = false;
      window.dispatchEvent(new CustomEvent('ibge:ready'));
    });
}

// ── Posicionamento ────────────────────────────────────────────────────────────
interface DropPos {
  top?: number; bottom?: number;
  left?: number; right?: number;
  width: number;
}
const DROP_W   = 320;
const DROP_H   = 300; // estimativa
const MARGIN   = 8;
const MAX_RESULTS = 10;

// ── Props ─────────────────────────────────────────────────────────────────────
interface CitySearchSelectProps {
  value: string;                   // "CIDADE - UF"
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

const CitySearchSelect: React.FC<CitySearchSelectProps> = ({
  value, onChange, placeholder, className, inputClassName, disabled = false,
}) => {
  const [isOpen,   setIsOpen]   = useState(false);
  const [query,    setQuery]    = useState('');
  const [cities,   setCities]   = useState<CityEntry[]>(_cities ?? []);
  const [loading,  setLoading]  = useState(!_cities);
  const [pos,      setPos]      = useState<DropPos | null>(null);

  const triggerRef  = useRef<HTMLDivElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // ── Carrega IBGE ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (_cities) { setCities(_cities); setLoading(false); return; }
    ensureCitiesLoaded();
    const onReady = () => { setCities(_cities ?? []); setLoading(false); };
    window.addEventListener('ibge:ready', onReady);
    return () => window.removeEventListener('ibge:ready', onReady);
  }, []);

  // ── Filtragem ─────────────────────────────────────────────────────────────
  const results = useMemo(() => {
    const q = accentFree(query.trim());
    if (!q || cities.length === 0) return [];
    return cities.filter(c => c.norm.includes(q)).slice(0, MAX_RESULTS);
  }, [query, cities]);

  // ── Calcula posição ótima ─────────────────────────────────────────────────
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r  = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - r.bottom - MARGIN;
    const spaceAbove = r.top - MARGIN;
    const spaceRight = vw - r.left;

    const openDown = spaceBelow >= DROP_H || spaceBelow >= spaceAbove;
    const alignLeft = spaceRight >= DROP_W;

    const p: DropPos = { width: Math.max(r.width, DROP_W) };
    openDown  ? (p.top    = r.bottom + MARGIN) : (p.bottom = vh - r.top + MARGIN);
    alignLeft ? (p.left   = r.left)            : (p.right  = vw - r.right);
    setPos(p);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    calcPos();
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [isOpen, calcPos]);

  // ── Foca input ao abrir ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 20);
    else setQuery('');
  }, [isOpen]);

  // ── Fecha ao clicar fora ──────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropRef.current?.contains(t)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── ESC fecha ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  const select = (label: string) => {
    onChange(label);
    setIsOpen(false);
  };

  const clear = () => { onChange(''); setQuery(''); };

  // ── Trigger style ─────────────────────────────────────────────────────────
  const triggerCls = [
    'w-full px-4 py-3.5 rounded-2xl border-2 text-[11px] font-bold uppercase',
    'flex items-center justify-between transition-all select-none cursor-pointer',
    isOpen
      ? 'border-blue-400 bg-white shadow-sm'
      : 'border-slate-100 bg-slate-50 hover:border-blue-300',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    inputClassName ?? '',
  ].join(' ');

  const openDown = pos ? pos.top !== undefined : true;

  return (
    <div ref={triggerRef} className={`relative ${className ?? ''}`}>
      {/* ── Trigger ── */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => { if (!disabled) setIsOpen(v => !v); }}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault(); setIsOpen(v => !v);
          }
        }}
        className={triggerCls}
      >
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-300'}`}>
          {value || placeholder || 'Buscar cidade...'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); clear(); }}
              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 transition-all"
              tabIndex={-1}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? (openDown ? 'rotate-180' : 'rotate-0') : (openDown ? 'rotate-0' : 'rotate-180')}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>

      {/* ── Dropdown (fixed) ── */}
      {isOpen && pos && (
        <div
          ref={dropRef}
          className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{
            top:    pos.top    !== undefined ? `${pos.top}px`    : undefined,
            bottom: pos.bottom !== undefined ? `${pos.bottom}px` : undefined,
            left:   pos.left   !== undefined ? `${pos.left}px`   : undefined,
            right:  pos.right  !== undefined ? `${pos.right}px`  : undefined,
            width:  `${pos.width}px`,
          }}
        >
          {/* Busca */}
          <div className="p-2 border-b border-slate-50 bg-slate-50/70">
            <div className="relative">
              <svg className="w-3.5 h-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Digite cidade ou UF..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-100 text-[10px] font-bold uppercase outline-none focus:border-blue-300 transition-colors"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-black text-slate-400 uppercase">Carregando cidades...</span>
              </div>
            ) : query.trim().length === 0 ? (
              <p className="text-[9px] font-bold text-slate-300 uppercase text-center py-5">
                Digite para buscar
              </p>
            ) : results.length === 0 ? (
              <p className="text-[9px] font-bold text-slate-300 uppercase text-center py-5">
                Nenhuma cidade encontrada
              </p>
            ) : (
              results.map(city => {
                const [cityName, uf] = city.label.split(' - ');
                const isSelected = value === city.label;
                return (
                  <button
                    key={city.label}
                    type="button"
                    onClick={() => select(city.label)}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {isSelected
                      ? <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      : <svg className={`w-3 h-3 shrink-0 ${isSelected ? 'text-white' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    }
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[11px] font-black uppercase truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {cityName}
                      </span>
                    </span>
                    <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {uf}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Entrada manual se não encontrou */}
          {!loading && query.trim().length > 0 && results.length === 0 && (
            <div className="border-t border-slate-50 px-3 pb-2 pt-1">
              <button
                type="button"
                onClick={() => select(query.trim().toUpperCase())}
                className="w-full py-2 rounded-xl text-blue-600 text-[9px] font-black uppercase hover:bg-blue-50 transition-colors"
              >
                Usar "{query.trim().toUpperCase()}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitySearchSelect;
