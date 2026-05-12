
import React, { useState, useRef, useEffect } from 'react';
import { localDateStr } from '../../utils/dateHelpers';

interface DateTimePickerProps {
  value: string;           // YYYY-MM-DDTHH:MM  (datetime-local format)
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  minDate?: string;
  maxDate?: string;
  required?: boolean;
}

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT   = ['D','S','T','Q','Q','S','S'];
const QUICK_TIMES = ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];

const offsetDate = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateStr(d);
};

const parseDateTime = (v: string) => {
  if (!v) return { date: '', hour: 8, minute: 0 };
  const [datePart, timePart] = v.split('T');
  const [h, m] = (timePart || '08:00').split(':');
  return { date: datePart || '', hour: parseInt(h) || 8, minute: parseInt(m) || 0 };
};

/** YYYY-MM-DDTHH:MM  →  DD/MM/AAAA HH:MM */
const toDisplay = (v: string) => {
  if (!v) return '';
  const [dp, tp] = v.split('T');
  if (!dp) return '';
  const [y, mo, d] = dp.split('-');
  const timeStr = tp ? ` ${tp.slice(0, 5)}` : '';
  return `${d}/${mo}/${y}${timeStr}`;
};

/** DD/MM/AAAA HH:MM  →  YYYY-MM-DDTHH:MM  (returns '' on invalid) */
const fromManual = (s: string): string => {
  const clean = s.trim();
  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?$/);
  if (!match) return '';
  const [, d, mo, y, hh, mm] = match;
  const date = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  if (hh !== undefined) {
    const h = Math.min(23, Math.max(0, parseInt(hh)));
    const m = Math.min(59, Math.max(0, parseInt(mm)));
    return `${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  return `${date}T08:00`;
};

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value, onChange, placeholder, className, inputClassName, minDate, maxDate,
}) => {
  const today   = new Date();
  const parsed  = parseDateTime(value);

  const [isOpen,         setIsOpen]         = useState(false);
  const [viewYear,       setViewYear]        = useState(() => parsed.date ? parseInt(parsed.date.slice(0, 4)) : today.getFullYear());
  const [viewMonth,      setViewMonth]       = useState(() => parsed.date ? parseInt(parsed.date.slice(5, 7)) - 1 : today.getMonth());
  const [showYearPicker, setShowYearPicker]  = useState(false);
  const [hour,           setHour]            = useState(parsed.hour);
  const [minute,         setMinute]          = useState(parsed.minute);
  const [manualInput,    setManualInput]     = useState(() => toDisplay(value));
  const [manualError,    setManualError]     = useState(false);
  const [popupStyle,     setPopupStyle]      = useState<React.CSSProperties>({ top: '100%', left: 0, marginTop: 8 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when value changes externally
  useEffect(() => {
    const p = parseDateTime(value);
    if (p.date) {
      setViewYear(parseInt(p.date.slice(0, 4)));
      setViewMonth(parseInt(p.date.slice(5, 7)) - 1);
    }
    setHour(p.hour);
    setMinute(p.minute);
    setManualInput(toDisplay(value));
  }, [value]);

  // Compute popup position when opening
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const vh   = window.innerHeight;
    const vw   = window.innerWidth;
    const POP_W = 480;
    const POP_H = 400;

    const style: React.CSSProperties = {};

    // Vertical: prefer below, fallback above
    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    if (spaceBelow >= POP_H || spaceBelow >= spaceAbove) {
      style.top    = '100%';
      style.bottom = 'auto';
      style.marginTop    = 8;
      style.marginBottom = 0;
    } else {
      style.bottom = '100%';
      style.top    = 'auto';
      style.marginBottom = 8;
      style.marginTop    = 0;
    }

    // Horizontal: prefer left-aligned, fallback right-aligned
    if (rect.left + POP_W <= vw) {
      style.left  = 0;
      style.right = 'auto';
    } else {
      style.right = 0;
      style.left  = 'auto';
    }

    setPopupStyle(style);
  }, [isOpen]);

  // Close on outside click / ESC
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowYearPicker(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); setShowYearPicker(false); }
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const buildValue = (date: string, h: number, m: number) =>
    date ? `${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` : '';

  const emit = (date: string, h: number, m: number) => onChange(buildValue(date, h, m));

  const selectDay = (day: number) => {
    const mo   = String(viewMonth + 1).padStart(2,'0');
    const dy   = String(day).padStart(2,'0');
    const date = `${viewYear}-${mo}-${dy}`;
    emit(date, hour, minute);
    setShowYearPicker(false);
  };

  const selectQuickDate = (offset: number) => {
    const date = offsetDate(offset);
    emit(date, hour, minute);
  };

  const applyHour = (h: number) => {
    // Clamp 0–23 (no negatives, no overflow)
    const safe = ((h % 24) + 24) % 24;
    setHour(safe);
    if (parsed.date) emit(parsed.date, safe, minute);
  };

  const applyMinute = (m: number) => {
    const safe = ((m % 60) + 60) % 60;
    setMinute(safe);
    if (parsed.date) emit(parsed.date, hour, safe);
  };

  const applyQuickTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    setHour(h); setMinute(m);
    if (parsed.date) emit(parsed.date, h, m);
  };

  // Hour: always wraps 0↔23, no negatives
  const incHour = () => applyHour(hour + 1);
  const decHour = () => applyHour(hour - 1);

  // Minute: if NOT on a multiple of 5 → step by 1 toward nearest multiple; else step by 5
  const incMinute = () => {
    if (minute % 5 !== 0) {
      applyMinute(minute + 1);           // step +1 until we hit a multiple of 5
    } else {
      applyMinute(minute + 5);           // already aligned → jump 5
    }
  };
  const decMinute = () => {
    if (minute % 5 !== 0) {
      applyMinute(minute - 1);           // step -1 until we hit a multiple of 5
    } else {
      applyMinute(minute - 5);           // already aligned → jump 5
    }
  };

  // ── Manual input ───────────────────────────────────────────────────────────
  const commitManual = (raw: string) => {
    if (!raw.trim()) { onChange(''); setManualError(false); return; }
    const result = fromManual(raw);
    if (result) {
      onChange(result);
      setManualError(false);
    } else {
      setManualError(true);
    }
  };

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const yearRange       = Array.from({ length: 21 }, (_, i) => today.getFullYear() - 5 + i);

  const isSelected = (d: number) => {
    const mo = String(viewMonth + 1).padStart(2,'0');
    const dy = String(d).padStart(2,'0');
    return parsed.date === `${viewYear}-${mo}-${dy}`;
  };

  const isTodayCell = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isDisabled = (d: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Display ────────────────────────────────────────────────────────────────
  const displayValue = toDisplay(value);

  const triggerClass = [
    'w-full px-4 py-3.5 rounded-2xl border-2',
    isOpen ? 'border-blue-400 bg-white' : 'border-slate-100 bg-slate-50 hover:border-blue-300',
    'text-[11px] font-bold uppercase cursor-pointer flex items-center justify-between transition-all select-none',
    inputClassName ?? '',
  ].join(' ');

  // Shared arrow button style
  const arrowBtn = "w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all";

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>

      {/* ── Trigger ── */}
      <div
        onClick={() => { setIsOpen(v => !v); setShowYearPicker(false); }}
        className={triggerClass}
      >
        <span className={displayValue ? 'text-slate-800' : 'text-slate-300'}>
          {displayValue || placeholder || 'Selecionar data e hora...'}
        </span>
        <svg className="w-4 h-4 text-slate-400 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>

      {/* ── Popup ── */}
      {isOpen && (
        <div
          className="absolute z-[600] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          style={{ width: 480, ...popupStyle }}
        >
          {/* ── Two-column layout: LEFT = calendar  |  RIGHT = time ── */}
          <div className="flex">

            {/* ════ LEFT: Calendar ════ */}
            <div className="flex-1 min-w-0 border-r border-slate-100">

              {/* Quick date shortcuts */}
              <div className="flex gap-1.5 p-3 border-b border-slate-100 bg-slate-50/60">
                {([[-1,'Ontem'],[0,'Hoje'],[1,'Amanhã']] as [number,string][]).map(([offset, label]) => (
                  <button key={label} type="button" onClick={() => selectQuickDate(offset)}
                    className={`flex-1 py-1.5 rounded-xl text-[8px] font-black uppercase transition-colors shadow-sm
                      ${offset === 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {!showYearPicker ? (
                <>
                  {/* Month / Year nav */}
                  <div className="flex items-center justify-between px-3 py-2">
                    <button type="button" onClick={prevMonth}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowYearPicker(true)}
                      className="flex items-center gap-1 px-2 py-1 rounded-xl hover:bg-slate-100 transition-colors">
                      <span className="text-[10px] font-black text-slate-800 uppercase">{MONTHS_PT[viewMonth]}</span>
                      <span className="text-[10px] font-black text-blue-600">{viewYear}</span>
                      <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <button type="button" onClick={nextMonth}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </div>

                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 px-3 pb-0.5">
                    {DAYS_PT.map((d, i) => (
                      <div key={i} className="text-center text-[7px] font-black text-slate-400 uppercase py-0.5">{d}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 px-3 pb-3 gap-0.5">
                    {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                      <button
                        key={d}
                        type="button"
                        disabled={isDisabled(d)}
                        onClick={() => !isDisabled(d) && selectDay(d)}
                        className={`w-full aspect-square rounded-xl text-[10px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
                          ${isSelected(d)
                            ? 'bg-blue-600 text-white font-black shadow-md scale-105'
                            : isTodayCell(d)
                              ? 'bg-blue-50 text-blue-700 font-black ring-1 ring-blue-200'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >{d}</button>
                    ))}
                  </div>
                </>
              ) : (
                /* Year / Month picker */
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Selecionar Ano</span>
                    <button type="button" onClick={() => setShowYearPicker(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 max-h-36 overflow-y-auto custom-scrollbar">
                    {yearRange.map(y => (
                      <button key={y} type="button" onClick={() => { setViewYear(y); setShowYearPicker(false); }}
                        className={`py-1.5 rounded-xl text-[9px] font-black transition-all ${y === viewYear ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                        {y}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mês</span>
                    <div className="grid grid-cols-3 gap-1">
                      {MONTHS_PT.map((m, i) => (
                        <button key={i} type="button" onClick={() => { setViewMonth(i); setShowYearPicker(false); }}
                          className={`py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${i === viewMonth ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                          {m.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ════ RIGHT: Time ════ */}
            <div className="w-40 shrink-0 p-3 flex flex-col items-center gap-2.5 bg-slate-50/40">

              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Horário</p>

              {/* Hour : Minute columns */}
              <div className="flex items-center gap-2">

                {/* Hour column */}
                <div className="flex flex-col items-center gap-1">
                  <button type="button" onClick={incHour} className={arrowBtn}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <div className="w-12 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[20px] font-black tabular-nums shadow-sm select-none">
                    {String(hour).padStart(2, '0')}
                  </div>
                  <button type="button" onClick={decHour} className={arrowBtn}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <p className="text-[7px] font-black text-slate-400 uppercase">Hora</p>
                </div>

                <span className="text-[22px] font-black text-slate-300 mb-5 select-none">:</span>

                {/* Minute column */}
                <div className="flex flex-col items-center gap-1">
                  <button type="button" onClick={incMinute} className={arrowBtn}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <div className="w-12 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[20px] font-black tabular-nums shadow-sm select-none">
                    {String(minute).padStart(2, '0')}
                  </div>
                  <button type="button" onClick={decMinute} className={arrowBtn}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <p className="text-[7px] font-black text-slate-400 uppercase">Min</p>
                </div>
              </div>

              {/* Quick time presets */}
              <div className="w-full space-y-0.5">
                {QUICK_TIMES.map(t => {
                  const [qh, qm] = t.split(':').map(Number);
                  const isActive = hour === qh && minute === qm;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyQuickTime(t)}
                      className={`w-full py-1 rounded-lg text-[8px] font-black transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Bottom: Manual text input + actions ── */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-100 flex items-center gap-2">

            {/* Manual input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={manualInput}
                onChange={e => { setManualInput(e.target.value); setManualError(false); }}
                onBlur={e  => commitManual(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitManual(manualInput); } }}
                placeholder="DD/MM/AAAA HH:MM"
                className={`w-full px-3 py-2 rounded-xl border text-[10px] font-mono font-bold outline-none transition-all
                  ${manualError
                    ? 'border-red-400 bg-red-50 text-red-700 focus:ring-1 focus:ring-red-400'
                    : 'border-slate-200 bg-white text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-300'
                  }`}
              />
              {manualError && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-red-400 uppercase pointer-events-none">
                  Inválido
                </span>
              )}
            </div>

            {/* Clear */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setManualInput(''); setManualError(false); setIsOpen(false); }}
                className="px-3 py-2 rounded-xl text-[8px] font-black uppercase text-slate-400 border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Limpar
              </button>
            )}

            {/* Confirm */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[8px] font-black uppercase hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
