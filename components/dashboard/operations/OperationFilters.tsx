
import React, { useState } from 'react';
import { Customer, Driver } from '../../../types';

interface OperationFiltersProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  selectedClients: string[];
  onClientsChange: (clients: string[]) => void;
  selectedDrivers: string[];
  onDriversChange: (drivers: string[]) => void;
  customers: Customer[];
  drivers: Driver[];
}

const OperationFilters: React.FC<OperationFiltersProps> = ({ 
  selectedTypes, 
  onTypesChange, 
  selectedClients, 
  onClientsChange, 
  selectedDrivers,
  onDriversChange,
  customers,
  drivers
}) => {
  const [clientSearch, setClientSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'types' | 'clients' | 'drivers' | null>(null);

  const MODALITIES = ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

  const filteredCustomers = customers.filter(c => 
    (c.legalName || c.name).toUpperCase().includes(clientSearch.toUpperCase())
  );

  const filteredDriversList = drivers.filter(d => 
    d.name.toUpperCase().includes(driverSearch.toUpperCase()) || d.plateHorse.toUpperCase().includes(driverSearch.toUpperCase())
  );

  const toggleItem = (list: string[], item: string, setter: (l: string[]) => void) => {
    if (list.includes(item)) setter(list.filter(i => i !== item));
    else setter([...list, item]);
  };

  const selectAll = (fullList: string[], setter: (l: string[]) => void) => setter(fullList);

  const DropdownHeader = ({ label, count, isOpen, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition-all text-[11px] font-bold uppercase ${isOpen ? 'border-blue-500 bg-white shadow-lg' : 'border-slate-50 bg-slate-50 hover:bg-white'}`}
    >
      <span className="truncate">{count === 0 ? `TODOS OS ${label}` : `${count} ${label} SELEC.`}</span>
      <svg className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
    </button>
  );

  return (
    <div className="flex flex-wrap gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
      
      {/* MODALIDADES */}
      <div className="flex-1 min-w-[200px] space-y-2 relative">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade</label>
        <DropdownHeader label="TIPOS" count={selectedTypes.length} isOpen={openDropdown === 'types'} onClick={() => setOpenDropdown(openDropdown === 'types' ? null : 'types')} />
        {openDropdown === 'types' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-4 animate-in fade-in zoom-in-95">
             <button onClick={() => selectAll(MODALITIES, onTypesChange)} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase text-blue-600 border border-blue-50 mb-2">Selecionar Todos</button>
             <div className="space-y-1">
                {MODALITIES.map(t => (
                  <label key={t} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedTypes.includes(t)} onChange={() => toggleItem(selectedTypes, t, onTypesChange)} className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-[10px] font-bold uppercase">{t}</span>
                  </label>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* CLIENTES */}
      <div className="flex-1 min-w-[280px] space-y-2 relative">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Clientes</label>
        <DropdownHeader label="CLIENTES" count={selectedClients.length} isOpen={openDropdown === 'clients'} onClick={() => setOpenDropdown(openDropdown === 'clients' ? null : 'clients')} />
        {openDropdown === 'clients' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-4 animate-in fade-in zoom-in-95">
             <input type="text" placeholder="BUSCAR CLIENTE..." className="w-full px-4 py-2 mb-3 bg-slate-50 rounded-xl text-[10px] outline-none" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
             <button onClick={() => selectAll(customers.map(c => c.name), onClientsChange)} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase text-blue-600 border border-blue-50 mb-2">Selecionar Todos</button>
             <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {filteredCustomers.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedClients.includes(c.name)} onChange={() => toggleItem(selectedClients, c.name, onClientsChange)} className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-[10px] font-bold uppercase truncate">{c.legalName || c.name}</span>
                  </label>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* MOTORISTAS */}
      <div className="flex-1 min-w-[280px] space-y-2 relative">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Motoristas</label>
        <DropdownHeader label="MOTORISTAS" count={selectedDrivers.length} isOpen={openDropdown === 'drivers'} onClick={() => setOpenDropdown(openDropdown === 'drivers' ? null : 'drivers')} />
        {openDropdown === 'drivers' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-4 animate-in fade-in zoom-in-95">
             <input type="text" placeholder="BUSCAR MOTORISTA..." className="w-full px-4 py-2 mb-3 bg-slate-50 rounded-xl text-[10px] outline-none" value={driverSearch} onChange={e => setDriverSearch(e.target.value)} />
             <button onClick={() => selectAll(drivers.map(d => d.name), onDriversChange)} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase text-blue-600 border border-blue-50 mb-2">Selecionar Todos</button>
             <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {filteredDriversList.map(d => (
                  <label key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedDrivers.includes(d.name)} onChange={() => toggleItem(selectedDrivers, d.name, onDriversChange)} className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-[10px] font-bold uppercase truncate">{d.name} <span className="text-slate-400 font-mono ml-2">[{d.plateHorse}]</span></span>
                  </label>
                ))}
             </div>
          </div>
        )}
      </div>
      
      <div className="flex items-end pb-1.5">
        <button 
          onClick={() => { onTypesChange([]); onClientsChange([]); onDriversChange([]); setOpenDropdown(null); }}
          className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  );
};

export default OperationFilters;
