
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import MultiCheckboxFilter from '../../shared/MultiCheckboxFilter';

interface TripsThisYearProps {
  trips: Trip[];
}

const TripsThisYear: React.FC<TripsThisYearProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'ranking' | 'list'>('ranking');

  const yearRaw = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return trips.filter(t => t.dateTime && t.dateTime.substring(0, 4) === currentYear);
  }, [trips]);

  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selClients, setSelClients] = useState<string[]>([]);
  const [selDrivers, setSelDrivers] = useState<string[]>([]);

  const stats = useMemo(() => {
    const active = yearRaw.filter(t => t.status !== 'Viagem cancelada');
    const canceled = yearRaw.filter(t => t.status === 'Viagem cancelada').length;
    const completed = active.filter(t => t.status === 'Viagem concluída').length;

    const typeCounts: Record<string, number> = {};
    const clientRank: Record<string, number> = {};

    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      if (t.category?.toUpperCase() === 'INDÚSTRIA') typeCounts['IND'] = (typeCounts['IND'] || 0) + 1;
      if (t.category?.toUpperCase() === 'CARGA SOLTA') typeCounts['SOLTA'] = (typeCounts['SOLTA'] || 0) + 1;
      clientRank[t.customer.name] = (clientRank[t.customer.name] || 0) + 1;
    });

    return { 
      total: active.length, 
      typeCounts, 
      canceled, 
      completed,
      clientRank: Object.entries(clientRank).sort((a,b) => b[1] - a[1])
    };
  }, [yearRaw]);

  const filteredTrips = useMemo(() => {
    return yearRaw.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchT = selTypes.length === 0 || selTypes.includes(t.type?.toUpperCase() || 'OUTROS');
      const matchC = selClients.length === 0 || selClients.includes(t.customer.name);
      const matchD = selDrivers.length === 0 || selDrivers.includes(t.driver.name);
      return matchT && matchC && matchD;
    }).sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [yearRaw, selTypes, selClients, selDrivers]);

  const allTypes = useMemo(() => Array.from(new Set(yearRaw.map(t => t.type?.toUpperCase() || 'OUTROS'))).sort(), [yearRaw]);
  const allClients = useMemo(() => Array.from(new Set(yearRaw.map(t => t.customer.name))).sort(), [yearRaw]);
  const allDrivers = useMemo(() => Array.from(new Set(yearRaw.map(t => t.driver.name))).sort(), [yearRaw]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 140 : 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-slate-900 p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/10 rounded-b-none' : 'border-white/10'}`}
      >
        <div className="flex justify-between items-start w-full">
          <div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Consolidado Anual</p>
            <p className="text-5xl font-black text-white tracking-tighter mt-1">{stats.total}</p>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-blue-400'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        <div className="mt-8 w-full space-y-5">
          <div className="flex flex-wrap gap-2 min-h-[30px]">
            {Object.entries(stats.typeCounts).slice(0, 5).map(([type, c]) => (
              <div key={type} className="bg-white/5 px-3 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                <span className="text-xs font-black text-slate-400 uppercase">{type.substring(0,5)}</span>
                <span className="text-sm font-black text-white">{c}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 p-3 rounded-2xl text-center border border-emerald-500/20">
              <p className="text-[10px] font-black text-emerald-400 uppercase">Total Concl.</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{stats.completed}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase">Canceladas</p>
              <p className="text-xl font-black text-slate-300 mt-1">{stats.canceled}</p>
            </div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-slate-900 border border-blue-500 rounded-b-[2.5rem] shadow-2xl z-[160] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-950/50 border-b border-white/5 flex flex-wrap gap-2 shrink-0">
             <MultiCheckboxFilter label="Modalidade" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Clientes" options={allClients} selectedOptions={selClients} onChange={setSelClients} />
             <MultiCheckboxFilter label="Motoristas" options={allDrivers} selectedOptions={selDrivers} onChange={setSelDrivers} />
          </div>
          
          <div className="flex bg-slate-800 p-1 mx-4 mt-4 rounded-xl shrink-0">
             <button onClick={() => setViewMode('ranking')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'ranking' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>Ranking Clientes</button>
             <button onClick={() => setViewMode('list')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>Últimas do Ano</button>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-6 space-y-4 flex-1 bg-slate-950/20 min-h-[250px] rounded-b-[2.5rem]">
            {viewMode === 'ranking' ? (
              <div className="space-y-4 pb-4">
                 {stats.clientRank.slice(0, 15).map(([name, count]) => (
                   <div key={name} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                      <span className="text-sm font-black text-slate-300 uppercase truncate pr-4">{name}</span>
                      <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black">{count}</span>
                   </div>
                 ))}
              </div>
            ) : (
              filteredTrips.slice(0, 50).map(trip => (
                <div key={trip.id} className="p-4 bg-white/5 border border-white/5 rounded-3xl">
                  <span className="text-xs font-black text-slate-500">{new Date(trip.dateTime).toLocaleDateString('pt-BR')}</span>
                  <p className="text-[13px] font-black text-white uppercase mt-1 leading-none truncate">{trip.driver.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase truncate mt-1">{trip.customer.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsThisYear;
