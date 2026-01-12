
import React, { useState, useMemo, useEffect } from 'react';
import { Trip } from '../../../types';
import MultiCheckboxFilter from '../../shared/MultiCheckboxFilter';

interface TripsTodayProps {
  trips: Trip[];
}

const TripsToday: React.FC<TripsTodayProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const todayRaw = useMemo(() => trips.filter(t => t.dateTime.split('T')[0] === todayStr), [trips, todayStr]);

  const stats = useMemo(() => {
    const active = todayRaw.filter(t => t.status !== 'Viagem cancelada');
    const canceled = todayRaw.filter(t => t.status === 'Viagem cancelada').length;
    const completed = todayRaw.filter(t => t.status === 'Viagem concluída').length;
    
    const typeCounts: { [key: string]: number } = {};
    active.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });

    const delays = active.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      return arrival && new Date(arrival.dateTime).getTime() > new Date(t.dateTime).getTime();
    }).length;

    return { total: active.length, typeCounts, canceled, delays, completed };
  }, [todayRaw]);

  // Filtros para lista expandida
  const allTypes = useMemo(() => Array.from(new Set(todayRaw.map(t => t.type))).sort(), [todayRaw]);
  const allClients = useMemo(() => Array.from(new Set(todayRaw.map(t => t.customer.name))).sort(), [todayRaw]);
  const allDests = useMemo(() => Array.from(new Set(todayRaw.map(t => t.destination?.name || t.scheduling?.location).filter(Boolean))).sort(), [todayRaw]);

  const [selTypes, setSelTypes] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_today_types') || '[]'));
  const [selClients, setSelClients] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_today_clients') || '[]'));
  const [selDests, setSelDests] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_today_dests') || '[]'));
  
  const todayTrips = useMemo(() => {
    return todayRaw.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchType = selTypes.length === 0 || selTypes.includes(t.type);
      const matchClient = selClients.length === 0 || selClients.includes(t.customer.name);
      const dName = t.destination?.name || t.scheduling?.location || '';
      const matchDest = selDests.length === 0 || (dName && selDests.includes(dName));
      return matchType && matchClient && matchDest;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [todayRaw, selTypes, selClients, selDests]);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start w-full">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Viagens Hoje</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-5xl font-black text-slate-800 tracking-tighter">{stats.total}</p>
              {stats.total > 0 && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="mt-6 w-full space-y-4">
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(stats.typeCounts).slice(0, 2).map(([type, c]) => (
              <div key={type} className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-[7.5px] font-black text-slate-400 uppercase truncate pr-1">{type}</span>
                <span className="text-[10px] font-black text-slate-700">{c}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-[7px] font-black text-red-400 uppercase">Atraso</p>
              <p className="text-sm font-black text-red-600 leading-none mt-1">{stats.delays}</p>
            </div>
            <div className="text-center">
              <p className="text-[7px] font-black text-emerald-400 uppercase">Concl.</p>
              <p className="text-sm font-black text-emerald-600 leading-none mt-1">{stats.completed}</p>
            </div>
            <div className="text-center">
              <p className="text-[7px] font-black text-slate-400 uppercase">Canc.</p>
              <p className="text-sm font-black text-slate-600 leading-none mt-1">{stats.canceled}</p>
            </div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border border-blue-500 rounded-b-[2.5rem] shadow-2xl z-[60] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2 shrink-0 relative z-[100]">
             <MultiCheckboxFilter label="Tipos" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Clientes" options={allClients} selectedOptions={selClients} onChange={setSelClients} />
             <MultiCheckboxFilter label="Destinos" options={allDests} selectedOptions={selDests} onChange={setSelDests} />
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/30 flex-1 min-h-[300px]">
            {todayTrips.length > 0 ? todayTrips.map(trip => (
              <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-3xl group shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-black text-blue-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                  <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[7px] font-black uppercase">{trip.type}</span>
                </div>
                <p className="text-[10px] font-black text-slate-800 uppercase leading-none truncate">{trip.driver.name}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 truncate">{trip.customer.name}</p>
              </div>
            )) : <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px]">Sem resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsToday;
