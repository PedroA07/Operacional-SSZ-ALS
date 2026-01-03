
import React from 'react';
import { Customer } from '../../../types';

interface OperationFiltersProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedClient: string;
  onClientChange: (client: string) => void;
  customers: Customer[];
}

const OperationFilters: React.FC<OperationFiltersProps> = ({ 
  selectedType, 
  onTypeChange, 
  selectedClient, 
  onClientChange, 
  customers 
}) => {
  const types = ['TODOS', 'EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

  return (
    <div className="flex flex-wrap gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
      <div className="flex-1 min-w-[240px] space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade de Operação</label>
        <div className="relative">
          <select 
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 text-[11px] font-bold uppercase focus:border-blue-500 focus:bg-white outline-none bg-slate-50 transition-all appearance-none cursor-pointer"
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-[320px] space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Cliente (Razão + Fantasia)</label>
        <div className="relative">
          <select 
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-50 text-[11px] font-bold uppercase focus:border-blue-500 focus:bg-white outline-none bg-slate-50 transition-all appearance-none cursor-pointer"
            value={selectedClient}
            onChange={(e) => onClientChange(e.target.value)}
          >
            <option value="TODOS">LISTAR TODOS OS CLIENTES ATIVOS</option>
            {customers.sort((a,b) => (a.legalName || a.name).localeCompare(b.legalName || b.name)).map(c => (
              <option key={c.id} value={c.name}>
                {c.legalName ? `${c.legalName.substring(0,35)} (${c.name})` : c.name}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
          </div>
        </div>
      </div>
      
      <div className="flex items-end pb-1.5">
        <button 
          onClick={() => { onTypeChange('TODOS'); onClientChange('TODOS'); }}
          className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  );
};

export default OperationFilters;
