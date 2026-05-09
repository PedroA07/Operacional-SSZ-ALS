
import React from 'react';
import DatePicker from '../../shared/DatePicker';

interface ViewFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onClear: () => void;
  placeholder?: string;
}

const ViewFilters: React.FC<ViewFiltersProps> = ({
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClear,
  placeholder = "BUSCAR OS, CONTAINER, MOTORISTA..."
}) => {
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";
  const inputClass = "w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 text-[11px] font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm placeholder:text-slate-300";

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm mb-6 flex flex-col lg:flex-row items-end gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* BUSCA TEXTUAL */}
      <div className="flex-1 w-full space-y-1">
        <label className={labelClass}>Busca Rápida</label>
        <div className="relative">
          <input 
            type="text" 
            placeholder={placeholder}
            className={`${inputClass} pl-12`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* RANGE DE DATAS */}
      <div className="grid grid-cols-2 gap-4 w-full lg:w-[450px]">
        <div className="space-y-1">
          <label className={labelClass}>De (Data Início)</label>
          <DatePicker
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Data início..."
            maxDate={endDate || undefined}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Até (Data Fim)</label>
          <DatePicker
            value={endDate}
            onChange={onEndDateChange}
            placeholder="Data fim..."
            minDate={startDate || undefined}
          />
        </div>
      </div>

      {/* AÇÕES */}
      <div className="shrink-0 flex gap-2 w-full lg:w-auto">
        {(searchQuery || startDate || endDate) && (
          <button 
            onClick={onClear}
            className="flex-1 lg:flex-none px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase transition-all active:scale-95"
          >
            Limpar
          </button>
        )}
        <button className="flex-1 lg:flex-none px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95">
          Filtrar
        </button>
      </div>
    </div>
  );
};

export default ViewFilters;
