
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import { statsCalculator } from '../../../utils/statsCalculator';
import RichEntityFilter from './RichEntityFilter';
import MultiCheckboxFilter from '../../shared/MultiCheckboxFilter';

interface TripsTomorrowProps {
  trips: Trip[];
}

const TripsTomorrow: React.FC<TripsTomorrowProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selClients, setSelClients] = useState<string[]>([]);
  const [selDrivers, setSelDrivers] = useState<string[]>([]);

  const tomStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
  }, []);

  const tomorrowRaw = useMemo(() => {
    return trips.filter(t => t.dateTime && t.dateTime.substring(0, 10) === tomStr);
  }, [trips, tomStr]);

  const filteredBase = useMemo(() => {
    return tomorrowRaw.filter(t => selTypes.length === 0 || selTypes.includes(t.type?.toUpperCase() || 'OUTROS'));
  }, [tomorrowRaw, selTypes]);

  const clientStats = useMemo(() => statsCalculator.calculateFullDashboardStats(filteredBase, 'client'), [filteredBase]);
  const driverStats = useMemo(() => statsCalculator.calculateFullDashboardStats(filteredBase, 'driver'), [filteredBase]);

  const stats = useMemo(() => {
    const active = filteredBase.filter(t => t.status !== 'Viagem cancelada');
    const canceled = filteredBase.filter(t => t.status === 'Viagem cancelada').length;
    const completed = active.filter(t => t.isCompleted || t.status === 'Viagem concluída').length;
    const delays = active.filter(t => statsCalculator.isDelayed(t)).length;
    const typeCounts: Record<string, number> = {};
    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return { total: active.length, typeCounts, canceled, completed, delays };
  }, [filteredBase]);

  const displayTrips = useMemo(() => {
    return filteredBase.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchC = selClients.length === 0 || selClients.includes(t.customer.name);
      const matchD = selDrivers.length === 0 || selDrivers.includes(t.driver.name);
      return matchC && matchD;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [filteredBase, selClients, selDrivers]);

  const allOpTypes = useMemo(() => Array.from(new Set(tomorrowRaw.map(t => t.type?.toUpperCase() || 'OUTROS'))).sort(), [tomorrowRaw]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 500 : 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-amber-500 ring-4 ring-amber-500/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start w-full">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Amanhã</p>
            <p className="text-5xl font-black text-slate-800 tracking-tighter mt-1">{stats.total}</p>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-50 text-amber-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        <div className="mt-8 w-full space-y-5">
          <div className="flex flex-wrap gap-2 min-h-[30px]">
            {Object.entries(stats.typeCounts).slice(0, 3).map(([type, c]) => (
              <div key={type} className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center gap-3">
                <span className="text-xs font-black text-slate-400 uppercase">{type.substring(0,5)}</span>
                <span className="text-sm font-black text-slate-700">{c}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 p-2.5 rounded-xl text-center border border-red-100"><p className="text-[9px] font-black text-red-400 uppercase">Prev. Atr.</p><p className="text-lg font-black text-red-600 mt-1">{stats.delays}</p></div>
            <div className="bg-emerald-50 p-2.5 rounded-xl text-center border border-emerald-100"><p className="text-[9px] font-black text-emerald-400 uppercase">Concl.</p><p className="text-lg font-black text-emerald-600 mt-1">{stats.completed}</p></div>
            <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-200"><p className="text-[9px] font-black text-slate-400 uppercase">Canc.</p><p className="text-lg font-black text-slate-600 mt-1">{stats.canceled}</p></div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border border-amber-500 rounded-b-[2.5rem] shadow-2xl z-[160] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col overflow-visible">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 shrink-0 relative z-[170]">
             <MultiCheckboxFilter label="Modalidades" options={allOpTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <RichEntityFilter label="Ranking Clientes" stats={clientStats} selectedItems={selClients} onChange={setSelClients} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>} />
             <RichEntityFilter label="Ranking Equipe" stats={driverStats} selectedItems={selDrivers} onChange={setSelDrivers} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2"/></svg>} />
          </div>
          
          <div className="overflow-y-auto custom-scrollbar p-5 space-y-3 flex-1 bg-slate-50/30 min-h-[300px] rounded-b-[2.5rem]">
            {displayTrips.map(trip => (
              <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <span className="text-xs font-black text-amber-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                <p className="text-[12px] font-black text-slate-800 uppercase mt-2 leading-none truncate">{trip.driver.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 truncate">{trip.customer.name}</p>
              </div>
            ))}
            {displayTrips.length === 0 && <p className="py-12 text-center text-[10px] font-black text-slate-300 uppercase italic">Nenhuma programação p/ Amanhã com os filtros atuais</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsTomorrow;
