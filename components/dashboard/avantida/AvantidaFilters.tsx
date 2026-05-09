
import React from 'react';
import DatePicker from '../../shared/DatePicker';

interface AvantidaFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  showOnlyPending: boolean;
  setShowOnlyPending: (val: boolean) => void;
}

const AvantidaFilters: React.FC<AvantidaFiltersProps> = ({ 
  search, setSearch, startDate, setStartDate, endDate, setEndDate, showOnlyPending, setShowOnlyPending
}) => {
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block";
  const inputClass = "w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 bg-slate-50 text-[11px] font-bold uppercase focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm";

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row items-end gap-6">
      <div className="flex-1 w-full space-y-1">
        <label className={labelClass}>Busca Global</label>
        <div className="relative group">
           <input 
             type="text" 
             className={`${inputClass} pl-12`} 
             placeholder="FILTRAR CONTAINER, EXPORT REF..." 
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
           <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full lg:w-[400px]">
        <div className="space-y-1">
           <label className={labelClass}>Data Início</label>
           <DatePicker value={startDate} onChange={setStartDate} placeholder="Data início..." maxDate={endDate || undefined} />
        </div>
        <div className="space-y-1">
           <label className={labelClass}>Data Fim</label>
           <DatePicker value={endDate} onChange={setEndDate} placeholder="Data fim..." minDate={startDate || undefined} />
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <button 
          onClick={() => setShowOnlyPending(!showOnlyPending)}
          className={`px-6 py-3.5 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 border-2 ${showOnlyPending ? 'bg-amber-50 border-amber-500 text-amber-600 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
        >
          <div className={`w-2 h-2 rounded-full ${showOnlyPending ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
          Apenas Pendentes
        </button>
        
        <button 
          onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setShowOnlyPending(false); }}
          className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[9px] font-black uppercase transition-all"
        >
          Limpar
        </button>
      </div>
    </div>
  );
};

export default AvantidaFilters;
