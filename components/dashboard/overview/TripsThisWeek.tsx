
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import MultiCheckboxFilter from '../../shared/MultiCheckboxFilter';

interface TripsThisWeekProps {
  trips: Trip[];
}

const TripsThisWeek: React.FC<TripsThisWeekProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'ranking'>('ranking');

  const weekStats = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekTrips = trips.filter(t => {
      if (!t.dateTime) return false;
      const tripTime = new Date(t.dateTime).getTime();
      return tripTime >= startOfWeek.getTime() && tripTime <= endOfWeek.getTime();
    });

    const active = weekTrips.filter(t => t.status !== 'Viagem cancelada');
    const canceled = weekTrips.filter(t => t.status === 'Viagem cancelada').length;
    const completed = active.filter(t => t.status === 'Viagem concluída').length;
    
    const typeCounts: Record<string, number> = {};
    const clientRank: Record<string, number> = {};
    const driverRank: Record<string, number> = {};
    const driverDetails: Record<string, { total: number, clients: Record<string, number> }> = {};

    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      clientRank[t.customer.name] = (clientRank[t.customer.name] || 0) + 1;
      driverRank[t.driver.name] = (driverRank[t.driver.name] || 0) + 1;

      if (!driverDetails[t.driver.name]) {
        driverDetails[t.driver.name] = { total: 0, clients: {} };
      }
      driverDetails[t.driver.name].total += 1;
      driverDetails[t.driver.name].clients[t.customer.name] = (driverDetails[t.driver.name].clients[t.customer.name] || 0) + 1;
    });

    const delays = active.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      const scheduled = new Date(t.dateTime).getTime();
      if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      return new Date().getTime() > (scheduled + 600000) && t.status !== 'Viagem concluída';
    }).length;

    return { 
      total: active.length, 
      typeCounts, 
      canceled, 
      delays, 
      completed, 
      raw: active,
      clientRank: Object.entries(clientRank).sort((a,b) => b[1] - a[1]),
      driverRank: Object.entries(driverRank).sort((a,b) => b[1] - a[1]),
      driverDetails
    };
  }, [trips]);

  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selClients, setSelClients] = useState<string[]>([]);
  const [selDrivers, setSelDrivers] = useState<string[]>([]);

  const filteredList = useMemo(() => {
    return weekStats.raw.filter(t => {
      const matchT = selTypes.length === 0 || selTypes.includes(t.type?.toUpperCase() || 'OUTROS');
      const matchC = selClients.length === 0 || selClients.includes(t.customer.name);
      const matchD = selDrivers.length === 0 || selDrivers.includes(t.driver.name);
      return matchT && matchC && matchD;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [weekStats.raw, selTypes, selClients, selDrivers]);

  const allTypes = useMemo(() => Array.from(new Set(weekStats.raw.map(t => t.type?.toUpperCase() || 'OUTROS'))).sort(), [weekStats.raw]);
  const allClients = useMemo(() => Array.from(new Set(weekStats.raw.map(t => t.customer.name))).sort(), [weekStats.raw]);
  
  const driverOptions = useMemo(() => {
    /* Added explicit type casting to Object.entries return value to avoid 'unknown' type inference and property errors */
    return (Object.entries(weekStats.driverDetails) as [string, { total: number, clients: Record<string, number> }][])
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, d]) => {
        /* d is now typed, so accessing d.clients and d.total is safe */
        const clientBreakdown = Object.entries(d.clients)
          .map(([cName, count]) => `${cName.substring(0, 5)}: ${count}`)
          .join(', ');
        return {
          value: name,
          label: `${name} [${d.total}] (${clientBreakdown})`
        };
      });
  }, [weekStats.driverDetails]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 140 : 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start w-full">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume Semana</p>
            <p className="text-4xl font-black text-indigo-600 tracking-tighter mt-1">{weekStats.total}</p>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-400'}`}>
            <svg className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="mt-6 w-full space-y-4">
          <div className="flex flex-wrap gap-1.5 min-h-[30px]">
            {Object.entries(weekStats.typeCounts).slice(0, 4).map(([type, c]) => (
              <div key={type} className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                <span className="text-[7px] font-black text-slate-400 uppercase">{type.substring(0,3)}</span>
                <span className="text-[9px] font-black text-slate-700">{c}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-red-50 p-2 rounded-xl text-center border border-red-100"><p className="text-[7px] font-black text-red-400 uppercase">Atr.</p><p className="text-sm font-black text-red-600">{weekStats.delays}</p></div>
            <div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-100"><p className="text-[7px] font-black text-emerald-400 uppercase">Concl.</p><p className="text-sm font-black text-emerald-600">{weekStats.completed}</p></div>
            <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-200"><p className="text-[7px] font-black text-slate-400 uppercase">Canc.</p><p className="text-sm font-black text-slate-600">{weekStats.canceled}</p></div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border border-indigo-500 rounded-b-[2.5rem] shadow-2xl z-[60] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 shrink-0 relative z-[110]">
             <MultiCheckboxFilter label="Tipos" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Clientes" options={allClients} selectedOptions={selClients} onChange={setSelClients} />
             <MultiCheckboxFilter label="Motoristas" options={driverOptions} selectedOptions={selDrivers} onChange={setSelDrivers} />
          </div>
          
          <div className="flex bg-slate-100 p-1 mx-4 mt-4 rounded-xl shrink-0">
             <button onClick={() => setViewMode('ranking')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'ranking' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Ranking Volumes</button>
             <button onClick={() => setViewMode('list')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Lista Viagens</button>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3 flex-1 bg-slate-50/30 min-h-[250px] rounded-b-[2.5rem]">
            {viewMode === 'ranking' ? (
              <div className="space-y-6 pb-4">
                <section className="space-y-2">
                   <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest ml-1">Volumes por Cliente</p>
                   {weekStats.clientRank.map(([name, count]) => (
                     <div key={name} className="bg-white p-3 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                        <span className="text-[10px] font-black text-slate-700 uppercase truncate pr-4">{name}</span>
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">{count}</span>
                     </div>
                   ))}
                </section>
                <section className="space-y-2">
                   <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest ml-1">Volumes por Motorista</p>
                   {weekStats.driverRank.map(([name, count]) => (
                     <div key={name} className="bg-white p-3 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                        <span className="text-[10px] font-black text-slate-700 uppercase truncate pr-4">{name}</span>
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black">{count}</span>
                     </div>
                   ))}
                </section>
              </div>
            ) : (
              filteredList.length > 0 ? filteredList.map(trip => (
                <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <span className="text-xs font-black text-indigo-600">{new Date(trip.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} • {new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                  <p className="text-[10px] font-black text-slate-800 uppercase mt-1 leading-none truncate">{trip.driver.name}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase truncate mt-1">{trip.customer.name}</p>
                </div>
              )) : <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px]">Sem dados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsThisWeek;
