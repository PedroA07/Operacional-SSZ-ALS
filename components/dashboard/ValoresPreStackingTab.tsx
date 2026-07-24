import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrency(formatted: string): number {
  return parseFloat(formatted.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatPercent(raw: string): string {
  return raw.replace(/[^0-9,]/g, '');
}

function parsePercent(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
  const parse = (s: string) => {
    const [datePart, timePart] = s.split(' ');
    if (!timePart) return null;
    const [d, m, y] = datePart.split('/').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    if (!y || isNaN(hh)) return null;
    return new Date(y, m - 1, d, hh, mm || 0);
  };
  const a = parse(start), b = parse(end);
  if (!a || !b) return 0;
  return Math.max(0, (b.getTime() - a.getTime()) / 3600000);
}

// ─── Smart Date Input with validation ────────────────────────────────────────

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
  const [calPos, setCalPos] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || calRef.current?.contains(target)) return;
      setShowCal(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Posiciona o calendário via portal (position: fixed) para não ser cortado
  // por containers com overflow — igual ao sistema personalizado de data/hora.
  const openCalendar = () => {
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const CAL_W = 288; // w-72
      const CAL_H = 330;
      const openUp = rect.bottom + CAL_H > window.innerHeight - 16;
      const left = Math.min(rect.left, window.innerWidth - CAL_W - 16);
      setCalPos({
        position: 'fixed',
        left: Math.max(8, left),
        ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        zIndex: 9999,
      });
    }
    setShowCal(v => !v);
  };

  // Validated masking: reject digit if it would produce invalid date/time part
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const clamp = (val: string, max: number): string => {
      const n = parseInt(val, 10);
      if (isNaN(n)) return val;
      return String(Math.min(n, max)).padStart(val.length > 1 ? 2 : 1, '');
    };

    let d = raw.substring(0, 2);
    let m = raw.substring(2, 4);
    let y = raw.substring(4, 8);
    let hh = raw.substring(8, 10);
    let mm2 = raw.substring(10, 12);

    // Validate each segment progressively
    if (d.length === 2) d = clamp(d, 31).padStart(2, '0');
    if (m.length === 2) m = clamp(m, 12).padStart(2, '0');
    if (hh.length === 2) hh = clamp(hh, 23).padStart(2, '0');
    if (mm2.length === 2) mm2 = clamp(mm2, 59).padStart(2, '0');

    let out = '';
    if (d) out += d;
    if (m) out += '/' + m;
    if (y) out += '/' + y;
    if (withTime) {
      if (hh) out += ' ' + hh;
      if (mm2) out += ':' + mm2;
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
      const y = parseInt(withTime ? parts[2].split(' ')[0] : parts[2]);
      if (m === calMonth && y === calYear) return d;
    }
    return -1;
  })();

  return (
    <div className="relative w-full" ref={wrapRef}>
      {/* Input + calendar button inline — button INSIDE the input wrapper */}
      <div className="flex items-center border-2 border-slate-100 bg-white rounded-xl shadow-sm focus-within:border-blue-500 transition-all overflow-hidden">
        <input
          type="text"
          value={value}
          onChange={handleInput}
          maxLength={withTime ? 16 : 10}
          placeholder={placeholder || (withTime ? 'DD/MM/AAAA HH:MM' : 'DD/MM/AAAA')}
          className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-slate-700 font-bold text-xs outline-none placeholder:text-slate-300 font-mono"
        />
        <button
          type="button"
          onClick={openCalendar}
          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-blue-500 transition-colors shrink-0 border-l border-slate-100"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </button>
      </div>

      {showCal && createPortal(
        <div ref={calRef} style={calPos} className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 w-72 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{months[calMonth]} {calYear}</span>
            <button
              onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            >
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
              <button key={d} onClick={() => selectDay(d)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all mx-auto flex items-center justify-center
                  ${d === selectedDay ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-blue-50 text-slate-600'}`}>
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={() => { const t = new Date(); setCalMonth(t.getMonth()); setCalYear(t.getFullYear()); selectDay(t.getDate()); }}
            className="w-full mt-3 py-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-xl transition-colors"
          >
            Hoje
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── Currency Input ───────────────────────────────────────────────────────────

const CurrencyInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = '0,00' }) => (
  <div className="relative w-full">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px] select-none pointer-events-none">R$</span>
    <input
      type="text" inputMode="numeric" value={value}
      onChange={e => onChange(formatCurrency(e.target.value))}
      placeholder={placeholder}
      className="w-full pl-7 pr-3 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-slate-700 font-bold text-xs focus:border-blue-500 outline-none transition-all shadow-sm font-mono"
    />
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ title, subtitle, color = 'blue' }: { title: string; subtitle?: string; color?: string }) => {
  const bg: Record<string, string> = { blue: 'bg-blue-600', emerald: 'bg-emerald-600', violet: 'bg-violet-600' };
  return (
    <div className={`${bg[color] ?? 'bg-blue-600'} rounded-2xl px-5 py-3`}>
      <h2 className="text-white font-black text-xs uppercase tracking-widest">{title}</h2>
      {subtitle && <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
    </div>
  );
};

const FL = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-0.5 block">{children}</label>
);

const inputBase = "w-full px-3 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-slate-700 font-bold text-xs focus:border-blue-500 outline-none transition-all shadow-sm placeholder:text-slate-300";

// ─── Toggle ───────────────────────────────────────────────────────────────────

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!value)}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border
      ${value ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center transition-all ${value ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
      {value && <div className="w-1 h-1 rounded-full bg-white" />}
    </div>
    {label}
  </button>
);

// ─── Dot Leader Row (visual) ──────────────────────────────────────────────────

const DotRow = ({ label, sub, value }: { label: string; sub?: string; value: string }) => (
  <div className="flex items-start gap-2 py-1.5">
    <div className="flex-1 min-w-0 pt-0.5">
      <span className="text-[12px] font-semibold text-slate-600 leading-tight">{label}</span>
      {sub && <span className="block text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{sub}</span>}
    </div>
    <div className="flex-1 border-b border-dotted border-slate-300 self-center mb-0.5 mx-1" style={{ minWidth: 16 }} />
    <span className="text-[13px] font-black font-mono text-slate-700 shrink-0 pt-0.5">{value}</span>
  </div>
);

const TotalRow = ({ value }: { value: string }) => (
  <div className="flex items-center gap-2 pt-1">
    <span className="text-[13px] font-black text-white">Total Geral</span>
    <div className="flex-1 border-b border-dotted border-white/30 mx-1 mb-0.5" style={{ minWidth: 16 }} />
    <span className="text-[14px] font-black font-mono text-white shrink-0">{value}</span>
  </div>
);

// ─── HTML Card builder for clipboard ─────────────────────────────────────────

function buildCardHtml(params: {
  container: string;
  valorPS: number; valorPSFmt: string;
  diasEstadia: number; valorDiaria: string; valorTotalEstadia: number; diariasLabel: string;
  adValorTotal: number; adValLabel: string;
  showEstadia: boolean; valorTotalHoras: number; horasLabel: string;
  estInicio: string; estFim: string; horasFreeNum: number;
  totalHoras: number; horasExcedentes: number; diasExc: number; horasResiduo: number; valorHoraNum: number;
  showEntreMargem: boolean; emTotal: number; emLabel: string;
  grandTotal: number;
}): string {
  const { container, valorPS, valorPSFmt, diasEstadia, valorDiaria, valorTotalEstadia, diariasLabel,
    adValorTotal, adValLabel, showEstadia, valorTotalHoras, horasLabel,
    estInicio, estFim, horasFreeNum, totalHoras, horasExcedentes, diasExc, horasResiduo, valorHoraNum,
    showEntreMargem, emTotal, emLabel, grandTotal } = params;

  const dotRow = (label: string, sub: string, val: string) => `
    <tr>
      <td style="padding:6px 24px 2px;font-family:Arial,sans-serif;font-size:13px;color:#475569;vertical-align:top;">
        <div style="font-weight:600;">${label}</div>
        ${sub ? `<div style="font-size:10px;color:#94a3b8;margin-top:1px;">${sub}</div>` : ''}
      </td>
      <td style="padding:6px 24px 2px;text-align:right;font-family:'Courier New',monospace;font-size:13px;font-weight:800;color:#1e293b;vertical-align:top;white-space:nowrap;">${val}</td>
    </tr>
    <tr><td colspan="2" style="padding:0 24px;"><hr style="border:none;border-top:1px dotted #cbd5e1;margin:0;"/></td></tr>`;

  const sectionLabel = (text: string, color: string) => `
    <tr><td colspan="2" style="padding:16px 24px 6px;">
      <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:${color};">${text}</div>
    </td></tr>`;

  let rows = '';
  rows += sectionLabel('Pré-Stacking', '#3b82f6');
  if (valorPS > 0) rows += dotRow('Pré-staking', '', valorPSFmt);
  if (diasEstadia > 0 && valorDiaria) rows += dotRow('Diárias excedentes', diariasLabel, fmtBRL(valorTotalEstadia));
  if (adValorTotal > 0) rows += dotRow('Ad-Valorem', adValLabel, fmtBRL(adValorTotal));

  if (showEstadia && valorTotalHoras > 0) {
    rows += sectionLabel('Estadia', '#10b981');
    if (estInicio) rows += dotRow('Data/Hora de Início', '', estInicio);
    if (estFim) rows += dotRow('Data/Hora de Término', '', estFim);
    rows += dotRow('Horas FREE', '', `${horasFreeNum}h`);
    if (totalHoras > 0) rows += dotRow('Total do Período', '', `${Math.floor(totalHoras)}h ${Math.round((totalHoras % 1) * 60)}min`);
    rows += dotRow('Horas de Estadia', '', `${diasExc > 0 ? `${diasExc}d ` : ''}${horasResiduo}h`);
    rows += dotRow('Valor por Hora', '', fmtBRL(valorHoraNum) + '/h');
    rows += dotRow('Total Estadia', '', fmtBRL(valorTotalHoras));
  }

  if (showEntreMargem && emTotal > 0) {
    rows += sectionLabel('Entre Margem', '#8b5cf6');
    rows += dotRow('Entre Margem', emLabel, fmtBRL(emTotal));
  }

  return `
<table width="520" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;font-family:Arial,sans-serif;background:#ffffff;max-width:520px;">
  <!-- top stripe -->
  <tr><td colspan="2" style="height:4px;background:linear-gradient(to right,#3b82f6,#6366f1);padding:0;"></td></tr>
  <!-- header -->
  <tr><td colspan="2" style="padding:24px 24px 18px;text-align:center;border-bottom:1px solid #f1f5f9;">
    <div style="width:44px;height:44px;background:#2563eb;border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
      <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBzdHJva2VXaWR0aD0iMiIgc3Ryb2tlTGluZWNhcD0icm91bmQiIHN0cm9rZUxpbmVqb2luPSJyb3VuZCIgZD0iTTIwIDdsLTgtNC04IDRtMTYgMGwtOCA0bTgtNHYxMGwtOCA0bTAtMTBMNCA3bTggNHYxMCIvPjwvc3ZnPg==" width="22" height="22" alt="" style="display:block;"/>
    </div>
    <div style="font-size:15px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:3px;">${container || 'DESCRIÇÃO'}</div>
    ${container ? `<div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-top:3px;">DESCRIÇÃO</div>` : ''}
  </td></tr>
  <!-- rows -->
  ${rows}
  <!-- total -->
  <tr><td colspan="2" style="padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;">
      <tr>
        <td style="padding:14px 24px;font-family:Arial,sans-serif;font-size:13px;font-weight:900;color:#ffffff;">Total Geral</td>
        <td style="padding:14px 24px;text-align:right;font-family:'Courier New',monospace;font-size:14px;font-weight:900;color:#ffffff;white-space:nowrap;">${fmtBRL(grandTotal)}</td>
      </tr>
    </table>
  </td></tr>
  <!-- footer -->
  <tr><td colspan="2" style="padding:10px 24px;text-align:center;background:#f8fafc;border-top:1px solid #f1f5f9;">
    <span style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:2px;">ALS Logística · Pré-Stacking</span>
  </td></tr>
</table>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ValoresPreStackingTab: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showEstadia, setShowEstadia] = useState(true);
  const [showEntreMargem, setShowEntreMargem] = useState(true);

  const [container, setContainer] = useState('');
  const [valorPS, setValorPS] = useState('');
  const [adValPercent, setAdValPercent] = useState('0,15');
  const [valorNF, setValorNF] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diasFree, setDiasFree] = useState('7');
  const [valorDiaria, setValorDiaria] = useState('');

  const [estInicio, setEstInicio] = useState('');
  const [estFim, setEstFim] = useState('');
  const [horasFree, setHorasFree] = useState('7');
  const [valorHora, setValorHora] = useState('');

  const [emQtd, setEmQtd] = useState('');
  const [emValor, setEmValor] = useState('');

  // ── Calculations ──────────────────────────────────────────────────────────

  const adValPercNum = parsePercent(adValPercent);
  const nfNum = parseCurrency(valorNF);
  const adValorTotal = (adValPercNum / 100) * nfNum;

  const totalDias = diffDays(dataInicio, dataFim);
  const diasFreeNum = parseInt(diasFree) || 0;
  const diasEstadia = Math.max(0, totalDias - diasFreeNum);
  const valorDiariaNum = parseCurrency(valorDiaria);
  const valorTotalEstadia = diasEstadia * valorDiariaNum;
  const valorPSNum = parseCurrency(valorPS);

  const totalHoras = diffHours(estInicio, estFim);
  const horasFreeNum = parseFloat(horasFree) || 0;
  const horasExcedentes = Math.max(0, totalHoras - horasFreeNum);
  const diasExc = Math.floor(horasExcedentes / 24);
  const horasResiduo = Math.round((horasExcedentes % 24) * 10) / 10;
  const valorHoraNum = parseCurrency(valorHora);
  const valorTotalHoras = horasExcedentes * valorHoraNum;

  const emQtdNum = parseFloat(emQtd) || 0;
  const emValorNum = parseCurrency(emValor);
  const emTotal = emQtdNum * emValorNum;

  const grandTotal = valorPSNum + valorTotalEstadia + adValorTotal
    + (showEstadia ? valorTotalHoras : 0)
    + (showEntreMargem ? emTotal : 0);

  const diariasLabel = diasEstadia > 0 && valorDiaria
    ? `${diasEstadia} dia(s) × R$ ${valorDiaria}` : '';
  const adValLabel = adValPercent && valorNF
    ? `${adValPercent}% sobre NF de R$ ${valorNF}` : '';
  const horasLabel = horasExcedentes > 0 && valorHora
    ? `${diasExc > 0 ? `${diasExc}d ` : ''}${horasResiduo}h × R$ ${valorHora}/h` : '';
  const emLabel = emQtdNum > 0 && emValor
    ? `${emQtdNum} × R$ ${emValor}` : '';

  const hasAnyValue = valorPSNum > 0 || adValorTotal > 0 || valorTotalEstadia > 0;

  // ── Copy HTML card ─────────────────────────────────────────────────────────

  const handleCopy = async () => {
    const html = buildCardHtml({
      container, valorPS: valorPSNum, valorPSFmt: fmtBRL(valorPSNum),
      diasEstadia, valorDiaria, valorTotalEstadia, diariasLabel,
      adValorTotal, adValLabel,
      showEstadia, valorTotalHoras, horasLabel,
      estInicio, estFim, horasFreeNum, totalHoras, horasExcedentes, diasExc, horasResiduo, valorHoraNum,
      showEntreMargem, emTotal, emLabel,
      grandTotal,
    });

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([buildPlainText()], { type: 'text/plain' }),
        }),
      ]);
    } catch {
      // fallback to plain text
      navigator.clipboard.writeText(buildPlainText());
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(buildPlainText()).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    });
  };

  const buildPlainText = () => {
    const lines = [`PRÉ-STACKING IN/OUT${container ? ` — ${container}` : ''}`, ''];
    if (valorPSNum > 0) lines.push(`Pré-staking: ${fmtBRL(valorPSNum)}`);
    if (diasEstadia > 0 && valorDiaria) lines.push(`Diárias excedentes (${diariasLabel}): ${fmtBRL(valorTotalEstadia)}`);
    if (adValorTotal > 0) lines.push(`Ad-Valorem (${adValLabel}): ${fmtBRL(adValorTotal)}`);
    if (showEstadia && valorTotalHoras > 0) {
      lines.push('');
      lines.push('ESTADIA');
      if (estInicio) lines.push(`Data/Hora de Início: ${estInicio}`);
      if (estFim) lines.push(`Data/Hora de Término: ${estFim}`);
      lines.push(`Horas FREE: ${horasFreeNum}h`);
      if (totalHoras > 0) lines.push(`Total do Período: ${Math.floor(totalHoras)}h ${Math.round((totalHoras % 1) * 60)}min`);
      lines.push(`Horas de Estadia: ${diasExc > 0 ? `${diasExc}d ` : ''}${horasResiduo}h`);
      lines.push(`Valor por Hora: ${fmtBRL(valorHoraNum)}/h`);
      lines.push(`Total Estadia: ${fmtBRL(valorTotalHoras)}`);
    }
    if (showEntreMargem && emTotal > 0) lines.push(`Entre Margem (${emLabel}): ${fmtBRL(emTotal)}`);
    lines.push('', `Total Geral: ${fmtBRL(grandTotal)}`);
    return lines.join('\n');
  };

  return (
    <div className="flex gap-4 h-full min-h-0 animate-in fade-in duration-500">

      {/* ── Left: Form ───────────────────────────────────────────────────── */}
      <div className="w-[400px] shrink-0 overflow-y-auto space-y-4 pr-1 pb-10 custom-scrollbar">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">Valores de Pré-Stacking</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Calculadora de custos e estadias</p>
          </div>
        </div>

        {/* ── SEÇÃO 1 ───────────────────────────────────────────────────── */}
        <SectionHeader title="Pré-Stacking In/Out" subtitle="Dados do container e valores" color="blue" />

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">

          <div>
            <FL>Container</FL>
            <input type="text" value={container}
              onChange={e => setContainer(e.target.value.toUpperCase())}
              placeholder="Ex: MSCU1234567"
              className={inputBase + " font-mono uppercase"} />
          </div>

          <div>
            <FL>Valor do Pré-Stacking</FL>
            <CurrencyInput value={valorPS} onChange={setValorPS} />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Ad Valorem</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FL>Percentual (%)</FL>
                <div className="relative">
                  <input type="text" inputMode="decimal" value={adValPercent}
                    onChange={e => setAdValPercent(formatPercent(e.target.value))}
                    placeholder="0,15" className={inputBase + " pr-5 font-mono"} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black pointer-events-none">%</span>
                </div>
              </div>
              <div>
                <FL>Valor da NF</FL>
                <CurrencyInput value={valorNF} onChange={setValorNF} />
              </div>
            </div>
            {nfNum > 0 && (
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ad Valorem calculado</span>
                <span className="text-xs font-black text-slate-800 font-mono">{fmtBRL(adValorTotal)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><FL>Data de Início</FL><SmartDateInput value={dataInicio} onChange={setDataInicio} placeholder="DD/MM/AAAA" /></div>
            <div><FL>Data de Término</FL><SmartDateInput value={dataFim} onChange={setDataFim} placeholder="DD/MM/AAAA" /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FL>Dias FREE</FL>
              <input type="number" min="0" value={diasFree}
                onChange={e => setDiasFree(e.target.value)}
                className={inputBase + " font-mono"} />
            </div>
            <div>
              <FL>Total do Período</FL>
              <div className={`${inputBase} bg-slate-50 text-slate-500 cursor-default`}>
                {totalDias > 0 ? `${totalDias} dia(s)` : '—'}
              </div>
            </div>
          </div>

          {totalDias > 0 && (
            <div className={`rounded-xl px-3 py-2.5 border flex items-center justify-between ${diasEstadia > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <span className={`text-[9px] font-black uppercase tracking-widest ${diasEstadia > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Dias de Estadia</span>
              <span className={`text-sm font-black font-mono ${diasEstadia > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {diasEstadia > 0 ? `${diasEstadia} dia(s)` : 'Sem estadia'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div><FL>Valor da Diária</FL><CurrencyInput value={valorDiaria} onChange={setValorDiaria} /></div>
            <div>
              <FL>Total Estadia (dias)</FL>
              <div className={`${inputBase} bg-slate-50 text-slate-500 font-mono cursor-default`}>
                {valorTotalEstadia > 0 ? fmtBRL(valorTotalEstadia) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── SEÇÃO 2 ───────────────────────────────────────────────────── */}
        <SectionHeader title="Estadia" subtitle="Cálculo por período em horas" color="emerald" />

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div><FL>Data/Hora de Início</FL><SmartDateInput value={estInicio} onChange={setEstInicio} placeholder="DD/MM/AAAA HH:MM" withTime /></div>
            <div><FL>Data/Hora de Término</FL><SmartDateInput value={estFim} onChange={setEstFim} placeholder="DD/MM/AAAA HH:MM" withTime /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FL>Horas FREE</FL>
              <div className="relative">
                <input type="number" min="0" value={horasFree}
                  onChange={e => setHorasFree(e.target.value)}
                  className={inputBase + " pr-7 font-mono"} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black pointer-events-none">h</span>
              </div>
            </div>
            <div>
              <FL>Total do Período</FL>
              <div className={`${inputBase} bg-slate-50 text-slate-500 cursor-default`}>
                {totalHoras > 0 ? `${Math.floor(totalHoras)}h ${Math.round((totalHoras % 1) * 60)}min` : '—'}
              </div>
            </div>
          </div>

          {totalHoras > 0 && (
            <div className={`rounded-xl px-3 py-2.5 border flex items-center justify-between ${horasExcedentes > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <span className={`text-[9px] font-black uppercase tracking-widest ${horasExcedentes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Horas de Estadia</span>
              <span className={`text-sm font-black font-mono ${horasExcedentes > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {horasExcedentes > 0 ? `${diasExc > 0 ? `${diasExc}d ` : ''}${horasResiduo}h excedentes` : 'Dentro do FREE'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div><FL>Valor por Hora</FL><CurrencyInput value={valorHora} onChange={setValorHora} /></div>
            <div>
              <FL>Total Estadia (horas)</FL>
              <div className={`${inputBase} bg-slate-50 text-slate-500 font-mono cursor-default`}>
                {valorTotalHoras > 0 ? fmtBRL(valorTotalHoras) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── SEÇÃO 3 ───────────────────────────────────────────────────── */}
        <SectionHeader title="Entre Margem" subtitle="Quantidade e valor unitário" color="violet" />

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FL>Quantidade</FL>
              <input type="number" min="0" value={emQtd}
                onChange={e => setEmQtd(e.target.value)}
                placeholder="0" className={inputBase + " font-mono"} />
            </div>
            <div><FL>Valor Unitário</FL><CurrencyInput value={emValor} onChange={setEmValor} /></div>
          </div>
          {emTotal > 0 && (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Entre Margem</span>
              <span className="text-xs font-black text-slate-800 font-mono">{fmtBRL(emTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Preview ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl flex flex-col h-full overflow-hidden">

          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-[12px] font-black text-slate-800 tracking-tight">Prévia do E-mail</h3>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">Escolha o formato para copiar</p>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Copiar texto plano */}
                <button onClick={handleCopyText}
                  title="Copiar como texto simples"
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 border ${
                    copiedText
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'
                  }`}>
                  {copiedText ? (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Ok!</>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7"/></svg>Texto</>
                  )}
                </button>
                {/* Copiar card HTML */}
                <button onClick={handleCopy}
                  title="Copiar card formatado (HTML para e-mail)"
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm ${
                    copied
                      ? 'bg-emerald-500 text-white shadow-emerald-100'
                      : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200'
                  }`}>
                  {copied ? (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Copiado!</>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Card</>
                  )}
                </button>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Toggle label="Estadia" value={showEstadia} onChange={setShowEstadia} />
              <Toggle label="Entre Margem" value={showEntreMargem} onChange={setShowEntreMargem} />
            </div>
          </div>

          {/* Card preview area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/60">
            <div className="max-w-sm mx-auto">
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">

                {/* Top stripe */}
                <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" />

                {/* Card header */}
                <div className="px-5 pt-4 pb-3 text-center border-b border-slate-100">
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md shadow-blue-100">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
                    </svg>
                  </div>
                  <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-widest leading-tight">
                    {container || 'DESCRIÇÃO'}
                  </h2>
                  {container && (
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">DESCRIÇÃO</p>
                  )}
                </div>

                {/* Pré-Stacking rows */}
                {hasAnyValue ? (
                  <div className="px-5 py-3">
                    <div className="text-[8px] font-black text-blue-500 uppercase tracking-[0.25em] mb-2">Pré-Stacking</div>
                    <div className="space-y-0">
                      {valorPSNum > 0 && <DotRow label="Pré-staking" value={fmtBRL(valorPSNum)} />}
                      {diasEstadia > 0 && valorDiaria && (
                        <DotRow label="Diárias excedentes" sub={diariasLabel} value={fmtBRL(valorTotalEstadia)} />
                      )}
                      {adValorTotal > 0 && (
                        <DotRow label="Ad-Valorem" sub={adValLabel} value={fmtBRL(adValorTotal)} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preencha os campos ao lado</p>
                  </div>
                )}

                {/* Estadia rows */}
                {showEstadia && valorTotalHoras > 0 && (
                  <div className="px-5 py-3 border-t border-slate-100">
                    <div className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.25em] mb-2">Estadia</div>
                    <DotRow label="Estadia excedente" sub={horasLabel} value={fmtBRL(valorTotalHoras)} />
                  </div>
                )}

                {/* Entre Margem rows */}
                {showEntreMargem && emTotal > 0 && (
                  <div className="px-5 py-3 border-t border-slate-100">
                    <div className="text-[8px] font-black text-violet-600 uppercase tracking-[0.25em] mb-2">Entre Margem</div>
                    <DotRow label="Entre Margem" sub={emLabel} value={fmtBRL(emTotal)} />
                  </div>
                )}

                {/* Total */}
                {grandTotal > 0 && (
                  <div className="px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800">
                    <TotalRow value={fmtBRL(grandTotal)} />
                  </div>
                )}

                {/* Footer */}
                <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 text-center">
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">ALS Logística · Pré-Stacking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValoresPreStackingTab;
