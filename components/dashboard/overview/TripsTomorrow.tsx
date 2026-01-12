
import React, { useState, useMemo, useEffect } from 'react';
import { Trip } from '../../../types';
import MultiCheckboxFilter from '../../shared/MultiCheckboxFilter';

interface TripsTomorrowProps {
  trips: Trip[];
}

const TripsTomorrow: React.FC<TripsTomorrowProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tomStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const tomorrowRaw = useMemo(() => trips.filter(t => t.dateTime.split('T')[0] === tomStr), [trips, tomStr]);

  const allTypes = useMemo(() => Array.from(new Set(tomorrowRaw.map(t => t.type))).sort(), [tomorrowRaw]);
  const allClients = useMemo(() => Array.from(new Set(tomorrowRaw.map(t => t.customer.name))).sort(), [tomorrowRaw]);

  // Estados com persistência local
  const [selTypes, setSelTypes] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_tom_types') || '[]'));
  const [selClients, setSelClients] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_tom_clients') || '[]'));
  
  useEffect(() => { localStorage.setItem('filter_tom_types', JSON.stringify(selTypes)); }, [selTypes]);
  useEffect(() => { localStorage.setItem('filter_tom_clients', JSON.stringify(selClients)); }, [selClients]);

  const tomorrowTrips = useMemo(() => {
    return tomorrowRaw.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchType = selTypes.length === 0 || selTypes.includes(t.type);
      const matchClient = selClients.length === 0 || selClients.includes(t.customer.name);
      return matchType && matchClient;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [tomorrowRaw, selTypes, selClients]);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-6 rounded-[2.2rem] border transition-all duration-500 shadow-sm hover:shadow-xl ${isOpen ? 'border-amber-500 ring-4 ring-amber-500/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amanhã</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{tomorrowTrips.length}</p>
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-50 text-amber-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-0 bg-white border border-t-0 border-amber-500 rounded-b-[2.5rem] shadow-2xl z-50 animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2 shrink-0 relative z-[60]">
             <MultiCheckboxFilter label="Modalidades" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Filtrar Clientes" options={allClients} selectedOptions={selClients} onChange={setSelClients} />
          </div>

          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3 flex-1 bg-slate-50/30 min-h-[250px] rounded-b-[2.5rem] relative z-10">
            {tomorrowTrips.length > 0 ? tomorrowTrips.map(trip => (
              <div key={trip.id} className="p-5 bg-white border border-slate-100 rounded-3xl hover:border-amber-200 transition-all group shadow-sm">
                <span className="text-sm font-black text-amber-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                <p className="text-[10px] font-black text-slate-800 uppercase mt-2 leading-none">{trip.driver.name}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{trip.customer.name}</p>
              </div>
            )) : (
              <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px]">Sem dados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsTomorrow;
