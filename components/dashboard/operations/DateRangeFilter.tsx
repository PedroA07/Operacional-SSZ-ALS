
import React from 'react';

interface DateRangeFilterProps {
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onClear: () => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClear
}) => {
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";
  const inputClass = "w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 text-[11px] font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm";

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row items-end gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="space-y-1">
          <label className={labelClass}>Início do Período</label>
          <input 
            type="date" 
            className={inputClass}
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Fim do Período</label>
          <input 
            type="date" 
            className={inputClass}
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
      </div>

      <div className="shrink-0 flex gap-2 w-full md:w-auto">
        {(startDate || endDate) && (
          <button 
            onClick={onClear}
            className="flex-1 md:flex-none px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase transition-all active:scale-95 border border-slate-200"
          >
            Limpar Datas
          </button>
        )}
        <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
           </svg>
        </div>
      </div>
    </div>
  );
};

export default DateRangeFilter;
