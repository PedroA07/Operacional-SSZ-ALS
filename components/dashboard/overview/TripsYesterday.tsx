
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import MultiCheckboxFilter, { FilterStats } from '../../shared/MultiCheckboxFilter';

interface TripsYesterdayProps {
  trips: Trip[];
}

const TripsYesterday: React.FC<TripsYesterdayProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
  }, []);

  const yesterdayRaw = useMemo(() => {
    return trips.filter(t => t.dateTime && t.dateTime.substring(0, 10) === yesterdayStr);
  }, [trips, yesterdayStr]);

  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selClients, setSelClients] = useState<string[]>([]);
  const [selDrivers, setSelDrivers] = useState<string[]>([]);

  const getStatsForEntity = (name: string, type: 'driver' | 'client'): FilterStats => {
    const entityTrips = yesterdayRaw.filter(t => type === 'driver' ? t.driver.name === name : t.customer.name === name);
    const active = entityTrips.filter(t => t.status !== 'Viagem cancelada');
    
    const delayed = active.filter(t => {
      const scheduled = new Date(t.dateTime).getTime();
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      return t.status !== 'Viagem concluída'; 
    }).length;

    const completed = active.filter(t => t.status === 'Viagem concluída').length;
    const canceled = entityTrips.filter(t => t.status === 'Viagem cancelada').length;

    // Added explicit type to Set to fix inference
    const details = type === 'driver' 
      ? { label: 'Atendimentos Ontem', subLabel: 'Rotas', items: Array.from(new Set<string>(entityTrips.map(t => t.customer.name))) }
      : { label: 'Frota Alocada', subLabel: 'Equipe', items: Array.from(new Set<string>(entityTrips.map(t => t.driver.name))) };

    return { total: entityTrips.length, completed, delayed, canceled, details };
  };

  const driverOptions = useMemo(() => {
    // Added explicit type to Set to fix inference
    const names = Array.from(new Set<string>(yesterdayRaw.map(t => t.driver.name))).sort();
    return names.map(name => ({
      value: name,
      label: name,
      stats: getStatsForEntity(name, 'driver')
    }));
  }, [yesterdayRaw]);

  const clientOptions = useMemo(() => {
    // Added explicit type to Set to fix inference
    const names = Array.from(new Set<string>(yesterdayRaw.map(t => t.customer.name))).sort();
    return names.map(name => ({
      value: name,
      label: name,
      stats: getStatsForEntity(name, 'client')
    }));
  }, [yesterdayRaw]);

  const stats = useMemo(() => {
    const active = yesterdayRaw.filter(t => t.status !== 'Viagem cancelada');
    const completed = yesterdayRaw.filter(t => t.status === 'Viagem concluída').length;
    const canceled = yesterdayRaw.filter(t => t.status === 'Viagem cancelada').length;
    
    const typeCounts: Record<string, number> = {};
    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const delays = active.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      const scheduled = new Date(t.dateTime).getTime();
      if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      return t.status !== 'Viagem concluída'; 
    }).length;

    return { total: active.length, completed, canceled, delays, typeCounts };
  }, [yesterdayRaw]);

  const filteredTrips = useMemo(() => {
    return yesterdayRaw.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchT = selTypes.length === 0 || selTypes.includes(t.type?.toUpperCase() || 'OUTROS');
      const matchC = selClients.length === 0 || selClients.includes(t.customer.name);
      const matchD = selDrivers.length === 0 || selDrivers.includes(t.driver.name);
      return matchT && matchC && matchD;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [yesterdayRaw, selTypes, selClients, selDrivers]);

  const allTypes = useMemo(() => Array.from(new Set(yesterdayRaw.map(t => t.type?.toUpperCase() || 'OUTROS'))).sort(), [yesterdayRaw]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 150 : 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-slate-400 ring-4 ring-slate-400/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start w-full">
            <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ontem</p>
                <p className="text-5xl font-black text-slate-800 tracking-tighter mt-1">{stats.total}</p>
            </div>
            <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
               <svg className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
        </div>

        <div className="mt-8 w-full space-y-5">
          <div className="flex flex-wrap gap-2 min-h-[30px]">
            {Object.entries(stats.typeCounts).slice(0, 3).map(([type, c]) => (
              <div key={type} className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase">{type.substring(0,5)}</span>
                <span className="text-sm font-black text-slate-700">{c}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-red-50 p-2.5 rounded-xl text-center border border-red-100"><p className="text-[9px] font-black text-red-400 uppercase">Atr.</p><p className="text-lg font-black text-red-600 mt-1">{stats.delays}</p></div>
            <div className="bg-emerald-50 p-2.5 rounded-xl text-center border border-emerald-100"><p className="text-[9px] font-black text-emerald-400 uppercase">Concl.</p><p className="text-lg font-black text-emerald-600 mt-1">{stats.completed}</p></div>
            <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-200"><p className="text-[9px] font-black text-slate-400 uppercase">Canc.</p><p className="text-lg font-black text-slate-600 mt-1">{stats.canceled}</p></div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border border-slate-400 rounded-b-[2.5rem] shadow-2xl z-[160] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 shrink-0 relative z-[170]">
             <MultiCheckboxFilter label="Filtrar Modais" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Desempenho Cliente" options={clientOptions} selectedOptions={selClients} onChange={setSelClients} />
             <MultiCheckboxFilter label="Estatística Motorista" options={driverOptions} selectedOptions={selDrivers} onChange={setSelDrivers} />
          </div>
          <div className="overflow-y-auto custom-scrollbar p-5 space-y-3 flex-1 bg-slate-50/30 min-h-[300px] rounded-b-[2.5rem]">
            {filteredTrips.map(trip => (
              <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-[1.8rem] shadow-sm flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[9px] font-black text-slate-400">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase truncate leading-none mt-1">{trip.driver.name}</h4>
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${trip.status === 'Viagem concluída' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{trip.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsYesterday;
