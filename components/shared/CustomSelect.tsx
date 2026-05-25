
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  color?: string; // optional color dot
}

interface DropdownPos {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  minWidth: number;
  maxWidth: number;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean; // auto-enabled when options.length > 8
}

const DROPDOWN_MAX_H = 288; // matches max-h-56 (224px list) + search (40px) + clear (40px)
const DROPDOWN_MIN_W = 180;
const DROPDOWN_MAX_W = 400;
const MARGIN = 8; // gap from trigger

const CustomSelect: React.FC<CustomSelectProps> = ({
  value, onChange, options, placeholder, className, inputClassName,
  disabled = false, required = false, searchable,
}) => {
  const [isOpen,  setIsOpen]  = useState(false);
  const [search,  setSearch]  = useState('');
  const [pos,     setPos]     = useState<DropdownPos | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef    = useRef<HTMLInputElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);

  const shouldSearch = searchable ?? options.length > 8;
  const selectedOption = options.find(o => o.value === value);
  const displayLabel   = selectedOption?.label ?? '';

  // ── Calcula posição ótima do dropdown ─────────────────────────────────────
  const calcPosition = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const estimatedH = Math.min(DROPDOWN_MAX_H, options.length * 40 + (shouldSearch ? 48 : 0) + (!required && value ? 40 : 0) + 8);
    const w = Math.min(DROPDOWN_MAX_W, Math.max(DROPDOWN_MIN_W, r.width));

    const spaceBelow = vh - r.bottom - MARGIN;
    const spaceAbove = r.top - MARGIN;
    const spaceRight = vw - r.left;
    const spaceLeft  = r.right;

    // Vertical: preferir abaixo, senão acima
    const openDown = spaceBelow >= estimatedH || spaceBelow >= spaceAbove;

    // Horizontal: alinhar à esquerda se couber, senão à direita
    const alignLeft = spaceRight >= w;

    const result: DropdownPos = { minWidth: r.width, maxWidth: DROPDOWN_MAX_W };

    if (openDown) {
      result.top = r.bottom + MARGIN;
    } else {
      result.bottom = vh - r.top + MARGIN;
    }

    if (alignLeft) {
      result.left = r.left;
    } else {
      result.right = vw - r.right;
    }

    setPos(result);
  }, [options.length, shouldSearch, required, value]);

  // ── Recalcula ao abrir e no scroll/resize ─────────────────────────────────
  useLayoutEffect(() => {
    if (!isOpen) return;
    calcPosition();
    window.addEventListener('scroll', calcPosition, true);
    window.addEventListener('resize', calcPosition);
    return () => {
      window.removeEventListener('scroll', calcPosition, true);
      window.removeEventListener('resize', calcPosition);
    };
  }, [isOpen, calcPosition]);

  // ── Fecha ao clicar fora ──────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insideDropdown  = dropdownRef.current?.contains(target);
      if (!insideContainer && !insideDropdown) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Focus na busca ao abrir ───────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && shouldSearch) {
      setTimeout(() => searchRef.current?.focus(), 30);
    }
    if (!isOpen) setSearch('');
  }, [isOpen, shouldSearch]);

  // ── ESC fecha ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); setSearch(''); }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  const filtered = shouldSearch && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const select = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearch('');
  };

  const openDropdown = () => {
    if (disabled) return;
    setIsOpen(v => !v);
  };

  const triggerClass = [
    'w-full px-4 py-3.5 rounded-2xl border-2 text-[11px] font-bold uppercase',
    'flex items-center justify-between transition-all select-none',
    isOpen
      ? 'border-blue-400 bg-white shadow-sm'
      : 'border-slate-100 bg-slate-50 hover:border-blue-300',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    inputClassName ?? '',
  ].join(' ');

  // Seta indica a direção em que o dropdown abrirá
  const arrowDown = pos ? pos.top !== undefined : true;

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>

      {/* ── Trigger ── */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={openDropdown}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            openDropdown();
          }
        }}
        className={triggerClass}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className={`truncate ${displayLabel ? 'text-slate-800' : 'text-slate-300'}`}>
            {displayLabel || placeholder || 'Selecionar...'}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${isOpen ? (arrowDown ? 'rotate-180' : 'rotate-0') : (arrowDown ? 'rotate-0' : 'rotate-180')}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>

      {/* ── Dropdown (portal via fixed) ── */}
      {isOpen && pos && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{
            top:      pos.top    !== undefined ? `${pos.top}px`    : undefined,
            bottom:   pos.bottom !== undefined ? `${pos.bottom}px` : undefined,
            left:     pos.left   !== undefined ? `${pos.left}px`   : undefined,
            right:    pos.right  !== undefined ? `${pos.right}px`  : undefined,
            minWidth: `${pos.minWidth}px`,
            maxWidth: `${pos.maxWidth}px`,
          }}
        >
          {/* Search input */}
          {shouldSearch && (
            <div className="p-2 border-b border-slate-50 bg-slate-50/60">
              <div className="relative">
                <svg className="w-3.5 h-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-100 text-[10px] font-bold uppercase outline-none focus:border-blue-300 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto py-1 custom-scrollbar">
            {filtered.length === 0 ? (
              <p className="text-[9px] font-bold text-slate-300 uppercase text-center py-5">
                Nenhum resultado
              </p>
            ) : (
              filtered.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && select(opt.value)}
                    className={[
                      'w-full flex items-center gap-2 px-4 py-2.5 text-left text-[11px] font-bold uppercase transition-colors',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {opt.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: isSelected ? 'white' : opt.color }}
                      />
                    )}
                    {isSelected
                      ? <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      : <span className="w-3 shrink-0" />
                    }
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Clear */}
          {value && !required && (
            <div className="border-t border-slate-50 px-3 pb-2 pt-1">
              <button
                type="button"
                onClick={() => select('')}
                className="w-full py-1.5 rounded-xl text-slate-400 text-[8px] font-black uppercase hover:bg-slate-50 transition-colors"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
