
import React from 'react';
import CustomSelect from '../../shared/CustomSelect';

interface ListFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  placeholder?: string;
}

const ListFilters: React.FC<ListFiltersProps> = ({ 
  searchQuery, 
  onSearchChange, 
  sortBy, 
  onSortChange, 
  statusFilter, 
  onStatusFilterChange,
  placeholder = "PESQUISAR..."
}) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 mb-6">
      <div className="flex-1 relative w-full">
        <input 
          type="text" 
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase focus:bg-white focus:border-blue-400 outline-none transition-all"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex-1 md:w-48 space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Ordenar por</label>
          <CustomSelect
            value={sortBy}
            onChange={(v) => onSortChange(v)}
            options={[
              { value: 'name_asc', label: 'A-Z (ALFABÉTICA)' },
              { value: 'name_desc', label: 'Z-A' },
              { value: 'recent', label: 'MAIS RECENTES' },
            ]}
            inputClassName="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[9px] font-black uppercase outline-none focus:border-blue-400 cursor-pointer"
          />
        </div>

        {onStatusFilterChange && (
          <div className="flex-1 md:w-40 space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Status</label>
            <CustomSelect
              value={statusFilter || 'todos'}
              onChange={(v) => onStatusFilterChange(v)}
              options={[
                { value: 'todos', label: 'TODOS' },
                { value: 'Ativo', label: 'ATIVOS' },
                { value: 'Inativo', label: 'INATIVOS' },
              ]}
              inputClassName="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[9px] font-black uppercase outline-none focus:border-blue-400 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ListFilters;
