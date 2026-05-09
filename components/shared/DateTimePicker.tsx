
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

const QUICK_TIMES = ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state when value changes externally
  useEffect(() => {
    const p = parseDateTime(value);
    if (p.date) {
      setViewYear(parseInt(p.date.slice(0, 4)));
      setViewMonth(parseInt(p.date.slice(5, 7)) - 1);
    }
    setHour(p.hour);
    setMinute(p.minute);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowYearPicker(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const buildValue = (date: string, h: number, m: number) =>
    date ? `${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` : '';

  const emit = (date: string, h: number, m: number) => onChange(buildValue(date, h, m));

  const selectDay = (day: number) => {
    const mo  = String(viewMonth + 1).padStart(2,'0');
    const dy  = String(day).padStart(2,'0');
    const date = `${viewYear}-${mo}-${dy}`;
    emit(date, hour, minute);
    setShowYearPicker(false);
    // keep popup open so user can pick time
  };

  const selectQuickDate = (offset: number) => {
    const date = offsetDate(offset);
    emit(date, hour, minute);
  };

  const applyHour = (h: number) => {
    setHour(h);
    if (parsed.date) emit(parsed.date, h, minute);
  };
  const applyMinute = (m: number) => {
    setMinute(m);
    if (parsed.date) emit(parsed.date, hour, m);
  };

  const applyQuickTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    setHour(h); setMinute(m);
    if (parsed.date) emit(parsed.date, h, m);
  };

  const incHour   = () => applyHour((hour + 1) % 24);
  const decHour   = () => applyHour((hour + 23) % 24);
  const incMinute = () => applyMinute((minute + 5) % 60);
  const decMinute = () => applyMinute(minute === 0 ? 55 : minute - 5);

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const yearRange       = Array.from({ length: 21 }, (_, i) => today.getFullYear() - 5 + i);

  const selDateStr = parsed.date;
  const isSelected = (d: number) => {
    const mo = String(viewMonth + 1).padStart(2,'0');
    const dy = String(d).padStart(2,'0');
    return selDateStr === `${viewYear}-${mo}-${dy}`;
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
    if (viewMonth === 0)  { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0);  setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Display ────────────────────────────────────────────────────────────────
  const displayValue = value
    ? (() => {
        const [dp, tp] = value.split('T');
        if (!dp) return '';
        const [y, mo, d] = dp.split('-');
        const timeStr = tp ? ` ${tp.slice(0, 5)}` : '';
        return `${d}/${mo}/${y}${timeStr}`;
      })()
    : '';

  const triggerClass = [
    'w-full px-4 py-3.5 rounded-2xl border-2',
    isOpen ? 'border-blue-400 bg-white' : 'border-slate-100 bg-slate-50 hover:border-blue-300',
    'text-[11px] font-bold uppercase cursor-pointer flex items-center justify-between transition-all select-none',
    inputClassName ?? '',
  ].join(' ');

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>

      {/* ── Trigger ── */}
      <div onClick={() => { setIsOpen(v => !v); setShowYearPicker(false); }} className={triggerClass}>
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
          className="absolute top-full left-0 mt-2 z-[600] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          style={{ minWidth: '288px', maxWidth: '340px' }}
        >
          {/* Quick date shortcuts */}
          <div className="flex gap-1.5 p-3 border-b border-slate-50 bg-slate-50/60">
            <button type="button" onClick={() => selectQuickDate(-1)}
              className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[8px] font-black uppercase hover:bg-slate-100 transition-colors shadow-sm">
              Ontem
            </button>
            <button type="button" onClick={() => selectQuickDate(0)}
              className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-[8px] font-black uppercase hover:bg-blue-700 transition-colors shadow-sm">
              Hoje
            </button>
            <button type="button" onClick={() => selectQuickDate(1)}
              className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[8px] font-black uppercase hover:bg-slate-100 transition-colors shadow-sm">
              Amanhã
            </button>
          </div>

          {!showYearPicker ? (
            <>
              {/* Month / Year nav */}
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

              {/* Day headers */}
              <div className="grid grid-cols-7 px-3 pb-1">
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
                    className={`w-full aspect-square rounded-xl text-[11px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
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
                      {m.slice(0,3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Time selector ── */}
          <div className="border-t border-slate-100 bg-slate-50/40 p-3 space-y-3">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Horário</p>

            {/* Hour : Minute display with arrows */}
            <div className="flex items-center justify-center gap-3">

              {/* Hour column */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={incHour}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                </button>
                <div className="w-14 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[22px] font-black tabular-nums shadow-sm">
                  {String(hour).padStart(2, '0')}
                </div>
                <button type="button" onClick={decHour}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <p className="text-[7px] font-black text-slate-400 uppercase">Hora</p>
              </div>

              <span className="text-[28px] font-black text-slate-300 pb-6">:</span>

              {/* Minute column */}
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={incMinute}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                </button>
                <div className="w-14 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-[22px] font-black tabular-nums shadow-sm">
                  {String(minute).padStart(2, '0')}
                </div>
                <button type="button" onClick={decMinute}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <p className="text-[7px] font-black text-slate-400 uppercase">Min</p>
              </div>
            </div>

            {/* Quick time presets */}
            <div className="grid grid-cols-3 gap-1">
              {QUICK_TIMES.map(t => {
                const [qh, qm] = t.split(':').map(Number);
                const isActive = hour === qh && minute === qm;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => applyQuickTime(t)}
                    className={`py-1.5 rounded-xl text-[9px] font-black transition-all ${
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

          {/* Confirm / Clear footer */}
          <div className="px-3 pb-3 flex gap-2">
            {value && (
              <button type="button" onClick={() => { onChange(''); setIsOpen(false); }}
                className="flex-1 py-1.5 rounded-xl text-slate-400 text-[8px] font-black uppercase hover:bg-slate-50 transition-colors border border-slate-100">
                Limpar
              </button>
            )}
            <button type="button" onClick={() => setIsOpen(false)}
              className="flex-1 py-1.5 rounded-xl bg-blue-600 text-white text-[8px] font-black uppercase hover:bg-blue-700 transition-colors shadow-sm">
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
