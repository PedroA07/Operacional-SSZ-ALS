
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

  const allTypes = useMemo(() => Array.from(new Set(todayRaw.map(t => t.type))).sort(), [todayRaw]);
  const allClients = useMemo(() => Array.from(new Set(todayRaw.map(t => t.customer.name))).sort(), [todayRaw]);
  const allDests = useMemo(() => Array.from(new Set(todayRaw.map(t => t.destination?.name || t.scheduling?.location).filter(Boolean))).sort(), [todayRaw]);

  // Estados com persistência local
  const [selTypes, setSelTypes] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_today_types') || '[]'));
  const [selClients, setSelClients] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_today_clients') || '[]'));
  const [selDests, setSelDests] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_today_dests') || '[]'));
  
  useEffect(() => { localStorage.setItem('filter_today_types', JSON.stringify(selTypes)); }, [selTypes]);
  useEffect(() => { localStorage.setItem('filter_today_clients', JSON.stringify(selClients)); }, [selClients]);
  useEffect(() => { localStorage.setItem('filter_today_dests', JSON.stringify(selDests)); }, [selDests]);

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
        className={`w-full text-left bg-white p-6 rounded-[2.2rem] border transition-all duration-500 shadow-sm hover:shadow-xl ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Viagens Hoje</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-5xl font-black text-slate-800 tracking-tighter">{todayTrips.length}</p>
              {todayTrips.length > 0 && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-0 bg-white border border-t-0 border-blue-500 rounded-b-[2.5rem] shadow-2xl z-50 animate-in slide-in-from-top-1 duration-300 max-h-[700px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2 shrink-0 relative z-[60]">
             <MultiCheckboxFilter label="Tipos" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Clientes" options={allClients} selectedOptions={selClients} onChange={setSelClients} />
             <MultiCheckboxFilter label="Destinos" options={allDests} selectedOptions={selDests} onChange={setSelDests} />
          </div>

          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/30 flex-1 min-h-[300px] rounded-b-[2.5rem] relative z-10">
            {todayTrips.length > 0 ? todayTrips.map(trip => (
              <div key={trip.id} className="p-5 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 transition-all group shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-blue-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[7px] font-black uppercase tracking-widest">{trip.type}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-300">OS: {trip.os}</span>
                </div>
                <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{trip.driver.name}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 truncate">{trip.customer.name}</p>
              </div>
            )) : (
              <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px]">Sem resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsToday;
