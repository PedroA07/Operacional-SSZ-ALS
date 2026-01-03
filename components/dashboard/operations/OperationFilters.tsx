
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
    <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-4">
      <div className="flex-1 min-w-[200px] space-y-1">
        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Tipo de Operação</label>
        <select 
          className="w-full px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-bold uppercase focus:border-blue-500 outline-none bg-slate-50"
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex-1 min-w-[200px] space-y-1">
        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Filtrar por Cliente</label>
        <select 
          className="w-full px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-bold uppercase focus:border-blue-500 outline-none bg-slate-50"
          value={selectedClient}
          onChange={(e) => onClientChange(e.target.value)}
        >
          <option value="TODOS">TODOS OS CLIENTES</option>
          {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      
      <div className="flex items-end pb-1">
        <button 
          onClick={() => { onTypeChange('TODOS'); onClientChange('TODOS'); }}
          className="px-4 py-2 text-[8px] font-black text-blue-600 uppercase hover:underline"
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  );
};

export default OperationFilters;
