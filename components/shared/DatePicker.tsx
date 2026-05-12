
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { localDateStr } from '../../utils/dateHelpers';

interface DatePickerProps {
  value: string;           // YYYY-MM-DD
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const DAYS_PT = ['D','S','T','Q','Q','S','S'];

// Devolve YYYY-MM-DD para "hoje + offsetDays"
const offsetDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return localDateStr(d);
};

const DatePicker: React.FC<DatePickerProps> = ({
  value, onChange, placeholder, className, inputClassName, minDate, maxDate,
}) => {
  const today = new Date();
  const parseView = (v: string) => v
    ? { y: parseInt(v.slice(0, 4)), m: parseInt(v.slice(5, 7)) - 1 }
    : { y: today.getFullYear(), m: today.getMonth() };

  const [isOpen, setIsOpen]     = useState(false);
  const [viewYear, setViewYear] = useState(() => parseView(value).y);
  const [viewMonth, setViewMonth] = useState(() => parseView(value).m);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef   = useRef<HTMLDivElement>(null);

  // Calcula posição fixed ao abrir
  const recalcPosition = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const popupW = 288;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 340 && r.top > 340;
    setPopupStyle({
      position: 'fixed',
      top: openUp ? undefined : r.bottom + 6,
      bottom: openUp ? window.innerHeight - r.top + 6 : undefined,
      left: Math.min(r.left, window.innerWidth - popupW - 8),
      width: popupW,
      zIndex: 9999,
    });
  };

  // Fecha ao clicar fora (trigger + popup)
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const t = e.target as Node;
      const inTrigger = containerRef.current?.contains(t);
      const popup = document.getElementById('datepicker-portal-popup');
      const inPopup = popup?.contains(t);
      if (!inTrigger && !inPopup) {
        setIsOpen(false);
        setShowYearPicker(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Recalcula posição ao scroll / resize enquanto aberto
  useEffect(() => {
    if (!isOpen) return;
    const update = () => recalcPosition();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen]);

  // Sincroniza view quando valor muda externamente
  useEffect(() => {
    if (value) {
      const { y, m } = parseView(value);
      setViewYear(y);
      setViewMonth(m);
    }
  }, [value]);

  const displayValue = value
    ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
    : '';

  const select = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setIsOpen(false);
    setShowYearPicker(false);
  };

  const quickSelect = (offset: number) => {
    onChange(offsetDate(offset));
    setIsOpen(false);
    setShowYearPicker(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();

  const selY = value ? parseInt(value.slice(0, 4))  : null;
  const selM = value ? parseInt(value.slice(5, 7)) - 1 : null;
  const selD = value ? parseInt(value.slice(8, 10)) : null;

  const isSelected = (d: number) =>
    d === selD && viewMonth === selM && viewYear === selY;
  const isTodayCell = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isDisabled = (d: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  // Intervalo de anos para o seletor
  const yearRange = Array.from({ length: 21 }, (_, i) => today.getFullYear() - 5 + i);

  const baseInput = `w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50 hover:border-blue-300 text-[11px] font-bold text-slate-800 uppercase cursor-pointer flex items-center justify-between transition-all select-none ${inputClassName || ''}`;

  const popup = (
    <div
      id="datepicker-portal-popup"
      style={popupStyle}
      className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
    >
      {/* Quick shortcuts */}
      <div className="flex gap-1.5 p-3 border-b border-slate-50 bg-slate-50/60">
        <button type="button" onClick={() => quickSelect(-1)}
          className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[8px] font-black uppercase tracking-wide hover:bg-slate-100 transition-colors shadow-sm">
          Ontem
        </button>
        <button type="button" onClick={() => quickSelect(0)}
          className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-[8px] font-black uppercase tracking-wide hover:bg-blue-700 transition-colors shadow-sm">
          Hoje
        </button>
        <button type="button" onClick={() => quickSelect(1)}
          className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[8px] font-black uppercase tracking-wide hover:bg-slate-100 transition-colors shadow-sm">
          Amanhã
        </button>
      </div>

      {!showYearPicker ? (
        <>
          <div className="flex items-center justify-between px-3 py-2.5">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button type="button" onClick={() => setShowYearPicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
              <span className="text-[11px] font-black text-slate-800 uppercase">{MONTHS_PT[viewMonth]}</span>
              <span className="text-[11px] font-black text-blue-600">{viewYear}</span>
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 px-3 pb-1">
            {DAYS_PT.map((d, i) => (
              <div key={i} className="text-center text-[7px] font-black text-slate-400 uppercase py-0.5">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-3 pb-3 gap-0.5">
            {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
              <button
                key={d}
                type="button"
                disabled={isDisabled(d)}
                onClick={() => !isDisabled(d) && select(d)}
                className={`w-full aspect-square rounded-xl text-[11px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
                  ${isSelected(d) ? 'bg-blue-600 text-white font-black shadow-md scale-105'
                    : isTodayCell(d) ? 'bg-blue-50 text-blue-700 font-black ring-1 ring-blue-200'
                    : 'text-slate-700 hover:bg-slate-100'}`}
              >{d}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Selecionar Ano</span>
            <button type="button" onClick={() => setShowYearPicker(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 max-h-44 overflow-y-auto">
            {yearRange.map(y => (
              <button key={y} type="button" onClick={() => { setViewYear(y); setShowYearPicker(false); }}
                className={`py-2 rounded-xl text-[10px] font-black transition-all ${y === viewYear ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                {y}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Mês</span>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_PT.map((m, i) => (
                <button key={i} type="button" onClick={() => { setViewMonth(i); setShowYearPicker(false); }}
                  className={`py-2 rounded-xl text-[8px] font-black uppercase transition-all ${i === viewMonth ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {value && (
        <div className="px-3 pb-3 border-t border-slate-50 pt-2">
          <button type="button" onClick={() => { onChange(''); setIsOpen(false); }}
            className="w-full py-1.5 rounded-xl text-slate-400 text-[8px] font-black uppercase hover:bg-slate-50 transition-colors">
            Limpar data
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {/* ── Trigger ── */}
      <div
        ref={triggerRef}
        onClick={() => {
          if (!isOpen) recalcPosition();
          setIsOpen(v => !v);
          setShowYearPicker(false);
        }}
        className={baseInput}
      >
        <span className={displayValue ? 'text-slate-800' : 'text-slate-300'}>
          {displayValue || placeholder || 'Selecionar data...'}
        </span>
        <svg className="w-4 h-4 text-slate-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>

      {/* ── Calendar popup — renderizado via portal para sobrepor overflow containers ── */}
      {isOpen && ReactDOM.createPortal(popup, document.body)}
    </div>
  );
};

export default DatePicker;
