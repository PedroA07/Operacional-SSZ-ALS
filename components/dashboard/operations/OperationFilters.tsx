
import React, { useState } from 'react';
import { Customer } from '../../../types';

interface OperationFiltersProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedClients: string[];
  onClientsChange: (clients: string[]) => void;
  customers: Customer[];
}

const OperationFilters: React.FC<OperationFiltersProps> = ({ 
  selectedType, 
  onTypeChange, 
  selectedClients, 
  onClientsChange, 
  customers 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const types = ['TODOS', 'EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

  const filteredCustomers = customers.filter(c => 
    (c.legalName || c.name).toUpperCase().includes(searchTerm.toUpperCase())
  );

  const toggleClient = (name: string) => {
    if (selectedClients.includes(name)) {
      onClientsChange(selectedClients.filter(n => n !== name));
    } else {
      onClientsChange([...selectedClients, name]);
    }
  };

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

      <div className="flex-1 min-w-[320px] space-y-2 relative">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
          Clientes Selecionados ({selectedClients.length || 'Todos'})
        </label>
        
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 border-slate-50 text-[11px] font-bold uppercase bg-slate-50 hover:bg-white transition-all"
        >
          <span className="truncate max-w-[250px]">
            {selectedClients.length === 0 ? 'LISTAR TODOS OS CLIENTES' : selectedClients.join(', ')}
          </span>
          <svg className={`w-4 h-4 text-slate-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-4 animate-in fade-in slide-in-from-top-2">
            <input 
              type="text" 
              placeholder="PESQUISAR CLIENTE..." 
              className="w-full px-4 py-2 mb-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black uppercase outline-none focus:border-blue-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              <button 
                onClick={() => onClientsChange([])}
                className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-blue-50 text-blue-600 mb-2 border border-blue-100"
              >
                Limpar Seleção (Ver Todos)
              </button>
              {filteredCustomers.map(c => {
                const isSelected = selectedClients.includes(c.name);
                return (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200 group-hover:border-blue-300'}`}>
                      {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleClient(c.name)} />
                    <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                      {c.legalName ? `${c.legalName.substring(0,35)} (${c.name})` : c.name}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
               <button onClick={() => setIsDropdownOpen(false)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Fechar</button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-end pb-1.5">
        <button 
          onClick={() => { onTypeChange('TODOS'); onClientsChange([]); setSearchTerm(''); }}
          className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  );
};

export default OperationFilters;
