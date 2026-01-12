
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsTomorrowProps {
  trips: Trip[];
}

const TripsTomorrow: React.FC<TripsTomorrowProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const tomorrowTrips = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrowStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    return trips.filter(t => {
      const tripDate = t.dateTime.split('T')[0];
      return tripDate === tomorrowStr && t.status !== 'Viagem cancelada';
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips]);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-6 rounded-[2.2rem] border transition-all duration-500 shadow-sm hover:shadow-xl ${isOpen ? 'border-amber-500 ring-4 ring-amber-500/5' : 'border-slate-100'}`}
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
        <p className="mt-4 text-[9px] font-black uppercase text-amber-600 tracking-tighter flex items-center gap-2">
          {isOpen ? 'Recolher Lista' : 'Toque para Expandir'}
        </p>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[400px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amanhã</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[7px] font-black uppercase">{tomorrowTrips.length} Cargas</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-2">
            {tomorrowTrips.length > 0 ? tomorrowTrips.map(trip => (
              <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-amber-200 hover:shadow-md transition-all group">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-amber-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                  <span className="text-[8px] font-black text-slate-300 uppercase">OS: {trip.os}</span>
                </div>
                <p className="text-[10px] font-black text-slate-800 uppercase truncate">{trip.driver.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{trip.customer.name}</p>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase italic">Nada agendado para amanhã</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsTomorrow;
