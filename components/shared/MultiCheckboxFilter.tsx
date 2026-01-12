
import React from 'react';

interface MultiCheckboxFilterProps {
  label: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
}

const MultiCheckboxFilter: React.FC<MultiCheckboxFilterProps> = ({ label, options, selectedOptions, onChange }) => {
  const toggleAll = (select: boolean) => {
    onChange(select ? [...options] : []);
  };

  const toggleOption = (opt: string) => {
    if (selectedOptions.includes(opt)) {
      onChange(selectedOptions.filter(o => o !== opt));
    } else {
      onChange([...selectedOptions, opt]);
    }
  };

  return (
    <div className="space-y-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center px-1">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <div className="flex gap-2">
           <button onClick={() => toggleAll(true)} className="text-[7px] font-black text-blue-500 uppercase hover:underline">Todos</button>
           <button onClick={() => toggleAll(false)} className="text-[7px] font-black text-slate-400 uppercase hover:underline">Limpar</button>
        </div>
      </div>
      <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 pr-1">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
            <input 
              type="checkbox" 
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={selectedOptions.includes(opt)}
              onChange={() => toggleOption(opt)}
            />
            <span className={`text-[9px] font-bold uppercase truncate transition-colors ${selectedOptions.includes(opt) ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>
              {opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default MultiCheckboxFilter;
