
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

  const stats = useMemo(() => {
    const active = tomorrowRaw.filter(t => t.status !== 'Viagem cancelada');
    const canceled = tomorrowRaw.filter(t => t.status === 'Viagem cancelada').length;
    const completed = tomorrowRaw.filter(t => t.status === 'Viagem concluída').length;
    
    const typeCounts: { [key: string]: number } = {};
    active.forEach(t => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });

    return { total: active.length, typeCounts, canceled, completed };
  }, [tomorrowRaw]);

  // Filtros
  const allTypes = useMemo(() => Array.from(new Set(tomorrowRaw.map(t => t.type))).sort(), [tomorrowRaw]);
  const allClients = useMemo(() => Array.from(new Set(tomorrowRaw.map(t => t.customer.name))).sort(), [tomorrowRaw]);

  const [selTypes, setSelTypes] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_tom_types') || '[]'));
  const [selClients, setSelClients] = useState<string[]>(() => JSON.parse(localStorage.getItem('filter_tom_clients') || '[]'));
  
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
        className={`w-full text-left bg-white p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-amber-500 ring-4 ring-amber-500/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start w-full">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amanhã</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{stats.total}</p>
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-50 text-amber-600'}`}>
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

          <div className="grid grid-cols-2 gap-2">
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
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border border-amber-500 rounded-b-[2.5rem] shadow-2xl z-[60] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2 shrink-0 relative z-[100]">
             <MultiCheckboxFilter label="Modalidades" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Filtrar Clientes" options={allClients} selectedOptions={selClients} onChange={setSelClients} />
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3 flex-1 bg-slate-50/30 min-h-[250px]">
            {tomorrowTrips.length > 0 ? tomorrowTrips.map(trip => (
              <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <span className="text-sm font-black text-amber-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                <p className="text-[10px] font-black text-slate-800 uppercase mt-2 leading-none truncate">{trip.driver.name}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 truncate">{trip.customer.name}</p>
              </div>
            )) : <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px]">Sem dados</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsTomorrow;
