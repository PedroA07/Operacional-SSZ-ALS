import React, { useState, useRef, useCallback, useEffect } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrency(formatted: string): number {
  const clean = formatted.replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

function formatPercent(raw: string): string {
  const clean = raw.replace(/[^0-9,]/g, '');
  return clean;
}

function parsePercent(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const [d1, m1, y1] = start.split('/').map(Number);
  const [d2, m2, y2] = end.split('/').map(Number);
  if (!y1 || !y2) return 0;
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

function diffHours(start: string, end: string): number {
  if (!start || !end) return 0;
  // expects "DD/MM/AAAA HH:MM"
  const parseDateTime = (s: string) => {
    const parts = s.split(' ');
    if (parts.length < 2) return null;
    const [d, m, y] = parts[0].split('/').map(Number);
    const [hh, mm] = parts[1].split(':').map(Number);
    if (!y || isNaN(hh)) return null;
    return new Date(y, m - 1, d, hh, mm || 0);
  };
  const a = parseDateTime(start);
  const b = parseDateTime(end);
  if (!a || !b) return 0;
  const diff = (b.getTime() - a.getTime()) / 3600000;
  return diff > 0 ? diff : 0;
}

// ─── Smart Date Input (DD/MM/AAAA) ──────────────────────────────────────────

interface SmartDateInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  withTime?: boolean;
}

const SmartDateInput: React.FC<SmartDateInputProps> = ({ value, onChange, placeholder, withTime = false }) => {
  const [showCal, setShowCal] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const calRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setShowCal(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const mask = withTime ? 'DD/MM/AAAA HH:MM' : 'DD/MM/AAAA';
  const maxLen = withTime ? 16 : 10;

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    let out = '';
    if (withTime) {
      if (raw.length > 0) out += raw.substring(0, 2);
      if (raw.length > 2) out += '/' + raw.substring(2, 4);
      if (raw.length > 4) out += '/' + raw.substring(4, 8);
      if (raw.length > 8) out += ' ' + raw.substring(8, 10);
      if (raw.length > 10) out += ':' + raw.substring(10, 12);
    } else {
      if (raw.length > 0) out += raw.substring(0, 2);
      if (raw.length > 2) out += '/' + raw.substring(2, 4);
      if (raw.length > 4) out += '/' + raw.substring(4, 8);
    }
    onChange(out);
  };

  const selectDay = (day: number) => {
    const dd = String(day).padStart(2, '0');
    const mm = String(calMonth + 1).padStart(2, '0');
    const yyyy = String(calYear);
    if (withTime) {
      const timePart = value.includes(' ') ? value.split(' ')[1] : '00:00';
      onChange(`${dd}/${mm}/${yyyy} ${timePart}`);
    } else {
      onChange(`${dd}/${mm}/${yyyy}`);
    }
    setShowCal(false);
  };

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const selectedDay = (() => {
    const parts = value.split('/');
    if (parts.length >= 3) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const y = parseInt(parts[2]);
      if (m === calMonth && y === calYear) return d;
    }
    return -1;
  })();

  return (
    <div className="relative flex-1" ref={calRef}>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInput}
          maxLength={maxLen}
          placeholder={placeholder || mask}
          className="flex-1 px-4 py-3 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold text-sm focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300 font-mono"
        />
        <button
          type="button"
          onClick={() => setShowCal(v => !v)}
          className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-2xl transition-all"
          title="Abrir calendário"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </button>
      </div>
      {showCal && (
        <div className="absolute z-50 top-14 left-0 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 w-72 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{months[calMonth]} {calYear}</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['D','S','T','Q','Q','S','S'].map((d, i) => (
              <div key={i} className="text-center text-[9px] font-black text-slate-400 uppercase py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
              <button
                key={d}
                onClick={() => selectDay(d)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all mx-auto flex items-center justify-center
                  ${d === selectedDay ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-slate-600'}`}
              >{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Currency Input ──────────────────────────────────────────────────────────

interface CurrencyInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, placeholder = '0,00', className = '' }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatCurrency(e.target.value));
  };
  return (
    <div className="relative flex-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs select-none">R$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full pl-8 pr-4 py-3 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold text-sm focus:border-blue-500 outline-none transition-all shadow-sm font-mono ${className}`}
      />
    </div>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────

const SectionHeader = ({ title, subtitle, color = 'blue' }: { title: string; subtitle?: string; color?: string }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    violet: 'bg-violet-600',
    amber: 'bg-amber-500',
  };
  return (
    <div className={`${colors[color]} rounded-3xl px-6 py-4 flex items-center gap-3`}>
      <div>
        <h2 className="text-white font-black text-sm uppercase tracking-widest leading-tight">{title}</h2>
        {subtitle && <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">{children}</label>
);

const ResultBadge = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <span className="text-sm font-black text-slate-800 font-mono">{value}</span>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const ValoresPreStackingTab: React.FC = () => {
  const [copied, setCopied] = useState(false);

  // Section 1 – Pré-Stacking In/Out
  const [container, setContainer] = useState('');
  const [valorPS, setValorPS] = useState('');
  const [adValPercent, setAdValPercent] = useState('0,15');
  const [valorNF, setValorNF] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diasFree, setDiasFree] = useState('7');
  const [valorDiaria, setValorDiaria] = useState('');

  // Section 2 – Estadia (horas)
  const [estInicio, setEstInicio] = useState('');
  const [estFim, setEstFim] = useState('');
  const [horasFree, setHorasFree] = useState('7');
  const [valorHora, setValorHora] = useState('');

  // Section 3 – Entre Margem
  const [emQtd, setEmQtd] = useState('');
  const [emValor, setEmValor] = useState('');

  // ── Calculations ────────────────────────────────────────────────────────────

  const adValPercNum = parsePercent(adValPercent);
  const nfNum = parseCurrency(valorNF);
  const adValorTotal = (adValPercNum / 100) * nfNum;

  const totalDias = diffDays(dataInicio, dataFim);
  const diasFreeNum = parseInt(diasFree) || 0;
  const diasEstadia = Math.max(0, totalDias - diasFreeNum);
  const valorDiariaNum = parseCurrency(valorDiaria);
  const valorTotalEstadia = diasEstadia * valorDiariaNum;

  const totalHoras = diffHours(estInicio, estFim);
  const horasFreeNum = parseFloat(horasFree) || 0;
  const horasExcedentes = Math.max(0, totalHoras - horasFreeNum);
  const diasExc = Math.floor(horasExcedentes / 24);
  const horasResiduo = Math.round(horasExcedentes % 24 * 10) / 10;
  const valorHoraNum = parseCurrency(valorHora);
  const valorTotalHoras = horasExcedentes * valorHoraNum;

  const emQtdNum = parseFloat(emQtd) || 0;
  const emValorNum = parseCurrency(emValor);
  const emTotal = emQtdNum * emValorNum;

  const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Preview Text ─────────────────────────────────────────────────────────────

  const previewText = [
    `╔══════════════════════════════════════╗`,
    `         PRÉ-STACKING IN/OUT`,
    `╚══════════════════════════════════════╝`,
    ``,
    `📦 Container: ${container || '—'}`,
    ``,
    `━━━━ PRÉ-STACKING ━━━━`,
    `Valor do Pré-Stacking: ${valorPS ? `R$ ${valorPS}` : '—'}`,
    `Ad Valorem (${adValPercent || '0,15'}%): ${nfNum > 0 ? fmtBRL(adValorTotal) : '—'}`,
    `  └ Valor NF: ${valorNF ? `R$ ${valorNF}` : '—'}`,
    ``,
    `━━━━ PERÍODO ━━━━`,
    `Início: ${dataInicio || '—'}`,
    `Término: ${dataFim || '—'}`,
    `Dias FREE: ${diasFreeNum}`,
    `Dias de Estadia: ${diasEstadia > 0 ? `${diasEstadia} dia(s)` : 'Sem estadia'}`,
    `Valor da Diária: ${valorDiaria ? `R$ ${valorDiaria}` : '—'}`,
    `Total Estadia (dias): ${valorTotalEstadia > 0 ? fmtBRL(valorTotalEstadia) : '—'}`,
    ``,
    `━━━━ ESTADIA (HORAS) ━━━━`,
    `Início: ${estInicio || '—'}`,
    `Término: ${estFim || '—'}`,
    `Horas FREE: ${horasFreeNum}h`,
    `Horas Excedentes: ${horasExcedentes > 0 ? `${diasExc > 0 ? `${diasExc}d ` : ''}${horasResiduo}h` : 'Sem estadia'}`,
    `Valor/hora: ${valorHora ? `R$ ${valorHora}` : '—'}`,
    `Total Estadia (horas): ${valorTotalHoras > 0 ? fmtBRL(valorTotalHoras) : '—'}`,
    ``,
    `━━━━ ENTRE MARGEM ━━━━`,
    `Quantidade: ${emQtdNum || '—'}`,
    `Valor unitário: ${emValor ? `R$ ${emValor}` : '—'}`,
    `Total Entre Margem: ${emTotal > 0 ? fmtBRL(emTotal) : '—'}`,
  ].join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputBase = "w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-white text-slate-700 font-bold text-sm focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300";

  return (
    <div className="flex gap-6 h-full min-h-0 animate-in fade-in duration-500">

      {/* ── Left: Form ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-6 pr-1 pb-10 custom-scrollbar">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Valores de Pré-Stacking</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculadora de custos e estadias</p>
          </div>
        </div>

        {/* ── SEÇÃO 1: PRÉ-STACKING IN/OUT ─────────────────────────────────── */}
        <SectionHeader title="Pré-Stacking In/Out" subtitle="Dados do container e valores" color="blue" />

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">

          {/* Container */}
          <div>
            <FieldLabel>Container</FieldLabel>
            <input
              type="text"
              value={container}
              onChange={e => setContainer(e.target.value.toUpperCase())}
              placeholder="Ex: MSCU1234567"
              className={inputBase + " font-mono uppercase"}
            />
          </div>

          {/* Valor do Pré-Stacking */}
          <div>
            <FieldLabel>Valor do Pré-Stacking</FieldLabel>
            <CurrencyInput value={valorPS} onChange={setValorPS} placeholder="0,00" />
          </div>

          {/* Adicional Ad Valorem */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Adicional Ad Valorem</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Percentual (%)</FieldLabel>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={adValPercent}
                    onChange={e => setAdValPercent(formatPercent(e.target.value))}
                    placeholder="0,15"
                    className={inputBase + " pr-6 font-mono"}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">%</span>
                </div>
              </div>
              <div>
                <FieldLabel>Valor da NF</FieldLabel>
                <CurrencyInput value={valorNF} onChange={setValorNF} placeholder="0,00" />
              </div>
            </div>
            {nfNum > 0 && (
              <ResultBadge label="Ad Valorem calculado" value={fmtBRL(adValorTotal)} />
            )}
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Data de Início</FieldLabel>
              <SmartDateInput value={dataInicio} onChange={setDataInicio} placeholder="DD/MM/AAAA" />
            </div>
            <div>
              <FieldLabel>Data de Término</FieldLabel>
              <SmartDateInput value={dataFim} onChange={setDataFim} placeholder="DD/MM/AAAA" />
            </div>
          </div>

          {/* Dias FREE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Dias FREE</FieldLabel>
              <input
                type="number"
                min="0"
                value={diasFree}
                onChange={e => setDiasFree(e.target.value)}
                className={inputBase + " font-mono"}
              />
            </div>
            <div>
              <FieldLabel>Total de Dias (período)</FieldLabel>
              <div className={`${inputBase} bg-slate-50 text-slate-500`}>
                {totalDias > 0 ? `${totalDias} dia(s)` : '—'}
              </div>
            </div>
          </div>

          {/* Resultado estadia por dias */}
          {totalDias > 0 && (
            <div className={`rounded-2xl px-4 py-3 border flex items-center justify-between ${diasEstadia > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${diasEstadia > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Dias de Estadia</span>
              <span className={`text-base font-black font-mono ${diasEstadia > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {diasEstadia > 0 ? `${diasEstadia} dia(s)` : 'Sem estadia'}
              </span>
            </div>
          )}

          {/* Valor da diária */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Valor da Diária</FieldLabel>
              <CurrencyInput value={valorDiaria} onChange={setValorDiaria} />
            </div>
            <div>
              <FieldLabel>Total Estadia (dias)</FieldLabel>
              <div className={`${inputBase} bg-slate-50 text-slate-500 font-mono`}>
                {valorTotalEstadia > 0 ? fmtBRL(valorTotalEstadia) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── SEÇÃO 2: ESTADIA (HORAS) ─────────────────────────────────────── */}
        <div className="relative flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] shrink-0">Quebra de Seção</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <SectionHeader title="Estadia (Horas)" subtitle="Cálculo por período em horas" color="emerald" />

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">

          {/* Período com hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Data/Hora de Início</FieldLabel>
              <SmartDateInput value={estInicio} onChange={setEstInicio} placeholder="DD/MM/AAAA HH:MM" withTime />
            </div>
            <div>
              <FieldLabel>Data/Hora de Término</FieldLabel>
              <SmartDateInput value={estFim} onChange={setEstFim} placeholder="DD/MM/AAAA HH:MM" withTime />
            </div>
          </div>

          {/* Horas FREE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Horas FREE</FieldLabel>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={horasFree}
                  onChange={e => setHorasFree(e.target.value)}
                  className={inputBase + " pr-10 font-mono"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">h</span>
              </div>
            </div>
            <div>
              <FieldLabel>Total do Período</FieldLabel>
              <div className={`${inputBase} bg-slate-50 text-slate-500`}>
                {totalHoras > 0 ? `${Math.floor(totalHoras)}h ${Math.round((totalHoras % 1) * 60)}min` : '—'}
              </div>
            </div>
          </div>

          {/* Resultado horas excedentes */}
          {totalHoras > 0 && (
            <div className={`rounded-2xl px-4 py-3 border flex items-center justify-between ${horasExcedentes > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${horasExcedentes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Horas de Estadia</span>
              <span className={`text-base font-black font-mono ${horasExcedentes > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {horasExcedentes > 0
                  ? `${diasExc > 0 ? `${diasExc}d ` : ''}${horasResiduo}h excedentes`
                  : 'Dentro do FREE'}
              </span>
            </div>
          )}

          {/* Valor por hora + total */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Valor por Hora</FieldLabel>
              <CurrencyInput value={valorHora} onChange={setValorHora} />
            </div>
            <div>
              <FieldLabel>Total Estadia (horas)</FieldLabel>
              <div className={`${inputBase} bg-slate-50 text-slate-500 font-mono`}>
                {valorTotalHoras > 0 ? fmtBRL(valorTotalHoras) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── SEÇÃO 3: ENTRE MARGEM ────────────────────────────────────────── */}
        <div className="relative flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] shrink-0">Quebra de Seção</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        <SectionHeader title="Entre Margem" subtitle="Quantidade e valor unitário" color="violet" />

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Quantidade</FieldLabel>
              <input
                type="number"
                min="0"
                value={emQtd}
                onChange={e => setEmQtd(e.target.value)}
                placeholder="0"
                className={inputBase + " font-mono"}
              />
            </div>
            <div>
              <FieldLabel>Valor Unitário</FieldLabel>
              <CurrencyInput value={emValor} onChange={setEmValor} />
            </div>
          </div>
          {emTotal > 0 && (
            <ResultBadge label="Total Entre Margem" value={fmtBRL(emTotal)} />
          )}
        </div>

        {/* Resumo final */}
        {(valorTotalEstadia > 0 || valorTotalHoras > 0 || emTotal > 0 || adValorTotal > 0) && (
          <div className="bg-slate-900 rounded-3xl p-6 space-y-3">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Resumo Geral</span>
            {adValorTotal > 0 && <ResultBadge label="Ad Valorem" value={fmtBRL(adValorTotal)} />}
            {valorTotalEstadia > 0 && <ResultBadge label="Estadia (dias)" value={fmtBRL(valorTotalEstadia)} />}
            {valorTotalHoras > 0 && <ResultBadge label="Estadia (horas)" value={fmtBRL(valorTotalHoras)} />}
            {emTotal > 0 && <ResultBadge label="Entre Margem" value={fmtBRL(emTotal)} />}
            <div className="h-px bg-white/10 my-2" />
            <div className="flex items-center justify-between px-4 py-3 bg-blue-600 rounded-2xl">
              <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Total Geral</span>
              <span className="text-lg font-black text-white font-mono">{fmtBRL(adValorTotal + valorTotalEstadia + valorTotalHoras + emTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Preview ──────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 flex flex-col gap-3 h-full">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Prévia do E-mail</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Clique para copiar</p>
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-blue-600'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  Copiar
                </>
              )}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">{previewText}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValoresPreStackingTab;
