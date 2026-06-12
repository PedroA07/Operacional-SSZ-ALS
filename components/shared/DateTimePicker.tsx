
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

const MONTHS_PT  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT    = ['D','S','T','Q','Q','S','S'];
const QUICK_TIMES = ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];

const offsetDate = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateStr(d);
};

// Default hour 0 (not 8) so arrows start from 00:00
const parseDateTime = (v: string) => {
  if (!v) return { date: '', hour: 0, minute: 0 };
  const [datePart, timePart] = v.split('T');
  const [h, m] = (timePart || '00:00').split(':');
  return { date: datePart || '', hour: parseInt(h) || 0, minute: parseInt(m) || 0 };
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

/**
 * Applies the mask DD/MM/AAAA HH:MM to a raw string of digits.
 * Accepts only digits, auto-inserts separators, clamps each field to its max value.
 *   Day  01–31 | Month 01–12 | Year 4 digits | Hour 00–23 | Minute 00–59
 */
const applyDateMask = (raw: string): string => {
  // Strip every non-digit and cap at 12 digits (2+2+4+2+2)
  const d = raw.replace(/\D/g, '').slice(0, 12);
  let r = '';
  let i = 0;

  // ── Day ─────────────────────────────
  if (i >= d.length) return r;
  let d0 = parseInt(d[i++]);
  if (d0 > 3) d0 = 3;            // first digit: 0-3
  r += d0;

  if (i >= d.length) return r;
  let d1 = parseInt(d[i++]);
  const day = d0 * 10 + d1;
  if (day > 31) d1 = 1;          // 32-39 → clamp to _1
  if (day === 0) d1 = 1;         // 00 → 01
  r += d1 + '/';

  // ── Month ────────────────────────────
  if (i >= d.length) return r;
  let m0 = parseInt(d[i++]);
  if (m0 > 1) m0 = 1;            // first digit: 0-1
  r += m0;

  if (i >= d.length) return r;
  let m1 = parseInt(d[i++]);
  const month = m0 * 10 + m1;
  if (month > 12) m1 = 2;        // 13-19 → clamp to _2
  if (month === 0) m1 = 1;       // 00 → 01
  r += m1 + '/';

  // ── Year (4 digits) ──────────────────
  for (let j = 0; j < 4 && i < d.length; j++, i++) r += d[i];
  if (i < 8 && d.length >= 8) return r;   // year still being typed
  if (d.length < 8) return r;             // year not finished yet
  r += ' ';

  // ── Hour ─────────────────────────────
  if (i >= d.length) return r;
  let h0 = parseInt(d[i++]);
  if (h0 > 2) h0 = 2;            // first digit: 0-2
  r += h0;

  if (i >= d.length) return r;
  let h1 = parseInt(d[i++]);
  const hr = h0 * 10 + h1;
  if (hr > 23) h1 = 3;           // 24-29 → clamp to _3
  r += h1 + ':';

  // ── Minute ───────────────────────────
  if (i >= d.length) return r;
  let min0 = parseInt(d[i++]);
  if (min0 > 5) min0 = 5;        // first digit: 0-5
  r += min0;

  if (i >= d.length) return r;
  r += d[i];                     // second digit 0-9, always valid

  return r;
};

/** DD/MM/AAAA HH:MM  →  YYYY-MM-DDTHH:MM  (returns '' on invalid) */
const fromDisplay = (s: string): string => {
  const clean = s.trim();
  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (!match) return '';
  const [, d, mo, y, hh = '00', mm = '00'] = match;
  const date = `${y}-${mo}-${d}`;
  const h = Math.min(23, parseInt(hh));
  const m = Math.min(59, parseInt(mm));
  return `${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value, onChange, placeholder, className, inputClassName, minDate, maxDate,
}) => {
  const today  = new Date();
  const parsed = parseDateTime(value);

  const [isOpen,         setIsOpen]         = useState(false);
  const [viewYear,       setViewYear]        = useState(() => parsed.date ? parseInt(parsed.date.slice(0, 4)) : today.getFullYear());
  const [viewMonth,      setViewMonth]       = useState(() => parsed.date ? parseInt(parsed.date.slice(5, 7)) - 1 : today.getMonth());
  const [showYearPicker, setShowYearPicker]  = useState(false);
  const [hour,           setHour]            = useState(parsed.hour);
  const [minute,         setMinute]          = useState(parsed.minute);
  const [manualInput,    setManualInput]     = useState(() => toDisplay(value));
  const [manualError,    setManualError]     = useState(false);
  const [popupStyle,     setPopupStyle]      = useState<React.CSSProperties>({ top: '100%', left: 0, marginTop: 8 });

  const containerRef  = useRef<HTMLDivElement>(null);
  const manualRef     = useRef<HTMLInputElement>(null);
  const prevDigitsRef = useRef('');

  // Sync when value changes externally
  useEffect(() => {
    const p = parseDateTime(value);
    if (p.date) {
      setViewYear(parseInt(p.date.slice(0, 4)));
      setViewMonth(parseInt(p.date.slice(5, 7)) - 1);
    }
    setHour(p.hour);
    setMinute(p.minute);
    setManualInput(toDisplay(value));
    prevDigitsRef.current = value.replace(/\D/g, '');
  }, [value]);

  // Compute popup position using fixed coords to escape overflow clipping
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect  = containerRef.current.getBoundingClientRect();
    const vh    = window.innerHeight;
    const vw    = window.innerWidth;
    const POP_W = 380;
    const POP_H = 350;
    const style: React.CSSProperties = { position: 'fixed', width: POP_W, maxHeight: vh - 16, overflowY: 'auto' };

    // Vertical: abaixo se couber; senão acima; senão prende dentro da tela
    if (vh - rect.bottom - 8 >= POP_H) {
      style.top = rect.bottom + 8; style.bottom = 'auto';
    } else if (rect.top - 8 >= POP_H) {
      style.bottom = vh - rect.top + 8; style.top = 'auto';
    } else {
      style.top = Math.max(8, vh - POP_H - 8); style.bottom = 'auto';
    }

    // Horizontal: nunca sai do viewport
    if (rect.left + POP_W <= vw - 8) { style.left = rect.left; style.right = 'auto'; }
    else                              { style.left = Math.max(8, vw - POP_W - 8); style.right = 'auto'; }

    setPopupStyle(style);
  }, [isOpen]);

  // Close on outside click / ESC
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      const t = e.target as Node;
      const inTrigger = containerRef.current?.contains(t);
      const popup = document.getElementById('datetimepicker-portal-popup');
      const inPopup = popup?.contains(t);
      if (!inTrigger && !inPopup) {
        setIsOpen(false); setShowYearPicker(false);
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

  // ── Core helpers ────────────────────────────────────────────────────────────
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

  const selectQuickDate = (offset: number) => emit(offsetDate(offset), hour, minute);

  const applyHour = (h: number) => {
    const safe = ((h % 24) + 24) % 24;   // wrap 0↔23, never negative
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

  const incHour   = () => applyHour(hour + 1);
  const decHour   = () => applyHour(hour - 1);

  // Smart minute: if not on multiple-of-5 → step 1 toward it; else step 5
  const incMinute = () => applyMinute(minute % 5 !== 0 ? minute + 1 : minute + 5);
  const decMinute = () => applyMinute(minute % 5 !== 0 ? minute - 1 : minute - 5);

  // ── Masked manual input ────────────────────────────────────────────────────
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw      = e.target.value;
    const newDigits = raw.replace(/\D/g, '');
    const oldDigits = prevDigitsRef.current;

    // If the user deleted a separator (same digit count, shorter string) → remove last digit too
    const digitsToUse =
      newDigits === oldDigits && raw.length < manualInput.length
        ? newDigits.slice(0, -1)
        : newDigits;

    prevDigitsRef.current = digitsToUse;
    const masked = applyDateMask(digitsToUse);
    setManualInput(masked);
    setManualError(false);
  };

  const commitManual = () => {
    if (!manualInput.trim()) { onChange(''); setManualError(false); return; }
    const result = fromDisplay(manualInput);
    if (result) { onChange(result); setManualError(false); }
    else        { setManualError(true); }
  };

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const yearRange       = Array.from({ length: 21 }, (_, i) => today.getFullYear() - 5 + i);

  const isSelected = (d: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return parsed.date === iso;
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

  const arrowBtn = 'w-6 h-5 flex items-center justify-center rounded-md bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all';

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

      {/* ── Popup (portal para escapar overflow dos containers pais) ── */}
      {isOpen && createPortal(
        <div
          id="datetimepicker-portal-popup"
          className="z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          style={popupStyle}
          onMouseDown={e => e.nativeEvent.stopPropagation()}
        >
          {/* Two-column: LEFT = calendar | RIGHT = time */}
          <div className="flex">

            {/* ════ LEFT: Calendar ════ */}
            <div className="flex-1 min-w-0 border-r border-slate-100">

              {/* Quick shortcuts */}
              <div className="flex gap-1 p-2 border-b border-slate-100 bg-slate-50/60">
                {([[-1,'Ontem'],[0,'Hoje'],[1,'Amanhã']] as [number,string][]).map(([offset, label]) => (
                  <button key={label} type="button" onClick={() => selectQuickDate(offset)}
                    className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-colors shadow-sm
                      ${offset === 0
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {!showYearPicker ? (
                <>
                  {/* Month/Year nav */}
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <button type="button" onClick={prevMonth}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button type="button" onClick={() => setShowYearPicker(true)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="text-[9px] font-black text-slate-800 uppercase">{MONTHS_PT[viewMonth]}</span>
                      <span className="text-[9px] font-black text-blue-600">{viewYear}</span>
                      <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <button type="button" onClick={nextMonth}
                      className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </div>

                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 px-2">
                    {DAYS_PT.map((d, i) => (
                      <div key={i} className="text-center text-[7px] font-black text-slate-400 uppercase">{d}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 px-2 pb-2 gap-px">
                    {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                      <button
                        key={d}
                        type="button"
                        disabled={isDisabled(d)}
                        onClick={() => !isDisabled(d) && selectDay(d)}
                        className={`w-full h-7 rounded-lg text-[10px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed
                          ${isSelected(d)
                            ? 'bg-blue-600 text-white font-black shadow-md'
                            : isTodayCell(d)
                              ? 'bg-blue-50 text-blue-700 font-black ring-1 ring-blue-200'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >{d}</button>
                    ))}
                  </div>
                </>
              ) : (
                /* Year/Month picker */
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
            <div className="w-32 shrink-0 p-2 flex flex-col items-center gap-1.5 bg-slate-50/40">

              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Horário</p>

              {/* Hour : Minute */}
              <div className="flex items-center gap-1">

                {/* Hour */}
                <div className="flex flex-col items-center gap-0.5">
                  <button type="button" onClick={incHour} className={arrowBtn}>
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <div className="w-9 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-black tabular-nums shadow-sm select-none">
                    {String(hour).padStart(2, '0')}
                  </div>
                  <button type="button" onClick={decHour} className={arrowBtn}>
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>

                <span className="text-base font-black text-slate-300 select-none">:</span>

                {/* Minute */}
                <div className="flex flex-col items-center gap-0.5">
                  <button type="button" onClick={incMinute} className={arrowBtn}>
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <div className="w-9 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-black tabular-nums shadow-sm select-none">
                    {String(minute).padStart(2, '0')}
                  </div>
                  <button type="button" onClick={decMinute} className={arrowBtn}>
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>
              </div>

              {/* Quick time presets — grade 2 colunas para reduzir altura */}
              <div className="w-full grid grid-cols-2 gap-0.5">
                {QUICK_TIMES.map(t => {
                  const [qh, qm] = t.split(':').map(Number);
                  const isActive = hour === qh && minute === qm;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyQuickTime(t)}
                      className={`py-1 rounded-md text-[8px] font-black transition-all ${
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

          {/* ── Bottom: Masked manual input + actions ── */}
          <div className="px-2 pb-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5">

            {/* Masked input: only digits accepted, auto-formats DD/MM/AAAA HH:MM */}
            <div className="flex-1 relative">
              <input
                ref={manualRef}
                type="text"
                inputMode="numeric"
                value={manualInput}
                onChange={handleManualChange}
                onBlur={commitManual}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitManual(); } }}
                placeholder="DD/MM/AAAA HH:MM"
                maxLength={16}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold outline-none transition-all
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
                onClick={() => { onChange(''); setManualInput(''); setManualError(false); prevDigitsRef.current = ''; setIsOpen(false); }}
                className="px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase text-slate-400 border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Limpar
              </button>
            )}

            {/* Confirm */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-[8px] font-black uppercase hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateTimePicker;
