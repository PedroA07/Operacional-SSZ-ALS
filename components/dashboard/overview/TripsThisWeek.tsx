
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import MultiCheckboxFilter, { FilterStats } from '../../shared/MultiCheckboxFilter';

interface TripsThisWeekProps {
  trips: Trip[];
}

const TripsThisWeek: React.FC<TripsThisWeekProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);

  const weekRaw = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return trips.filter(t => {
      if (!t.dateTime) return false;
      const tripTime = new Date(t.dateTime).getTime();
      return tripTime >= startOfWeek.getTime() && tripTime <= endOfWeek.getTime();
    });
  }, [trips]);

  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selClients, setSelClients] = useState<string[]>([]);
  const [selDrivers, setSelDrivers] = useState<string[]>([]);

  const getStatsForEntity = (name: string, type: 'driver' | 'client'): FilterStats => {
    const entityTrips = weekRaw.filter(t => type === 'driver' ? t.driver.name === name : t.customer.name === name);
    const active = entityTrips.filter(t => t.status !== 'Viagem cancelada');
    
    const delayed = active.filter(t => {
      const scheduled = new Date(t.dateTime).getTime();
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      return new Date().getTime() > (scheduled + 600000) && t.status !== 'Viagem concluída';
    }).length;

    const completed = active.filter(t => t.status === 'Viagem concluída').length;
    const canceled = entityTrips.filter(t => t.status === 'Viagem cancelada').length;

    // Added explicit type to Set to fix inference
    const details = type === 'driver' 
      ? { label: 'Clientes na Semana', subLabel: 'Vínculos', items: Array.from(new Set<string>(entityTrips.map(t => t.customer.name))) }
      : { label: 'Motoristas Escalados', subLabel: 'Equipe', items: Array.from(new Set<string>(entityTrips.map(t => t.driver.name))) };

    return { total: entityTrips.length, completed, delayed, canceled, details };
  };

  const driverOptions = useMemo(() => {
    // Added explicit type to Set to fix inference
    const names = Array.from(new Set<string>(weekRaw.map(t => t.driver.name))).sort();
    return names.map(name => ({
      value: name,
      label: name,
      stats: getStatsForEntity(name, 'driver')
    }));
  }, [weekRaw]);

  const clientOptions = useMemo(() => {
    // Added explicit type to Set to fix inference
    const names = Array.from(new Set<string>(weekRaw.map(t => t.customer.name))).sort();
    return names.map(name => ({
      value: name,
      label: name,
      stats: getStatsForEntity(name, 'client')
    }));
  }, [weekRaw]);

  const stats = useMemo(() => {
    const active = weekRaw.filter(t => t.status !== 'Viagem cancelada');
    const canceled = weekRaw.filter(t => t.status === 'Viagem cancelada').length;
    const completed = active.filter(t => t.status === 'Viagem concluída').length;
    
    const typeCounts: Record<string, number> = {};
    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const delays = active.filter(t => {
      const scheduled = new Date(t.dateTime).getTime();
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      return new Date().getTime() > (scheduled + 600000) && t.status !== 'Viagem concluída';
    }).length;

    return { total: active.length, typeCounts, canceled, completed, delays };
  }, [weekRaw]);

  const filteredTrips = useMemo(() => {
    return weekRaw.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchT = selTypes.length === 0 || selTypes.includes(t.type?.toUpperCase() || 'OUTROS');
      const matchC = selClients.length === 0 || selClients.includes(t.customer.name);
      const matchD = selDrivers.length === 0 || selDrivers.includes(t.driver.name);
      return matchT && matchC && matchD;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [weekRaw, selTypes, selClients, selDrivers]);

  const allTypes = useMemo(() => Array.from(new Set(weekRaw.map(t => t.type?.toUpperCase() || 'OUTROS'))).sort(), [weekRaw]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 140 : 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start w-full">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Volume Semana</p>
            <p className="text-5xl font-black text-indigo-600 tracking-tighter mt-1">{stats.total}</p>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-400'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 p-2.5 rounded-xl text-center border border-red-100"><p className="text-[9px] font-black text-red-400 uppercase">Atr.</p><p className="text-lg font-black text-red-600 mt-1">{stats.delays}</p></div>
            <div className="bg-emerald-50 p-2.5 rounded-xl text-center border border-emerald-100"><p className="text-[9px] font-black text-emerald-400 uppercase">Concl.</p><p className="text-lg font-black text-emerald-600 mt-1">{stats.completed}</p></div>
            <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-200"><p className="text-[9px] font-black text-slate-400 uppercase">Canc.</p><p className="text-lg font-black text-slate-600 mt-1">{stats.canceled}</p></div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border border-indigo-500 rounded-b-[2.5rem] shadow-2xl z-[160] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 shrink-0 relative z-[170]">
             <MultiCheckboxFilter label="Modalidades" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Principais Clientes" options={clientOptions} selectedOptions={selClients} onChange={setSelClients} />
             <MultiCheckboxFilter label="Equipe Escalada" options={driverOptions} selectedOptions={selDrivers} onChange={setSelDrivers} />
          </div>
          
          <div className="overflow-y-auto custom-scrollbar p-5 space-y-3 flex-1 bg-slate-50/30 min-h-[300px] rounded-b-[2.5rem]">
            {filteredTrips.map(trip => (
              <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase">{new Date(trip.dateTime).toLocaleDateString('pt-BR')}</p>
                  <h4 className="text-[12px] font-black text-slate-800 uppercase truncate mt-1">{trip.driver.name}</h4>
                  <p className="text-[9px] font-bold text-blue-600 uppercase mt-1 truncate">{trip.customer.name}</p>
                </div>
                <div className="flex flex-col items-end">
                   <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[9px] font-mono font-bold border border-slate-200">{trip.os}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsThisWeek;
