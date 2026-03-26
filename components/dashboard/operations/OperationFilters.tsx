
import React, { useState } from 'react';
import { Customer, Driver } from '../../../types';

interface OperationFiltersProps {
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  selectedClients: string[];
  onClientsChange: (clients: string[]) => void;
  selectedDrivers: string[];
  onDriversChange: (drivers: string[]) => void;
  selectedScheduling: 'all' | 'scheduled' | 'not_scheduled';
  onSchedulingChange: (val: 'all' | 'scheduled' | 'not_scheduled') => void;
  customers: Customer[];
  drivers: Driver[];
  hideModality?: boolean;
}

const OperationFilters: React.FC<OperationFiltersProps> = ({ 
  selectedTypes, 
  onTypesChange, 
  selectedClients, 
  onClientsChange, 
  selectedDrivers,
  onDriversChange,
  selectedScheduling,
  onSchedulingChange,
  customers,
  drivers,
  hideModality = false
}) => {
  const [clientSearch, setClientSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'types' | 'clients' | 'drivers' | 'scheduling' | null>(null);

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
  const deselectAll = (setter: (l: string[]) => void) => setter([]);

  const DropdownHeader = ({ label, count, isOpen, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition-all text-[11px] font-bold uppercase ${isOpen ? 'border-blue-500 bg-white shadow-lg' : 'border-slate-50 bg-slate-50 hover:bg-white'}`}
    >
      <span className="truncate">{count === 0 ? `FILTRAR ${label}` : `${count} ${label} SELEC.`}</span>
      <svg className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3"/></svg>
    </button>
  );

  return (
    <div className="flex flex-wrap gap-4 items-end">
      
      {!hideModality && (
        <div className="flex-1 min-w-[200px] space-y-2 relative">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade</label>
          <DropdownHeader label="TIPOS" count={selectedTypes.length} isOpen={openDropdown === 'types'} onClick={() => setOpenDropdown(openDropdown === 'types' ? null : 'types')} />
          {openDropdown === 'types' && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-4 animate-in fade-in zoom-in-95">
               <div className="flex gap-2 mb-3">
                  <button onClick={() => selectAll(MODALITIES, onTypesChange)} className="flex-1 px-3 py-2 rounded-lg text-[8px] font-black uppercase text-blue-600 border border-blue-100 hover:bg-blue-50">Tudo</button>
                  <button onClick={() => deselectAll(onTypesChange)} className="flex-1 px-3 py-2 rounded-lg text-[8px] font-black uppercase text-slate-400 border border-slate-100 hover:bg-slate-50">Limpar</button>
               </div>
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
      )}

      {/* CLIENTES */}
      <div className="flex-1 min-w-[280px] space-y-2 relative">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Carteira de Clientes</label>
        <DropdownHeader label="CLIENTES" count={selectedClients.length} isOpen={openDropdown === 'clients'} onClick={() => setOpenDropdown(openDropdown === 'clients' ? null : 'clients')} />
        {openDropdown === 'clients' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-4 animate-in fade-in zoom-in-95">
             <input type="text" placeholder="BUSCAR CLIENTE..." className="w-full px-4 py-2.5 mb-3 bg-slate-50 rounded-xl text-[10px] outline-none border border-slate-100" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
             <div className="flex gap-2 mb-3">
                <button onClick={() => selectAll(customers.map(c => c.name), onClientsChange)} className="flex-1 px-3 py-2 rounded-lg text-[8px] font-black uppercase text-blue-600 border border-blue-100 hover:bg-blue-50">Todos</button>
                <button onClick={() => deselectAll(onClientsChange)} className="flex-1 px-3 py-2 rounded-lg text-[8px] font-black uppercase text-slate-400 border border-slate-100 hover:bg-slate-50">Limpar</button>
             </div>
             <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {filteredCustomers.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input 
                      type={hideModality ? "radio" : "checkbox"} 
                      checked={selectedClients.includes(c.name)} 
                      onChange={() => hideModality ? onClientsChange([c.name]) : toggleItem(selectedClients, c.name, onClientsChange)} 
                      className="w-4 h-4 rounded text-blue-600" 
                    />
                    <span className="text-[10px] font-bold uppercase truncate">{c.legalName || c.name}</span>
                  </label>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* MOTORISTAS */}
      <div className="flex-1 min-w-[280px] space-y-2 relative">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monitor Equipe</label>
        <DropdownHeader label="MOTORISTAS" count={selectedDrivers.length} isOpen={openDropdown === 'drivers'} onClick={() => setOpenDropdown(openDropdown === 'drivers' ? null : 'drivers')} />
        {openDropdown === 'drivers' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-4 animate-in fade-in zoom-in-95">
             <input type="text" placeholder="BUSCAR MOTORISTA..." className="w-full px-4 py-2.5 mb-3 bg-slate-50 rounded-xl text-[10px] outline-none border border-slate-100" value={driverSearch} onChange={e => setDriverSearch(e.target.value)} />
             <div className="flex gap-2 mb-3">
                <button onClick={() => selectAll(drivers.map(d => d.name), onDriversChange)} className="flex-1 px-3 py-2 rounded-lg text-[8px] font-black uppercase text-blue-600 border border-blue-100 hover:bg-blue-50">Marcar Todos</button>
                <button onClick={() => deselectAll(onDriversChange)} className="flex-1 px-3 py-2 rounded-lg text-[8px] font-black uppercase text-slate-400 border border-slate-100 hover:bg-slate-50">Limpar</button>
             </div>
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

      {/* AGENDAMENTO */}
      <div className="flex-1 min-w-[200px] space-y-2 relative">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Agendamento</label>
        <DropdownHeader 
          label="AGENDAMENTO" 
          count={selectedScheduling === 'all' ? 0 : 1} 
          isOpen={openDropdown === 'scheduling'} 
          onClick={() => setOpenDropdown(openDropdown === 'scheduling' ? null : 'scheduling')} 
        />
        {openDropdown === 'scheduling' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-4 animate-in fade-in zoom-in-95">
             <div className="space-y-1">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'scheduled', label: 'Agendados' },
                  { id: 'not_scheduled', label: 'Não Agendados' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input 
                      type="radio" 
                      name="scheduling_filter"
                      checked={selectedScheduling === opt.id} 
                      onChange={() => {
                        onSchedulingChange(opt.id as any);
                        setOpenDropdown(null);
                      }} 
                      className="w-4 h-4 rounded-full text-blue-600" 
                    />
                    <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                  </label>
                ))}
             </div>
          </div>
        )}
      </div>
      
      <button 
        onClick={() => { onTypesChange([]); onClientsChange([]); onDriversChange([]); onSchedulingChange('all'); setOpenDropdown(null); }}
        className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
      >
        Limpar Seleção
      </button>
    </div>
  );
};

export default OperationFilters;
