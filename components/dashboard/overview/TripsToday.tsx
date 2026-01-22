
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import { statsCalculator } from '../../../utils/statsCalculator';
import RichEntityFilter from './RichEntityFilter';

interface TripsTodayProps {
  trips: Trip[];
}

const TripsToday: React.FC<TripsTodayProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  const todayRaw = useMemo(() => {
    return trips.filter(t => t.dateTime && t.dateTime.substring(0, 10) === todayStr);
  }, [trips, todayStr]);

  const [selClients, setSelClients] = useState<string[]>([]);
  const [selDrivers, setSelDrivers] = useState<string[]>([]);

  const clientStats = useMemo(() => statsCalculator.calculateStats(todayRaw, 'client'), [todayRaw]);
  const driverStats = useMemo(() => statsCalculator.calculateStats(todayRaw, 'driver'), [todayRaw]);

  const stats = useMemo(() => {
    const activeTrips = todayRaw.filter(t => t.status !== 'Viagem cancelada');
    const canceled = todayRaw.filter(t => t.status === 'Viagem cancelada').length;
    const completed = activeTrips.filter(t => t.status === 'Viagem concluída').length;
    const delays = activeTrips.filter(t => statsCalculator.isDelayed(t)).length;

    const typeCounts: Record<string, number> = {};
    activeTrips.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return { total: activeTrips.length, typeCounts, canceled, delays, completed };
  }, [todayRaw]);

  const filteredTrips = useMemo(() => {
    return todayRaw.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchClient = selClients.length === 0 || selClients.includes(t.customer.name);
      const matchDriver = selDrivers.length === 0 || selDrivers.includes(t.driver.name);
      return matchClient && matchDriver;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [todayRaw, selClients, selDrivers]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 150 : 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start w-full">
            <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Viagens Hoje</p>
                <p className="text-5xl font-black text-slate-800 tracking-tighter mt-1">{stats.total}</p>
            </div>
            <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
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
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border border-blue-500 rounded-b-[2.5rem] shadow-2xl z-[160] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 shrink-0 relative z-[170]">
             <RichEntityFilter label="Performance Cliente" data={clientStats} selectedItems={selClients} onChange={setSelClients} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>} />
             <RichEntityFilter label="Performance Motorista" data={driverStats} selectedItems={selDrivers} onChange={setSelDrivers} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2"/></svg>} />
          </div>
          
          <div className="overflow-y-auto custom-scrollbar p-5 space-y-3 flex-1 bg-slate-50/30 min-h-[300px] rounded-b-[2.5rem]">
            {filteredTrips.map(trip => (
              <div key={trip.id} className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center justify-between hover:border-blue-300 transition-all">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-blue-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    <h4 className="text-[11px] font-black text-slate-800 uppercase truncate leading-none">{trip.driver.name}</h4>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 truncate">{trip.customer.name}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                   <span className="bg-slate-900 text-white px-2 py-1 rounded text-[9px] font-mono font-bold uppercase">{trip.driver.plateHorse}</span>
                   <span className={`text-[8px] font-black uppercase mt-1.5 ${trip.status === 'Viagem concluída' ? 'text-emerald-500' : 'text-blue-500'}`}>{trip.status}</span>
                </div>
              </div>
            ))}
            {filteredTrips.length === 0 && <p className="py-12 text-center text-[10px] font-black text-slate-300 uppercase italic">Nenhuma OS para os filtros atuais</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsToday;
