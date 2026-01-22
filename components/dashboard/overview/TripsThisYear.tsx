
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import { statsCalculator } from '../../../utils/statsCalculator';
import RichEntityFilter from './RichEntityFilter';
import MultiCheckboxFilter from '../../shared/MultiCheckboxFilter';

interface TripsThisYearProps {
  trips: Trip[];
}

const TripsThisYear: React.FC<TripsThisYearProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selClients, setSelClients] = useState<string[]>([]);
  const [selDrivers, setSelDrivers] = useState<string[]>([]);

  const yearRaw = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return trips.filter(t => t.dateTime && t.dateTime.substring(0, 4) === currentYear);
  }, [trips]);

  const filteredBase = useMemo(() => {
    return yearRaw.filter(t => selTypes.length === 0 || selTypes.includes(t.type?.toUpperCase() || 'OUTROS'));
  }, [yearRaw, selTypes]);

  const clientStats = useMemo(() => statsCalculator.calculateFullDashboardStats(filteredBase, 'client'), [filteredBase]);
  const driverStats = useMemo(() => statsCalculator.calculateFullDashboardStats(filteredBase, 'driver'), [filteredBase]);

  const stats = useMemo(() => {
    const active = filteredBase.filter(t => t.status !== 'Viagem cancelada');
    const canceled = filteredBase.filter(t => t.status === 'Viagem cancelada').length;
    const completed = active.filter(t => t.status === 'Viagem concluída').length;
    const delays = active.filter(t => statsCalculator.isDelayed(t)).length;

    const typeCounts: Record<string, number> = {};
    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return { total: active.length, typeCounts, canceled, delays, completed };
  }, [filteredBase]);

  const displayTrips = useMemo(() => {
    return filteredBase.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchC = selClients.length === 0 || selClients.includes(t.customer.name);
      const matchD = selDrivers.length === 0 || selDrivers.includes(t.driver.name);
      return matchC && matchD;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [filteredBase, selClients, selDrivers]);

  const allOpTypes = useMemo(() => Array.from(new Set(yearRaw.map(t => t.type?.toUpperCase() || 'OUTROS'))).sort(), [yearRaw]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 500 : 10 }}>
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
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/5"><p className="text-[10px] font-black text-slate-500 uppercase">Atr.</p><p className="text-lg font-black text-red-400 mt-1">{stats.delays}</p></div>
            <div className="bg-emerald-500/10 p-2.5 rounded-xl text-center border border-emerald-500/20"><p className="text-[10px] font-black text-emerald-400 uppercase">Concl.</p><p className="text-lg font-black text-emerald-400 mt-1">{stats.completed}</p></div>
            <div className="bg-white/5 p-2.5 rounded-xl text-center border border-white/5"><p className="text-[10px] font-black text-slate-500 uppercase">Canc.</p><p className="text-lg font-black text-slate-300 mt-1">{stats.canceled}</p></div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-slate-900 border border-blue-500 rounded-b-[2.5rem] shadow-2xl z-[160] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col overflow-visible">
          <div className="p-4 bg-slate-950/50 border-b border-white/5 flex flex-wrap gap-2 shrink-0">
             <MultiCheckboxFilter label="Filtrar Modalidade" options={allOpTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <RichEntityFilter label="Ranking Clientes" stats={clientStats} selectedItems={selClients} onChange={setSelClients} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>} />
             <RichEntityFilter label="Ranking Equipe" stats={driverStats} selectedItems={selDrivers} onChange={setSelDrivers} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2"/></svg>} />
          </div>
          
          <div className="overflow-y-auto custom-scrollbar p-6 space-y-4 flex-1 bg-slate-950/20 min-h-[250px] rounded-b-[2.5rem]">
            {displayTrips.slice(0, 100).map(trip => (
              <div key={trip.id} className="p-4 bg-white/5 border border-white/5 rounded-3xl">
                <span className="text-xs font-black text-slate-500">{new Date(trip.dateTime).toLocaleDateString('pt-BR')}</span>
                <p className="text-[13px] font-black text-white uppercase mt-1 leading-none truncate">{trip.driver.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase truncate mt-1">{trip.customer.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsThisYear;
