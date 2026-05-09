
import React from 'react';
import DatePicker from '../../shared/DatePicker';
import { localDateStr } from '../../../utils/dateHelpers';

interface DateRangeFilterProps {
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onClear: () => void;
}

const offsetDate = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDateStr(d);
};

const QuickBtn: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wide transition-all ${
      active ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'
    }`}
  >
    {label}
  </button>
);

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate, onStartDateChange, endDate, onEndDateChange, onClear,
}) => {
  const today     = localDateStr();
  const yesterday = offsetDate(-1);
  const tomorrow  = offsetDate(1);

  const isSingleDay = (d: string) => startDate === d && endDate === d;
  const setDay = (d: string) => { onStartDateChange(d); onEndDateChange(d); };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Quick shortcuts */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">Atalhos:</span>
        <QuickBtn label="Ontem" active={isSingleDay(yesterday)} onClick={() => setDay(yesterday)} />
        <QuickBtn label="Hoje"  active={isSingleDay(today)}     onClick={() => setDay(today)} />
        <QuickBtn label="Amanhã" active={isSingleDay(tomorrow)} onClick={() => setDay(tomorrow)} />
        <div className="w-px h-4 bg-slate-200 mx-1" />
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-200"
          >
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
            Início do Período
          </label>
          <DatePicker
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Data inicial..."
            maxDate={endDate || undefined}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">
            Fim do Período
          </label>
          <DatePicker
            value={endDate}
            onChange={onEndDateChange}
            placeholder="Data final..."
            minDate={startDate || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangeFilter;
